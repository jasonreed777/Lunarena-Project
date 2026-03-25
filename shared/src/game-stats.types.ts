import { z } from "zod";

// Represents a user's game statistics for a specific game type, including total wins and games played
export const zPerGameTypeStats = z.object({
  wins: z.number().int().nonnegative(),
  gamesPlayed: z.number().int().nonnegative(),
});

export type PerGameTypeStats = z.infer<typeof zPerGameTypeStats>;

// Represents a user's overall game statistics, including total wins, total games played, and breakdown by game
export const zUserGameStatsRecord = z.object({
  username: z.string(),
  winsTotal: z.number().int().nonnegative(),
  gamesPlayedTotal: z.number().int().nonnegative(),
  byGame: z.record(z.string(), zPerGameTypeStats),
  updatedAt: z.string().datetime(),
});

export type UserGameStatsRecord = z.infer<typeof zUserGameStatsRecord>;
