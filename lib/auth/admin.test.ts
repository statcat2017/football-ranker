import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  signAdminSession,
  verifyAdminSession,
  verifyAdminPassword,
} from "./admin";

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-admin-secret";
  process.env.ADMIN_PASSWORD = "test-password";
});

describe("admin auth", () => {
  describe("signAdminSession / verifyAdminSession", () => {
    it("creates and verifies a valid session token", () => {
      const token = signAdminSession();
      const result = verifyAdminSession(token);
      expect(result.valid).toBe(true);
    });

    it("rejects an expired token", () => {
      vi.useFakeTimers();
      const token = signAdminSession();
      // Advance past the 24-hour window
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
      const result = verifyAdminSession(token);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("Token expired");
      }
      vi.useRealTimers();
    });

    it("rejects a tampered token", () => {
      const token = signAdminSession();
      const tampered = token.slice(0, -4) + "XXXX";
      const result = verifyAdminSession(tampered);
      expect(result.valid).toBe(false);
    });

    it("rejects an empty string", () => {
      const result = verifyAdminSession("");
      expect(result.valid).toBe(false);
    });

    it("rejects a non-base64url string", () => {
      const result = verifyAdminSession("not-a-token");
      expect(result.valid).toBe(false);
    });
  });

  describe("verifyAdminPassword", () => {
    it("accepts the correct password", () => {
      expect(verifyAdminPassword("test-password")).toBe(true);
    });

    it("rejects an incorrect password", () => {
      expect(verifyAdminPassword("wrong-password")).toBe(false);
    });

    it("rejects empty password", () => {
      expect(verifyAdminPassword("")).toBe(false);
    });
  });
});
