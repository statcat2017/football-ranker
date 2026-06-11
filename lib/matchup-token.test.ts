import { describe, it, expect } from "vitest";
import { signMatchup, verifyMatchup } from "./matchup-token";

describe("matchup-token", () => {
  it("signs and verifies a valid token", () => {
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
});
