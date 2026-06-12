import type { AppDatabase } from "../db/adapter";
import type { LeaderboardEntry } from "../types";

export async function getLeaderboard(
  db: AppDatabase,
  options: { includeProvisional?: boolean; limit?: number } = {},
): Promise<LeaderboardEntry[]> {
  const { includeProvisional = false, limit = 100 } = options;

  const whereClause = includeProvisional
    ? ""
    : "WHERE p.comparisons >= 1";

  const rows = await db.all<LeaderboardEntry>(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY p.elo_rating DESC) as rank,
       p.id, p.name, t.name as team_name, t.crest_url as team_crest_url,
       p.position_group, p.elo_rating, p.wins, p.losses, p.comparisons,
       p.photo_url,
       CASE WHEN p.comparisons < 1 THEN 1 ELSE 0 END as is_provisional
     FROM players p
     LEFT JOIN teams t ON p.team_id = t.id
     WHERE p.is_active = 1
     ${whereClause ? `AND p.comparisons >= 1` : ""}
     ORDER BY p.elo_rating DESC
     LIMIT ?`,
    [limit],
  );

  return rows;
}
