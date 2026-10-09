import { describe, expect, it } from "vitest";
import type { CatchupItem, Message } from "../../types";
import { resolveDecisionUpdates, topicKey } from "../decisionUpdates";
import { DAY } from "../time";

const NOW = Date.now();

function decision(title: string, msgId: string): CatchupItem {
  return {
    id: `d-${msgId}`,
    type: "decision",
    title,
    priority: "high",
    score: 90,
    reasons: [],
    messageId: msgId,
  };
}

function msg(id: string, dayOffset: number): Message {
  return {
    id,
    sender: "Rohan",
    timestamp: NOW - dayOffset * DAY,
    text: id,
    source: "whatsapp",
    isSystem: false,
    mentions: [],
  };
}

describe("resolveDecisionUpdates", () => {
  it("shows only the latest version of a changed decision", () => {
    const messages = [msg("m1", 3), msg("m2", 2), msg("m3", 1)];
    const decisions = [
      decision("DECISION: Planning meeting Monday 3pm in the library", "m1"),
      decision("DECISION UPDATE: Meeting moved from Monday 3pm to Wednesday 3pm, same library", "m2"),
      decision("DECISION UPDATE: Meeting venue changed from library to seminar hall, Wednesday 3pm", "m3"),
    ];
    const resolved = resolveDecisionUpdates(decisions, messages);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].latest).toBe(true);
    expect(resolved[0].history).toHaveLength(2);
    expect(resolved[0].history?.[0]).toContain("moved");
    expect(resolved[0].history?.[1]).toContain("Monday");
  });

  it("keeps unrelated decisions untouched", () => {
    const messages = [msg("m1", 2), msg("m2", 1)];
    const decisions = [
      decision("DECISION: Backend DB is PostgreSQL", "m1"),
      decision("DECISION UPDATE: Report deadline extended", "m2"),
    ];
    const resolved = resolveDecisionUpdates(decisions, messages);
    expect(resolved).toHaveLength(2);
    expect(resolved.some((d) => d.title.includes("Backend"))).toBe(true);
    expect(resolved.some((d) => d.title.includes("deadline"))).toBe(true);
  });
});

describe("topicKey", () => {
  it("groups meetings and venues together", () => {
    expect(topicKey("Meeting moved to Wednesday 3pm")).toBe("meeting");
    expect(topicKey("Meeting venue changed to the seminar hall")).toBe("meeting");
  });
});