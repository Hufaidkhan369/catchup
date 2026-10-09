import { useRef, useState } from "react";

interface ImportPanelProps {
  onParse: (text: string) => void;
  onDemo: () => void;
  messageCount: number;
  warnings: string[];
}

export function ImportPanel({ onParse, onDemo, messageCount, warnings }: ImportPanelProps) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    setFileName(file.name);
    onParse(content);
  };

  return (
    <section
      aria-labelledby="import-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="import-heading" className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
        1. Import a chat
      </h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        Paste text, upload a WhatsApp/Telegram <code>.txt</code> or Slack <code>.json</code> export,
        or try a real, public Ubuntu support-chat sample. Everything stays in your browser.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        aria-label="Paste chat text"
        placeholder={"12/12/24, 10:18 PM - Priya: are we still meeting tomorrow?"}
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onParse(text)}
          disabled={!text.trim()}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Parse pasted text
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Upload file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.json,text/plain,application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={onDemo}
          className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
        >
          Load real chat sample
        </button>
        {messageCount > 0 && (
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400" role="status">
            {messageCount} messages loaded{fileName ? ` from ${fileName}` : ""}
          </span>
        )}
      </div>

      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Sample: Ubuntu Chat Logs, conversation 43.15, attributed to Axel Bax / ConvoKit. Speaker handles are anonymized and timestamps shifted. CC BY 4.0. {" "}
        <a className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-100" href="https://convokit.cornell.edu/documentation/chatlogs.html" target="_blank" rel="noreferrer">Source &amp; license</a>
      </p>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-300" role="status">
          {warnings.map((warning, index) => (
            <li key={index}>Note: {warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
