import { useState } from "react";
import type { CatchupResult } from "../types";
import { EngineBadge } from "./Badges";

interface SummaryCardProps {
  result: CatchupResult;
  onExportMarkdown: () => void;
  onExportText: () => void;
  onCopy: () => void;
}

export function SummaryCard({ result, onExportMarkdown, onExportText, onCopy }: SummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const reviewItems = [...result.actions, ...result.decisions, ...result.announcements, ...result.mentions];
  const priorityCounts = {
    high: reviewItems.filter((item) => item.priority === "high").length,
    medium: reviewItems.filter((item) => item.priority === "medium").length,
    low: reviewItems.filter((item) => item.priority === "low").length,
  };

  const handleCopy = async () => {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section
      aria-labelledby="summary-heading"
      className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm dark:border-brand-900 dark:from-slate-900 dark:to-slate-900"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="summary-heading" className="mr-auto text-base font-bold text-slate-900 dark:text-slate-100">
          Summary
        </h2>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          {result.windowLabel} · {result.messageCount} msgs
        </span>
        <EngineBadge engine={result.engine} />
      </div>

      <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{result.tldr}</p>

      <div className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Important to review
        </h3>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Priority overview">
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900/70 dark:bg-rose-950/30">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">High</p>
            <p className="mt-1 text-2xl font-bold leading-none text-rose-800 dark:text-rose-200">{priorityCounts.high}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/70 dark:bg-amber-950/30">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Medium</p>
            <p className="mt-1 text-2xl font-bold leading-none text-amber-800 dark:text-amber-200">{priorityCounts.medium}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Low</p>
            <p className="mt-1 text-2xl font-bold leading-none text-slate-700 dark:text-slate-200">{priorityCounts.low}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Open the Priority tab to review the highest-urgency messages first.</p>
      </div>

      {result.topics.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Topic breakdown
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.topics.map((topic) => (
              <li
                key={topic.title}
                className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">{topic.title}</span>
                <span className="ml-1 text-xs text-slate-400">({topic.messageIds.length})</span>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{topic.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExportMarkdown}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Export Markdown
        </button>
        <button
          type="button"
          onClick={onExportText}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Export text
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {copied ? "Copied!" : "Copy summary"}
        </button>
      </div>
    </section>
  );
}
