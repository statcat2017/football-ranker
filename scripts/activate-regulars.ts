import { createAppDatabase } from "../lib/db/adapter";
import { SCHEMA } from "../lib/db/schema";

const API_BASE = "https://footballapi.pulselive.com/football/stats/ranked/players/appearances";

interface PLPlayer {
  owner: {
    name: { display: string; first: string; last: string };
    currentTeam?: { name: string };
  };
  value: number;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

async function fetchAllAppearances(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const url = `${API_BASE}?page=${page}&pageSize=100&compSeasons=719&comps=1&altIds=true`;
    const res = await fetch(url, { headers: { Origin: "https://www.premierleague.com" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    totalPages = data.stats.pageInfo.numPages;
    for (const p of data.stats.content) {
      map.set(normalize(p.owner.name.display), Math.round(p.value));
    }
    page++;
  }
  return map;
}

async function main() {
  const dbPath = process.env.SQLITE_DB_PATH ?? "./data/football-ranker.sqlite";
  const db = createAppDatabase(dbPath);
  await db.exec(SCHEMA);

  console.log("Fetching PL appearances...");
  const plAppearances = await fetchAllAppearances();
  console.log(`Got ${plAppearances.size} players from PL API\n`);

  const dbPlayers = await db.all<{ id: number; name: string; is_active: number }>(
    "SELECT id, name, is_active FROM players"
  );
  console.log(`DB has ${dbPlayers.length} players\n`);

  const eligibleIds: number[] = [];
  let matched = 0;
  let dbOnly = 0;

  for (const p of dbPlayers) {
    const normalizedName = normalize(p.name);
    const apps = plAppearances.get(normalizedName);
    if (apps !== undefined && apps >= 10) {
      eligibleIds.push(p.id);
      matched++;
    } else if (apps === undefined) {
      dbOnly++;
    }
  }

  console.log(`Matched to PL API with 10+ apps: ${matched}`);
  console.log(`DB-only (no PL API match): ${dbOnly}`);

  const idList = eligibleIds.map(() => "?").join(",");
  const activateResult = await db.run(
    `UPDATE players SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${idList})`,
    eligibleIds,
  );

  const deactivateResult = await db.run(
    `UPDATE players SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id NOT IN (${idList})`,
    eligibleIds,
  );

  const finalCount = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM players WHERE is_active = 1"
  );

  console.log(`\nActivated: ${activateResult.changes}`);
  console.log(`Deactivated: ${deactivateResult.changes}`);
  console.log(`Total active: ${finalCount?.count ?? 0}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
