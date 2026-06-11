import { describe, it, expect } from "vitest";
import { signMatchup, verifyMatchup, TokenError } from "./matchup-token";

describe("matchup-token", () => {
  it("signs and verifies a valid token with session", () => {
    const token = signMatchup(1, 2, "session-1");
    const result = verifyMatchup(token, 1, 2, "session-1");
    expect(result.valid).toBe(true);
  });

  it("signs and verifies without session", () => {
    const token = signMatchup(1, 2);
    const result = verifyMatchup(token, 1, 2);
    expect(result.valid).toBe(true);
  });

  it("rejects wrong player IDs", () => {
    const token = signMatchup(1, 2);
    const result = verifyMatchup(token, 1, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("Token mismatch");
    }
  });

  it("rejects session mismatch", () => {
    const token = signMatchup(1, 2, "session-A");
    const result = verifyMatchup(token, 1, 2, "session-B");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("Session mismatch");
    }
  });

  it("rejects malformed token", () => {
    const result = verifyMatchup("bad-token", 1, 2);
    expect(result.valid).toBe(false);
  });

  it("rejects tampered token", () => {
    const token = signMatchup(1, 2);
    const tampered = "X" + token.slice(1);
    const result = verifyMatchup(tampered, 1, 2);
    expect(result.valid).toBe(false);
  });

  it("produces different tokens for different pairs", () => {
    const t1 = signMatchup(1, 2);
    const t2 = signMatchup(3, 4);
    expect(t1).not.toBe(t2);
  });

  it("produces different tokens for same pair (different nonce)", () => {
    const t1 = signMatchup(1, 2);
    const t2 = signMatchup(1, 2);
    expect(t1).not.toBe(t2);
  });

  it("returns nonce on valid verification", () => {
    const token = signMatchup(1, 2);
    const result = verifyMatchup(token, 1, 2);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.nonce).toBeDefined();
      expect(typeof result.nonce).toBe("string");
    }
  });

  it("TokenError has correct name", () => {
    const err = new TokenError("test");
    expect(err.name).toBe("TokenError");
    expect(err.message).toContain("test");
  });
});
