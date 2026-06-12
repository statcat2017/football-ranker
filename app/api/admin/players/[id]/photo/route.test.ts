import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createAppDatabase, AppDatabase } from "@/lib/db/adapter";
import { SCHEMA } from "@/lib/db/schema";
import { resetDatabase } from "@/lib/db/client";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/admin/players/:id/photo", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-photo-${Date.now()}.sqlite`);
  const uploadDir = path.join(os.tmpdir(), `rank-uploads-${Date.now()}`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    process.env.UPLOAD_DIR = uploadDir;
    resetDatabase();

    fs.mkdirSync(uploadDir, { recursive: true });

    await db.run(
      "INSERT INTO teams (id, external_id, name, season_label) VALUES (?, ?, ?, ?)",
      [1, "team-1", "Test FC", "2025-26"],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, "ext-1", "Photo Player", 1, 1, 1500, 5],
    );
  });

  afterAll(() => {
    delete process.env.UPLOAD_DIR;
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
    try { fs.rmSync(uploadDir, { recursive: true }); } catch {}
  });

  it("uploads a photo for a player", async () => {
    const route = await import("@/app/api/admin/players/[id]/photo/route");

    const file = new File(["fake image data"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("photo", file);

    const req = new Request("http://localhost/api/admin/players/1/photo", {
      method: "POST",
      body: formData,
    });

    const res = await route.POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.photo_url).toContain("/api/uploads/player-photos/");
    expect(json.photo_url).toMatch(/\.\w+$/);
  });

  it("returns 400 when no file provided", async () => {
    const route = await import("@/app/api/admin/players/[id]/photo/route");

    const formData = new FormData();
    const req = new Request("http://localhost/api/admin/players/1/photo", {
      method: "POST",
      body: formData,
    });

    const res = await route.POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid player id", async () => {
    const route = await import("@/app/api/admin/players/[id]/photo/route");

    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("photo", file);

    const req = new Request("http://localhost/api/admin/players/abc/photo", {
      method: "POST",
      body: formData,
    });

    const res = await route.POST(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent player", async () => {
    const route = await import("@/app/api/admin/players/[id]/photo/route");

    const file = new File(["data"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("photo", file);

    const req = new Request("http://localhost/api/admin/players/999/photo", {
      method: "POST",
      body: formData,
    });

    const res = await route.POST(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for disallowed MIME type", async () => {
    const route = await import("@/app/api/admin/players/[id]/photo/route");

    const file = new File(["<svg></svg>"], "hack.svg", { type: "image/svg+xml" });
    const formData = new FormData();
    formData.append("photo", file);

    const req = new Request("http://localhost/api/admin/players/1/photo", {
      method: "POST",
      body: formData,
    });

    const res = await route.POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid file type");
  });
});

describe("DELETE /api/admin/players/:id/photo", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-photo-del-${Date.now()}.sqlite`);
  const uploadDir = path.join(os.tmpdir(), `rank-uploads-del-${Date.now()}`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    process.env.UPLOAD_DIR = uploadDir;
    resetDatabase();

    fs.mkdirSync(uploadDir, { recursive: true });

    await db.run(
      "INSERT INTO teams (id, external_id, name, season_label) VALUES (?, ?, ?, ?)",
      [1, "team-1", "Test FC", "2025-26"],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [1, "ext-1", "Has Photo", 1, 1, 1500, 5, "/api/uploads/player-photos/test-photo.jpg"],
    );

    fs.writeFileSync(path.join(uploadDir, "test-photo.jpg"), "fake image data");
  });

  afterAll(() => {
    delete process.env.UPLOAD_DIR;
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
    try { fs.rmSync(uploadDir, { recursive: true }); } catch {}
  });

  it("removes photo from player", async () => {
    const route = await import("@/app/api/admin/players/[id]/photo/route");
    const req = new Request("http://localhost/api/admin/players/1/photo", { method: "DELETE" });
    const res = await route.DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    const row = await db.get("SELECT photo_url FROM players WHERE id = 1");
    expect(row?.photo_url).toBeNull();
  });

  it("returns 400 for invalid player id", async () => {
    const route = await import("@/app/api/admin/players/[id]/photo/route");
    const req = new Request("http://localhost/api/admin/players/abc/photo", { method: "DELETE" });
    const res = await route.DELETE(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });
});
