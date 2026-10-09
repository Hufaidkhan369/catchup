import { describe, expect, it } from "vitest";
import { containsSensitive, maskSensitive } from "../privacy";

describe("maskSensitive", () => {
  it("masks OTP codes", () => {
    const out = maskSensitive("Your OTP is 482913. Do not share it.");
    expect(out).not.toContain("482913");
    expect(out).toContain("••••••");
  });

  it("masks card numbers keeping the last 4", () => {
    const out = maskSensitive("Card: 4532 1234 5678 9012");
    expect(out).toContain("••••");
    expect(out).toContain("9012");
    expect(out).not.toContain("4532");
  });

  it("masks phone numbers keeping the last 2", () => {
    const out = maskSensitive("Call me at +91 98765 43210");
    expect(out).not.toContain("9876543210");
    expect(out).toContain("10");
  });

  it("masks emails while keeping the domain", () => {
    const out = maskSensitive("Reach x.y@college.edu today");
    expect(out).toContain("@college.edu");
    expect(out).not.toContain("x.y@");
  });

  it("leaves normal text untouched", () => {
    const text = "The meeting moved to Wednesday at 3pm in the library.";
    expect(maskSensitive(text)).toBe(text);
    expect(containsSensitive(text)).toBe(false);
  });
});