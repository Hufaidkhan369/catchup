import { describe, expect, it } from "vitest";
import { buildDemoChat } from "../demoChat";
import { extractItems } from "../extract";
import type { UserProfile } from "../../types";

const PROFILE: UserProfile = {
  name: "Aarav",
  handle: "aarav",
  tasks: ["ML model", "slides", "demo video"],
};

describe("buildDemoChat", () => {
  const messages = buildDemoChat();

  it("contains 150+ messages", () => {
    expect(messages.length).toBeGreaterThanOrEqual(150);
  });

  it("is realistic and dated in the past", () => {
    const now = Date.now();
    expect(messages.every((m) => m.timestamp <= now)).toBe(true);
    expect(messages.some((m) => m.text.includes("end-to-end encrypted"))).toBe(true);
  });

  it("contains @mentions of the demo user", () => {
    const withMentions = messages.filter((m) => m.mentions.includes("aarav"));
    expect(withMentions.length).toBeGreaterThan(5);
  });

  it("contains deadlines, decisions, questions and noise", () => {
    const all = messages.map((m) => m.text.toLowerCase()).join(" ");
    expect(all).toMatch(/deadline|due|tomorrow/);
    expect(all).toMatch(/decision|decided/);
    expect(all).toMatch(/\?/);
    expect(all).toMatch(/\blol\b|\bok\b|\bgn\b/);
  });

  it("extracts a non-trivial set of items from the demo alone", () => {
    const result = extractItems(messages, PROFILE);
    expect(result.actions.length).toBeGreaterThan(3);
    expect(result.decisions.length).toBeGreaterThan(3);
    expect(result.mentions.length).toBeGreaterThan(3);
    expect(result.announcements.length).toBeGreaterThan(1);
  });
});