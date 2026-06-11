import { describe, it, expect } from "vitest";
import { calculateElo, getKFactor } from "./elo";

describe("getKFactor", () => {
  it("returns 48 for fewer than 10 comparisons", () => {
    expect(getKFactor(0)).toBe(48);
    expect(getKFactor(5)).toBe(48);
    expect(getKFactor(9)).toBe(48);
  });

  it("returns 32 for 10-49 comparisons", () => {
    expect(getKFactor(10)).toBe(32);
    expect(getKFactor(25)).toBe(32);
    expect(getKFactor(49)).toBe(32);
  });

  it("returns 16 for 50 or more comparisons", () => {
    expect(getKFactor(50)).toBe(16);
    expect(getKFactor(100)).toBe(16);
  });
});

describe("calculateElo", () => {
  it("gives equal gain/loss for equal ratings (K=48, <10 comps)", () => {
    const result = calculateElo(1500, 1500, 5, 5);
    expect(result.winnerDelta).toBe(24); // 48 * (1 - 0.5) = 24
    expect(result.loserDelta).toBe(-24);
    expect(result.winnerNewRating).toBe(1524);
    expect(result.loserNewRating).toBe(1476);
  });

  it("higher-rated winner gains little", () => {
    const result = calculateElo(1600, 1400, 5, 5);
    expect(result.winnerDelta).toBeLessThan(15);
    expect(result.loserDelta).toBeGreaterThan(-20);
    expect(result.winnerNewRating).toBeGreaterThan(1600);
    expect(result.loserNewRating).toBeLessThan(1400);
  });

  it("upset gives large swing", () => {
    const result = calculateElo(1400, 1600, 5, 5);
    expect(result.winnerDelta).toBeGreaterThan(30);
    expect(result.loserDelta).toBeLessThan(-30);
  });

  it("uses different K for established vs provisional players", () => {
    const result = calculateElo(1500, 1500, 100, 5);
    // Established player (K=16) gains 8, provisional (K=48) loses 24
    expect(result.winnerDelta).toBe(8);
    expect(result.loserDelta).toBe(-24);
    expect(result.kFactor).toBe(16); // K of winner
  });

  it("ratings converge when expected winner wins", () => {
    const result = calculateElo(1600, 1400, 10, 10);
    expect(result.winnerNewRating).toBeGreaterThan(1600);
    expect(result.winnerNewRating).toBeLessThan(1610);
  });
});
