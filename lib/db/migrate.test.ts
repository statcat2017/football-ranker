import { describe, it, expect } from "vitest";
import { createAppDatabase, AppDatabase } from "./adapter";
import { SCHEMA } from "./schema";

describe("Database migrations", () => {
  let db: AppDatabase;

  it("creates all tables and indexes in memory", async () => {
    db = createAppDatabase(":memory:");
    await db.exec(SCHEMA);

    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("teams");
    expect(tableNames).toContain("players");
    expect(tableNames).toContain("votes");
  });

  it("applies schema idempotently", async () => {
    db = createAppDatabase(":memory:");
    await db.exec(SCHEMA);
    await db.exec(SCHEMA);

    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    expect(tables.length).toBeGreaterThanOrEqual(3);
  });

  it("enforces foreign key constraints", async () => {
    db = createAppDatabase(":memory:");
    await db.exec(SCHEMA);
    await db.exec("PRAGMA foreign_keys = ON");

    // Insert player with non-existent team should fail
    await expect(
      db.run("INSERT INTO players (external_id, name, team_id) VALUES (?, ?, ?)", ["ext-1", "Test", 999]),
    ).rejects.toThrow();
  });

  it("enforces vote CHECK constraints", async () => {
    db = createAppDatabase(":memory:");
    await db.exec(SCHEMA);

    await db.run("INSERT INTO players (external_id, name, is_active) VALUES (?, ?, 1)", ["ext-1", "A"]);
    await db.run("INSERT INTO players (external_id, name, is_active) VALUES (?, ?, 1)", ["ext-2", "B"]);

    await expect(
      db.run(
        "INSERT INTO votes (player_a_id, player_b_id, winner_id, loser_id, player_a_elo_before, player_b_elo_before, player_a_elo_after, player_b_elo_after, k_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [1, 2, 3, 2, 1500, 1500, 1500, 1500, 32],
      ),
    ).rejects.toThrow();

    await expect(
      db.run(
        "INSERT INTO votes (player_a_id, player_b_id, winner_id, loser_id, player_a_elo_before, player_b_elo_before, player_a_elo_after, player_b_elo_after, k_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [1, 2, 1, 1, 1500, 1500, 1500, 1500, 32],
      ),
    ).rejects.toThrow();
  });
});
