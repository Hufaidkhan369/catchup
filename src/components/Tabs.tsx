export interface TabDef {
  id: string;
  label: string;
  count: number;
}

interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label="CatchUp sections"
      className="feature-tabs flex gap-1.5 overflow-x-auto rounded-2xl border border-emerald-100 bg-white/90 p-1.5 shadow-[0_8px_26px_rgba(12,80,46,.08)] backdrop-blur dark:border-emerald-950 dark:bg-slate-900/95"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              selected
                ? "bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-md shadow-emerald-900/15"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 dark:text-slate-300 dark:hover:bg-emerald-950/60"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 text-xs ${
                selected
                  ? "bg-white/25 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
