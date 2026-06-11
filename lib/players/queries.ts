import type { AppDatabase } from "../db/adapter";
import type { PlayerSummary, Matchup } from "../types";

export async function getRandomMatchup(db: AppDatabase): Promise<Matchup> {
  const candidates = await db.all<Record<string, unknown>>(
    `SELECT p.*, t.name as team_name, t.crest_url as team_crest_url
     FROM players p
     LEFT JOIN teams t ON p.team_id = t.id
     WHERE p.is_active = 1
     ORDER BY p.comparisons ASC, RANDOM()
     LIMIT 20`
  );

  if (candidates.length < 2) {
    throw new Error("Not enough active players to form a matchup. Import players first.");
  }

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  return {
    playerA: toPlayerSummary(shuffled[0]),
    playerB: toPlayerSummary(shuffled[1]),
  };
}

export async function getPlayer(db: AppDatabase, id: number) {
  return db.get<Record<string, unknown>>("SELECT * FROM players WHERE id = ?", [id]);
}

export async function getActivePlayerCount(db: AppDatabase): Promise<number> {
  const result = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM players WHERE is_active = 1"
  );
  return result?.count ?? 0;
}

function toPlayerSummary(row: Record<string, unknown>): PlayerSummary {
  return {
    id: row.id as number,
    name: row.name as string,
    position_group: row.position_group as string | null,
    nationality: row.nationality as string | null,
    shirt_number: row.shirt_number as number | null,
    team_name: (row.team_name as string) ?? null,
    team_crest_url: (row.team_crest_url as string) ?? null,
    elo_rating: row.elo_rating as number,
    comparisons: row.comparisons as number,
  };
}
