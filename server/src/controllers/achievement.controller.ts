import type { Request, Response } from "express";
import { getUserAchievements } from "../services/achievement.service.ts";

/**
 * Returns earned achievements for a user
 */
export async function getAchievementsByUsername(req: Request, res: Response): Promise<void> {
  try {
    const username = req.params.username;

    if (typeof username !== "string") {
      res.status(400).send({ error: "invalid username" });
      return;
    }

    const achievements = await getUserAchievements(username);

    res.status(200).send(achievements);
  } catch (err) {
    res.status(500).send({
      error: `failed to fetch user achievements: ${String(err)}`,
    });
  }
}
