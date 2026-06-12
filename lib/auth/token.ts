function base64urlToBase64(s: string): string {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return b64;
}

export function decodeToken(token: string): { payload: string; sig: string } | null {
  try {
    const decoded = atob(base64urlToBase64(token));
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return null;
    return { payload: decoded.slice(0, lastColon), sig: decoded.slice(lastColon + 1) };
  } catch {
    return null;
  }
}

export function parseSessionPayload(payload: string): { expiry: number; nonce: string } | null {
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "admin") return null;
  const expiry = parseInt(parts[1], 10);
  if (!Number.isFinite(expiry)) return null;
  return { expiry, nonce: parts[2] };
}
