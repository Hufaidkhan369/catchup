/**
 * Summarisation.
 *
 * Long chats are chunked (map) and the partial summaries reduced into a final
 * TL;DR. When a real on-device model is active it produces the TL;DR; the
 * topic breakdown is always computed deterministically from the messages so
 * it stays accurate even without a model.
 */

import type { CatchupItem, EngineInfo, Message, Topic, UserProfile } from "../types";
import type { AiEngine } from "./aiEngine";
import { compareByPriority } from "./priority";
import { maskSensitive } from "./privacy";
import { formatClock } from "./time";

export interface SummaryOutput {
  tldr: string;
  topics: Topic[];
  engine: EngineInfo;
}

const CHUNK_CHARS = 3500;

export function buildTranscript(messages: Message[]): string {
  return messages
    .filter((m) => !m.isSystem)
    .map((m) => `${formatClock(m.timestamp)} ${m.sender}: ${maskSensitive(m.text)}`)
    .join("\n");
}

export function chunkMessages(messages: Message[], maxChars = CHUNK_CHARS): Message[][] {
  const chunks: Message[][] = [];
  let current: Message[] = [];
  let size = 0;
  for (const message of messages) {
    const len = message.text.length + message.sender.length + 12;
    if (size + len > maxChars && current.length > 0) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(message);
    size += len;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

const SYSTEM_PROMPT =
  "You are CatchUp, a concise assistant helping a busy person understand what they missed in a group chat. " +
  "Use ONLY the provided messages. Never invent facts, names, dates or numbers. " +
  "If something is unclear, say so. Keep answers short.";

/**
 * Produce the final summary. Uses the model for the TL;DR when
 * `engine.info.neural` is true, otherwise a deterministic extractive summary.
 */
export async function summarizeChat(
  messages: Message[],
  profile: UserProfile,
  engine: AiEngine,
  items: CatchupItem[],
  now: number = Date.now(),
): Promise<SummaryOutput> {
  const topics = topicBreakdown(messages, items, now);

  if (!engine.info.neural) {
    return { tldr: extractiveTldr(messages, items, profile, now), topics, engine: engine.info };
  }

  try {
    const tldr = await neuralTldr(messages, profile, engine);
    if (!tldr) throw new Error("empty model response");
    return { tldr: maskSensitive(tldr), topics, engine: engine.info };
  } catch {
    return {
      tldr: extractiveTldr(messages, items, profile, now),
      topics,
      engine: {
        name: "rule-based",
        label: "Rule-based (on-device)",
        neural: false,
        detail: "Model call failed at runtime - used deterministic fallback.",
      },
    };
  }
}

async function neuralTldr(
  messages: Message[],
  profile: UserProfile,
  engine: AiEngine,
): Promise<string> {
  const chunks = chunkMessages(messages);
  const who = profile.name ? `The reader is "${profile.name}".` : "";

  let context: string;
  if (chunks.length <= 1) {
    context = buildTranscript(messages);
  } else {
    const partials: string[] = [];
    for (const chunk of chunks) {
      const partial = await engine.generate(
        `${who} Summarise the key decisions, deadlines, requests and any @mentions of the reader in this excerpt as 2-4 short bullets.\n\n${buildTranscript(chunk)}`,
        SYSTEM_PROMPT,
      );
      partials.push(partial);
    }
    context = partials.join("\n---\n");
  }

  const tldr = await engine.generate(
    `${who} Write a TL;DR of at most 3 sentences (under 70 words) for what the reader missed. ` +
      `Focus on the most urgent deadlines, the reader's action items and any decisions that changed.\n\n${context}`,
    SYSTEM_PROMPT,
  );
  return tldr.trim();
}

function extractiveTldr(
  messages: Message[],
  items: CatchupItem[],
  profile: UserProfile,
  now: number,
): string {
  void now;
  const lint = messages.filter((m) => !m.isSystem).length;
  const notable = [...items]
    .sort(compareByPriority)
    .slice(0, 3)
    .map((item) => trimSentence(item.title));

  const mentions = items.filter((i) => i.type === "mention" || i.type === "question").length;
  const parts: string[] = [];
  parts.push(`${lint} message${lint === 1 ? "" : "s"} analysed${profile.name ? ` for ${profile.name}` : ""}.`);
  if (mentions) parts.push(`${mentions} mention${mentions === 1 ? "" : "s"} or question directed at you.`);
  if (notable.length) parts.push(`Key points: ${notable.join("; ")}.`);
  if (parts.length === 1) parts.push("No decisions, deadlines or requests were detected in this window.");
  return maskSensitive(parts.join(" "));
}

function trimSentence(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 110 ? `${clean.slice(0, 107)}...` : clean;
}

// ---- Topic breakdown ----------------------------------------------------

interface TopicDef {
  title: string;
  re: RegExp;
}

const TOPIC_DEFS: TopicDef[] = [
  {
    title: "Deadlines & submissions",
    re: /\b(deadline|due|submission|submit|report|extend(?:ed|sion)?|synopsis)\b/i,
  },
  {
    title: "Meetings & schedule",
    re: /\b(meeting|rehearsal|call|schedule|venue|hall|library|calendar|3pm|5pm|monday|wednesday)\b/i,
  },
  {
    title: "Build & technical work",
    re: /\b(model|dataset|accuracy|backend|database|postgres|api|ui|design|frontend|code|train(?:ing|ed)?|colab)\b/i,
  },
  {
    title: "Team & admin",
    re: /\b(contribution|sheet|attendance|print|copies|prof|email|review|deck|slides)\b/i,
  },
];

export function topicBreakdown(
  messages: Message[],
  items: CatchupItem[],
  now: number,
): Topic[] {
  void now;
  const topics: Topic[] = [];
  const itemById = new Map<string, CatchupItem[]>();
  for (const item of items) {
    const list = itemById.get(item.messageId) ?? [];
    list.push(item);
    itemById.set(item.messageId, list);
  }

  for (const def of TOPIC_DEFS) {
    const matched = messages.filter((m) => !m.isSystem && def.re.test(m.text));
    if (matched.length < 2) continue;
    const matchedIds = new Set(matched.map((m) => m.id));
    const keyPoints = items
      .filter((i) => matchedIds.has(i.messageId))
      .sort(compareByPriority)
      .slice(0, 2)
      .map((i) => trimSentence(i.title));

    const summary =
      keyPoints.length > 0
        ? keyPoints.join(" · ")
        : `${matched.length} messages on this topic.`;
    topics.push({
      title: def.title,
      summary: maskSensitive(summary),
      messageIds: [...matchedIds],
    });
  }

  topics.sort((a, b) => b.messageIds.length - a.messageIds.length);
  return topics.slice(0, 4);
}
