import type { Message, SinceWindow } from "../types";
import { formatDateTime } from "../lib/time";

interface WindowPickerProps {
  value: SinceWindow;
  customHours: number;
  scope: "window" | "unread";
  messages: Message[];
  lastReadMessageId: string;
  onValueChange: (value: SinceWindow) => void;
  onCustomHoursChange: (hours: number) => void;
  onScopeChange: (scope: "window" | "unread") => void;
  onLastReadChange: (messageId: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  disabled: boolean;
  notice: string;
}

const OPTIONS: Array<{ value: SinceWindow; label: string }> = [
  { value: "1h", label: "Last 1h" },
  { value: "6h", label: "Last 6h" },
  { value: "24h", label: "Last 24h" },
  { value: "all", label: "Entire chat" },
];

export function CatchupWindowPicker({
  value,
  customHours,
  scope,
  messages,
  lastReadMessageId,
  onValueChange,
  onCustomHoursChange,
  onScopeChange,
  onLastReadChange,
  onAnalyze,
  loading,
  disabled,
  notice,
}: WindowPickerProps) {
  const readableMessages = messages.filter((message) => !message.isSystem);

  return (
    <section
      aria-labelledby="window-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-4">
        <h2 id="window-heading" className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          2. Choose what to catch up on
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Review a recent time range or focus on messages after the last one you read.
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Messages to summarize">
        <button
          type="button"
          aria-pressed={scope === "window"}
          onClick={() => onScopeChange("window")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${scope === "window" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300"}`}
        >
          Recent messages
        </button>
        <button
          type="button"
          aria-pressed={scope === "unread"}
          onClick={() => onScopeChange("unread")}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${scope === "unread" ? "bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-200" : "text-slate-600 hover:text-slate-900 dark:text-slate-300"}`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
          Unread messages
        </button>
      </div>

      {scope === "unread" ? (
        <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/80 p-3 dark:border-brand-900 dark:bg-brand-900/20">
          <label htmlFor="last-read-message" className="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-100">
            Last message you read
          </label>
          <select
            id="last-read-message"
            value={lastReadMessageId}
            onChange={(event) => onLastReadChange(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
          >
            <option value="">I havenâ€™t read any of these messages</option>
            {readableMessages.map((message) => (
              <option key={message.id} value={message.id}>
                {formatDateTime(message.timestamp)} Â· {message.sender}: {message.text.replace(/\s+/g, " ").slice(0, 90)}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            Chat exports donâ€™t include read receipts. Choose your last read message; CatchUp will summarize and rank everything after it. With no message selected, the whole import is treated as unread.
          </p>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Recent message window">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => onValueChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                value === option.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <button
              type="button"
              aria-pressed={value === "custom"}
              onClick={() => onValueChange("custom")}
              className={`rounded-full px-3 py-1.5 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                value === "custom"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              Custom
            </button>
            <span className="sr-only">Custom hours</span>
            <input
              type="number"
              min={1}
              max={720}
              value={customHours}
              onChange={(event) => onCustomHoursChange(Math.max(1, Number(event.target.value) || 1))}
              onFocus={() => onValueChange("custom")}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-brand-900"
              aria-label="Custom window in hours"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">hours</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`min-h-6 text-sm font-semibold ${notice ? "text-emerald-700 dark:text-emerald-300" : "text-transparent"}`}>
          {notice || "Ready to summarize"}
        </p>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={disabled || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
        >
          {loading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          )}
          {loading ? "Summarising..." : scope === "unread" ? "Summarize unread messages" : "Summarize recent messages"}
        </button>
      </div>
    </section>
  );
}
