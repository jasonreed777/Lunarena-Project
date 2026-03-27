import type { DailyPoints } from "../util/types";

/**
 * Gets the points for a user
 * @param username of the user
 */
export async function getUserPoints(username: string): Promise<number> {
  const res = await fetch(`/api/points/${username}`);

  if (!res.ok) {
    throw new Error("Failed to fetch user points");
  }

  return (await res.json()) as number;
}

/**
 * Gets the daily points for a user
 * @param username of the user
 */
export async function getUserDailyPoints(username: string): Promise<DailyPoints[]> {
  const res = await fetch(`/api/points/daily/${username}`);
  if (!res.ok) {
    throw new Error("Failed to fetch user daily points");
  }
  return (await res.json()) as DailyPoints[];
}

/**
 * Gets the login streak for a user
 * @param username of the user
 */
export async function getUserStreak(username: string): Promise<number> {
  const res = await fetch(`/api/points/streak/${username}`);
  if (!res.ok) {
    throw new Error("Failed to fetch user streak");
  }
  return (await res.json()) as number;
}
