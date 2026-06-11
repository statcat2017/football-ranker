# Football Ranker — Overarching Plan

## Vision

A "who's better?" web app for Premier League players. Two players appear side-by-side, the user picks one, and an ELO-based ranking system produces a live leaderboard. Think "Hot or Not" but framed as football ability comparison.

## Product Copy

> Who's better?
> Pick the stronger Premier League player.
> Live fan-powered player rankings.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Database:** SQLite via better-sqlite3
- **Language:** TypeScript
- **Testing:** Vitest + Testing Library (Playwright later)
- **Validation:** Zod
- **Runtime:** Node.js on VPS (not Edge/serverless)
- **Deployment:** Standalone Next.js build on VPS

## Key Design Decisions

### 1. Normalized Data Model

- Separate `teams` and `players` tables (not denormalized on players).
- `comparisons` instead of `total_votes` (less ambiguous).
- No `draws` column (pick-one system, no draws possible).
- Votes store ELO before/after for full auditability.
- `session_id`, `ip_hash`, `user_agent_hash` on votes from day one.
- `is_active` on players for re-import strategy without deleting history.

### 2. ELO with Dynamic K

| Comparisons | K Factor |
|---:|---:|
| < 10 | 48 |
| 10–49 | 32 |
| 50+ | 16 |

This gives early movement without letting mature rankings swing wildly.

### 3. Provisional Rankings

- Default leaderboard: only players with ≥ 10 comparisons.
- Players below threshold labelled "Provisional".
- Comparisons displayed prominently.

### 4. Matchup Selection

- MVP: prefer players with fewer comparisons, then random.
- Later: bias toward similar ELO (±200 points), avoid repeated pairs, include exploration pairings.

### 5. Player Photos

- NOT solved in MVP. football-data.org free tier doesn't provide photos.
- Use bold player cards with initials, club crest, shirt number, position, nationality.
- `photo_url` kept nullable for future enrichment (FotMob CDN, Wikipedia/Commons).
- If the app's appeal depends on faces, photo enrichment must be solved before launch polish.

### 6. Player Import

- Football-data.org API for PL squads and team data.
- Idempotent re-import: upsert by external ID, mark missing players inactive.
- Position normalization: map raw values (Offence, Defence, etc.) to groups (Forward, Defender, etc.).
- Season label tracked on teams for season-to-season comparison.

## Project Structure

```
football-ranker/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── vote/page.tsx
│   ├── leaderboard/page.tsx
│   └── api/
│       ├── matchups/next/route.ts
│       ├── votes/route.ts
│       └── leaderboard/route.ts
├── components/
│   ├── PlayerCard.tsx
│   ├── VotePanel.tsx
│   └── Leaderboard.tsx
├── lib/
│   ├── db/
│   │   ├── client.ts
│   │   ├── adapter.ts
│   │   ├── schema.ts
│   │   ├── migrate.ts
│   │   └── migrations/
│   │       └── 001-initial.sql
│   ├── players/
│   │   ├── normalize.ts
│   │   └── queries.ts
│   ├── votes/
│   │   ├── cast.ts
│   │   └── queries.ts
│   ├── leaderboard/
│   │   └── queries.ts
│   ├── elo.ts
│   ├── rate-limit.ts
│   └── types.ts
├── scripts/
│   └── import-players.ts
├── data/
│   └── .gitkeep
├── docs/
│   └── plans/
│       ├── 00-overarching-plan.md
│       ├── 01-project-scaffolding.md
│       ├── 02-database-layer.md
│       ├── 03-elo-logic.md
│       ├── 04-player-import.md
│       ├── 05-vote-service.md
│       ├── 06-api-routes.md
│       ├── 07-vote-ui.md
│       ├── 08-leaderboard-ui.md
│       ├── 09-rate-limiting.md
│       ├── 10-styling.md
│       └── 11-lint-test-build.md
├── next.config.ts
├── tsconfig.json
├── package.json
├── vitest.config.ts
├── eslint.config.mjs
├── .env.example
└── .gitignore
```

## Database Schema

### teams

