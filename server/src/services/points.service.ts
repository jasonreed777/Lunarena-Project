import { randomUUID } from "crypto";
import { PointsLedgerModel, UserPointsModel, UserModel } from "../mongoose-models.ts";
import type { PointReasonType } from "@gamenite/shared";
import { getUserByUsername } from "./auth.service.ts";

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

  const existingUserPoints = await getOrCreatePointRecord(username);

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
  const userPoints = await getOrCreatePointRecord(username);
  return userPoints.pointsTotal;
}

/**
 * Retrieves the points record for a user, creating it if it doesn't exist
 * @param username username to look up
 * @returns the points record
 */
export async function getOrCreatePointRecord(username: string) {
  if (!(await getUserByUsername(username))) {
    throw new Error("User does not exist");
  }
  const existingUserPoints = await UserPointsModel.findById(username);

  if (!existingUserPoints) {
    return UserPointsModel.create({
      _id: username,
      pointsTotal: 0,
      updatedAt: new Date().toISOString(),
      currentStreak: 0,
      lastStreakReceivedDate: new Date(0).toISOString(),
    });
  }
  return existingUserPoints;
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

/**
 * gets the current streak for the user, and resets or update it depending on the date
 * @param username the name of the user
 * @returns the updated streak for the yser
 */
export async function getOrUpdateStreak(username: string): Promise<number> {
  const points = await getOrCreatePointRecord(username);
  let streak = points.currentStreak ?? 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastStreakDate = points.lastStreakReceivedDate
    ? new Date(points.lastStreakReceivedDate)
    : null;

  if (!lastStreakDate || Number.isNaN(lastStreakDate.getTime())) {
    points.currentStreak = 1;
    points.lastStreakReceivedDate = new Date().toISOString();
    await points.save();
    await awardPoints(username, 1, "streak", "Day 1 streak");
    return 1;
  }

  lastStreakDate.setHours(0, 0, 0, 0);

  if (lastStreakDate.getTime() === today.getTime()) {
    return streak;
  }

  if (lastStreakDate.getTime() === yesterday.getTime()) {
    streak += 1;
  } else {
    streak = 1;
  }

  points.currentStreak = streak;
  points.lastStreakReceivedDate = new Date().toISOString();
  await points.save();
  await awardPoints(username, streak > 5 ? 5 : streak, "streak", `Day ${streak} streak`);

  return streak;
}
