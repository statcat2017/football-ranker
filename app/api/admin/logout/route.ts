export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/admin";

export async function POST() {
  const { name, value, options } = clearAdminSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(name, value, options);
  return response;
}
