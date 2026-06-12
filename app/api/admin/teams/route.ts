export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdminGuard } from "@/lib/auth/guard";
import { getDatabase } from "@/lib/db/client";

export const GET = withAdminGuard(async () => {
  try {
    const db = await getDatabase();
    const teams = await db.all<{ id: number; name: string }>(
      "SELECT id, name FROM teams ORDER BY name ASC",
    );
    return NextResponse.json({ teams });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
