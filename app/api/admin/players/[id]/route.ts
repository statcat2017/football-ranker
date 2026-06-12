export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDatabase } from "@/lib/db/client";
import {
  getAdminPlayer,
  updateAdminPlayer,
  deleteAdminPlayer,
} from "@/lib/admin/players";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const player = await getAdminPlayer(db, playerId);

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

const updatePlayerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  team_id: z.number().int().positive().nullable().optional(),
  raw_position: z.string().max(100).nullable().optional(),
  position_group: z.string().max(50).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  shirt_number: z.number().int().min(0).max(99).nullable().optional(),
  photo_url: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updatePlayerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const existing = await getAdminPlayer(db, playerId);
    if (!existing) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    await updateAdminPlayer(db, playerId, parsed.data);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const existing = await getAdminPlayer(db, playerId);
    if (!existing) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const { deleted, hadVotes } = await deleteAdminPlayer(db, playerId);

    if (hadVotes) {
      return NextResponse.json(
        { error: "Cannot delete player with vote history. Deactivate instead." },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
