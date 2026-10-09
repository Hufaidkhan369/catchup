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
