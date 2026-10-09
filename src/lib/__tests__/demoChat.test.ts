import { describe, expect, it } from "vitest";
import { buildDemoChat } from "../demoChat";

describe("buildDemoChat", () => {
  const messages = buildDemoChat();

  it("contains the 43-message real Ubuntu support sample", () => {
    expect(messages).toHaveLength(43);
    expect(messages[0].text).toBe("So I ran into a wifi pickle");
    expect(messages[messages.length - 1].text).toBe("got it to work, thanks");
  });

  it("shifts original timestamps into the recent catch-up window", () => {
    const now = Date.now();
    expect(messages.every((m) => m.timestamp <= now)).toBe(true);
    expect(now - messages[0].timestamp).toBeGreaterThan(53 * 60_000);
    expect(now - messages[0].timestamp).toBeLessThan(55 * 60_000);
  });

  it("uses anonymized role labels instead of source IRC handles", () => {
    expect(new Set(messages.map((m) => m.sender))).toEqual(new Set(["Requester", "Helper"]));
    expect(messages.some((m) => m.text.includes("frecel") || m.text.includes("TJ-"))).toBe(false);
  });

  it("preserves the real troubleshooting conversation text", () => {
    expect(messages.some((m) => m.text.includes("0bda:5875"))).toBe(true);
    expect(messages.some((m) => m.text.includes("thanks for your help"))).toBe(true);
  });
});
