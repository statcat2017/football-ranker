export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db/client";
import { castVote } from "@/lib/votes/cast";
import { castVoteSchema } from "@/lib/votes/schema";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
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

    const cookieStore = await cookies();
    let sessionId = cookieStore.get("fr_session")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const db = await getDatabase();
    const result = await castVote(db, {
      ...parsed.data,
      sessionId,
      ipHash: ip === "unknown" ? undefined : ip,
    });

    const response = NextResponse.json(result);

    if (!cookieStore.get("fr_session")) {
      response.cookies.set("fr_session", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
