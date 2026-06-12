export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads", "player-photos");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;
    const filename = pathSegments.join("/");

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("\0")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // pathSegments[0] is "player-photos" which is already in UPLOAD_DIR
    const filePath = path.join(UPLOAD_DIR, ...pathSegments.slice(1));
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    try {
      const data = await fs.readFile(filePath);
      return new NextResponse(data, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
