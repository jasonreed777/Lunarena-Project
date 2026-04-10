import type { DailyObjectivesResponse } from "@gamenite/shared";
import type { RestAPI } from "../types.ts";
import { getDailyObjectives } from "../services/daily-objectives.service.ts";

/**
 * GET /api/game/daily/objectives
 * Get today's daily objectives and the authenticated user's progress.
 */
export const getObjectives: RestAPI<DailyObjectivesResponse> = async (req, res) => {
  try {
    const result = await getDailyObjectives(req.authUser.username);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: `Failed to get daily objectives: ${String(err)}` });
  }
};
