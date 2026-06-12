export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDatabase } from "@/lib/db/client";
import { getAdminPlayers, createAdminPlayer } from "@/lib/admin/players";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? undefined;
    const teamId = url.searchParams.get("teamId");
    const active = url.searchParams.get("active");
    const hasPhoto = url.searchParams.get("hasPhoto");
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const db = await getDatabase();
    const result = await getAdminPlayers(db, {
      search,
      teamId: teamId ? Number(teamId) : undefined,
      active: active === "true" ? true : active === "false" ? false : undefined,
      hasPhoto: hasPhoto === "true" ? true : hasPhoto === "false" ? false : undefined,
      limit: Math.min(Math.max(limit, 1), 200),
      offset: Math.max(offset, 0),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

const createPlayerSchema = z.object({
  name: z.string().min(1).max(200),
  team_id: z.number().int().positive().nullable().optional(),
  raw_position: z.string().max(100).nullable().optional(),
  position_group: z.string().max(50).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  shirt_number: z.number().int().min(0).max(99).nullable().optional(),
  is_active: z.boolean().optional(),
  photo_url: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createPlayerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }

    const db = await getDatabase();
    const result = await createAdminPlayer(db, parsed.data);

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
