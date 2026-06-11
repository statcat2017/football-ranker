export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db/client";
import { getRandomMatchup } from "@/lib/players/queries";

export async function GET() {
  try {
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("fr_session")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const db = await getDatabase();
    const matchup = await getRandomMatchup(db, sessionId);

    const response = NextResponse.json(matchup);

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
