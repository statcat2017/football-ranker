# Stage 09 — Rate Limiting & Session Management

## Goal

Add basic session tracking and rate limiting to prevent abuse.

## Dependencies

- Stage 05 (vote service)
- Stage 06 (API routes)

## Steps

### 1. Create lib/rate-limit.ts

In-memory rate limiter (same pattern as `footballticketsdashboard`):

```ts
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}
```

### 2. Apply rate limiting to vote endpoint

```ts
// POST /api/votes
const ip = request.headers.get("x-forwarded-for") ?? "unknown";
const { allowed, remaining } = checkRateLimit(`vote:${ip}`, 60, 60_000); // 60 votes/minute

if (!allowed) {
  return NextResponse.json(
    { error: "Too many votes. Please wait." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
```

### 3. Create session cookie

Simple session ID cookie for tracking vote counts:

```ts
import { cookies } from "next/headers";
import crypto from "crypto";

export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("fr_session");
  if (existing) return existing.value;

  const sessionId = crypto.randomUUID();
  // Set cookie in response (handled by route handler)
  return sessionId;
}
```

### 4. Store session_id on votes

When casting a vote, include the session ID:

```ts
const sessionId = await getOrCreateSessionId();
const result = await castVote(db, {
  ...input,
  sessionId,
});
```

### 5. Session vote count (optional)

For showing "You've voted X times" across page loads:

```sql
SELECT COUNT(*) as count
FROM votes
WHERE session_id = ?
```

### 6. Basic IP hashing

For audit trail without storing raw IPs:

```ts
import crypto from "crypto";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
```

Store `hashIp(ip)` as `ip_hash` on votes.

## Verification

```bash
npm run test
npm run build
```

## Key Design Decisions

- **In-memory rate limiting**: sufficient for single-VPS deployment. No Redis needed.
- **Session cookie**: lightweight, no auth system. Just tracks a browser.
- **IP hashing**: privacy-preserving audit trail.
- **60 votes/minute**: reasonable limit for a hobby app.

## Blocks

- Stage 10 (styling — no dependency, but this completes the functional MVP)
