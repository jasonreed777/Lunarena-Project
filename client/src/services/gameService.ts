import type { ErrorMsg, GameInfo, GameKey } from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const GAME_API_URL = `/api/game`;

/**
 * Sends a POST request to create a game
 */
export const createGame = async (gameKey: GameKey): APIResponse<GameInfo> => {
  try {
    const res = await api.post<GameInfo | ErrorMsg>(`${GAME_API_URL}/create`, {
      payload: gameKey,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a GET request to get a game
 */
export const getGameById = async (gameId: string): APIResponse<GameInfo> => {
  try {
    const res = await api.get<GameInfo | ErrorMsg>(`${GAME_API_URL}/${gameId}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export interface GameListParams {
  clanId?: string;
  userId?: string;
  limit?: number;
  status?: "waiting" | "active" | "done";
}

/**
 * Sends a GET request for games, optionally filtered by clan or user
 */
export const gameList = async (params?: GameListParams): APIResponse<GameInfo[]> => {
  try {
    const res = await api.get<GameInfo[] | ErrorMsg>(`${GAME_API_URL}/list`, { params });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
