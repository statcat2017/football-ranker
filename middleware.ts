import { NextRequest, NextResponse } from "next/server";
import { decodeToken, parseSessionPayload } from "@/lib/auth/token";

const COOKIE_NAME = "fr_admin_session";

function isTokenValid(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  const parsed = parseSessionPayload(decoded.payload);
  if (!parsed) return false;
  return Date.now() <= parsed.expiry;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const validSession = token ? isTokenValid(token) : false;

  if (pathname === "/admin/login") {
    if (validSession) {
      return NextResponse.redirect(new URL("/admin/players", request.url));
    }
    return NextResponse.next();
  }

  if (!validSession) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
