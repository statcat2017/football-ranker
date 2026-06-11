# Stage 07 — Vote UI

## Goal

Build the main voting interface: two player cards side-by-side, click to pick the better player.

## Dependencies

- Stage 01 (project scaffolding)
- Stage 02 (database layer — for server component data)
- Stage 06 (API routes — for client-side vote submission)

## Steps

### 1. Create app/vote/page.tsx (server component)

```ts
import { getDatabase } from "@/lib/db/client";
import { getRandomMatchup } from "@/lib/players/queries";
import { VotePanel } from "@/components/VotePanel";

export default async function VotePage() {
  const db = await getDatabase();
  const matchup = await getRandomMatchup(db);

  return (
    <main>
      <h1>Who's better?</h1>
      <p>Pick the stronger Premier League player</p>
      <VotePanel initialMatchup={matchup} />
    </main>
  );
}
```

### 2. Create components/PlayerCard.tsx

```tsx
interface PlayerCardProps {
  player: {
    id: number;
    name: string;
    position_group: string | null;
    nationality: string | null;
    shirt_number: number | null;
    team_name: string | null;
    team_crest_url: string | null;
    elo_rating: number;
    comparisons: number;
  };
  onSelect: () => void;
  disabled: boolean;
}
```

Visual design:

- Large card with player initials (or photo if available later)
- Team crest (small icon)
- Name in bold
- Position group badge (e.g., "Midfielder")
- Nationality flag or text
- Shirt number
- Subtle ELO display (small, not prominent — don't want users seeing ratings before voting)
- Hover effect: green border/glow
- Click handler triggers `onSelect`

### 3. Create components/VotePanel.tsx (client component)

```tsx
"use client";

import { useState, useCallback } from "react";
import { PlayerCard } from "./PlayerCard";

interface Matchup {
  playerA: Player;
  playerB: Player;
}

interface VotePanelProps {
  initialMatchup: Matchup;
}

export function VotePanel({ initialMatchup }: VotePanelProps) {
  const [matchup, setMatchup] = useState(initialMatchup);
  const [voting, setVoting] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  const handleVote = useCallback(async (winnerId: number) => {
    setVoting(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerAId: matchup.playerA.id,
          playerBId: matchup.playerB.id,
          winnerId,
        }),
      });
      const data = await res.json();
      setMatchup(data.nextMatchup);
      setVoteCount(prev => prev + 1);
    } finally {
      setVoting(false);
    }
  }, [matchup]);

  return (
    <div className="vote-panel">
      <div className="matchup">
        <PlayerCard
          player={matchup.playerA}
          onSelect={() => handleVote(matchup.playerA.id)}
          disabled={voting}
        />
        <span className="vs">VS</span>
        <PlayerCard
          player={matchup.playerB}
          onSelect={() => handleVote(matchup.playerB.id)}
          disabled={voting}
        />
      </div>
      <p className="vote-count">You've voted {voteCount} times</p>
    </div>
  );
}
```

### 4. Handle edge cases

- **Only 1 active player**: show message "Not enough players to compare"
- **API error**: show retry button
- **Loading state**: disable cards during vote submission
- **Transition animation**: brief fade/slide between matchups

### 5. Server vs client split

- **Server component** (`app/vote/page.tsx`): fetches initial matchup from DB directly (no HTTP round-trip).
- **Client component** (`VotePanel.tsx`): handles vote submission and matchup refresh via API.

This avoids fetching the first matchup over HTTP.

## Verification

```bash
npm run dev
# Visit /vote, click a player, verify next pair loads
npm run build
```

## Key Design Decisions

- **Server-first initial load**: first matchup fetched server-side, subsequent ones via API.
- **No ELO shown during voting**: prevents anchoring bias.
- **Vote count displayed**: shows user their engagement.
- **Disabled during vote**: prevents double-clicks.

## Blocks

- Stage 09 (rate limiting on vote endpoint)
- Stage 10 (styling polish)
