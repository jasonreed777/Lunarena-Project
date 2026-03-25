import type { Request, Response } from "express";
import {
  getUserPoints,
  getLeaderboard as getLeaderboardService,
  getOrUpdateStreak,
} from "../services/points.service.ts";

/**
 * Returns the top users by points
 */
export async function getLeaderboard(_req: Request, res: Response): Promise<void> {
  try {
    const leaderboard = await getLeaderboardService();
    res.status(200).send(leaderboard);
  } catch (err) {
    res.status(500).send({
      error: `failed to fetch leaderboard: ${String(err)}`,
    });
  }
}

/**
 * Returns total points for a user
 */
export async function getPointsByUsername(req: Request, res: Response): Promise<void> {
  try {
    // validate username param
    const username = req.params.username;

    if (typeof username !== "string") {
      res.status(400).send({ error: "invalid username" });
      return;
    }

    const points = await getUserPoints(username);

    res.status(200).send(points);
  } catch (err) {
    res.status(500).send({
      error: `failed to fetch user points: ${String(err)}`,
    });
  }
}

export async function getStreakByUsername(req: Request, res: Response): Promise<void> {
  // validate username param
  try {
    const username = req.params.username;
    if (typeof username !== "string") {
      res.status(400).send({ error: "username must be a string" });
      return;
    }
    const streak = await getOrUpdateStreak(username);
    res.status(200).send(streak);
  } catch (err) {
    res.status(500).send({
      error: `failed to fetch streak: ${String(err)}`,
    });
  }
}
