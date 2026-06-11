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
