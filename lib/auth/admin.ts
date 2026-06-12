import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "fr_admin_session";
const MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_SESSION_SECRET is required in production");
    }
    return "dev-admin-secret-do-not-use-in-production";
  }
  return secret;
}

export function signAdminSession(): string {
  const expiry = Date.now() + MAX_AGE * 1000;
  const nonce = crypto.randomUUID();
  const payload = `admin:${expiry}:${nonce}`;
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  const sig = hmac.digest("hex").slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyAdminSession(token: string): { valid: boolean; reason?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return { valid: false, reason: "Malformed token" };

    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    const parts = payload.split(":");
    if (parts.length !== 3 || parts[0] !== "admin") {
      return { valid: false, reason: "Malformed token" };
    }

    const expiry = parseInt(parts[1], 10);
    if (!Number.isFinite(expiry) || Date.now() > expiry) {
      return { valid: false, reason: "Token expired" };
    }

    const recomputed = crypto.createHmac("sha256", getSecret());
    recomputed.update(payload);
    const expectedSig = recomputed.digest("hex").slice(0, 16);

    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, reason: "Invalid signature" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid token" };
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminSession(token).valid;
}

export async function requireAdmin(): Promise<void> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    throw new Error("Unauthorized");
  }
}

export function setAdminSessionCookie(token: string): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE,
      path: "/",
    },
  };
}

export function clearAdminSessionCookie(): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    },
  };
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const pwBuf = Buffer.from(password);
  const expBuf = Buffer.from(expected);
  if (pwBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(pwBuf, expBuf);
}
