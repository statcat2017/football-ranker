import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "fr_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: COOKIE_MAX_AGE,
  path: "/",
};

export async function ensureSessionCookie(): Promise<{
  sessionId: string;
  isNew: boolean;
}> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  const sessionId = existing ?? crypto.randomUUID();
  return { sessionId, isNew: !existing };
}

export function persistSessionCookie(
  response: NextResponse,
  sessionId: string,
): void {
  response.cookies.set(COOKIE_NAME, sessionId, COOKIE_OPTIONS);
}
