import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "fr_admin_session";

function isTokenValid(token: string): boolean {
  try {
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return false;
    const payload = decoded.slice(0, lastColon);
    const parts = payload.split(":");
    if (parts.length !== 3 || parts[0] !== "admin") return false;
    const expiry = parseInt(parts[1], 10);
    if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
    return true;
  } catch {
    return false;
  }
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
