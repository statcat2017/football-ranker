import type { AppDatabase } from "../db/adapter";
import type { CastVoteInput, CastVoteResult, Player, PlayerSummary } from "../types";
import { calculateElo } from "../elo";
import { getRandomMatchup } from "../players/queries";

export async function castVote(db: AppDatabase, input: CastVoteInput): Promise<CastVoteResult> {
  return db.transaction(async (txDb) => {
    const playerA = await txDb.get<Player>("SELECT * FROM players WHERE id = ?", [input.playerAId]);
    const playerB = await txDb.get<Player>("SELECT * FROM players WHERE id = ?", [input.playerBId]);

    if (!playerA || !playerB) {
      throw new Error("One or both players not found");
    }

    if (!playerA.is_active || !playerB.is_active) {
      throw new Error("One or both players are no longer active");
    }

    if (input.winnerId !== input.playerAId && input.winnerId !== input.playerBId) {
      throw new Error("Winner must be one of the two players");
    }

    const winner = input.winnerId === input.playerAId ? playerA : playerB;
    const loser = input.winnerId === input.playerAId ? playerB : playerA;

    const eloResult = calculateElo(
      winner.elo_rating,
      loser.elo_rating,
      winner.comparisons,
      loser.comparisons,
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
      [playerA.id, playerB.id, winner.id, loser.id,
       playerA.elo_rating, playerB.elo_rating,
       aEloAfter, bEloAfter,
       eloResult.kFactor,
       input.sessionId ?? null,
       input.ipHash ?? null,
       input.userAgentHash ?? null],
    );

    await txDb.run(
      "UPDATE players SET elo_rating = ?, wins = wins + 1, comparisons = comparisons + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [winnerNewRating, winner.id],
    );

    await txDb.run(
      "UPDATE players SET elo_rating = ?, losses = losses + 1, comparisons = comparisons + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [loserNewRating, loser.id],
    );

    return {
      vote: {
        winnerId: winner.id,
        loserId: loser.id,
        winnerDelta: eloResult.winnerDelta,
        loserDelta: eloResult.loserDelta,
      },
      nextMatchup: { playerA: null as unknown as PlayerSummary, playerB: null as unknown as PlayerSummary },
    };
  }).then(async (result) => {
    const nextMatchup = await getRandomMatchup(db);
    result.nextMatchup = nextMatchup;
    return result;
  });
}
