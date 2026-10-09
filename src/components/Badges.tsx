import { useState } from "react";
import type { CatchupItem, EngineInfo, Priority } from "../types";

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200 ring-red-200 dark:ring-red-800",
  medium:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 ring-amber-200 dark:ring-amber-800",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200 ring-emerald-200 dark:ring-emerald-800",
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

/** High / Medium / Low chip with an accessible, explainable "Why?" popover. */
export function PriorityBadge({ item }: { item: CatchupItem }) {
  const [open, setOpen] = useState(false);
  const id = `why-${item.id}`;
  return (
    <span className="relative inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${PRIORITY_STYLES[item.priority]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[item.priority]}`} aria-hidden="true" />
        {item.priority}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        Why?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-64 animate-fade-in rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal normal-case text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <span className="mb-1 block font-semibold text-slate-900 dark:text-slate-100">
            Why {item.priority}? (score {item.score})
          </span>
          <ul className="space-y-0.5">
            {item.reasons.map((reason, index) => (
              <li key={index} className="flex justify-between gap-2">
                <span>{reason.label}</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  +{reason.weight}
                </span>
              </li>
            ))}
          </ul>
        </span>
      )}
    </span>
  );
}

export function EngineBadge({ engine }: { engine: EngineInfo }) {
  const neural = engine.neural;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        neural
          ? "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-violet-800"
          : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
      }`}
      title={engine.detail}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${neural ? "bg-violet-500" : "bg-slate-400"}`}
        aria-hidden="true"
      />
      Engine: {engine.label}
    </span>
  );
}

export function PrivacyBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-800"
      title="All processing happens in your browser. No conversations, data or summaries leave this device."
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1a4 4 0 00-4 4v2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 6V5a2 2 0 10-4 0v2h4z"
          clipRule="evenodd"
        />
      </svg>
      100% on-device
    </span>
  );
}

export function OfflineDot({ online }: { online: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      title={online ? "Browser reports online. Gugli AI still works fully offline." : "Offline - Gugli AI works fully offline."}
    >
      <span
        className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`}
        aria-hidden="true"
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
