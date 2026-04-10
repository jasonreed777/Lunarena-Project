import type { Game, GameInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { gameList } from "../services/gameService.ts";
import type { LeaderboardProps } from "../util/types.ts";

// parses each game in the game list and records the total number of plays alongisde the name
const getRankingsForGameList = (gameList: GameInfo[]): Record<Game, number> => {
  const dummy: Record<Game, number> = {
    nim: 0,
    guess: 0,
    minesweeper: 0,
    circleconnect: 0,
  };
  gameList.forEach((game) => {
    dummy[game.type] = dummy[game.type] + 1;
  });
  return dummy;
};

// parses rankings into leaderboard props
const parseRankings = (dummy: Record<Game, number>): LeaderboardProps => {
  const parsed = Object.entries(dummy).sort((a, b) => b[1] - a[1]);
  return parsed.map(([key, value]) => ({
    name: key,
    pointsTotal: value,
  }));
};

/**
 * Custom hook to get the list of games, sorted by popularity.
 * @returns LeaderboardProps for displaying the most popular games.
 */
export default function useGamePopularity(): LeaderboardProps {
  const [ranking, setRanking] = useState<LeaderboardProps>([]);

  useEffect(() => {
    gameList().then((result) => {
      if (!("error" in result)) {
        const initRanking = getRankingsForGameList(result);
        setRanking(parseRankings(initRanking));
      }
    });
  }, []);

  return ranking;
}
