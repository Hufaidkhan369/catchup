/**
 * Decision update resolution.
 *
 * When the chat revises something ("Meeting moved Mon -> Wed", "deadline
 * extended"), we show only the newest version and keep the earlier wording as
 * history, instead of listing contradictory items.
 */

import type { CatchupItem, Message } from "../types";
import { isUpdateText } from "./extract";
import { compareByPriority } from "./priority";

const TOPIC_RULES: Array<{ key: string; re: RegExp }> = [
  { key: "meeting", re: /\b(meeting|rehearsal|call|sync|meet)\b/i },
  { key: "venue", re: /\b(venue|location|hall|library|room|seminar)\b/i },
  { key: "deadline", re: /\b(deadline|due|submission|submit|extended|extension)\b/i },
  { key: "database", re: /\b(backend|database|postgres|firebase|db)\b/i },
  { key: "topic", re: /\b(topic|project|theme|idea)\b/i },
  { key: "presentation", re: /\b(presentation|deck|slides|review)\b/i },
];

export function topicKey(title: string): string {
  for (const rule of TOPIC_RULES) {
    if (rule.re.test(title)) return rule.key;
  }
  const word = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .find((w) => w.length > 3);
  return word ?? "general";
}

function timestampOf(item: CatchupItem, messages: Map<string, Message>): number {
  return messages.get(item.messageId)?.timestamp ?? 0;
}

/**
 * Collapse a list of decision items into the latest version per topic, with
 * superseded wording preserved in `history`.
 */
export function resolveDecisionUpdates(
  decisions: CatchupItem[],
  messages: Message[],
): CatchupItem[] {
  const byId = new Map(messages.map((m) => [m.id, m]));
  const sorted = [...decisions].sort(
    (a, b) => timestampOf(a, byId) - timestampOf(b, byId),
  );

  const groups = new Map<string, CatchupItem[]>();
  for (const decision of sorted) {
    const key = topicKey(decision.title);
    const list = groups.get(key) ?? [];
    list.push(decision);
    groups.set(key, list);
  }

  const resolved: CatchupItem[] = [];
  for (const group of groups.values()) {
    const hasUpdate = group.slice(1).some((item) => isUpdateText(item.title));
    if (group.length > 1 && hasUpdate) {
      const latest = group[group.length - 1];
      const history = group
        .slice(0, -1)
        .map((item) => item.title)
        .reverse();
      resolved.push({
        ...latest,
        latest: true,
        previousTitle: history[0],
        history,
      });
    } else {
      group.forEach((item) => resolved.push({ ...item, latest: true }));
    }
  }

  resolved.sort(compareByPriority);
  return resolved;
}
