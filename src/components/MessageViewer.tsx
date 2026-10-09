import { useEffect, useRef, type ReactNode } from "react";
import type { Message } from "../types";
import { maskSensitive } from "../lib/privacy";
import { formatClock, formatDay, formatDateTime } from "../lib/time";

function MessageRow({
  message,
  highlight,
}: {
  message: Message;
  highlight?: boolean;
}) {
  return (
    <li
      className={`rounded-lg px-3 py-2 text-sm ${
        highlight
          ? "border border-brand-300 bg-brand-50 ring-1 ring-brand-300 dark:border-brand-700 dark:bg-brand-900/30"
          : "border border-transparent"
      } ${message.isSystem ? "italic text-slate-400 dark:text-slate-500" : ""}`}
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {message.sender}
        </span>
        <span className="text-[10px] text-slate-400" title={formatDateTime(message.timestamp)}>
          {formatClock(message.timestamp)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">
        {maskSensitive(message.text)}
      </p>
    </li>
  );
}

const CONTEXT_RADIUS = 3;

/** Modal showing 3 messages before and after the selected item. */
export function MessageContextModal({
  messages,
  selectedId,
  onClose,
}: {
  messages: Message[];
  selectedId: string | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onClose]);

  if (!selectedId) return null;
  const index = messages.findIndex((m) => m.id === selectedId);
  if (index === -1) return null;

  const start = Math.max(0, index - CONTEXT_RADIUS);
  const end = Math.min(messages.length, index + CONTEXT_RADIUS + 1);
  const context = messages.slice(start, end);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="context-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="context-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Original message context
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <ol className="space-y-1">
          {context.map((message) => (
            <MessageRow key={message.id} message={message} highlight={message.id === selectedId} />
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Full chat transcript with an "unread" divider at the catch-up window start. */
export function ChatView({
  messages,
  windowStart,
  highlightId,
}: {
  messages: Message[];
  windowStart: number;
  highlightId?: string | null;
}) {
  if (messages.length === 0) {
    return <p className="p-4 text-sm text-slate-500">No messages loaded yet.</p>;
  }

  const rows: ReactNode[] = [];
  let lastDay = "";
  let dividerPlaced = false;

  messages.forEach((message) => {
    const day = formatDay(message.timestamp);
    if (day !== lastDay) {
      rows.push(
        <li key={`day-${day}-${message.id}`} className="my-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {day}
        </li>,
      );
      lastDay = day;
    }
    if (!dividerPlaced && windowStart > 0 && message.timestamp >= windowStart) {
      dividerPlaced = true;
      rows.push(
        <li
          key="divider"
          className="my-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300"
        >
          <span className="h-px flex-1 bg-brand-200 dark:bg-brand-800" />
          Unread since your last visit
          <span className="h-px flex-1 bg-brand-200 dark:bg-brand-800" />
        </li>,
      );
    }
    rows.push(
      <MessageRow key={message.id} message={message} highlight={message.id === highlightId} />,
    );
  });

  return (
    <ol className="space-y-1 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      {rows}
    </ol>
  );
}
