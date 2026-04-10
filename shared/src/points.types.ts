import { z } from "zod";

// Allowed reasons for awarding points
export const zPointReasonType = z.enum(["win", "streak", "achievement", "objective"]);

export type PointReasonType = z.infer<typeof zPointReasonType>;

// Stores a user's current total points
export const zUserPointsRecord = z.object({
  username: z.string(),
  pointsTotal: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type UserPointsRecord = z.infer<typeof zUserPointsRecord>;

// Stores a record of points awarded to users
export const zPointsLedgerRecord = z.object({
  id: z.string(),
  username: z.string(),
  pointsAdded: z.number().int().positive(),
  reasonType: zPointReasonType,
  reason: z.string(),
  refId: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type PointsLedgerRecord = z.infer<typeof zPointsLedgerRecord>;
