import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CatchupItem,
  CatchupResult,
  Message,
  SinceWindow,
  UserProfile,
} from "./types";
import type { AiEngine } from "./lib/aiEngine";
import { chooseEngine, enableWebllm, probeEngines, ruleBasedEngine } from "./lib/aiEngine";
import { parseChat } from "./lib/parser";
import { buildDemoChat } from "./lib/demoChat";
import { extractItems } from "./lib/extract";
import { resolveDecisionUpdates } from "./lib/decisionUpdates";
import { summarizeChat } from "./lib/summarize";
import { windowLabel, windowStart } from "./lib/time";
import { compareByPriority } from "./lib/priority";
import { copyToClipboard, downloadText, toMarkdown, toPlainText } from "./lib/export";
import { KEYS, clearAll, idbGet, idbSet } from "./lib/storage";
import { useTheme } from "./hooks/useTheme";

import { Header } from "./components/Header";
import { ProfilePanel } from "./components/ProfilePanel";
import { ImportPanel } from "./components/ImportPanel";
import { CatchupWindowPicker } from "./components/CatchupWindowPicker";
import { SummaryCard } from "./components/SummaryCard";
import { FilterBar, DEFAULT_FILTERS, type Filters } from "./components/FilterBar";
import { Tabs, type TabDef } from "./components/Tabs";
import { ItemCard } from "./components/ItemCard";
import { ChatView, MessageContextModal } from "./components/MessageViewer";
import { EnginePanel } from "./components/EnginePanel";

const DEFAULT_PROFILE: UserProfile = {
  name: "Aarav",
  handle: "aarav",
  tasks: ["ML model", "slides", "demo video", "backup demo video"],
};

