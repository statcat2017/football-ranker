import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
import { getOrCreateSessionId, attachSessionCookie } from "./session";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";

describe("getOrCreateSessionId", () => {
  it("creates a new session ID when no cookie exists", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as never);

    const { sessionId, isNew } = await getOrCreateSessionId();

    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe("string");
    expect(isNew).toBe(true);
  });

  it("returns existing session ID when cookie exists", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "existing-session-id" }),
    } as never);

    const { sessionId, isNew } = await getOrCreateSessionId();

    expect(sessionId).toBe("existing-session-id");
    expect(isNew).toBe(false);
  });
});

describe("attachSessionCookie", () => {
  it("sets the fr_session cookie on the response", () => {
    const response = NextResponse.json({});
    const setSpy = vi.spyOn(response.cookies, "set");

    attachSessionCookie(response, "test-session-id");

    expect(setSpy).toHaveBeenCalledWith(
      "fr_session",
      "test-session-id",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      }),
    );
  });
});
