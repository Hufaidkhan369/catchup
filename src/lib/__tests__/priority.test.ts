import { describe, expect, it } from "vitest";
import { scorePriority } from "../priority";
import { HOUR } from "../time";

const NOW = Date.now();

describe("scorePriority", () => {
  it("marks urgent, user-mentioned items as high with explanations", () => {
    const out = scorePriority({
      text: "Please submit the report by tomorrow 5pm, @aarav",
      type: "action",
      deadline: NOW + 5 * HOUR,
      mentionsUser: true,
      matchesUserTask: false,
      now: NOW,
    });
    expect(out.priority).toBe("high");
    const labels = out.reasons.map((r) => r.label).join(" ");
    expect(labels).toContain("Deadline in");
    expect(labels).toContain("You were mentioned");
  });

  it("downgrades to medium for a mention-only message", () => {
    const out = scorePriority({
      text: "@aarav what do you think?",
      type: "question",
      mentionsUser: true,
      matchesUserTask: false,
      now: NOW,
    });
    expect(out.priority).toBe("medium");
  });

  it("keeps irrelevant items low", () => {
    const out = scorePriority({
      text: "let's meet for chai sometime",
      type: "announcement",
      mentionsUser: false,
      matchesUserTask: false,
      now: NOW,
    });
    expect(out.priority).toBe("low");
  });

  it("boosts items matching the user's own tasks", () => {
    const low = scorePriority({
      text: "model accuracy reached 94%",
      type: "announcement",
      mentionsUser: false,
      matchesUserTask: false,
      now: NOW,
    });
    const boosted = scorePriority({
      text: "model accuracy reached 94%",
      type: "announcement",
      mentionsUser: false,
      matchesUserTask: true,
      now: NOW,
    });
    expect(boosted.score).toBeGreaterThan(low.score);
  });
});