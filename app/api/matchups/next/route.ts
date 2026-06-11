export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { getRandomMatchup } from "@/lib/players/queries";

export async function GET() {
  try {
    const db = await getDatabase();
    const matchup = await getRandomMatchup(db);
    return NextResponse.json(matchup);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
