# Stage 02 — Database Layer

## Goal

Build the SQLite adapter, schema, migration system, and pragmas. Establish the data foundation for players, teams, and votes.

## Dependencies

- Stage 01 (project scaffolding)

## Steps

### 1. Create lib/db/adapter.ts

Thin async wrapper around `better-sqlite3`, matching the `footballticketsdashboard` pattern:

```ts
export interface AppDatabase {
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  run(sql: string, ...params: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: () => T): T;
}
```

### 2. Create lib/db/client.ts

Singleton pattern:

```ts
let db: AppDatabase | null = null;

export async function getDatabase(): Promise<AppDatabase> {
  if (!db) {
    db = await createDatabase();
  }
  return db;
}
```

DB path from `SQLITE_DB_PATH` env var, defaulting to `data/football-ranker.sqlite`.

### 3. Create lib/db/schema.ts

Raw SQL `CREATE TABLE` statements as TypeScript constants:

```ts
export const SCHEMA = `
  CREATE TABLE teams (...);
  CREATE TABLE players (...);
  CREATE TABLE votes (...);
  CREATE INDEX idx_votes_winner ON votes(winner_id);
  CREATE INDEX idx_votes_players ON votes(player_a_id, player_b_id);
  CREATE INDEX idx_players_team ON players(team_id);
  CREATE INDEX idx_players_elo ON players(elo_rating);
  CREATE INDEX idx_players_active ON players(is_active);
`;
```

Full schema defined in `00-overarching-plan.md`.

### 4. Create lib/db/migrate.ts

Custom migration runner (same pattern as nearmefc):

- `_migrations` tracking table with file + hash.
- Apply numbered `.sql` files from `lib/db/migrations/`.
- Support both up and down migrations.
- Checksum-based idempotency.

### 5. Create lib/db/migrations/001-initial.sql

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

-- teams table
CREATE TABLE IF NOT EXISTS teams (...);
-- players table
CREATE TABLE IF NOT EXISTS players (...);
-- votes table
CREATE TABLE IF NOT EXISTS votes (...);
-- indexes
CREATE INDEX IF NOT EXISTS idx_votes_winner ON votes(winner_id);
...
```

Note: Pragmas are applied on DB open (in `client.ts`), not in migration files. The migration file creates tables and indexes only.

### 6. Apply pragmas on every DB connection

In `client.ts`, after opening the database:

```ts
rawDb.pragma("foreign_keys = ON");
rawDb.pragma("journal_mode = WAL");
rawDb.pragma("busy_timeout = 5000");
```

### 7. Create lib/types.ts

Shared TypeScript types:

```ts
export interface Team {
  id: number;
  external_id: string;
  name: string;
  short_name: string | null;
  crest_url: string | null;
  season_label: string;
}

export interface Player {
  id: number;
  external_id: string;
  name: string;
  raw_position: string | null;
  position_group: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  shirt_number: number | null;
  team_id: number | null;
  is_active: boolean;
  elo_rating: number;
  wins: number;
  losses: number;
  comparisons: number;
  photo_url: string | null;
}

export interface Vote {
  id: number;
  player_a_id: number;
  player_b_id: number;
  winner_id: number;
  loser_id: number;
  player_a_elo_before: number;
  player_b_elo_before: number;
  player_a_elo_after: number;
  player_b_elo_after: number;
  k_factor: number;
  session_id: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
}
```

### 8. Write tests

- `lib/db/migrate.test.ts`: run migration on temp DB, verify tables exist.
- `lib/db/client.test.ts`: verify singleton, pragma settings.

## Verification

```bash
npm run test
npm run build
```

## Key Design Decisions

- **WAL mode**: allows concurrent reads during writes, better for a voting app.
- **busy_timeout 5000**: prevents immediate SQLITE_BUSY errors under concurrent load.
- **foreign_keys ON**: enforces referential integrity at the DB level.
- **No ORM**: raw SQL throughout, matching existing project conventions.

## Blocks

- Stage 03 (ELO logic needs DB to test with)
- Stage 04 (import needs schema)
- Stage 05 (vote service needs schema)
