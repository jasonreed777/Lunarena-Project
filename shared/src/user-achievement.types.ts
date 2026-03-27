import { z } from "zod";

// Represents a record of a user earning an achievement
export const zUserAchievementRecord = z.object({
  id: z.string(),
  username: z.string(),
  achievementId: z.string(),
  achievedAt: z.string().datetime(),
});

export type UserAchievementRecord = z.infer<typeof zUserAchievementRecord>;
