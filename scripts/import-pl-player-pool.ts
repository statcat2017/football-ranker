import { createAppDatabase, AppDatabase } from "../lib/db/adapter";
import { SCHEMA, runMigrations } from "../lib/db/schema";
import { normalizePosition } from "../lib/players/normalize";

// ── football-data.org types ──────────────────────────────────────────────

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

// ── PL API types ─────────────────────────────────────────────────────────

interface PLPlayer {
  owner: {
    id?: number;
    playerId?: number;
    name: { display: string; first: string; last: string };
    currentTeam?: { name: string; club?: { name: string }; id?: number };
  };
  value: number;
}

interface PLResponse {
  stats: {
    pageInfo: { page: number; numPages: number; pageSize: number; numEntries: number };
    content: PLPlayer[];
  };
}

// ── Name normalisation ───────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019\-]/g, " ")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameKey(parts: string[]): string {
  return `${parts[parts.length - 1]} ${parts[0][0]}`;
}

// ── PL API fetcher ───────────────────────────────────────────────────────

const PL_API = "https://footballapi.pulselive.com/football/stats/ranked/players/appearances";

async function fetchPLAppearances(season?: number): Promise<PLPlayer[]> {
  const players: PLPlayer[] = [];
  let page = 0;
  let totalPages = 1;
  const seasonParam = season !== undefined ? `&compSeasons=${season}` : "";

  while (page < totalPages) {
    const url = `${PL_API}?page=${page}&pageSize=500&comps=1&altIds=true${seasonParam}`;
    const res = await fetch(url, { headers: { Origin: "https://www.premierleague.com" } });
    if (!res.ok) throw new Error(`PL API HTTP ${res.status} on page ${page}`);
    const data: PLResponse = await res.json();
    totalPages = data.stats.pageInfo.numPages;
    players.push(...data.stats.content);
    page++;
  }
  return players;
}

// ── football-data.org fetcher ────────────────────────────────────────────

const FD_API = "https://api.football-data.org/v4";
const FD_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;

async function fetchFDJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "X-Auth-Token": FD_TOKEN! } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} from ${url}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Category helpers ─────────────────────────────────────────────────────

function computeCategory(
  isCurrent: boolean,
  lastSeasonApps: number,
  allTimeApps: number,
): string {
  if (isCurrent) {
    if (lastSeasonApps >= 20) return "current_core";
    if (allTimeApps >= 100) return "current_veteran";
    if (allTimeApps >= 20) return "current_squad";
    return "current_fodder";
  }
  if (allTimeApps >= 300) return "historical_legend";
  return "historical_fodder";
}

function computeTier(apps: number): string | null {
  if (apps >= 200 && apps <= 299) return "historical_fodder_near_legend";
  if (apps >= 100 && apps <= 199) return "historical_fodder_established";
  if (apps >= 20 && apps <= 99) return "historical_fodder_squad";
  if (apps >= 1 && apps <= 19) return "historical_fodder_minor";
  return null;
}

