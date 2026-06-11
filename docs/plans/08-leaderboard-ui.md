# Stage 08 — Leaderboard UI

## Goal

Build a rankings page showing ELO-based leaderboard with provisional labels.

## Dependencies

- Stage 01 (project scaffolding)
- Stage 02 (database layer)
- Stage 06 (API routes)

## Steps

### 1. Create app/leaderboard/page.tsx (server component)

```ts
import { getDatabase } from "@/lib/db/client";
import { getLeaderboard } from "@/lib/leaderboard/queries";
import { Leaderboard } from "@/components/Leaderboard";

export default async function LeaderboardPage() {
  const db = await getDatabase();
  const leaderboard = await getLeaderboard(db, { limit: 100 });

  return (
    <main>
      <h1>Leaderboard</h1>
      <p>Top Premier League players ranked by fan votes</p>
      <Leaderboard initialData={leaderboard} />
    </main>
  );
}
```

### 2. Create components/Leaderboard.tsx (client component)

```tsx
"use client";

import { useState, useEffect } from "react";

interface LeaderboardEntry {
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

interface LeaderboardProps {
  initialData: LeaderboardEntry[];
}

export function Leaderboard({ initialData }: LeaderboardProps) {
  const [data, setData] = useState(initialData);
  const [showProvisional, setShowProvisional] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(
        `/api/leaderboard?provisional=${showProvisional}`
      );
      const { leaderboard } = await res.json();
      setData(leaderboard);
    }, 30000);
    return () => clearInterval(interval);
  }, [showProvisional]);

  return (
    <div className="leaderboard">
      <div className="leaderboard-controls">
        <label>
          <input
            type="checkbox"
            checked={showProvisional}
            onChange={e => setShowProvisional(e.target.checked)}
          />
          Show provisional rankings
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Team</th>
            <th>Position</th>
            <th>ELO</th>
            <th>W</th>
            <th>L</th>
            <th>Matches</th>
          </tr>
        </thead>
        <tbody>
          {data.map(entry => (
            <tr
              key={entry.id}
              className={entry.is_provisional ? "provisional" : ""}
            >
              <td>{entry.rank}</td>
              <td>{entry.name}</td>
              <td>{entry.team_name}</td>
              <td>{entry.position_group}</td>
              <td>{Math.round(entry.elo_rating)}</td>
              <td>{entry.wins}</td>
              <td>{entry.losses}</td>
              <td>
                {entry.comparisons}
                {entry.is_provisional && (
                  <span className="provisional-badge">Provisional</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 3. Display rules

| Criteria | Treatment |
|---|---|
| ≥ 10 comparisons | Full ranking, normal row |
| < 10 comparisons | "Provisional" badge, greyed row |
| Default view | Only qualified players |
| Toggle | "Show provisional rankings" checkbox |

### 4. Auto-refresh

- Poll `/api/leaderboard` every 30 seconds.
- Only refresh when tab is visible (use `document.visibilityState`).
- Show "Updated X seconds ago" timestamp.

### 5. Responsive design

- Desktop: full table with all columns.
- Mobile: condensed view — rank, name, team, ELO.
- Top 3 get special styling (gold, silver, bronze).

## Verification

```bash
npm run dev
# Visit /leaderboard, verify rankings display, provisional label appears
npm run build
```

## Key Design Decisions

- **Provisional filter**: default view only shows qualified players.
- **Auto-refresh**: keeps data fresh without manual reload.
- **Server-first initial load**: first leaderboard fetched server-side.
- **Comparisons prominent**: helps users judge ranking confidence.

## Blocks

- Stage 10 (styling polish)
