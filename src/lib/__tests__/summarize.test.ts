import { describe, expect, it } from "vitest";
import type { Message, UserProfile } from "../../types";
import { ruleBasedEngine } from "../aiEngine";
import {
  buildTranscript,
  chunkMessages,
  summarizeChat,
  topicBreakdown,
} from "../summarize";

const NOW = Date.now();
const PROFILE: UserProfile = { name: "Aarav", handle: "aarav", tasks: [] };

const MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "Priya",
    timestamp: NOW - 2 * 3600_000,
    text: "deadline for the report is tomorrow 5pm, @Aarav please submit",
    source: "demo",
    isSystem: false,
    mentions: ["aarav"],
  },
  {
    id: "m2",
    sender: "Rohan",
    timestamp: NOW - 3 * 3600_000,
    text: "DECISION: Meeting moved from Monday to Wednesday",
    source: "demo",
    isSystem: false,
    mentions: [],
  },
  {
    id: "m3",
    sender: "Sneha",
    timestamp: NOW - 4 * 3600_000,
    text: "I'll print the report copies tomorrow morning",
    source: "demo",
    isSystem: false,
    mentions: [],
  },
];

const EMPTY: Message[] = [];

function buildItemList(messages: Message[], type: string) {
  return messages
    .filter((m) => !m.isSystem)
    .map((m, index) => ({
      id: `${m.id}-${type}-${index}`,
      type: type as never,
      title: m.text,
      detail: m.text,
      priority: "medium" as const,
      score: 40,
      reasons: [],
      messageId: m.id,
    }));
}

describe("summarize", () => {
  it("builds a readable transcript with redaction", () => {
    const transcript = buildTranscript(MESSAGES);
    expect(transcript).toContain("Priya:");
    expect(buildTranscript(EMPTY)).toBe("");
  });

  it("chunks long transcripts", () => {
    const many = Array.from({ length: 50 }, (_, index) => ({
      id: String(index),
      sender: "A",
      timestamp: NOW + index,
      text: "x".repeat(300),
      source: "demo" as const,
      isSystem: false,
      mentions: [],
    }));
    expect(chunkMessages(many, 800).length).toBeGreaterThan(1);
  });

  it("builds topics from the messages themselves", () => {
    const topics = topicBreakdown(MESSAGES, buildItemList(MESSAGES, "announcement"), NOW);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.some((t) => t.messageIds.includes("m1"))).toBe(true);
  });

  it("produces a deterministic summary without a model", async () => {
    const engine = ruleBasedEngine();
    const outcome = await summarizeChat(
      MESSAGES,
      PROFILE,
      engine,
      [...buildItemList(MESSAGES, "action"), ...buildItemList(MESSAGES, "decision")],
      NOW,
    );
    expect(outcome.engine.neural).toBe(false);
    expect(outcome.tldr).toContain("messages analysed");
    expect(outcome.topics.length).toBeGreaterThan(0);
  });
});