import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createAppDatabase, AppDatabase } from "@/lib/db/adapter";
import { SCHEMA } from "@/lib/db/schema";
import { resetDatabase } from "@/lib/db/client";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));

describe("GET /api/matchups/next", () => {
  let db: AppDatabase;
  const dbPath = path.join(os.tmpdir(), `rank-test-${Date.now()}.sqlite`);

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

  it("returns 500 when no players exist", async () => {
    const { GET } = await import("@/app/api/matchups/next/route");
    const response = await GET();
    await response.json();
    expect(response.status).toBe(500);
  });

  it("returns two players and a token when players exist", async () => {
    await db.run("INSERT INTO players (id, external_id, name, is_active, comparisons) VALUES (?, ?, ?, 1, 0)", [1, "ext-1", "Player One"]);
    await db.run("INSERT INTO players (id, external_id, name, is_active, comparisons) VALUES (?, ?, ?, 1, 0)", [2, "ext-2", "Player Two"]);

    const { GET } = await import("@/app/api/matchups/next/route");
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.playerA.id).toBeDefined();
    expect(json.playerB.id).toBeDefined();
    expect(json.playerA.id).not.toBe(json.playerB.id);
    expect(json.token).toBeDefined();
  });
});
