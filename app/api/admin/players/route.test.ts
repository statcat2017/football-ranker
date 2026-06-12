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

describe("GET /api/admin/players", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-players-test-${Date.now()}.sqlite`);

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
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [1, "ext-1", "Alice Smith", 1, 1, 1500, 10, "https://example.com/photo.jpg"],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, team_id, is_active, elo_rating, comparisons) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [2, "ext-2", "Bob Jones", null, 0, 1300, 5],
    );
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("returns all players", async () => {
    const { GET } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players");
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.players.length).toBe(2);
    expect(json.total).toBe(2);
  });

  it("filters by search term", async () => {
    const { GET } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players?search=Alice");
    const res = await GET(req);
    const json = await res.json();
    expect(json.players.length).toBe(1);
    expect(json.players[0].name).toBe("Alice Smith");
  });

  it("filters by active status", async () => {
    const { GET } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players?active=true");
    const res = await GET(req);
    const json = await res.json();
    expect(json.players.length).toBe(1);
    expect(json.players[0].name).toBe("Alice Smith");
  });

  it("filters by photo presence", async () => {
    const { GET } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players?hasPhoto=true");
    const res = await GET(req);
    const json = await res.json();
    expect(json.players.length).toBe(1);
    expect(json.players[0].photo_url).toBeTruthy();
  });

  it("returns 401 when not authenticated", async () => {
    const { requireAdmin } = await import("@/lib/auth/admin");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));

    const { GET } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players");
    const res = await GET(req);
    expect(res.status).toBe(401);

    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });
});

describe("POST /api/admin/players", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-admin-create-test-${Date.now()}.sqlite`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    resetDatabase();
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("creates a player with valid data", async () => {
    const { POST } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Player" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe(1);
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty", async () => {
    const { POST } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const { requireAdmin } = await import("@/lib/auth/admin");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));

    const { POST } = await import("@/app/api/admin/players/route");
    const req = new Request("http://localhost/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Should Fail" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);

    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });
});
