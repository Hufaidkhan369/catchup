import type { UserProfile } from "../types";

interface ProfilePanelProps {
  profile: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfilePanel({ profile, onChange }: ProfilePanelProps) {
  return (
    <section
      aria-labelledby="profile-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="profile-heading" className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Your profile
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Display name</span>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
            placeholder="e.g. Aarav"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">@handle (optional)</span>
          <input
            type="text"
            value={profile.handle}
            onChange={(e) => onChange({ ...profile, handle: e.target.value })}
            placeholder="e.g. aarav"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
            Your current tasks (comma separated)
          </span>
          <input
            type="text"
            value={profile.tasks.join(", ")}
            onChange={(e) =>
              onChange({
                ...profile,
                tasks: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="e.g. ML model, slides, demo video"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900"
          />
          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
            Items matching these get a relevance boost.
          </span>
        </label>
      </div>
    </section>
  );
}
