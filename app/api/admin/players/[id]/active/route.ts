export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminGuard } from "@/lib/auth/guard";
import { getDatabase } from "@/lib/db/client";
import { setPlayerActive } from "@/lib/admin/players";

const toggleActiveSchema = z.object({
  active: z.boolean(),
});

export const POST = withAdminGuard(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = toggleActiveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    await setPlayerActive(db, playerId, parsed.data.active);

    return NextResponse.json({ ok: true, is_active: parsed.data.active ? 1 : 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
