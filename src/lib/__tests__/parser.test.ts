import { describe, expect, it } from "vitest";
import { extractMentions, parseChat } from "../parser";

describe("parseChat", () => {
  it("parses WhatsApp exports with times and PM", () => {
    const input = `12/12/24, 10:18 PM - Priya: hello team
12/12/24, 10:20 PM - Rohan: hi`;
    const { messages, source } = parseChat(input, "whatsapp");
    expect(source).toBe("whatsapp");
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("Priya");
    expect(messages[0].text).toBe("hello team");
    expect(messages[0].timestamp).toBeLessThan(messages[1].timestamp);
  });

  it("handles bracket format and multi-line continuations", () => {
    const input = `[12/12/24, 10:18:22 PM] Priya: hello team
this is a continuation
[12/12/24, 10:19:00 PM] Rohan: hi`;
    const { messages } = parseChat(input, "whatsapp");
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toContain("continuation");
  });

  it("flags system messages", () => {
    const input = `12/12/24, 9:00 AM - Messages and calls are end-to-end encrypted.`;
    const { messages } = parseChat(input, "whatsapp");
    expect(messages[0].isSystem).toBe(true);
  });

  it("parses Telegram style", () => {
    const input = `[12.12.2024 22:18] Alice: hey`;
    const { messages, source } = parseChat(input);
    expect(source).toBe("telegram");
    expect(messages[0].sender).toBe("Alice");
  });

  it("parses Slack JSON", () => {
    const input = JSON.stringify([
      { type: "message", user: "U1", text: "hello", ts: "1700000000.000100" },
      { type: "message", user: "U2", text: "<@U1> got it", ts: "1700000001.000100" },
    ]);
    const { messages } = parseChat(input);
    expect(messages).toHaveLength(2);
    expect(messages[1].mentions).toContain("u1");
  });

  it("falls back to loose lines when nothing is timestamped", () => {
    const { messages, warnings } = parseChat("just a note\nanother note", "pasted");
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("Me");
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe("extractMentions", () => {
  it("collects @handles", () => {
    expect(extractMentions("@aarav can you check @priya?")).toEqual(["aarav", "priya"]);
  });
});