export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/db/client";
import { castVote, TokenError } from "@/lib/votes/cast";
import { getRandomMatchup } from "@/lib/players/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashForAudit, parseFirstIp } from "@/lib/matchup-token";
import { ensureSessionCookie, persistSessionCookie } from "@/lib/session";
import type { CastVoteResult } from "@/lib/types";

const castVoteSchema = z.object({
  matchupToken: z.string().min(1),
  playerAId: z.number().int().positive(),
  playerBId: z.number().int().positive(),
  winnerId: z.number().int().positive(),
}).refine(
  (data) => data.playerAId !== data.playerBId,
  { message: "Cannot vote for the same player twice" }
).refine(
  (data) => data.winnerId === data.playerAId || data.winnerId === data.playerBId,
  { message: "Winner must be one of the two players" }
);

export async function POST(request: Request) {
  const rawIp = request.headers.get("x-forwarded-for") ?? "unknown";
  const ip = rawIp === "unknown" ? "unknown" : parseFirstIp(rawIp);
  const { allowed } = checkRateLimit(`vote:${ip}`, 60, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many votes. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const body = await request.json();

    const parsed = castVoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { sessionId, isNew } = await ensureSessionCookie();

    const db = await getDatabase();
    const { vote } = await castVote(db, {
      ...parsed.data,
      sessionId,
      ipHash: ip === "unknown" ? undefined : hashForAudit(ip),
    });

    let nextMatchup: CastVoteResult["nextMatchup"] | null = null;
    try {
      nextMatchup = await getRandomMatchup(db, sessionId);
    } catch {
      // vote is committed; don't fail the response if matchup fetch errors
    }

    const response = NextResponse.json({ vote, nextMatchup });

    if (isNew) persistSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    if (error instanceof TokenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
