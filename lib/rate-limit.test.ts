import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, clearRateLimits } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it("allows requests within limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("test", 10, 1000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
  });

  it("blocks requests after limit exceeded", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("test", 10, 1000);
    }
    const result = checkRateLimit("test", 10, 1000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after window passes", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("test", 10, -1);
    }
    const result = checkRateLimit("test", 10, 1000);
    expect(result.allowed).toBe(true);
  });
});
