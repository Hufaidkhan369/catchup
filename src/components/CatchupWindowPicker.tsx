import type { SinceWindow } from "../types";

interface WindowPickerProps {
  value: SinceWindow;
  customHours: number;
  onValueChange: (value: SinceWindow) => void;
  onCustomHoursChange: (hours: number) => void;
  onAnalyze: () => void;
  loading: boolean;
  disabled: boolean;
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
  onValueChange,
  onCustomHoursChange,
  onAnalyze,
  loading,
  disabled,
}: WindowPickerProps) {
  return (
    <section
      aria-labelledby="window-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="window-heading" className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
        2. Catch-up window
      </h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        "Since I was last online" - only messages in this range are summarised.
      </p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Catch-up window">
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
            onChange={(e) => onCustomHoursChange(Math.max(1, Number(e.target.value) || 1))}
            onFocus={() => onValueChange("custom")}
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-brand-900"
            aria-label="Custom window in hours"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">hours</span>
        </label>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={disabled || loading}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
        >
          {loading && (
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}
          {loading ? "Analysing..." : "Analyse chat"}
        </button>
      </div>
    </section>
  );
}