```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  crest_url TEXT,
  season_label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### players

```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  raw_position TEXT,
  position_group TEXT,
  nationality TEXT,
  date_of_birth TEXT,
  shirt_number INTEGER,
  team_id INTEGER REFERENCES teams(id),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  elo_rating REAL NOT NULL DEFAULT 1500,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  comparisons INTEGER NOT NULL DEFAULT 0,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### votes

```sql
CREATE TABLE votes (
  id INTEGER PRIMARY KEY,
  player_a_id INTEGER NOT NULL REFERENCES players(id),
  player_b_id INTEGER NOT NULL REFERENCES players(id),
  winner_id INTEGER NOT NULL REFERENCES players(id),
  loser_id INTEGER NOT NULL REFERENCES players(id),
  player_a_elo_before REAL NOT NULL,
  player_b_elo_before REAL NOT NULL,
  player_a_elo_after REAL NOT NULL,
  player_b_elo_after REAL NOT NULL,
  k_factor REAL NOT NULL,
  session_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (player_a_id <> player_b_id),
  CHECK (winner_id IN (player_a_id, player_b_id)),
  CHECK (loser_id IN (player_a_id, player_b_id)),
  CHECK (winner_id <> loser_id)
);
```

## API Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/matchups/next` | Return next two players to compare |
| `POST` | `/api/votes` | Cast vote, update ELO, return next matchup |
| `GET` | `/api/leaderboard` | Return ranked players |
| `GET` | `/api/players` | Debug/admin list (optional) |

### POST /api/votes Response

```json
{
  "vote": {
    "winnerId": 12,
    "loserId": 45,
    "winnerDelta": 16.2,
    "loserDelta": -16.2
  },
  "nextMatchup": {
    "playerA": { "id": 7, "name": "...", "team": "...", "position": "...", "elo": 1520 },
    "playerB": { "id": 23, "name": "...", "team": "...", "position": "...", "elo": 1480 }
  }
}
```

## Vote Transaction

`POST /api/votes` must be one SQLite transaction:

1. Validate `playerAId`, `playerBId`, `winnerId` via Zod.
2. Fetch both players.
3. Confirm winner is one of the two; determine loser.
4. Calculate ELO changes.
5. Insert vote with before/after ratings.
6. Update both players' ELO, wins/losses/comparisons.
7. Commit.
8. Fetch next matchup after commit.

No network calls or slow work inside the transaction.

## SQLite Pragmas

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

## Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `SQLITE_DB_PATH` | Override DB file location | `/var/lib/football-ranker/football-ranker.sqlite` |
| `FOOTBALL_DATA_API_TOKEN` | Football-data.org API key | `...` |
| `ADMIN_SECRET` | Admin endpoint protection | `...` |
| `SESSION_SECRET` | HMAC signing for session cookies | `...` |

Local secrets in `.dev.vars`. Production secrets in `/etc/football-ranker.env`.

## Implementation Stages

| Stage | Plan | Focus |
|---:|---|---|
| 01 | `01-project-scaffolding.md` | Next.js scaffold, deps, config |
| 02 | `02-database-layer.md` | SQLite adapter, schema, migrations, pragmas |
| 03 | `03-elo-logic.md` | ELO calculation + tests |
| 04 | `04-player-import.md` | Football-data.org import script |
| 05 | `05-vote-service.md` | Vote casting with transactions |
| 06 | `06-api-routes.md` | All API route handlers |
| 07 | `07-vote-ui.md` | Player cards + voting interaction |
| 08 | `08-leaderboard-ui.md` | Rankings table with provisional labels |
| 09 | `09-rate-limiting.md` | Session cookies + basic rate limiting |
| 10 | `10-styling.md` | Dark theme, responsive layout, animations |
| 11 | `11-lint-test-build.md` | ESLint, Vitest, Playwright, CI |

## Validation Before Handoff

```bash
npm run lint
npm run test
npm run build
```

## Workflow

- Always create a feature branch off `main` for changes.
- Never commit or push directly to `main`.
- Open PRs for review.
- Only `statcat2017` may merge.
