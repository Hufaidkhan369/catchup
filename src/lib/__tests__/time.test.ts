import { describe, expect, it } from "vitest";
import { DAY, HOUR, parseDeadline, startOfDay } from "../time";

const NOW = new Date("2026-10-09T10:00:00").getTime(); // a Friday

describe("parseDeadline", () => {
  it("parses explicit ISO dates", () => {
    const out = parseDeadline("submit by 2026-10-04", NOW);
    expect(out).toBe(new Date(2026, 9, 4, 18, 0, 0).getTime());
  });

  it("parses slash dates as day/month", () => {
    const out = parseDeadline("report due 12/11/26", NOW)!;
    expect(new Date(out).getMonth()).toBe(10); // November
    expect(new Date(out).getDate()).toBe(12);
  });

  it("parses 'by tomorrow 5pm'", () => {
    const out = parseDeadline("by tomorrow 5pm", NOW)!;
    expect(out).toBe(startOfDay(NOW) + DAY + 17 * HOUR);
  });

  it("parses weekdays", () => {
    const out = parseDeadline("deadline by Friday", NOW)!;
    // today is Friday -> Friday 18:00
    expect(out).toBe(startOfDay(NOW) + 18 * HOUR);
  });

  it("parses 'in 3 hours'", () => {
    expect(parseDeadline("we need this in 3 hours", NOW)).toBe(NOW + 3 * HOUR);
  });

  it("parses EOD", () => {
    expect(parseDeadline("send it eod please", NOW)).toBe(startOfDay(NOW) + 18 * HOUR);
  });

  it("parses bare times via 'at'", () => {
    const out = parseDeadline("meeting at 5pm", NOW)!;
    expect(out).toBe(startOfDay(NOW) + 17 * HOUR);
  });

  it("returns undefined without a deadline signal", () => {
    expect(parseDeadline("let's catch up later", NOW)).toBeUndefined();
  });
});