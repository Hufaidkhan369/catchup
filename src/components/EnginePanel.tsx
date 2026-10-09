import { useEffect, useRef } from "react";
import type { EngineInfo } from "../types";
import type { EngineProbe } from "../lib/aiEngine";

interface EnginePanelProps {
  probes: EngineProbe[];
  active: EngineInfo;
  webllmProgress: string | null;
  onEnableWebllm: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function EnginePanel({
  probes,
  active,
  webllmProgress,
  onEnableWebllm,
  onRefresh,
  onClose,
}: EnginePanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="engine-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="engine-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
            On-device AI engine
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

        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Active engine: <strong className="text-slate-800 dark:text-slate-200">{active.label}</strong>
          {active.neural ? " - a real neural model runs in your browser." : " - deterministic fallback, no model required."}
        </p>

        <ul className="space-y-2">
          {probes.map((probe) => (
            <li
              key={probe.info.name}
              className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-100">{probe.info.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    probe.available
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {probe.available ? "available" : "unavailable"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{probe.note}</p>
              {probe.info.name === "webllm" && !probe.available && (
                <button
                  type="button"
                  onClick={onEnableWebllm}
                  disabled={!!webllmProgress}
                  className="mt-2 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200"
                >
                  {webllmProgress ?? "Download & enable WebLLM (needs WebGPU)"}
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Re-detect engines
          </button>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Gen AI services used: Chrome Gemini Nano Prompt API (on-device) and WebLLM (open model
          weights running in-browser via WebGPU), with a rule-based fallback. No third-party API
          calls are made with your chat data.
        </p>
      </div>
    </div>
  );
}
