export interface TabDef {
  id: string;
  label: string;
  count: number;
  icon?: string;
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
      className="feature-tabs"
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
            className={`feature-tab ${selected ? "is-selected" : ""}`}
          >
            <span className="feature-tab-icon" aria-hidden="true">{tab.icon ?? "•"}</span>
            <span>{tab.label}</span>
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
