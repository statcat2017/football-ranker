export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { getLeaderboard } from "@/lib/leaderboard/queries";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeProvisional = url.searchParams.get("provisional") === "true";

    const rawLimit = Number(url.searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 500)
      : 100;

    const db = await getDatabase();
    const leaderboard = await getLeaderboard(db, { includeProvisional, limit });

    return NextResponse.json({ leaderboard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
