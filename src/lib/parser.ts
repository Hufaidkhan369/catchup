/**
 * Chat export parser.
 *
 * Normalises WhatsApp / Telegram `.txt` exports, Slack `.json` exports and
 * plain pasted text into a single `Message[]`. No network access.
 */

import type { ChatSource, Message } from "../types";

export interface ParseResult {
  messages: Message[];
  source: ChatSource;
  warnings: string[];
}

const SYSTEM_HINTS = [
  "messages and calls are end-to-end encrypted",
  "messages to this chat and calls are now secured",
  "created group",
  "added you",
  "changed the subject",
  "changed this group's icon",
  "changed the group description",
  "joined using this group's invite link",
  "left",
  "you were added",
  "this message was deleted",
  "this message was deleted.",
];

const MEDIA_HINTS = ["<media omitted>", "image omitted", "video omitted", "sticker omitted"];

/** `12/04/25, 10:18 PM - Alice: hello`  |  `[12.04.25 22:18] Alice: hello` */
const LINE_RE =
  /^\s*\[?\s*(\d{1,4}[/.]\d{1,2}[/.]\d{2,4})(?:[,\s]+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APap]\.?[Mm]\.?)?))?\s*\]?\s*[-–—]?\s*([^:]{1,60}?):\s?([\s\S]*)$/;

export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  const re = /@([\w.+-]{1,40})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return [...found];
}

function parseDateTime(datePart: string, timePart?: string, fallback = Date.now()): number {
  const dateMatch = datePart.match(/^(\d{1,4})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (!dateMatch) return fallback;
  let [, a, b, c] = dateMatch;
  let year: number;
  let month: number;
  let day: number;
  if (a.length === 4) {
    year = +a;
    month = +b;
    day = +c;
  } else {
    year = +c;
    if (year < 100) year += 2000;
    // Prefer day/month; flip when the first field cannot be a day.
    if (+a > 12 && +b <= 12) {
      day = +a;
      month = +b;
    } else if (+b > 12 && +a <= 12) {
      month = +a;
      day = +b;
    } else {
      day = +a;
      month = +b;
    }
  }

  let hour = 0;
  let minute = 0;
  let second = 0;
  if (timePart) {
    const t = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap]\.?[Mm]\.?)?/);
    if (t) {
      hour = +t[1];
      minute = +t[2];
      second = t[3] ? +t[3] : 0;
      const mer = t[4]?.toLowerCase().replace(/\./g, "");
      if (mer === "pm" && hour < 12) hour += 12;
      if (mer === "am" && hour === 12) hour = 0;
    }
  }

  const d = new Date(year, month - 1, day, hour, minute, second, 0);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.getTime();
}

function isSystemLine(sender: string, text: string): boolean {
  const haystack = `${sender} ${text}`.toLowerCase();
  return SYSTEM_HINTS.some((h) => haystack.includes(h));
}

function makeId(source: ChatSource, index: number): string {
  return `${source}-${index}`;
}

/** Parse a text export (WhatsApp / Telegram / pasted). */
export function parseTextChat(input: string, source: ChatSource = "pasted"): ParseResult {
  const warnings: string[] = [];
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const messages: Message[] = [];
  let last: Message | null = null;
  let matched = 0;

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const m = raw.match(LINE_RE);
    if (m) {
      const timestamp = parseDateTime(m[1], m[2]);
      const sender = m[3].trim();
      const text = m[4].trim();
      const isSystem = isSystemLine(sender, text) || MEDIA_HINTS.some((h) => text.toLowerCase().includes(h));
      const message: Message = {
        id: makeId(source, messages.length),
        sender,
        timestamp,
        text,
        source,
        isSystem,
        mentions: extractMentions(text),
      };
      messages.push(message);
      last = message;
      matched++;
    } else if (last) {
      // Continuation of the previous (multi-line) message.
      last.text += `\n${raw.trim()}`;
      last.mentions = extractMentions(last.text);
    } else if (raw.trim()) {
      warnings.push(`Skipped unparseable line: "${raw.slice(0, 60)}"`);
    }
  }

  if (matched === 0) {
    warnings.push(
      "No timestamped messages detected. Treating each non-empty line as a message from 'Me'.",
    );
    const loose = parseLooseLines(input, source);
    return { messages: loose.messages, source, warnings: [...warnings, ...loose.warnings] };
  }

  messages.sort((a, b) => a.timestamp - b.timestamp);
  messages.forEach((msg, i) => (msg.id = makeId(source, i)));
  return { messages, source, warnings };
}

