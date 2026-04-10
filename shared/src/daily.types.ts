/** Game types that have daily puzzles */
export type DailyGameType = "minesweeper" | "circleconnect";

/** Status of one daily game for a user on a given day */
export interface DailyGameStatus {
  gameType: DailyGameType;
  date: string; // "YYYY-MM-DD"
  gameId: string | null; // null = not started
  completed: boolean;
  won?: boolean;
  completionTimeMs?: number;
}

/** Response from the daily status endpoint */
export interface DailyStatusResponse {
  date: string;
  games: DailyGameStatus[];
  streak: number; // consecutive days with all dailies completed
}
