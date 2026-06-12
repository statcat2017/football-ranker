export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { withAdminGuard } from "@/lib/auth/guard";
import { getDatabase } from "@/lib/db/client";
import { getAdminPlayer, updateAdminPlayer, removePlayerPhoto } from "@/lib/admin/players";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads", "player-photos");
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

    const db = await getDatabase();
    const existing = await getAdminPlayer(db, playerId);
    if (!existing) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 },
      );
    }

    // Generate safe filename
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;

    // Ensure upload dir exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Write new file first (atomic: write → DB → delete old)
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

    const photoUrl = `/api/uploads/player-photos/${filename}`;

    // Update player photo_url
    await updateAdminPlayer(db, playerId, { photo_url: photoUrl });

    // Remove old photo AFTER successful write + DB update
    if (existing.photo_url && existing.photo_url.startsWith("/api/uploads/player-photos/")) {
      const oldFilename = path.basename(existing.photo_url);
      const oldPath = path.join(UPLOAD_DIR, oldFilename);
      try {
        await fs.unlink(oldPath);
      } catch {
        // ignore if file already gone
      }
    }

    return NextResponse.json({ photo_url: photoUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});

export const DELETE = withAdminGuard(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const photoUrl = await removePlayerPhoto(db, playerId);

    // Delete local file if it was an uploaded file
    if (photoUrl && photoUrl.startsWith("/api/uploads/player-photos/")) {
      const filename = path.basename(photoUrl);
      const filePath = path.join(UPLOAD_DIR, filename);
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore if file already gone
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
