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
  loserComparisons: number,
): EloResult {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));

  const kWinner = getKFactor(winnerComparisons);
  const kLoser = getKFactor(loserComparisons);
  const k = Math.max(kWinner, kLoser);

  const winnerDelta = k * (1 - expectedWinner);
  const loserDelta = k * (0 - (1 - expectedWinner));

  return {
    winnerNewRating: Math.round((winnerRating + winnerDelta) * 100) / 100,
    loserNewRating: Math.round((loserRating + loserDelta) * 100) / 100,
    kFactor: k,
    winnerDelta: Math.round(winnerDelta * 100) / 100,
    loserDelta: Math.round(loserDelta * 100) / 100,
  };
}
