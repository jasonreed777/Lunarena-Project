import type { DailyStatusResponse, ErrorMsg, GameInfo } from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const DAILY_API_URL = `/api/game/daily`;

/**
 * Get or create today's daily game for the given game type.
 */
export const getDailyGame = async (gameType: string): APIResponse<GameInfo> => {
  try {
    const res = await api.get<GameInfo | ErrorMsg>(`${DAILY_API_URL}/${gameType}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Get today's daily game status and streak.
 */
export const getDailyStatus = async (): APIResponse<DailyStatusResponse> => {
  try {
    const res = await api.get<DailyStatusResponse | ErrorMsg>(`${DAILY_API_URL}/status`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
