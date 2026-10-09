import type { ItemType, Priority } from "../types";

export interface Filters {
  priority: Priority | "all";
  type: ItemType | "all";
  sender: string;
  search: string;
}

export const DEFAULT_FILTERS: Filters = {
  priority: "all",
  type: "all",
  sender: "all",
  search: "",
};

interface FilterBarProps {
  filters: Filters;
  senders: string[];
  onChange: (filters: Filters) => void;
  showTypeFilter: boolean;
  resultCount: number;
}

const PRIORITY_OPTIONS: Array<Priority | "all"> = ["all", "high", "medium", "low"];
const TYPE_OPTIONS: Array<ItemType | "all"> = [
  "all",
  "action",
  "decision",
  "announcement",
  "mention",
  "question",
];

export function FilterBar({ filters, senders, onChange, showTypeFilter, resultCount }: FilterBarProps) {
  const control =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="filter-search">
        Search items
      </label>
      <input
        id="filter-search"
        type="search"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search items..."
        className={`${control} min-w-[10rem] flex-1`}
      />

      <label className="sr-only" htmlFor="filter-priority">
        Filter by priority
      </label>
      <select
        id="filter-priority"
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value as Filters["priority"] })}
        className={control}
      >
        {PRIORITY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All priorities" : option[0].toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>

      {showTypeFilter && (
        <>
          <label className="sr-only" htmlFor="filter-type">
            Filter by type
          </label>
          <select
            id="filter-type"
            value={filters.type}
            onChange={(e) => onChange({ ...filters, type: e.target.value as Filters["type"] })}
            className={control}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All types" : option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="sr-only" htmlFor="filter-sender">
        Filter by sender
      </label>
      <select
        id="filter-sender"
        value={filters.sender}
        onChange={(e) => onChange({ ...filters, sender: e.target.value })}
        className={control}
      >
        <option value="all">All senders</option>
        {senders.map((sender) => (
          <option key={sender} value={sender}>
            {sender}
          </option>
        ))}
      </select>

      <span className="ml-auto text-xs text-slate-500 dark:text-slate-400" role="status">
        {resultCount} item{resultCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