function isActiveDefault(category: string): 1 | 0 {
  return category === "current_core" || category === "current_veteran" || category === "historical_legend" ? 1 : 0;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const dbPath = process.env.SQLITE_DB_PATH ?? "./data/football-ranker.sqlite";
  const db = createAppDatabase(dbPath);
  await db.exec(SCHEMA);
  await runMigrations(db);

  // ── 1. Ensure synthetic teams ────────────────────────────────────────

  await db.run(
    `INSERT INTO teams (external_id, name, season_label, updated_at)
     VALUES ('synthetic:legends', 'Legends', 'all-time', CURRENT_TIMESTAMP)
     ON CONFLICT(external_id) DO NOTHING`,
  );
  await db.run(
    `INSERT INTO teams (external_id, name, season_label, updated_at)
     VALUES ('synthetic:fodder', 'Fodder', 'all-time', CURRENT_TIMESTAMP)
     ON CONFLICT(external_id) DO NOTHING`,
  );

  const legendsTeam = await db.get<{ id: number }>("SELECT id FROM teams WHERE external_id = 'synthetic:legends'");
  const fodderTeam = await db.get<{ id: number }>("SELECT id FROM teams WHERE external_id = 'synthetic:fodder'");
  if (!legendsTeam || !fodderTeam) throw new Error("Failed to create synthetic teams");

  // ── 2. Import current PL squads from football-data.org ───────────────

  const currentPlayerIds: Set<number> = new Set();

  if (FD_TOKEN) {
    console.log("Fetching current Premier League squads from football-data.org...");
    const data = await fetchFDJson<{ season?: { startDate?: string; endDate?: string }; teams: FootballDataTeam[] }>(
      `${FD_API}/competitions/PL/teams?season=2025`,
    );
    console.log(`Found ${data.teams.length} teams`);

    for (const team of data.teams) {
      console.log(`  Processing ${team.name}...`);
      await db.run(
        `INSERT INTO teams (external_id, name, short_name, crest_url, season_label, updated_at)
         VALUES (?, ?, ?, ?, '2025-2026', CURRENT_TIMESTAMP)
         ON CONFLICT(external_id) DO UPDATE SET
           name = excluded.name,
           short_name = excluded.short_name,
           crest_url = excluded.crest_url,
           updated_at = CURRENT_TIMESTAMP`,
        [team.id, team.name, team.shortName ?? team.tla ?? null, team.crest ?? null],
      );
      const teamRow = await db.get<{ id: number }>("SELECT id FROM teams WHERE external_id = ?", [team.id]);
      if (!teamRow) { console.error(`  Failed to upsert team ${team.name}`); continue; }

      if (!team.squad || team.squad.length === 0) {
        try {
          const detail = await fetchFDJson<FootballDataTeam>(`${FD_API}/teams/${team.id}`);
          team.squad = detail.squad;
        } catch { /* squad fetch failed */ }
        await delay(6500);
      }

      if (!team.squad) continue;

      for (const player of team.squad) {
        await db.run(
          `INSERT INTO players (external_id, name, raw_position, position_group, nationality, date_of_birth, shirt_number, team_id, is_current_pl_player, is_active, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(external_id) DO UPDATE SET
             name = excluded.name,
             raw_position = excluded.raw_position,
             position_group = excluded.position_group,
             nationality = excluded.nationality,
             date_of_birth = excluded.date_of_birth,
             shirt_number = excluded.shirt_number,
             team_id = excluded.team_id,
             is_current_pl_player = 1,
             updated_at = CURRENT_TIMESTAMP`,
          [player.id, player.name, player.position ?? null, normalizePosition(player.position), player.nationality ?? null, player.dateOfBirth ?? null, player.shirtNumber ?? null, teamRow.id],
        );
        const row = await db.get<{ id: number }>("SELECT id FROM players WHERE external_id = ?", [player.id]);
        if (row) currentPlayerIds.add(row.id);
      }
      console.log(`  Upserted ${team.squad.length} players`);
      await delay(6500);
    }
    console.log(`Current squads done. ${currentPlayerIds.size} players marked as current.\n`);
  } else {
    console.log("FOOTBALL_DATA_API_TOKEN not set, skipping current squad import.\n");
  }

  // ── 3. Fetch PL API appearance data ──────────────────────────────────

  console.log("Fetching PL API all-time appearances...");
  const allTimePL = await fetchPLAppearances();
  console.log(`Got ${allTimePL.length} player entries`);

  console.log("Fetching PL API current-season appearances...");
  const seasonPL = await fetchPLAppearances(719);
  console.log(`Got ${seasonPL.length} player entries`);

  // Build lookups
  const seasonAppsByNorm = new Map<string, number>();
  const allTimeAppsByNorm = new Map<string, number>();
  const plApiIdByNorm = new Map<string, number>();
  const allTimeSeen = new Set<string>();

  for (const p of seasonPL) {
    seasonAppsByNorm.set(normalize(p.owner.name.display), Math.round(p.value));
  }

  for (const p of allTimePL) {
    const norm = normalize(p.owner.name.display);
    const val = Math.round(p.value);
    const existing = allTimeAppsByNorm.get(norm) ?? 0;
    if (val > existing) allTimeAppsByNorm.set(norm, val);
    const pid = p.owner.id ?? p.owner.playerId;
    if (pid !== undefined && !plApiIdByNorm.has(norm)) plApiIdByNorm.set(norm, pid);
    const uniqueKey = pid !== undefined ? `id:${pid}` : `name:${norm}`;
    allTimeSeen.add(uniqueKey);
  }

  // ── 4. Build DB player lookup ────────────────────────────────────────

  const dbPlayers = await db.all<{ id: number; name: string; external_id: string; pl_api_id: string | null }>(
    "SELECT id, name, external_id, pl_api_id FROM players",
  );
  console.log(`DB has ${dbPlayers.length} players\n`);

  // Index by: pl_api_id, external_id (with plapi: prefix), normalized name, "last firstinitial"
  const byPlApiId = new Map<string, number>();
  const byExternalId = new Map<string, number>();
  const byNorm = new Map<string, number>();
  const byKey = new Map<string, number>();
  const keyCollisions = new Set<string>();

  for (const p of dbPlayers) {
    if (p.pl_api_id) byPlApiId.set(p.pl_api_id, p.id);
    byExternalId.set(p.external_id, p.id);
    const norm = normalize(p.name);
    byNorm.set(norm, p.id);
    const parts = norm.split(/\s+/);
    if (parts.length >= 2) {
      const key = nameKey(parts);
      if (byKey.has(key)) keyCollisions.add(key);
      else byKey.set(key, p.id);
    }
  }
  for (const k of keyCollisions) byKey.delete(k);

  // Also build byKey from all-time PL names for the merge step
  const plByKey = new Map<string, string>();
  const plKeyCollisions = new Set<string>();
  for (const p of allTimePL) {
    const parts = normalize(p.owner.name.display).split(/\s+/);
    if (parts.length >= 2) {
      const key = nameKey(parts);
      if (plByKey.has(key)) plKeyCollisions.add(key);
      else plByKey.set(key, normalize(p.owner.name.display));
    }
  }
  for (const k of plKeyCollisions) plByKey.delete(k);

  // ── 5. Match and merge PL API players with DB ────────────────────────

  function findDbId(plName: string, plApiId?: number): number | null {
    const norm = normalize(plName);

    // By PL API ID
    if (plApiId !== undefined) {
      const byId = byPlApiId.get(String(plApiId));
      if (byId) return byId;
    }

    // By normalized name
    const byNormId = byNorm.get(norm);
    if (byNormId) return byNormId;

    // By last name + first initial
    const parts = norm.split(/\s+/);
    if (parts.length >= 2) {
      const key = nameKey(parts);
      const byKeyId = byKey.get(key);
      if (byKeyId) return byKeyId;
    }

    return null;
  }

  let created = 0;
  let updatedExisting = 0;
  let skippedZeroApps = 0;

  const processed = new Set<string>();

  for (const p of allTimePL) {
    const plApiId = p.owner.id ?? p.owner.playerId;
    const plName = p.owner.name.display;
    const norm = normalize(plName);
    const allTimeApps = Math.round(p.value);
    const lastSeasonApps = seasonAppsByNorm.get(norm) ?? 0;

    if (allTimeApps < 1) { skippedZeroApps++; continue; }

    const dedupKey = plApiId !== undefined ? `pl:${plApiId}` : `nm:${norm}`;
    if (processed.has(dedupKey)) continue;
    processed.add(dedupKey);

    const existingId = findDbId(plName, plApiId);

    if (existingId !== null) {
      // Update existing player with PL data
      await db.run(
        `UPDATE players SET
           pl_api_id = COALESCE(NULLIF(pl_api_id, ''), ?),
           pl_all_time_appearances = ?,
           pl_last_season_appearances = ?,
           stats_updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [plApiId !== undefined ? String(plApiId) : null, allTimeApps, lastSeasonApps, existingId],
      );
      updatedExisting++;
    } else {
      // Create new player for historical PL appearance data
      const extId = plApiId !== undefined ? `plapi:${plApiId}` : `plapi:noid:${norm.slice(0, 30)}`;

      // Determine initial team
      const isCurrent = currentPlayerIds.size > 0 && false; // Will be overridden below
      const teamId = allTimeApps >= 100 ? legendsTeam!.id : fodderTeam!.id;

      try {
        const result = await db.run(
          `INSERT OR IGNORE INTO players (external_id, name, team_id, pl_api_id, pl_all_time_appearances, pl_last_season_appearances, is_current_pl_player, is_active, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP)`,
          [extId, plName, teamId, plApiId !== undefined ? String(plApiId) : null, allTimeApps, lastSeasonApps],
        );
        if (result.changes > 0) created++;
      } catch {
        // Race condition on concurrent insert; skip
      }
    }
  }

  console.log(`PL API merge complete:`);
  console.log(`  Updated existing: ${updatedExisting}`);
  console.log(`  Created new: ${created}`);
  console.log(`  Skipped (0 apps): ${skippedZeroApps}\n`);

  // ── 6. Ensure current squad players keep current_pl status ───────────

  if (currentPlayerIds.size > 0) {
    const idList = [...currentPlayerIds].join(",");
    await db.exec(
      `UPDATE players SET is_current_pl_player = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${idList})`,
    );
  }

  // ── 7. Assign teams and compute categories ───────────────────────────

  const allPlayers = await db.all<{ id: number; is_current_pl_player: number; pl_all_time_appearances: number; pl_last_season_appearances: number; team_id: number }>(
    "SELECT id, is_current_pl_player, pl_all_time_appearances, pl_last_season_appearances, team_id FROM players",
  );

  for (const p of allPlayers) {
    const isCurrent = p.is_current_pl_player === 1;
    const lastSeasonApps = p.pl_last_season_appearances ?? 0;
    const allTimeApps = p.pl_all_time_appearances ?? 0;
    const category = computeCategory(isCurrent, lastSeasonApps, allTimeApps);
    const tier = category === "historical_fodder" ? computeTier(allTimeApps) : null;
    const active = isActiveDefault(category);

    // Determine correct team
    let newTeamId = p.team_id;
    if (!isCurrent) {
      newTeamId = allTimeApps >= 100 ? legendsTeam!.id : fodderTeam!.id;
    }

    await db.run(
      `UPDATE players SET
         eligibility_category = ?,
         fodder_tier = ?,
         is_active = ?,
         team_id = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [category, tier, active, newTeamId, p.id],
    );
  }

  // ── 8. Report ────────────────────────────────────────────────────────

  const counts = await db.all<{ category: string; cnt: number }>(
    `SELECT COALESCE(eligibility_category, 'uncategorised') as category, COUNT(*) as cnt
     FROM players GROUP BY eligibility_category ORDER BY cnt DESC`,
  );
  console.log("Player pool by category:");
  for (const row of counts) {
    console.log(`  ${row.category}: ${row.cnt}`);
  }

  const activeTotal = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM players WHERE is_active = 1");
  const inactiveTotal = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM players WHERE is_active = 0");
  const totalPlayers = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM players");

  console.log(`\nTotal players: ${totalPlayers?.count ?? 0}`);
  console.log(`Active (default): ${activeTotal?.count ?? 0}`);
  console.log(`Inactive: ${inactiveTotal?.count ?? 0}`);

  // Deactivate any players not matched by PL API at all (e.g., youth with 0 PL apps)
  await db.exec(
    `UPDATE players SET is_active = 0, eligibility_category = 'no_pl_appearances', updated_at = CURRENT_TIMESTAMP
     WHERE pl_all_time_appearances = 0 AND is_current_pl_player = 0 AND is_active = 1`,
  );

  const finalActive = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM players WHERE is_active = 1");
  console.log(`\nFinal active count (after cleanup): ${finalActive?.count ?? 0}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
