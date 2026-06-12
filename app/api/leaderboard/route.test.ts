import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAppDatabase, AppDatabase } from "@/lib/db/adapter";
import { SCHEMA } from "@/lib/db/schema";
import { resetDatabase } from "@/lib/db/client";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("GET /api/leaderboard", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-lb-test-${Date.now()}.sqlite`);

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

  it("returns empty leaderboard when no players exist", async () => {
    const { GET } = await import("@/app/api/leaderboard/route");
    const req = new Request("http://localhost/api/leaderboard");
    const response = await GET(req);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.leaderboard).toEqual([]);
  });

  it("returns ranked players ordered by ELO", async () => {
    await db.run(
      "INSERT INTO players (id, external_id, name, is_active, elo_rating, comparisons) VALUES (?, ?, ?, 1, ?, ?)",
      [1, "ext-1", "Best Player", 1800, 20],
    );
    await db.run(
      "INSERT INTO players (id, external_id, name, is_active, elo_rating, comparisons) VALUES (?, ?, ?, 1, ?, ?)",
      [2, "ext-2", "Second Best", 1600, 15],
    );

    const { GET } = await import("@/app/api/leaderboard/route");
    const req = new Request("http://localhost/api/leaderboard");
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.leaderboard.length).toBe(2);
    expect(json.leaderboard[0].name).toBe("Best Player");
    expect(json.leaderboard[0].rank).toBe(1);
  });

  it("hides provisional players by default", async () => {
    await db.run(
      "INSERT INTO players (id, external_id, name, is_active, elo_rating, comparisons) VALUES (?, ?, ?, 1, ?, ?)",
      [3, "ext-3", "New Kid", 2000, 0],
    );

    const { GET } = await import("@/app/api/leaderboard/route");
    const req = new Request("http://localhost/api/leaderboard");
    const response = await GET(req);
    const json = await response.json();

    const names = json.leaderboard.map((e: { name: string }) => e.name);
    expect(names).not.toContain("New Kid");
  });

  it("shows provisional players when requested", async () => {
    const { GET } = await import("@/app/api/leaderboard/route");
    const req = new Request("http://localhost/api/leaderboard?provisional=true");
    const response = await GET(req);
    const json = await response.json();

    const names = json.leaderboard.map((e: { name: string }) => e.name);
    expect(names).toContain("New Kid");
  });
});
