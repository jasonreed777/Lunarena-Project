import type { DailyGameType, DailyStatusResponse, GameInfo } from "@gamenite/shared";
import type { RestAPI } from "../types.ts";
import {
  getOrCreateDailyGame,
  getDailyStatus as getDailyStatusService,
} from "../services/daily.service.ts";

const validDailyTypes = new Set<string>(["minesweeper", "circleconnect"]);

/**
 * GET /api/game/daily/:gameType
 * Get or create today's daily game for the authenticated user.
 */
export const getDailyGame: RestAPI<GameInfo, { gameType: string }> = async (req, res) => {
  const { gameType } = req.params;
  if (!validDailyTypes.has(gameType)) {
    res.status(400).send({ error: `Invalid daily game type: ${gameType}` });
    return;
  }

  try {
    const game = await getOrCreateDailyGame(req.authUser, gameType as DailyGameType);
    res.send(game);
  } catch (err) {
    res.status(500).send({ error: `Failed to get daily game: ${String(err)}` });
  }
};

/**
 * GET /api/game/daily/status
 * Get today's daily game status and streak for the authenticated user.
 */
export const getDailyStatus: RestAPI<DailyStatusResponse> = async (req, res) => {
  try {
    const status = await getDailyStatusService(req.authUser.username);
    res.send(status);
  } catch (err) {
    res.status(500).send({ error: `Failed to get daily status: ${String(err)}` });
  }
};
