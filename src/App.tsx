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
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("inbox");
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
    setAnalysisNotice("");
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
          : "Unread Â· entire import"
        : windowLabel(since, customHours);

      if (analysedCount === 0) {
        setResult({
          tldr: analysisScope === "unread"
            ? "No unread messages found after your selected read point."
            : "No messages in this window. Widen the catch-up window and try again.",
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
        setAnalysisNotice(analysisScope === "unread" ? "Checked unread messages · none found after your read point." : "Summary refreshed · no messages in this window.");
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
      setAnalysisNotice(`${analysedCount} messages summarized${analysisScope === "unread" ? " from unread messages" : ""}.`);
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
    { id: "inbox", label: "Home", count: messages.length, icon: "⌂" },
    { id: "summary", label: "Summary", count: result?.messageCount ?? 0, icon: "✦" },
    { id: "priority", label: "Important", count: allItems.filter((item) => item.priority === "high").length, icon: "◈" },
    { id: "actions", label: "To-dos", count: result?.actions.length ?? 0, icon: "✓" },
    { id: "decisions", label: "Decisions", count: result?.decisions.length ?? 0, icon: "⇄" },
    { id: "mentions", label: "Mentions", count: result?.mentions.length ?? 0, icon: "@" },
    { id: "chat", label: "Messages", count: messages.length, icon: "▤" },
    { id: "profile", label: "My profile", count: 0, icon: "☺" },
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

      <main id="main" className="mx-auto max-w-[1500px] px-3 py-3 sm:px-5 sm:py-5">
        <div className="whatsapp-app-shell catchup-workspace grid min-h-[calc(100dvh-110px)] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
          <aside className="whatsapp-sidebar min-w-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Your space</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything in one place</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-xl text-white shadow-md" aria-hidden="true">✦</span>
            </div>
            <div className="border-b border-slate-200 p-2 dark:border-slate-700">
              <button type="button" onClick={() => setActiveTab(messages.length ? "chat" : "inbox")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-slate-800">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" aria-hidden="true">◉</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{messages.length ? "Imported conversation" : "Start a conversation"}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{messages.length ? `${messages[messages.length - 1].sender}: ${messages[messages.length - 1].text}` : "Import a chat to see messages here"}</span>
                </span>
                {messages.length > 0 && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">{messages.length}</span>}
              </button>
            </div>
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            <div className="mx-4 mb-4 mt-2 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="font-semibold">Private by design</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">Your conversation stays in this browser.</p>
            </div>
          </aside>

          <section className="whatsapp-chat-pane flex min-w-0 flex-col">
            <div className="flex min-h-[76px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/90 sm:px-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-lg font-bold text-white shadow-sm" aria-hidden="true">C</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{tabs.find((tab) => tab.id === activeTab)?.label ?? "Home"}</h2>
                <p className="truncate text-sm text-slate-500 dark:text-slate-300">{messages.length ? `${messages.length} messages · private on-device workspace` : "Your private chat space · ready when you are"}</p>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:inline-flex dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> On device
              </span>
            </div>

            <div className="whatsapp-conversation min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
              {error && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">{error}</div>}
              {loading && (
                <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-lg dark:border-emerald-900 dark:bg-slate-900/95">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Summarising with {engine.info.label}...</span>
                </div>
              )}

              {activeTab === "inbox" && <div role="tabpanel" id="panel-inbox" aria-labelledby="tab-inbox" className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
                  <ImportPanel onParse={handleParse} onDemo={handleDemo} messageCount={messages.length} warnings={warnings} />
                  <CatchupWindowPicker
                    value={since} customHours={customHours} scope={analysisScope} messages={messages}
                    lastReadMessageId={unreadAfterId} onValueChange={setSince}
                    onCustomHoursChange={setCustomHours} onScopeChange={setAnalysisScope}
                    onLastReadChange={setUnreadAfterId} onAnalyze={() => void runAnalysis()}
                    loading={loading} disabled={messages.length === 0} notice={analysisNotice}
                  />
                </div>
                {messages.length === 0 && !loading && (
                  <div className="mx-auto max-w-xl rounded-2xl border border-white/90 bg-white/90 p-7 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                    <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" aria-hidden="true">☏</span>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Welcome to CatchUp</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Import a chat or load the demo, then summarize unread messages to see what matters.</p>
                  </div>
                )}
                {messages.length > 0 && <div className="home-nudge"><div><span className="eyebrow">YOUR CHAT, CAUGHT UP</span><h3>Good to see you, {profile.name}.</h3><p>Your messages stay on this device. Pick a time window, then get straight to what matters.</p></div><button type="button" onClick={() => setActiveTab("summary")}>View your summary <span aria-hidden="true">→</span></button></div>}
              </div>}

              {activeTab === "summary" && <section className="feature-page" role="tabpanel" id="panel-summary" aria-labelledby="tab-summary">
                <div className="feature-page-intro"><span className="eyebrow">THE SHORT VERSION</span><h2>Your catch-up</h2><p>A clear summary of the conversation, with the important bits ready to act on.</p></div>
                <CatchupWindowPicker value={since} customHours={customHours} scope={analysisScope} messages={messages} lastReadMessageId={unreadAfterId} onValueChange={setSince} onCustomHoursChange={setCustomHours} onScopeChange={setAnalysisScope} onLastReadChange={setUnreadAfterId} onAnalyze={() => void runAnalysis()} loading={loading} disabled={messages.length === 0} notice={analysisNotice} />
                {!loading && result && <SummaryCard result={result} onExportMarkdown={() => handleExport("md")} onExportText={() => handleExport("txt")} onCopy={handleCopy} />}
                {!loading && !result && <div className="empty-state"><span aria-hidden="true">✦</span><h3>Your summary will show up here</h3><p>Import a conversation, then choose <strong>Summarize unread messages</strong> to see a helpful recap.</p><button type="button" onClick={() => setActiveTab("inbox")}>Import a conversation</button></div>}
              </section>}

              {activeTab === "profile" && <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile"><ProfilePanel profile={profile} onChange={setProfile} /></div>}

              {!loading && !result && activeTab !== "inbox" && activeTab !== "profile" && activeTab !== "summary" && (
                <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/90 bg-white/90 p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">This chat view is ready.</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Import a conversation in Inbox to fill your {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()} view.</p>
                  <button type="button" onClick={() => setActiveTab("inbox")} className="mt-4 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-600">Go to inbox</button>
                </div>
              )}

              {!loading && result && activeTab !== "inbox" && activeTab !== "profile" && activeTab !== "summary" && (
                <section className="space-y-4" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                  {activeTab !== "chat" && <div className="feature-page-intro"><span className="eyebrow">YOUR CONVERSATION, ORGANIZED</span><h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2><p>{activeTab === "priority" ? "The messages and follow-ups that need your attention first." : activeTab === "actions" ? "A simple list of things people said they would do." : activeTab === "decisions" ? "Choices and plans made in the conversation." : "Messages that mention you directly."}</p></div>}
                  {activeTab !== "chat" && <FilterBar filters={filters} senders={senders} onChange={setFilters} showTypeFilter={activeTab === "priority"} resultCount={visibleByTab[activeTab]?.length ?? 0} />}
                  {activeTab === "chat" ? (
                    <ChatView messages={messages} windowStart={windowStartTs} unreadAfterId={analysisScope === "unread" ? unreadAfterId : undefined} unreadMode={analysisScope === "unread"} profileName={profile.name} />
                  ) : (
                    <div className="space-y-2">
                      {(visibleByTab[activeTab] ?? []).length === 0 ? <p className="rounded-xl border border-dashed border-white/80 bg-white/85 p-6 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-300">Nothing matched in this window. Try widening the catch-up window or clearing the filters.</p> : (
                        <ul className="space-y-2">{(visibleByTab[activeTab] ?? []).map((item) => <ItemCard key={item.id} item={item} message={messageById.get(item.messageId)} now={now} profile={profile} engine={engine} onJumpToMessage={setSelectedMessageId} onToggleDone={toggleDone} />)}</ul>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-6 text-center text-[11px] text-slate-400">
        CatchUp Â· local-first Â· no conversations leave this device Â· demo data released under CC0 Â·
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