/** Last-resort: each non-empty line becomes a message from "Me". */
function parseLooseLines(input: string, source: ChatSource): ParseResult {
  const messages: Message[] = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim())
    .map((line, i) => ({
      id: makeId(source, i),
      sender: "Me",
      timestamp: Date.now() + i,
      text: line.trim(),
      source,
      isSystem: false,
      mentions: extractMentions(line),
    }));
  return { messages, source, warnings: [] };
}

interface SlackMessage {
  type?: string;
  subtype?: string;
  user?: string;
  username?: string;
  text?: string;
  ts?: string;
  user_profile?: { real_name?: string; display_name?: string };
}

/** Parse a Slack JSON export (array of message objects) or generic message JSON. */
export function parseJsonChat(input: string, source: ChatSource = "slack"): ParseResult {
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch {
    return {
      messages: [],
      source,
      warnings: ["Invalid JSON - could not parse file."],
    };
  }

  const arr: SlackMessage[] = Array.isArray(data)
    ? (data as SlackMessage[])
    : Array.isArray((data as { messages?: SlackMessage[] })?.messages)
      ? (data as { messages: SlackMessage[] }).messages
      : [];

  const messages: Message[] = [];
  arr.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    if (entry.type && entry.type !== "message") return;
    const text = entry.text;
    if (!text) return;
    const sender =
      entry.username ||
      entry.user_profile?.real_name ||
      entry.user_profile?.display_name ||
      entry.user ||
      "Unknown";
    const tsNum = entry.ts ? Number(entry.ts) * 1000 : Date.now() + index;
    messages.push({
      id: makeId(source, messages.length),
      sender: sender.replace(/[<>@]/g, ""),
      timestamp: Number.isFinite(tsNum) ? tsNum : Date.now() + index,
      text,
      source,
      isSystem: entry.subtype === "channel_join" || entry.subtype === "channel_leave",
      mentions: extractMentions(text),
    });
  });

  if (messages.length === 0) {
    warnings.push("JSON did not contain any recognisable messages.");
  }
  messages.sort((a, b) => a.timestamp - b.timestamp);
  messages.forEach((msg, i) => (msg.id = makeId(source, i)));
  return { messages, source, warnings };
}

/**
 * Detect the format and dispatch.
 *
 * Anything that actually parses as JSON (a Slack/message array or
 * `{ messages: [...] }`) is treated as JSON. Otherwise it is text, which
 * covers WhatsApp and Telegram exports (including `[...]` time prefixes).
 */
export function parseChat(input: string, source?: ChatSource): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { messages: [], source: source ?? "pasted", warnings: ["Nothing to parse."] };
  }

  let isJson = false;
  try {
    const data: unknown = JSON.parse(trimmed);
    isJson =
      Array.isArray(data) ||
      (data !== null &&
        typeof data === "object" &&
        Array.isArray((data as { messages?: unknown[] }).messages));
  } catch {
    isJson = false;
  }
  if (isJson) {
    return parseJsonChat(trimmed, source ?? "slack");
  }

  let detected: ChatSource = source ?? "pasted";
  if (!source) {
    if (/\[\d{1,2}\.\d{1,2}\.\d{2,4}\s+\d{1,2}:\d{2}\]/.test(trimmed)) {
      detected = "telegram";
    } else if (/\[\d{1,2}\/\d{1,2}\/\d{2,4},/.test(trimmed)) {
      detected = "whatsapp";
    }
  }
  return parseTextChat(trimmed, detected);
}
