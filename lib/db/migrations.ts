import type { AppDatabase } from "./adapter";

export async function runMigrations(db: AppDatabase): Promise<void> {
  const existing = await db.all<{ name: string }>("PRAGMA table_info(players)");
  const columns = new Set(existing.map(r => r.name));

  const additions: [string, string][] = [
    ["pl_api_id", "TEXT"],
    ["pl_last_season_appearances", "INTEGER NOT NULL DEFAULT 0"],
    ["pl_all_time_appearances", "INTEGER NOT NULL DEFAULT 0"],
    ["is_current_pl_player", "INTEGER NOT NULL DEFAULT 0 CHECK(is_current_pl_player IN (0,1))"],
    ["eligibility_category", "TEXT"],
    ["fodder_tier", "TEXT"],
    ["stats_updated_at", "TEXT"],
    ["opta_id", "TEXT"],
    ["photo_updated_at", "TEXT"],
  ];

  for (const [name, def] of additions) {
    if (!columns.has(name)) {
      await db.exec(`ALTER TABLE players ADD COLUMN ${name} ${def}`);
      columns.add(name);
    }
  }

  const indexCols: [string, string][] = [
    ["idx_players_pl_api_id", "pl_api_id"],
    ["idx_players_eligibility_category", "eligibility_category"],
    ["idx_players_current_pl", "is_current_pl_player"],
  ];
  for (const [idxName, colName] of indexCols) {
    if (columns.has(colName)) {
      await db.exec(`CREATE INDEX IF NOT EXISTS ${idxName} ON players(${colName})`);
    }
  }
}
