import { randomUUID } from "crypto";
import { PointsLedgerModel, UserPointsModel, UserModel } from "../mongoose-models.ts";
import type { PointReasonType } from "@gamenite/shared";

/**
 * Awards points to a user by:
 * 1. recording the award in the points ledger
 * 2. updating the user's running points total
 */
export async function awardPoints(
  username: string,
  pointsAdded: number,
  reasonType: PointReasonType,
  reason: string,
  refId?: string,
): Promise<void> {
  if (refId) {
    const alreadyAwarded = await hasExistingPointAward(username, reasonType, refId);
    if (alreadyAwarded) {
      return;
    }
  }

  const now = new Date().toISOString();

  await PointsLedgerModel.create({
    _id: randomUUID(),
    username,
    pointsAdded,
    reasonType,
    reason,
    refId,
    createdAt: now,
  });

  const existingUserPoints = await UserPointsModel.findById(username);

  if (!existingUserPoints) {
    await UserPointsModel.create({
      _id: username,
      pointsTotal: pointsAdded,
      updatedAt: now,
    });
    return;
  }

  existingUserPoints.pointsTotal += pointsAdded;
  existingUserPoints.updatedAt = now;
  await existingUserPoints.save();
}

/**
 * Retrieves the total points for a user
 * @param username username to look up
 * @returns user points total, or 0 if user has no points record
 */
export async function getUserPoints(username: string): Promise<number> {
  const userPoints = await UserPointsModel.findById(username);
  return userPoints ? userPoints.pointsTotal : 0;
}

/**
 * Checks if a user has already received points for a specific reason (to prevent duplicate awards)
 * @param username username to check
 * @param reasonType reason type to check
 * @param refId reference ID for the point award
 * @returns true if an existing award is found, false otherwise
 */
export async function hasExistingPointAward(
  username: string,
  reasonType: PointReasonType,
  refId: string,
): Promise<boolean> {
  const existingAward = await PointsLedgerModel.findOne({
    username,
    reasonType,
    refId,
  });

  return existingAward !== null;
}

/**
 * Represents one leaderboard entry
 */
export interface LeaderboardEntry {
  username: string;
  display: string;
  pointsTotal: number;
}

/**
 * Returns the top users ranked by total points.
 * @param limit maximum number of users to return
 */
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  // Get top users sorted by pointsTotal in descending order, limited to the specified number
  const entries = await UserPointsModel.find({}).sort({ pointsTotal: -1 }).limit(limit);

  const leaderboard = await Promise.all(
    entries.map(async (entry) => {
      const user = await UserModel.findOne({ username: entry._id }).lean();

      return {
        username: entry._id,
        display: user?.display ?? entry._id,
        pointsTotal: entry.pointsTotal,
      };
    }),
  );

  return leaderboard;
}
