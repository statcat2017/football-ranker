import { NextResponse } from "next/server";
import { requireAdmin } from "./admin";

export function withAdminGuard<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<NextResponse>,
): (request: Request, ...args: T) => Promise<NextResponse> {
  return async (request, ...args) => {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, ...args);
  };
}
