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

// User-facing profile game stats, including wins, games played, and losses
export const zProfileGameStats = z.object({
  wins: z.number().int().nonnegative(),
  gamesPlayed: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
});

export type ProfileGameStats = z.infer<typeof zProfileGameStats>;
// User-facing profile with stats, including profile info and game stats
export const zUserProfileWithStats = z.object({
  username: z.string(),
  bio: z.string(),
  pfp: z.object({
    type: z.enum(["upload", "avatar"]),
    uploadId: z.string().optional(),
    avatarId: z.string().optional(),
  }),
  titleId: z.string().optional(),
  profileBorderColor: z.string(),
  updatedAt: z.string(),
  totalTimePlayedMS: z.number().nonnegative(),
  onlinePresence: z.object({
    status: z.enum(["active", "offline"]),
    activeGameId: z.string().optional(),
    lastActive: z.string(),
  }),
  stats: z.object({
    overall: zProfileGameStats,
    byGame: z.record(z.string(), zProfileGameStats),
  }),
});

export type UserProfileWithStats = z.infer<typeof zUserProfileWithStats>;