export default function App() {
  const { theme, toggle } = useTheme();

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [engine, setEngine] = useState<AiEngine>(() => ruleBasedEngine());
  const [probes, setProbes] = useState<
    Awaited<ReturnType<typeof probeEngines>>
  >([]);
  const [since, setSince] = useState<SinceWindow>("24h");
  const [customHours, setCustomHours] = useState(24);
  const [analysisScope, setAnalysisScope] = useState<"window" | "unread">("window");
  const [unreadAfterId, setUnreadAfterId] = useState("");
  const [result, setResult] = useState<CatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("priority");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [engineOpen, setEngineOpen] = useState(false);
  const [webllmProgress, setWebllmProgress] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(() => Date.now());
  const autoRanRef = useRef("");

  // ---- Boot: restore persisted state + detect engines -------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedProfile, storedMessages, storedDone, storedReadThrough] = await Promise.all([
        idbGet<UserProfile>(KEYS.profile),
        idbGet<Message[]>(KEYS.messages),
        idbGet<string[]>(KEYS.done),
        idbGet<string>(KEYS.readThrough),
      ]);
      if (cancelled) return;
      if (storedProfile) setProfile(storedProfile);
      if (Array.isArray(storedMessages) && storedMessages.length) {
        setMessages(storedMessages);
      }
      if (Array.isArray(storedDone)) setDoneIds(new Set(storedDone));
      if (typeof storedReadThrough === "string") setUnreadAfterId(storedReadThrough);
    })();

    const detachOnline = () => {
      const goOnline = () => setOnline(true);
      const goOffline = () => setOnline(false);
      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);
      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    };
    const cleanupOnline = detachOnline();
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);

    (async () => {
      const found = await probeEngines();
      if (cancelled) return;
      setProbes(found);
      const chosen = await chooseEngine();
      if (!cancelled) setEngine(chosen);
    })();

    return () => {
      cancelled = true;
      cleanupOnline();
      window.clearInterval(clock);
    };
  }, []);

  // ---- Persist state ----------------------------------------------------
  useEffect(() => {
    void idbSet(KEYS.profile, profile);
  }, [profile]);
  useEffect(() => {
    if (messages.length) void idbSet(KEYS.messages, messages);
  }, [messages]);
  useEffect(() => {
    void idbSet(KEYS.done, [...doneIds]);
  }, [doneIds]);
  useEffect(() => {
    void idbSet(KEYS.readThrough, unreadAfterId);
  }, [unreadAfterId]);

  // ---- Analysis ---------------------------------------------------------
  const runAnalysis = async () => {
    if (messages.length === 0) return;
    setLoading(true);
    setError(null);
    const nowAtRun = Date.now();
    try {
      const readIndex = unreadAfterId ? messages.findIndex((message) => message.id === unreadAfterId) : -1;
      const unreadMessages = messages.slice(readIndex + 1);
      const start = windowStart(since, nowAtRun, customHours);
      const candidates = analysisScope === "unread" ? unreadMessages : messages;
      const windowed =
        analysisScope === "unread" || since === "all"
          ? candidates
          : candidates.filter((message) => message.timestamp >= start);
      const analysedCount = windowed.filter((message) => !message.isSystem).length;
      const lastReadMessage = readIndex >= 0 ? messages[readIndex] : null;
      const resultWindowLabel = analysisScope === "unread"
        ? lastReadMessage
          ? `Unread after ${lastReadMessage.sender}`
          : "Unread · entire import"
        : windowLabel(since, customHours);

      if (analysedCount === 0) {
        setResult({
          tldr: "No messages in this window. Widen the catch-up window and try again.",
          topics: [],
          actions: [],
          decisions: [],
          announcements: [],
          mentions: [],
          questions: [],
          engine: engine.info,
          windowLabel: resultWindowLabel,
          messageCount: analysedCount,
          generatedAt: nowAtRun,
        });
        return;
      }

      const extracted = extractItems(windowed, profile, nowAtRun);
      const decisions = resolveDecisionUpdates(extracted.decisions, messages);
      const allItems = [
        ...extracted.actions,
        ...decisions,
        ...extracted.announcements,
        ...extracted.mentions,
      ];
      const summary = await summarizeChat(
        windowed,
        profile,
        engine,
        allItems,
        nowAtRun,
      );

      setResult({
        tldr: summary.tldr,
        topics: summary.topics,
        actions: extracted.actions,
        decisions,
        announcements: extracted.announcements,
        mentions: extracted.mentions,
        questions: extracted.questions,
        engine: summary.engine,
        windowLabel: resultWindowLabel,
        messageCount: analysedCount,
        generatedAt: nowAtRun,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong while analysing.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run once per chat (and again if the engine upgrades to a neural one).
  useEffect(() => {
    if (messages.length === 0) return;
    const first = messages[0];
    const last = messages[messages.length - 1];
    const sig = `${messages.length}:${first.id}:${last.id}:${engine.info.name}`;
    if (autoRanRef.current === sig) return;
    autoRanRef.current = sig;
    void runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, engine.info.name]);

  // ---- Handlers ---------------------------------------------------------
  const handleParse = (text: string) => {
    const parsed = parseChat(text);
    setMessages(parsed.messages);
    setUnreadAfterId("");
    setWarnings(parsed.warnings);
  };

  const handleDemo = () => {
    const demo = buildDemoChat();
    setMessages(demo);
    setUnreadAfterId("");
    setWarnings([]);
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      "Clear ALL data (messages, profile, summary, done items)? This cannot be undone.",
    );
    if (!confirmed) return;
    await clearAll();
    setMessages([]);
    setResult(null);
    setDoneIds(new Set());
    setProfile(DEFAULT_PROFILE);
    setUnreadAfterId("");
  };

  const handleEnableWebllm = () => {
    setWebllmProgress("Downloading model weights...");
    void (async () => {
      try {
        const wlEngine = await enableWebllm((p) => {
          if (p.progress !== undefined) {
            setWebllmProgress(`Downloading model: ${Math.min(100, Math.round(p.progress * 100))}%`);
          }
        });
        setEngine(wlEngine);
        setProbes(await probeEngines());
        setWebllmProgress(null);
      } catch {
        setWebllmProgress(null);
        setWebllmProgress("Failed to load WebLLM. Is WebGPU enabled?");
        window.setTimeout(() => setWebllmProgress(null), 4000);
      }
    })();
  };

  const handleRefreshEngines = async () => {
    setProbes(await probeEngines());
    const chosen = await chooseEngine({ preferWebllm: true });
    setEngine(chosen);
  };

  const withDone = (items: CatchupItem[]): CatchupItem[] =>
    items.map((item) =>
      item.type === "action" ? { ...item, done: doneIds.has(item.id) } : item,
    );

  const messageById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const message of messages) map.set(message.id, message);
    return map;
  }, [messages]);

  const senders = useMemo(
    () => [...new Set(messages.filter((m) => !m.isSystem).map((m) => m.sender))].sort(),
    [messages],
  );

  const items = useMemo(() => {
    if (!result) return [];
    return [...result.actions, ...result.decisions, ...result.announcements, ...result.mentions].sort(
      (a, b) => compareByPriority(a, b) || b.messageId.localeCompare(a.messageId),
    );
  }, [result]);

  const allItems = useMemo(() => withDone(items), [items, doneIds]);

  const applyFilters = (list: CatchupItem[]): CatchupItem[] =>
    list
      .filter((item) => {
        if (filters.priority !== "all" && item.priority !== filters.priority) return false;
        if (filters.type !== "all" && item.type !== filters.type) return false;
        if (filters.sender !== "all" && messageById.get(item.messageId)?.sender !== filters.sender)
          return false;
        if (filters.search) {
          const needle = filters.search.toLowerCase();
          const hay = `${item.title} ${item.detail ?? ""}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => compareByPriority(a, b) || b.messageId.localeCompare(a.messageId));

  const visibleByTab: Record<string, CatchupItem[]> = {
    priority: applyFilters(allItems),
    actions: applyFilters(withDone(result?.actions ?? [])),
    decisions: applyFilters(withDone(result?.decisions ?? [])),
    mentions: applyFilters(withDone(result?.mentions ?? [])),
    chat: [],
  };

  const tabs: TabDef[] = [
    { id: "priority", label: "Priority", count: allItems.length },
    { id: "actions", label: "Action items", count: result?.actions.length ?? 0 },
    { id: "decisions", label: "Decisions", count: result?.decisions.length ?? 0 },
    { id: "mentions", label: "Mentions", count: result?.mentions.length ?? 0 },
    { id: "chat", label: "Chat", count: messages.length },
  ];

  const handleExport = (format: "md" | "txt") => {
    if (!result) return;
    const content =
      format === "md" ? toMarkdown(result, profile, now) : toPlainText(result, profile, now);
    downloadText(`catchup-summary-${Date.now()}.${format === "md" ? "md" : "txt"}`, content);
  };

  const handleCopy = async () => {
    if (!result) return;
    await copyToClipboard(toPlainText(result, profile, now));
  };

  const toggleDone = (itemId: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const windowStartTs = analysisScope === "unread" || since === "all" ? 0 : windowStart(since, now, customHours);

  return (
    <div className="min-h-dvh">
      <Header
        engine={engine.info}
        online={online}
        theme={theme}
        onToggleTheme={toggle}
        onClearData={handleClearAll}
        onOpenEngine={() => setEngineOpen(true)}
      />

      <main id="main" className="mx-auto max-w-6xl space-y-5 px-4 py-7 sm:px-6 sm:py-10">
        <section className="welcome-card relative overflow-hidden rounded-[1.75rem] px-6 py-8 sm:px-9 sm:py-10">
          <div className="welcome-orb" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" />
              YOUR CONVERSATION, BACK IN FOCUS
            </div>
            <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
              A calmer way to catch up.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-indigo-100/85 sm:text-base">
              Find the decisions, action items, and messages that matter — without scrolling through everything.
            </p>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2 text-xs font-medium text-white/85 sm:mt-7">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Private by design</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Works right in your browser</span>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <ProfilePanel profile={profile} onChange={setProfile} />
          <ImportPanel onParse={handleParse} onDemo={handleDemo} messageCount={messages.length} warnings={warnings} />
        </div>

        <CatchupWindowPicker
          value={since}
          customHours={customHours}
          scope={analysisScope}
          messages={messages}
          lastReadMessageId={unreadAfterId}
          onValueChange={setSince}
          onCustomHoursChange={setCustomHours}
          onScopeChange={setAnalysisScope}
          onLastReadChange={setUnreadAfterId}
          onAnalyze={() => void runAnalysis()}
          loading={loading}
          disabled={messages.length === 0}
        />

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {messages.length === 0 && !loading && (
          <section className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No chat loaded. Paste a chat above or tap <strong>Load demo chat</strong> to see
              CatchUp in action - it uses real parsing and on-device extraction.
            </p>
          </section>
        )}

        {loading && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"
          >
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600"
              aria-hidden="true"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Summarising with {engine.info.label}...
            </span>
          </div>
        )}

        {!loading && result && (
          <>
            <SummaryCard
              result={result}
              onExportMarkdown={() => handleExport("md")}
              onExportText={() => handleExport("txt")}
              onCopy={handleCopy}
            />

            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

            {activeTab !== "chat" && (
              <FilterBar
                filters={filters}
                senders={senders}
                onChange={setFilters}
                showTypeFilter={activeTab === "priority"}
                resultCount={visibleByTab[activeTab]?.length ?? 0}
              />
            )}

            {activeTab === "chat" ? (
              <ChatView
                messages={messages}
                windowStart={windowStartTs}
                unreadAfterId={analysisScope === "unread" ? unreadAfterId : undefined}
                unreadMode={analysisScope === "unread"}
              />
            ) : (
              <div
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                className="space-y-2"
              >
                {(visibleByTab[activeTab] ?? []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Nothing matched in this window. Try widening the catch-up window or clearing the
                    filters.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(visibleByTab[activeTab] ?? []).map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        message={messageById.get(item.messageId)}
                        now={now}
                        profile={profile}
                        engine={engine}
                        onJumpToMessage={setSelectedMessageId}
                        onToggleDone={toggleDone}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-6 text-center text-[11px] text-slate-400">
        CatchUp · local-first · no conversations leave this device · demo data released under CC0 ·
        click through every tab with your own exported chat, not just the demo.
      </footer>

      {engineOpen && (
        <EnginePanel
          probes={probes.length ? probes : [{ info: engine.info, available: true, note: "Starting detection..." }]}
          active={engine.info}
          webllmProgress={webllmProgress}
          onEnableWebllm={handleEnableWebllm}
          onRefresh={handleRefreshEngines}
          onClose={() => setEngineOpen(false)}
        />
      )}
      <MessageContextModal
        messages={messages}
        selectedId={selectedMessageId}
        onClose={() => setSelectedMessageId(null)}
      />
    </div>
  );
}
