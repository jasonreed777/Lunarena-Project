import { z } from "zod";

// Represents an achievement that can be earned by users
export const zAchievementRecord = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  pointsAwarded: z.number().int().nonnegative(),
});

export type AchievementRecord = z.infer<typeof zAchievementRecord>;