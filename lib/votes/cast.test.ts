import { describe, it, expect, beforeAll } from "vitest";
import { createAppDatabase, AppDatabase } from "../db/adapter";
import { SCHEMA } from "../db/schema";
import { castVote } from "./cast";
import type { Player } from "../types";

describe("castVote", () => {
  let db: AppDatabase;

  beforeAll(async () => {
    db = createAppDatabase(":memory:");
    await db.exec(SCHEMA);
  });

  async function seedPlayer(id: number, name: string, elo = 1500, comps = 0): Promise<number> {
    await db.run(
      `INSERT INTO players (id, external_id, name, is_active, elo_rating, comparisons)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET elo_rating = ?, comparisons = ?`,
      [id, `ext-${id}`, name, elo, comps, elo, comps],
    );
    return id;
  }

  it("updates winner and loser ELO in a transaction", async () => {
    const a = await seedPlayer(1, "Player A", 1500, 5);
    const b = await seedPlayer(2, "Player B", 1500, 5);

    const result = await castVote(db, { playerAId: a, playerBId: b, winnerId: a });

    expect(result.vote.winnerId).toBe(a);
    expect(result.vote.loserId).toBe(b);
    expect(result.vote.winnerDelta).toBeGreaterThan(0);
    expect(result.vote.loserDelta).toBeLessThan(0);

    const playerA = await db.get<Player>("SELECT * FROM players WHERE id = ?", [a]);
    const playerB = await db.get<Player>("SELECT * FROM players WHERE id = ?", [b]);

    expect(playerA!.elo_rating).toBeGreaterThan(1500);
    expect(playerB!.elo_rating).toBeLessThan(1500);
    expect(playerA!.wins).toBe(1);
    expect(playerB!.losses).toBe(1);
    expect(playerA!.comparisons).toBe(6);
    expect(playerB!.comparisons).toBe(6);
  });

  it("stores audit trail in votes table", async () => {
    const a = await seedPlayer(3, "Player C", 1500, 5);
    const b = await seedPlayer(4, "Player D", 1500, 5);

    await castVote(db, {
      playerAId: a,
      playerBId: b,
      winnerId: a,
      sessionId: "test-session",
      ipHash: "hash123",
    });

    const votes = await db.all<Record<string, unknown>>("SELECT * FROM votes ORDER BY id DESC LIMIT 1");
    const vote = votes[0];

    expect(vote.winner_id).toBe(a);
    expect(vote.loser_id).toBe(b);
    expect(vote.player_a_elo_before).toBe(1500);
    expect(vote.player_b_elo_before).toBe(1500);
    expect(vote.player_a_elo_after).toBeGreaterThan(1500);
    expect(vote.player_b_elo_after).toBeLessThan(1500);
    expect(vote.k_factor).toBe(48);
    expect(vote.session_id).toBe("test-session");
    expect(vote.ip_hash).toBe("hash123");
  });

  it("handles player A winning", async () => {
    const a = await seedPlayer(5, "Player E", 1500, 5);
    const b = await seedPlayer(6, "Player F", 1500, 5);

    const result = await castVote(db, { playerAId: a, playerBId: b, winnerId: a });

    expect(result.vote.winnerId).toBe(a);
    expect(result.vote.loserId).toBe(b);
  });

  it("handles player B winning", async () => {
    const a = await seedPlayer(7, "Player G", 1500, 5);
    const b = await seedPlayer(8, "Player H", 1500, 5);

    const result = await castVote(db, { playerAId: a, playerBId: b, winnerId: b });

    expect(result.vote.winnerId).toBe(b);
    expect(result.vote.loserId).toBe(a);
  });

  it("rolls back on invalid player", async () => {
    await seedPlayer(9, "Player I", 1500);

    await expect(
      castVote(db, { playerAId: 9, playerBId: 999, winnerId: 9 }),
    ).rejects.toThrow("not found");
  });
});
