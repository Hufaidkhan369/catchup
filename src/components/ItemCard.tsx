import { useState } from "react";
import type { CatchupItem, Message, UserProfile } from "../types";
import type { AiEngine } from "../lib/aiEngine";
import { generateReplyDrafts } from "../lib/replyDrafts";
import { maskSensitive } from "../lib/privacy";
import { formatDateTime, formatDeadline, formatRelative } from "../lib/time";
import { copyToClipboard } from "../lib/export";
import { PriorityBadge } from "./Badges";

interface ItemCardProps {
  item: CatchupItem;
  message?: Message;
  now: number;
  profile: UserProfile;
  engine: AiEngine;
  onJumpToMessage: (messageId: string) => void;
  onToggleDone: (itemId: string) => void;
}

const TYPE_LABEL: Record<CatchupItem["type"], string> = {
  action: "Action",
  decision: "Decision",
  announcement: "Announcement",
  mention: "Mention",
  question: "Question",
};

export function ItemCard({
  item,
  message,
  now,
  profile,
  engine,
  onJumpToMessage,
  onToggleDone,
}: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [replies, setReplies] = useState<string[] | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const canDraft = item.type === "action" || item.type === "question";
  const isUnanswered = item.detail?.includes("[Unanswered]");

  const handleDraft = async () => {
    setLoadingReplies(true);
    try {
      setReplies(await generateReplyDrafts(item, profile, engine, now));
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleCopy = async (reply: string, index: number) => {
    if (await copyToClipboard(reply)) {
      setCopied(index);
      window.setTimeout(() => setCopied(null), 1500);
    }
  };

  return (
    <li
      className={`rounded-xl border bg-white shadow-sm transition dark:bg-slate-900 ${
        item.done
          ? "border-slate-200 opacity-70 dark:border-slate-800"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        {item.type === "action" && (
          <input
            type="checkbox"
            checked={!!item.done}
            onChange={() => onToggleDone(item.id)}
            aria-label={`Mark "${item.title}" as done`}
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
          />
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900"
        >
          <span className="mb-1 flex flex-wrap items-center gap-2">
            <PriorityBadge item={item} />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {TYPE_LABEL[item.type]}
            </span>
            {isUnanswered && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                Unanswered
              </span>
            )}
            {item.history && item.history.length > 0 && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-900/50 dark:text-sky-200">
                Updated
              </span>
            )}
          </span>
          <span className={`block text-sm ${item.done ? "line-through" : ""}`}>
            {maskSensitive(item.title)}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {item.owner && <span>👤 {item.owner}</span>}
            {item.deadline && (
              <span title={formatDateTime(item.deadline)}>
                ⏰ {formatDeadline(item.deadline, now)} ({formatRelative(item.deadline, now)})
              </span>
            )}
            {message && <span>💬 {message.sender}</span>}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="animate-fade-in space-y-3 border-t border-slate-100 px-3 py-3 text-sm dark:border-slate-800">
          {item.detail && (
            <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {maskSensitive(item.detail.replace(/\n\n\[Unanswered\]$/, ""))}
            </p>
          )}

          {item.history && item.history.length > 0 && (
            <div className="rounded-lg bg-sky-50 p-2 text-xs dark:bg-sky-950/40">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                aria-expanded={showHistory}
                className="font-medium text-sky-800 dark:text-sky-200"
              >
                {showHistory ? "Hide" : "Show"} earlier version{item.history.length > 1 ? "s" : ""} ({item.history.length})
              </button>
              {showHistory && (
                <ul className="mt-1 list-inside list-disc space-y-1 text-slate-600 dark:text-slate-300">
                  {item.history.map((entry, index) => (
                    <li key={index}>{maskSensitive(entry)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onJumpToMessage(item.messageId)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Show in chat
            </button>
            {canDraft && (
              <button
                type="button"
                onClick={handleDraft}
                disabled={loadingReplies}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
              >
                {loadingReplies && (
                  <span
                    className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400/40 border-t-brand-600"
                    aria-hidden="true"
                  />
                )}
                {replies ? "Regenerate replies" : "Draft a reply"}
              </button>
            )}
          </div>

          {replies && replies.length > 0 && (
            <ul className="space-y-1.5" aria-label="Suggested replies">
              {replies.map((reply, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/60"
                >
                  <span className="text-slate-700 dark:text-slate-200">{reply}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(reply, index)}
                    className="shrink-0 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {copied === index ? "Copied" : "Copy"}
                  </button>
                </li>
              ))}
              <li className="text-[10px] text-slate-400">
                Drafted on-device with {engine.info.label}.
              </li>
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
