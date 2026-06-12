import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";
import { withAdminGuard } from "./guard";

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth/admin";

describe("withAdminGuard", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = withAdminGuard(handler);
    const request = new Request("http://localhost/test");
    const response = await guarded(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when authenticated", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = withAdminGuard(handler);
    const request = new Request("http://localhost/test");
    const response = await guarded(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledWith(request);
  });

  it("forwards additional args to handler", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = withAdminGuard(handler);
    const request = new Request("http://localhost/test");
    const context = { params: Promise.resolve({ id: "42" }) };
    await guarded(request, context);

    expect(handler).toHaveBeenCalledWith(request, context);
  });
});
