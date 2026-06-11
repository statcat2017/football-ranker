import type { AppDatabase } from "../db/adapter";
import type { CastVoteInput, CastVoteResult } from "../types";
import { calculateElo } from "../elo";
import { getRandomMatchup } from "../players/queries";
import { verifyMatchup } from "../matchup-token";

export async function castVote(db: AppDatabase, input: CastVoteInput): Promise<{ vote: CastVoteResult["vote"] }> {
  const verification = verifyMatchup(input.matchupToken, input.playerAId, input.playerBId);
  if (!verification.valid) {
    throw new Error(`Invalid matchup token: ${verification.reason}`);
  }

  return db.transaction(async (txDb) => {
    const playerA = await txDb.get<Record<string, unknown>>(
      "SELECT * FROM players WHERE id = ?", [input.playerAId],
    );
    const playerB = await txDb.get<Record<string, unknown>>(
      "SELECT * FROM players WHERE id = ?", [input.playerBId],
    );

    if (!playerA || !playerB) {
      throw new Error("One or both players not found");
    }

    if (!playerA.is_active || !playerB.is_active) {
      throw new Error("One or both players are no longer active");
    }

    const winner = input.winnerId === input.playerAId ? playerA : playerB;
    const loser = input.winnerId === input.playerAId ? playerB : playerA;

    const eloResult = calculateElo(
      winner.elo_rating as number,
      loser.elo_rating as number,
      winner.comparisons as number,
      loser.comparisons as number,
    );

    const winnerNewRating = eloResult.winnerNewRating;
    const loserNewRating = eloResult.loserNewRating;

    const aEloAfter = input.winnerId === input.playerAId ? winnerNewRating : loserNewRating;
    const bEloAfter = input.winnerId === input.playerAId ? loserNewRating : winnerNewRating;

    await txDb.run(
      `INSERT INTO votes (
        player_a_id, player_b_id, winner_id, loser_id,
        player_a_elo_before, player_b_elo_before,
        player_a_elo_after, player_b_elo_after,
        k_factor, session_id, ip_hash, user_agent_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [playerA.id as number, playerB.id as number, winner.id as number, loser.id as number,
       playerA.elo_rating as number, playerB.elo_rating as number,
       aEloAfter, bEloAfter,
       eloResult.kFactor,
       input.sessionId ?? null,
       input.ipHash ?? null,
       input.userAgentHash ?? null],
    );

    await txDb.run(
      "UPDATE players SET elo_rating = ?, wins = wins + 1, comparisons = comparisons + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [winnerNewRating, winner.id as number],
    );

    await txDb.run(
      "UPDATE players SET elo_rating = ?, losses = losses + 1, comparisons = comparisons + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [loserNewRating, loser.id as number],
    );

    return {
      vote: {
        winnerId: winner.id as number,
        loserId: loser.id as number,
        winnerDelta: eloResult.winnerDelta,
        loserDelta: eloResult.loserDelta,
      },
    };
  });
}

export { getRandomMatchup };
