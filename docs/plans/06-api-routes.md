# Stage 06 — API Routes

## Goal

Implement all API route handlers: matchups, votes, and leaderboard.

## Dependencies

- Stage 02 (database layer)
- Stage 03 (ELO logic)
- Stage 04 (player import — need player data)
- Stage 05 (vote service)

## Steps

### 1. Create lib/players/queries.ts

```ts
export async function getRandomMatchup(db: AppDatabase): Promise<{ playerA: Player; playerB: Player }> {
  // MVP: prefer players with fewer comparisons, then random
  const candidates = await db.all<Player>(
    `SELECT * FROM players
     WHERE is_active = 1
     ORDER BY comparisons ASC, RANDOM()
     LIMIT 20`
  );

  // Pick two random from pool
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return { playerA: shuffled[0], playerB: shuffled[1] };
}

export async function getPlayer(db: AppDatabase, id: number): Promise<Player | undefined> {
  return db.get<Player>("SELECT * FROM players WHERE id = ?", id);
}

export async function getActivePlayerCount(db: AppDatabase): Promise<number> {
  const result = await db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM players WHERE is_active = 1"
  );
  return result?.count ?? 0;
}
```

### 2. Create lib/leaderboard/queries.ts

```ts
export interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  team_name: string | null;
  position_group: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  comparisons: number;
  is_provisional: boolean;
}

export async function getLeaderboard(
  db: AppDatabase,
  options: { includeProvisional?: boolean; limit?: number } = {}
): Promise<LeaderboardEntry[]> {
  const { includeProvisional = false, limit = 100 } = options;

  const whereClause = includeProvisional ? "" : "WHERE p.comparisons >= 10";

  const rows = await db.all<LeaderboardEntry>(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY p.elo_rating DESC) as rank,
       p.id, p.name, t.name as team_name, p.position_group,
       p.elo_rating, p.wins, p.losses, p.comparisons,
       CASE WHEN p.comparisons < 10 THEN 1 ELSE 0 END as is_provisional
     FROM players p
     LEFT JOIN teams t ON p.team_id = t.id
     ${whereClause}
     ORDER BY p.elo_rating DESC
     LIMIT ?`,
    limit
  );

  return rows;
}
```

### 3. Create app/api/matchups/next/route.ts

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { getRandomMatchup } from "@/lib/players/queries";

export async function GET() {
  const db = await getDatabase();
  const matchup = await getRandomMatchup(db);
  return NextResponse.json(matchup);
}
```

### 4. Create app/api/votes/route.ts

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { castVote, castVoteSchema } from "@/lib/votes/cast";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = castVoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const db = await getDatabase();
  const result = await castVote(db, parsed.data);
  return NextResponse.json(result);
}
```

### 5. Create app/api/leaderboard/route.ts

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/client";
import { getLeaderboard } from "@/lib/leaderboard/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeProvisional = url.searchParams.get("provisional") === "true";
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);

  const db = await getDatabase();
  const leaderboard = await getLeaderboard(db, { includeProvisional, limit });
  return NextResponse.json({ leaderboard });
}
```

### 6. Write tests

- `api/matchups/next.test.ts`: returns two different active players.
- `api/votes.test.ts`: valid vote updates stats, invalid vote returns 400.
- `api/leaderboard.test.ts`: returns ordered list, provisional filter works.

## Verification

```bash
npm run test
npm run build
```

## Key Design Decisions

- **Runtime declarations**: every DB-backed route has `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
- **Zod validation**: all inputs validated before touching DB.
- **Separate concerns**: route handlers are thin; logic lives in `lib/`.
- **Shared matchup function**: `getRandomMatchup()` used by both route handler and server component.

## Blocks

- Stage 07 (UI calls these APIs)
- Stage 08 (leaderboard UI uses these APIs)
