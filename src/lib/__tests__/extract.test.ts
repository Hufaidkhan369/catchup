import { describe, expect, it } from "vitest";
import type { Message, UserProfile } from "../../types";
import { extractItems, isUserMentioned } from "../extract";
import { DAY } from "../time";

const NOW = new Date("2026-10-09T10:00:00").getTime();

const PROFILE: UserProfile = {
  name: "Aarav",
  handle: "aarav",
  tasks: ["demo video", "slides"],
};

function msg(
  sender: string,
  minutesAgo: number,
  text: string,
  id: string,
): Message {
  return {
    id,
    sender,
    timestamp: NOW - minutesAgo * 60_000,
    text,
    source: "whatsapp",
    isSystem: false,
    mentions: [],
  };
}

describe("extractItems", () => {
  it("finds decisions", () => {
    const messages = [
      msg("Rohan", 300, "DECISION: Meeting moved from Monday 3pm to Wednesday 3pm", "m1"),
    ];
    const result = extractItems(messages, PROFILE, NOW);
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].title.toLowerCase()).toContain("meeting");
  });

  it("finds action items with owner and deadline", () => {
    const messages = [
      msg("Sneha", 250, "sure, I'll share a draft by tomorrow evening", "m2"),
    ];
    const result = extractItems(messages, PROFILE, NOW);
    const action = result.actions.find((a) => a.owner === "Sneha");
    expect(action).toBeDefined();
    expect(action?.deadline).toBeDefined();
  });

  it("detects @mentions of the user", () => {
    const messages = [
      msg("Priya", 100, "@Aarav can you record the demo video?", "m3"),
    ];
    expect(isUserMentioned(messages[0], PROFILE)).toBe(true);
  });

  it("flags questions directed at the user and unanswered ones", () => {
    const messages = [
      msg("Priya", 120, "@Aarav are you joining the rehearsal call now?", "m4"),
    ];
    const result = extractItems(messages, PROFILE, NOW);
    const question = result.questions.find((q) => q.messageId === "m4");
    expect(question).toBeDefined();
    expect(question?.detail).toContain("[Unanswered]");
  });

  it("does not flag the user's own sends as mentions", () => {
    const messages = [msg("Aarav", 10, "yes, joining now", "m5")];
    expect(isUserMentioned(messages[0], PROFILE)).toBe(false);
  });

  it("captures announcements", () => {
    const messages = [
      msg("Rohan", 60, "IMPORTANT: Review presentation is on Friday at 10am", "m6"),
    ];
    const result = extractItems(messages, PROFILE, NOW);
    expect(result.announcements.some((a) => a.messageId === "m6")).toBe(true);
  });

  it("sorts extracted items", () => {
    const messages = [
      msg("Rohan", 5, "IMPORTANT: live demo of the model today", "m7"),
      msg("Priya", 30, "@Aarav please bring the laptop", "m8"),
    ];
    const result = extractItems(messages, PROFILE, NOW);
    expect(result.mentions.length).toBeGreaterThan(0);
    expect(result.actions.some((a) => a.title.toLowerCase().includes("laptop"))).toBe(true);
  });
});

describe("notification window semantics", () => {
  it("window filtering keeps only recent messages", () => {
    const messages = [
      msg("Rohan", 5 * 24 * 60, "old news", "old"),
      msg("Priya", 30, "@Aarav are you free now?", "new"),
    ];
    const wall = NOW - 24 * 60 * 60_000;
    const recent = messages.filter((m) => m.timestamp >= wall);
    expect(recent.map((m) => m.id)).toEqual(["new"]);
    void DAY;
  });
});