# Stage 03 — ELO Logic

## Goal

Implement the ELO rating calculation with dynamic K-factor and comprehensive tests.

## Dependencies

- Stage 02 (database layer — for test infrastructure)

## Steps

### 1. Create lib/elo.ts

Pure functions, no DB dependency:

```ts
export interface EloResult {
  winnerNewRating: number;
  loserNewRating: number;
  kFactor: number;
  winnerDelta: number;
  loserDelta: number;
}

export function getKFactor(comparisons: number): number {
  if (comparisons < 10) return 48;
  if (comparisons < 50) return 32;
  return 16;
}

export function calculateElo(
  winnerRating: number,
  loserRating: number,
  winnerComparisons: number,
  loserComparisons: number
): EloResult {
  // Standard ELO calculation
  // Expected score for winner
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  // Expected score for loser
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  const kWinner = getKFactor(winnerComparisons);
  const kLoser = getKFactor(loserComparisons);

  const winnerDelta = kWinner * (1 - expectedWinner);
  const loserDelta = kLoser * (0 - expectedLoser);

  return {
    winnerNewRating: Math.round((winnerRating + winnerDelta) * 100) / 100,
    loserNewRating: Math.round((loserRating + loserDelta) * 100) / 100,
    kFactor: kWinner,
    winnerDelta: Math.round(winnerDelta * 100) / 100,
    loserDelta: Math.round(loserDelta * 100) / 100,
  };
}
```

### 2. Create lib/elo.test.ts

Test cases:

| Scenario | Winner | Loser | Expected |
|---|---|---|---|
| Equal ratings | 1500 | 1500 | Winner gains ~24 (K=48 for <10 comparisons) |
| Higher-rated wins | 1600 | 1400 | Small gain for winner, small loss for loser |
| Upset (lower-rated wins) | 1400 | 1600 | Large gain for winner, large loss for loser |
| K-factor thresholds | — | — | K=48 for <10, K=32 for 10-49, K=50+ for 16 |
| Established vs provisional | 1500 (100 comps) | 1500 (5 comps) | Winner gains less (K=16) than loser loses (K=48) |

### 3. Edge cases to test

- Ratings converge when expected winner wins.
- Ratings diverge when expected loser wins (upset).
- Very high ratings (2000+) vs very low (1000) produce near-zero expected score.
- K-factor selection is correct at exact boundaries (10, 50).

## Verification

```bash
npm run test
```

## Key Design Decisions

- **Dynamic K**: prevents early lucky wins from dominating, while still allowing new players to move quickly.
- **Rounding**: ELO values rounded to 2 decimal places for display.
- **Separate K per player**: each player's K is based on their own comparison count, not the opponent's. This is simpler and still achieves the goal.
- **Pure functions**: easy to test, no side effects, no DB dependency.

## Blocks

- Stage 05 (vote service uses ELO calculation)
