import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createAppDatabase, AppDatabase } from "@/lib/db/adapter";
import { SCHEMA } from "@/lib/db/schema";
import { resetDatabase } from "@/lib/db/client";
import { signMatchup } from "@/lib/matchup-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));

describe("POST /api/votes", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-vote-test-${Date.now()}.sqlite`);

  beforeAll(async () => {
    db = createAppDatabase(dbPath);
    await db.exec(SCHEMA);
    process.env.SQLITE_DB_PATH = dbPath;
    resetDatabase();

    await db.run("INSERT INTO players (id, external_id, name, is_active, elo_rating, comparisons) VALUES (?, ?, ?, 1, 1500, 5)", [1, "ext-1", "Player A"]);
    await db.run("INSERT INTO players (id, external_id, name, is_active, elo_rating, comparisons) VALUES (?, ?, ?, 1, 1500, 5)", [2, "ext-2", "Player B"]);
    await db.run("INSERT INTO players (id, external_id, name, is_active, elo_rating, comparisons) VALUES (?, ?, ?, 1, 1500, 5)", [3, "ext-3", "Player C"]);
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + "-wal"); } catch {}
    try { fs.unlinkSync(dbPath + "-shm"); } catch {}
  });

  it("rejects requests without matchupToken", async () => {
    const { POST } = await import("@/app/api/votes/route");
    const req = new Request("http://localhost/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerAId: 1, playerBId: 2, winnerId: 1 }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("rejects invalid matchup token", async () => {
    const { POST } = await import("@/app/api/votes/route");
    const req = new Request("http://localhost/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchupToken: "not-valid", playerAId: 1, playerBId: 2, winnerId: 1 }),
    });

    const response = await POST(req);
    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.error).toContain("Invalid matchup token");
  });

  it("accepts valid vote with signed token", async () => {
    const token = signMatchup(1, 2);

    const { POST } = await import("@/app/api/votes/route");
    const req = new Request("http://localhost/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchupToken: token, playerAId: 1, playerBId: 2, winnerId: 1 }),
    });

    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.vote).toBeDefined();
    expect(json.vote.winnerId).toBe(1);
    expect(json.vote.winnerDelta).toBeGreaterThan(0);
  });
});
