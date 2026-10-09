import type { EngineInfo } from "../types";
import { EngineBadge, OfflineDot, PrivacyBadge } from "./Badges";

interface HeaderProps {
  engine: EngineInfo;
  online: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onClearData: () => void;
  onOpenEngine: () => void;
}

export function Header({
  engine,
  online,
  theme,
  onToggleTheme,
  onClearData,
  onOpenEngine,
}: HeaderProps) {
  return (
    <header className="whatsapp-header sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="mr-auto flex items-center gap-2">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-[.9rem] bg-gradient-to-br from-emerald-400 to-brand-700 text-lg font-bold text-white shadow-[0_5px_14px_rgba(18,140,75,.3)] ring-1 ring-white/30"
          >
            C
          </span>
          <div className="leading-tight">
            <h1 className="text-[15px] font-bold tracking-tight">Gugli AI</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Your chats, in focus</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PrivacyBadge />
          <OfflineDot online={online} />
          <button
            type="button"
            onClick={onOpenEngine}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Show AI engine details"
          >
            <EngineBadge engine={engine} />
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.95 2.05a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM18 9a1 1 0 110 2h-1a1 1 0 110-2h1zM5.464 4.464a1 1 0 00-1.414 1.414l.707.707A1 1 0 006.17 5.17l-.707-.707zM10 6a4 4 0 100 8 4 4 0 000-8zm-5 4a1 1 0 11-2 0 1 1 0 012 0zm10.536 5.536a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.536-1.464a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 108.586 10.586z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onClearData}
            className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Clear all data
          </button>
        </div>
      </div>
    </header>
  );
}
