# Stage 05 — Vote Service

## Goal

Implement the vote casting logic with full transaction support and audit trail.

## Dependencies

- Stage 02 (database layer)
- Stage 03 (ELO logic)

## Steps

### 1. Create lib/votes/cast.ts

```ts
export interface CastVoteInput {
  playerAId: number;
  playerBId: number;
  winnerId: number;
  sessionId?: string;
  ipHash?: string;
  userAgentHash?: string;
}

export interface CastVoteResult {
  vote: {
    winnerId: number;
    loserId: number;
    winnerDelta: number;
    loserDelta: number;
  };
  nextMatchup: {
    playerA: PlayerSummary;
    playerB: PlayerSummary;
  };
}
```

### 2. Transaction flow

```ts
export async function castVote(db: AppDatabase, input: CastVoteInput): Promise<CastVoteResult> {
  return db.transaction(() => {
    // 1. Validate input
    // 2. Fetch both players
    // 3. Confirm winner is one of the two
    // 4. Determine loser
    // 5. Calculate ELO changes
    // 6. Insert vote with before/after ratings
    // 7. Update both players' stats
    // 8. Return result
  });
}
```

### 3. Validation rules

```ts
import { z } from "zod";

export const castVoteSchema = z.object({
  playerAId: z.number().int().positive(),
  playerBId: z.number().int().positive(),
  winnerId: z.number().int().positive(),
}).refine(
  (data) => data.playerAId !== data.playerBId,
  { message: "Cannot vote for the same player twice" }
).refine(
  (data) => data.winnerId === data.playerAId || data.winnerId === data.playerBId,
  { message: "Winner must be one of the two players" }
);
```

### 4. SQL for vote insert

```sql
INSERT INTO votes (
  player_a_id, player_b_id, winner_id, loser_id,
  player_a_elo_before, player_b_elo_before,
  player_a_elo_after, player_b_elo_after,
  k_factor, session_id, ip_hash, user_agent_hash
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 5. SQL for player stat updates

```sql
-- Winner update
UPDATE players
SET elo_rating = ?,
    wins = wins + 1,
    comparisons = comparisons + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

-- Loser update
UPDATE players
SET elo_rating = ?,
    losses = losses + 1,
    comparisons = comparisons + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

### 6. Get next matchup after vote

Call the matchup generator (Stage 06 will refine this) to get the next pair.

### 7. Write tests

- `lib/votes/cast.test.ts`:
  - Valid vote updates both players' ELO.
  - Winner's ELO increases, loser's decreases.
  - Winner's wins increment, loser's losses increment.
  - Both players' comparisons increment.
  - Vote record stores correct before/after values.
  - Same player twice is rejected.
  - Winner not in matchup is rejected.
  - Transaction rolls back on error.

## Verification

```bash
npm run test
```

## Key Design Decisions

- **Atomic transaction**: all DB changes happen in one transaction.
- **Audit trail**: full ELO history stored in votes table.
- **No network calls in transaction**: pure SQLite only.
- **CHECK constraints**: enforced at DB level (from schema).

## Blocks

- Stage 06 (API routes use vote service)
