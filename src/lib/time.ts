/**
 * Time parsing / formatting helpers.
 *
 * The deadline parser is intentionally transparent (pure functions, no
 * external deps) so it can be unit-tested and audited. It powers both the
 * rule-based fallback and the urgency score.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const WEEKDAY_ALIASES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  tues: 2,
  wed: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  fri: 5,
  sat: 6,
};

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatDateTime(ts: number): string {
  return `${formatDay(ts)}, ${formatClock(ts)}`;
}

/** "2h ago" / "in 15m" / "just now". */
export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = ts - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return "just now";
  const future = diff > 0;
  const value = formatDuration(abs);
  return future ? `in ${value}` : `${value} ago`;
}

export function formatDuration(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MINUTE))}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  return `${Math.round(ms / DAY)}d`;
}

export function formatDeadline(ts: number, now: number = Date.now()): string {
  const dayDiff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  const clock = formatClock(ts);
  if (dayDiff === 0) return `today ${clock}`;
  if (dayDiff === 1) return `tomorrow ${clock}`;
  if (dayDiff === -1) return `yesterday ${clock}`;
  if (dayDiff > 1 && dayDiff < 7) return `${formatDay(ts)} ${clock}`;
  if (dayDiff < 0) return `${formatDay(ts)} (overdue)`;
  return `${formatDay(ts)} ${clock}`;
}

/** Include a time within a day if the text mentions one. */
function timeOfDay(text: string): { hour: number; minute: number } | null {
  const m = text.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?m\.?|p\.?m\.?)?\b/i,
  );
  if (!m) return null;
  // Require a colon or an am/pm suffix so "10" in "2026-10-04" is not a time.
  if (!m[2] && !m[3]) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3]?.toLowerCase().replace(/\./g, "");
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function atTime(dayTs: number, time: { hour: number; minute: number }): number {
  const d = new Date(dayTs);
  d.setHours(time.hour, time.minute, 0, 0);
  return d.getTime();
}

/**
 * Best-effort deadline extraction from a single message.
 * Returns epoch ms or undefined. `now` is injectable for tests.
 */
export function parseDeadline(
  text: string,
  now: number = Date.now(),
): number | undefined {
  const lower = text.toLowerCase();
  const time = timeOfDay(lower);
  const today = startOfDay(now);

  // ISO date 2025-04-01
  let m = lower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) {
    const t = time ?? { hour: 18, minute: 0 };
    return atTime(
      new Date(+m[1], +m[2] - 1, +m[3]).getTime(),
      t,
    );
  }

  // Slash/dot date: assume day/month(/year). 12/04, 12-04-25
  m = lower.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
  if (m) {
    const day = +m[1];
    const month = +m[2];
    let year = m[3] ? +m[3] : new Date(now).getFullYear();
    if (year < 100) year += 2000;
    if (day <= 31 && month <= 12) {
      const t = time ?? { hour: 18, minute: 0 };
      const ts = atTime(new Date(year, month - 1, day).getTime(), t);
      // Roll to next year if the date already passed by more than a day.
      if (ts < now - DAY && !m[3]) {
        return atTime(new Date(year + 1, month - 1, day).getTime(), t);
      }
      return ts;
    }
  }

  // "in 3 hours" / "in 45 mins" / "in 2 days"
  m = lower.match(/\bin\s+(\d+)\s*(min|mins|minutes|hour|hours|hrs|day|days)\b/);
  if (m) {
    const n = +m[1];
    const unit = m[2];
    if (unit.startsWith("min")) return now + n * MINUTE;
    if (unit.startsWith("hour") || unit === "hrs") return now + n * HOUR;
    return now + n * DAY;
  }

  // Explicit weekdays, optionally "next".
  for (const day of WEEKDAYS) {
    const re = new RegExp(`\\b(next\\s+)?${day}\\b`);
    if (re.test(lower)) {
      const target = WEEKDAYS.indexOf(day);
      return nextWeekday(today, target, !!/\bnext\b/.test(lower), time);
    }
  }
  const aliasMatch = lower.match(
    /\b(next\s+)?(sun|mon|tues?|wed|thur?s?|fri|sat)\b/,
  );
  if (aliasMatch) {
    const target = WEEKDAY_ALIASES[aliasMatch[2]];
    return nextWeekday(today, target, !!aliasMatch[1], time);
  }

  // Relative days.
  if (/\bday after tomorrow\b/.test(lower)) {
    return atTime(today + 2 * DAY, time ?? { hour: 18, minute: 0 });
  }
  if (/\btomorrow\b/.test(lower)) {
    return atTime(today + DAY, time ?? { hour: 18, minute: 0 });
  }
  if (/\btonight\b/.test(lower)) {
    return atTime(today, time ?? { hour: 20, minute: 0 });
  }
  if (/\b(today|eod|end of day|by tonight)\b/.test(lower)) {
    const fallback = time ?? { hour: 18, minute: 0 };
    const ts = atTime(today, fallback);
    return ts;
  }
  if (/\bnext week\b/.test(lower)) {
    return nextWeekday(today, 1, true, time);
  }
  if (/\bthis week\b/.test(lower)) {
    return nextWeekday(today, 0, false, time);
  }

  // Bare "by 5pm" / "at 6:30pm" with no date -> today, or tomorrow if past.
  if (time && /\b(by|at|before|until|till)\b/.test(lower)) {
    let ts = atTime(today, time);
    if (ts < now) ts += DAY;
    return ts;
  }

  return undefined;
}

function nextWeekday(
  todayTs: number,
  target: number,
  forceNext: boolean,
  time: { hour: number; minute: number } | null,
): number {
  const current = new Date(todayTs).getDay();
  let delta = (target - current + 7) % 7;
  if (delta === 0) delta = forceNext ? 7 : 0;
  if (forceNext && delta < 7 && (target - current + 7) % 7 !== 0) {
    // "next Monday" means the Monday of next week; keep the computed delta.
  }
  return atTime(todayTs + delta * DAY, time ?? { hour: 18, minute: 0 });
}

/** Human label for the active catch-up window. */
export function windowStart(
  window: "1h" | "6h" | "24h" | "custom" | "all",
  now: number = Date.now(),
  customHours = 24,
): number {
  switch (window) {
    case "1h":
      return now - HOUR;
    case "6h":
      return now - 6 * HOUR;
    case "24h":
      return now - DAY;
    case "custom":
      return now - Math.max(1, customHours) * HOUR;
    case "all":
      return 0;
  }
}

export function windowLabel(
  window: "1h" | "6h" | "24h" | "custom" | "all",
  customHours = 24,
): string {
  switch (window) {
    case "1h":
      return "Last 1 hour";
    case "6h":
      return "Last 6 hours";
    case "24h":
      return "Last 24 hours";
    case "custom":
      return `Last ${customHours} hours`;
    case "all":
      return "Entire chat";
  }
}
