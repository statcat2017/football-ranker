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

describe("POST /api/admin/players/:id/active", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-active-${Date.now()}.sqlite`);

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
      [1, "ext-1", "Inactive Player", 1, 0, 1500, 5],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [2, "ext-2", "Active Player", 1, 1, 1500, 5],
    );
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("activates an inactive player", async () => {
    const route = await import("@/app/api/admin/players/[id]/active/route");
    const req = new Request("http://localhost/api/admin/players/1/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.is_active).toBe(1);

    const row = await db.get("SELECT is_active FROM players WHERE id = 1");
    expect(row?.is_active).toBe(1);
  });

  it("deactivates an active player", async () => {
    const route = await import("@/app/api/admin/players/[id]/active/route");
    const req = new Request("http://localhost/api/admin/players/2/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: "2" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.is_active).toBe(0);

    const row = await db.get("SELECT is_active FROM players WHERE id = 2");
    expect(row?.is_active).toBe(0);
  });

  it("returns 400 when active field is missing", async () => {
    const route = await import("@/app/api/admin/players/[id]/active/route");
    const req = new Request("http://localhost/api/admin/players/1/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid player id", async () => {
    const route = await import("@/app/api/admin/players/[id]/active/route");
    const req = new Request("http://localhost/api/admin/players/abc/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const { requireAdmin } = await import("@/lib/auth/admin");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));

    const route = await import("@/app/api/admin/players/[id]/active/route");
    const req = new Request("http://localhost/api/admin/players/1/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);

    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });
});
