/**
 * Summary export helpers (Markdown / plain text).
 * All output is run through the redaction layer first.
 */

import type { CatchupItem, CatchupResult, UserProfile } from "../types";
import { maskSensitive } from "./privacy";
import { formatDateTime } from "./time";

function lineFor(item: CatchupItem, now: number): string {
  void now;
  const bits: string[] = [];
  if (item.owner) bits.push(`owner: ${item.owner}`);
  if (item.deadline) bits.push(`due: ${formatDateTime(item.deadline)}`);
  if (item.previousTitle) bits.push(`changed from: ${maskSensitive(item.previousTitle)}`);
  const meta = bits.length ? ` _(${bits.join(", ")})_` : "";
  const done = item.done ? " [done]" : "";
  return `- [${item.priority.toUpperCase()}]${done} ${maskSensitive(item.title)}${meta}`;
}

function section(title: string, items: CatchupItem[], now: number): string {
  if (items.length === 0) return `## ${title}\n\n_None detected._\n`;
  return `## ${title}\n\n${items.map((i) => lineFor(i, now)).join("\n")}\n`;
}

export function toMarkdown(
  result: CatchupResult,
  profile: UserProfile,
  now: number = Date.now(),
): string {
  return [
    `# Gugli AI summary${profile.name ? ` for ${profile.name}` : ""}`,
    "",
    `_${result.windowLabel} · ${result.messageCount} messages · engine: ${result.engine.label} · generated ${formatDateTime(result.generatedAt)}_`,
    "",
    "## TL;DR",
    "",
    maskSensitive(result.tldr),
    "",
    "## Topics",
    "",
    result.topics.length
      ? result.topics
          .map((topic) => `- **${topic.title}** - ${maskSensitive(topic.summary)}`)
          .join("\n")
      : "_No clear topics._",
    "",
    section("Decisions", result.decisions, now),
    section("Action items", result.actions, now),
    section("Announcements", result.announcements, now),
    section("Mentions & questions for you", result.mentions, now),
    "",
    "---",
    "_Generated locally by Gugli AI. No data left this device._",
  ].join("\n");
}

export function toPlainText(
  result: CatchupResult,
  profile: UserProfile,
  now: number = Date.now(),
): string {
  const out: string[] = [];
  out.push(`Gugli AI summary${profile.name ? ` for ${profile.name}` : ""}`);
  out.push(`${result.windowLabel} - ${result.messageCount} messages - engine: ${result.engine.label}`);
  out.push("");
  out.push("TL;DR");
  out.push(maskSensitive(result.tldr));
  out.push("");
  if (result.topics.length) {
    out.push("Topics");
    result.topics.forEach((t) => out.push(`- ${t.title}: ${maskSensitive(t.summary)}`));
    out.push("");
  }
  const pushItems = (title: string, items: CatchupItem[]) => {
    out.push(title);
    if (!items.length) out.push("- none");
    else items.forEach((i) => out.push(lineFor(i, now).replace(/\*\*/g, "")));
    out.push("");
  };
  pushItems("Decisions", result.decisions);
  pushItems("Action items", result.actions);
  pushItems("Announcements", result.announcements);
  pushItems("Mentions & questions", result.mentions);
  out.push("Generated locally by Gugli AI. No data left this device.");
  return out.join("\n");
}

/** Trigger a client-side download of a text file. */
export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
