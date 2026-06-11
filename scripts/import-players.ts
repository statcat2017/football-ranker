import { createAppDatabase } from "../lib/db/adapter";
import { applyMigrations } from "../lib/db/migrate";
import { normalizePosition } from "../lib/players/normalize";

const API_BASE = "https://api.football-data.org/v4";
const TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;

if (!TOKEN) {
  console.error("FOOTBALL_DATA_API_TOKEN is required. Set it in .env or .dev.vars");
  process.exit(1);
}

interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
  squad?: FootballDataPlayer[];
}

interface FootballDataPlayer {
  id: number;
  name: string;
  position?: string;
  nationality?: string;
  dateOfBirth?: string;
  shirtNumber?: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "X-Auth-Token": TOKEN! },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} from ${url}: ${body}`);
  }

  return res.json() as Promise<T>;
}

async function main() {
  const dbPath = process.env.SQLITE_DB_PATH ?? "./data/football-ranker.sqlite";
  const db = createAppDatabase(dbPath);
  await applyMigrations(db);

  console.log("Fetching Premier League teams...");
  const data = await fetchJson<{ season?: { startDate?: string; endDate?: string }; teams: FootballDataTeam[] }>(
    `${API_BASE}/competitions/PL/teams?season=2025`
  );

  const seasonLabel = data.season
    ? `${data.season.startDate?.slice(0, 4) ?? "2025"}-${data.season.endDate?.slice(0, 4) ?? "2026"}`
    : "2025-2026";

  console.log(`Season: ${seasonLabel}`);
  console.log(`Found ${data.teams.length} teams`);

  const importedPlayerIds: number[] = [];

  for (const team of data.teams) {
    console.log(`  Processing ${team.name}...`);

    await db.run(
      `INSERT INTO teams (external_id, name, short_name, crest_url, season_label, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(external_id) DO UPDATE SET
         name = excluded.name,
         short_name = excluded.short_name,
         crest_url = excluded.crest_url,
         season_label = excluded.season_label,
         updated_at = CURRENT_TIMESTAMP`,
      [team.id, team.name, team.shortName ?? team.tla ?? null, team.crest ?? null, seasonLabel],
    );

    const teamRow = await db.get<{ id: number }>("SELECT id FROM teams WHERE external_id = ?", [team.id]);

    if (!teamRow) {
      console.error(`  Failed to upsert team ${team.name}`);
      continue;
    }

    if (!team.squad || team.squad.length === 0) {
      console.log(`  No squad data for ${team.name}, fetching from API...`);
      try {
        const teamDetail = await fetchJson<FootballDataTeam>(`${API_BASE}/teams/${team.id}`);
        team.squad = teamDetail.squad;
      } catch (err) {
        console.error(`  Failed to fetch squad for ${team.name}: ${err}`);
      }
      await delay(6500);
    }

    if (!team.squad) {
      continue;
    }

    for (const player of team.squad) {
      importedPlayerIds.push(player.id);

      await db.run(
        `INSERT INTO players (external_id, name, raw_position, position_group, nationality, date_of_birth, shirt_number, team_id, is_active, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(external_id) DO UPDATE SET
           name = excluded.name,
           raw_position = excluded.raw_position,
           position_group = excluded.position_group,
           nationality = excluded.nationality,
           date_of_birth = excluded.date_of_birth,
           shirt_number = excluded.shirt_number,
           team_id = excluded.team_id,
           is_active = 1,
           updated_at = CURRENT_TIMESTAMP`,
        [
          player.id,
          player.name,
          player.position ?? null,
          normalizePosition(player.position),
          player.nationality ?? null,
          player.dateOfBirth ?? null,
          player.shirtNumber ?? null,
          teamRow.id,
        ],
      );
    }

    console.log(`  Upserted ${team.squad.length} players`);

    await delay(6500);
  }

  console.log(`\nMarking inactive players...`);

  if (importedPlayerIds.length > 0) {
    const params = importedPlayerIds.map(() => "?").join(",");

    const result = await db.run(
      `UPDATE players SET is_active = 0, updated_at = CURRENT_TIMESTAMP
       WHERE external_id NOT IN (${params})
       AND is_active = 1`,
      importedPlayerIds,
    );
    console.log(`  Marked ${result.changes} players as inactive`);
  }

  const count = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM players WHERE is_active = 1");
  console.log(`\nDone! Active players: ${count?.count ?? 0}`);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
