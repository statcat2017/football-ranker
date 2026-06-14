import { createAppDatabase } from "../lib/db/adapter.ts";
import { SCHEMA } from "../lib/db/schema.ts";
import { runMigrations } from "../lib/db/migrations.ts";

// ── Types ──────────────────────────────────────────────────────────────────

interface PLPlayerEntry {
  playerId: number;
  id: number;
  name: { display: string; first: string; last: string };
  altIds?: { opta?: string };
}

interface PLPlayersResponse {
  pageInfo: { page: number; numPages: number; pageSize: number; numEntries: number };
  content: PLPlayerEntry[];
}

interface PLPlayerDetail {
  id: number;
  altIds?: { opta?: string };
}

// ── Constants ──────────────────────────────────────────────────────────────

const PL_API = "https://footballapi.pulselive.com/football";
const PHOTO_BASE = "https://resources.premierleague.com/premierleague/photos/players/250x250";
const PAGE_SIZE = 250;
const HEADERS = { Origin: "https://www.premierleague.com" };

// ── Name normalisation ─────────────────────────────────────────────────────

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

// ── Fetchers ───────────────────────────────────────────────────────────────

async function fetchPLPlayers(page: number): Promise<PLPlayerEntry[]> {
  const params = `pageSize=${PAGE_SIZE}&altIds=true&page=${page}&compSeasons=719`;
  const res = await fetch(`${PL_API}/players?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`PL API HTTP ${res.status} on bulk page ${page}`);
  const data: PLPlayersResponse = await res.json();
  return data.content;
}

async function fetchPlayerById(id: string): Promise<PLPlayerDetail | null> {
  const res = await fetch(`${PL_API}/players/${id}?altIds=true`, { headers: HEADERS });
  if (!res.ok) return null;
  return res.json() as Promise<PLPlayerDetail>;
}

// ── Photo URL construction ─────────────────────────────────────────────────

function photoUrl(opta: string): string {
  return `${PHOTO_BASE}/${opta}.png`;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const dbPath = process.env.SQLITE_DB_PATH ?? "./data/football-ranker.sqlite";
  const db = createAppDatabase(dbPath);
  await db.exec(SCHEMA);
  await runMigrations(db);

  // ── 1. Fetch all current PL players (bulk) ─────────────────────────────

  console.log("Fetching current PL season players...");
  const allFetched: PLPlayerEntry[] = [];
  for (let page = 0; page < 20; page++) {
    const players = await fetchPLPlayers(page);
    if (players.length === 0) break;
    allFetched.push(...players);
  }
  console.log(`Fetched ${allFetched.length} players\n`);

  // ── 2. Build lookup indexes ─────────────────────────────────────────────

  const byPlApiId = new Map<string, PLPlayerEntry>();
  const byNorm = new Map<string, PLPlayerEntry>();
  const byNameKey = new Map<string, PLPlayerEntry>();
  const keyCollisions = new Set<string>();

  for (const p of allFetched) {
    byPlApiId.set(String(Math.round(p.id)), p);

    const norm = normalize(p.name.display);
    if (!byNorm.has(norm)) byNorm.set(norm, p);

    const parts = norm.split(/\s+/);
    if (parts.length >= 2) {
      const key = nameKey(parts);
      if (byNameKey.has(key)) keyCollisions.add(key);
      else byNameKey.set(key, p);
    }
  }
  for (const k of keyCollisions) byNameKey.delete(k);

  // ── 3. Match and update players ─────────────────────────────────────────

  const dbPlayers = await db.all<{ id: number; pl_api_id: string | null; name: string }>(
    "SELECT id, pl_api_id, name FROM players WHERE pl_api_id IS NOT NULL AND pl_api_id != ''",
  );
  console.log(`DB has ${dbPlayers.length} players with pl_api_id\n`);

  let matched = 0;
  let skipped = 0;
  const unmatched: typeof dbPlayers = [];

  // Phase A: bulk match (pl_api_id or normalized name)
  for (const dbp of dbPlayers) {
    const plEntry = dbp.pl_api_id
      ? byPlApiId.get(dbp.pl_api_id)
      : undefined;

    if (plEntry) {
      const opta = plEntry.altIds?.opta;
      if (opta) {
        const url = photoUrl(opta);
        await db.run(
          "UPDATE players SET opta_id = ?, photo_url = ?, photo_updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [opta, url, dbp.id],
        );
        matched++;
        continue;
      }
    }

    // Try name match
    const norm = normalize(dbp.name);
    let entry = byNorm.get(norm);
    if (!entry) {
      const parts = norm.split(/\s+/);
      if (parts.length >= 2) entry = byNameKey.get(nameKey(parts));
    }
    if (entry && entry.altIds?.opta) {
      const url = photoUrl(entry.altIds.opta);
      await db.run(
        "UPDATE players SET opta_id = ?, photo_url = ?, photo_updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [entry.altIds.opta, url, dbp.id],
      );
      matched++;
      continue;
    }

    unmatched.push(dbp);
  }

  console.log(`Phase A (bulk) matched: ${matched}`);
  console.log(`Unmatched: ${unmatched.length}\n`);

  // ── 4. Phase B: unmatched active players, fetch individually ───────────

  const activeIds = new Set(
    (await db.all<{ id: number }>(
      "SELECT id FROM players WHERE is_active = 1",
    )).map(r => r.id),
  );

  const toFetch = unmatched.filter(u => activeIds.has(u.id));
  console.log(`Fetching ${toFetch.length} unmatched active players individually...`);

  let individualMatched = 0;
  for (let i = 0; i < toFetch.length; i++) {
    const dbp = toFetch[i];
    if (!dbp.pl_api_id) { skipped++; continue; }

    const detail = await fetchPlayerById(dbp.pl_api_id);
    if (!detail) { skipped++; continue; }

    const opta = detail.altIds?.opta;
    if (!opta) { skipped++; continue; }

    const url = photoUrl(opta);
    await db.run(
      "UPDATE players SET opta_id = ?, photo_url = ?, photo_updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [opta, url, dbp.id],
    );
    individualMatched++;

    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${toFetch.length} (${individualMatched} matched)`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  matched += individualMatched;

  // ── 5. Report ──────────────────────────────────────────────────────────

  const photoCount = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM players WHERE photo_url IS NOT NULL AND photo_url != ''",
  );
  const activePhotoCount = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM players WHERE is_active = 1 AND photo_url IS NOT NULL AND photo_url != ''",
  );
  const activeTotal = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM players WHERE is_active = 1",
  );

  console.log(`\nDone.`);
  console.log(`  Total matched: ${matched}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total players with photos: ${photoCount?.count ?? 0}`);
  console.log(`  Active players with photos: ${activePhotoCount?.count ?? 0} / ${activeTotal?.count ?? 0}`);
}

main().catch((err) => {
  console.error("Photo enrichment failed:", err);
  process.exit(1);
});
