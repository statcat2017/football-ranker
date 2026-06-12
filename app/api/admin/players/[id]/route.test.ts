import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createAppDatabase, AppDatabase } from "@/lib/db/adapter";
import { SCHEMA } from "@/lib/db/schema";
import { resetDatabase } from "@/lib/db/client";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
  isAdminAuthenticated: vi.fn().mockResolvedValue(true),
}));

describe("GET /api/admin/players/:id", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-id-get-${Date.now()}.sqlite`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    resetDatabase();

    await db.run(
      "INSERT INTO teams (id, external_id, name, season_label) VALUES (?, ?, ?, ?)",
      [1, "team-1", "Test FC", "2025-26"],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, "ext-1", "Test Player", 1, 1, 1500, 10],
    );
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("returns a player by id", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/1");
    const res = await route.GET(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.player.name).toBe("Test Player");
  });

  it("returns 404 for nonexistent player", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/999");
    const res = await route.GET(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/abc");
    const res = await route.GET(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/players/:id", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-id-patch-${Date.now()}.sqlite`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    resetDatabase();

    await db.run(
      "INSERT INTO teams (id, external_id, name, season_label) VALUES (?, ?, ?, ?)",
      [1, "team-1", "Test FC", "2025-26"],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, "ext-1", "Original Name", 1, 1, 1500, 10],
    );
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("updates player name", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const res = await route.PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);

    const getReq = new Request("http://localhost/api/admin/players/1");
    const getRes = await route.GET(getReq, { params: Promise.resolve({ id: "1" }) });
    const json = await getRes.json();
    expect(json.player.name).toBe("Updated Name");
  });

  it("returns 400 for invalid data", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const res = await route.PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent player", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    });
    const res = await route.PATCH(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/players/:id", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-id-delete-${Date.now()}.sqlite`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    resetDatabase();

    await db.run(
      "INSERT INTO teams (id, external_id, name, season_label) VALUES (?, ?, ?, ?)",
      [1, "team-1", "Test FC", "2025-26"],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, "ext-1", "Delete Me", 1, 1, 1500, 0],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [2, "ext-2", "Has Votes", 1, 1, 1500, 5],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [3, "ext-3", "Other Player", 1, 1, 1500, 5],
    );
    await db.run(
      "INSERT INTO votes (player_a_id, player_b_id, winner_id, loser_id, player_a_elo_before, player_b_elo_before, player_a_elo_after, player_b_elo_after, k_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [2, 3, 2, 3, 1500, 1500, 1516, 1484, 32],
    );
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("deletes a player without vote history", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/1", { method: "DELETE" });
    const res = await route.DELETE(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 409 for player with vote history", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/2", { method: "DELETE" });
    const res = await route.DELETE(req, { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(409);
  });

  it("returns 404 for nonexistent player", async () => {
    const route = await import("@/app/api/admin/players/[id]/route");
    const req = new Request("http://localhost/api/admin/players/999", { method: "DELETE" });
    const res = await route.DELETE(req, { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });
});
