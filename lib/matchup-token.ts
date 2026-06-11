import crypto from "crypto";

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-secret-do-not-use-in-production";
}

export class TokenError extends Error {
  constructor(reason: string) {
    super(`Invalid or expired matchup token: ${reason}`);
    this.name = "TokenError";
  }
}

export function signMatchup(playerAId: number, playerBId: number, sessionId?: string): string {
  const expiry = Date.now() + 5 * 60 * 1000;
  const nonce = crypto.randomUUID();
  const payload = `${playerAId}:${playerBId}:${sessionId ?? ""}:${expiry}:${nonce}`;
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  const sig = hmac.digest("hex").slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyMatchup(
  token: string,
  playerAId: number,
  playerBId: number,
  sessionId?: string,
):
  | { valid: true; playerAId: number; playerBId: number; nonce: string }
  | { valid: false; reason: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) {
      return { valid: false, reason: "Malformed token" };
    }

    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    const parts = payload.split(":");
    if (parts.length !== 5) {
      return { valid: false, reason: "Malformed token" };
    }

    const [aStr, bStr, tokSessionId, expiryStr, nonce] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (!Number.isFinite(expiry) || Date.now() > expiry) {
      return { valid: false, reason: "Token expired" };
    }

    const aId = parseInt(aStr, 10);
    const bId = parseInt(bStr, 10);

    if (aId !== playerAId || bId !== playerBId) {
      return { valid: false, reason: "Token mismatch" };
    }

    if (sessionId !== undefined && tokSessionId !== "" && tokSessionId !== sessionId) {
      return { valid: false, reason: "Session mismatch" };
    }

    const recomputed = crypto.createHmac("sha256", getSecret());
    recomputed.update(payload);
    const expectedSig = recomputed.digest("hex").slice(0, 16);

    if (sig !== expectedSig) {
      return { valid: false, reason: "Invalid signature" };
    }

    return { valid: true, playerAId: aId, playerBId: bId, nonce };
  } catch {
    return { valid: false, reason: "Invalid token" };
  }
}

export function hashForAudit(value: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

export function parseFirstIp(forwarded: string): string {
  return forwarded.split(",")[0].trim();
}
