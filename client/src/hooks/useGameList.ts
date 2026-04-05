import type { ErrorMsg, GameInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { type GameListParams, gameList } from "../services/gameService.ts";

/**
 * Custom hook to get the list of games, optionally filtered.
 * @param params - optional filters (clanId, userId, limit)
 * @param skip - if true, defer fetching until ready
 * @returns A message to display to the user (Loading... or an error message), or a list
 */
export default function useGameList(
  params?: GameListParams,
  skip = false,
): { message: string } | GameInfo[] {
  const [games, setGames] = useState<GameInfo[] | ErrorMsg | null>(null);

  const clanId = params?.clanId;
  const userId = params?.userId;
  const limit = params?.limit;

  useEffect(() => {
    if (skip) return;
    gameList(params).then(setGames);
  }, [clanId, userId, limit, skip]);

  if (skip || !games) return { message: "Loading..." };
  if ("error" in games) return { message: `Error: ${games.error}` };
  if (games.length === 0) return { message: "No games found..." };
  return games;
}
