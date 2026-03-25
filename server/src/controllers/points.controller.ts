import type { Request, Response } from "express";
import { getLeaderboard as getLeaderboardService } from "../services/points.service.ts";

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
