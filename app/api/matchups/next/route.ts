export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { getRandomMatchup } from "@/lib/players/queries";
import { getOrCreateSessionId, attachSessionCookie } from "@/lib/session";

export async function GET() {
  try {
    const { sessionId, isNew } = await getOrCreateSessionId();

    const db = await getDatabase();
    const matchup = await getRandomMatchup(db, sessionId);

    const response = NextResponse.json(matchup);

    if (isNew) attachSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
