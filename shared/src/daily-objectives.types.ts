/** All possible objective action IDs */
export type ObjectiveActionId =
  | "play_games"
  | "win_games"
  | "play_game_type"
  | "complete_daily"
  | "complete_both_dailies"
  | "send_dms"
  | "send_game_chat"
  | "create_dm_conversation"
  | "create_thread"
  | "post_comments"
  | "vote_on_comments"
  | "send_friend_request";

export type ObjectiveCategory = "game" | "social" | "forum" | "friends";

/** A single objective as rendered on the client */
export interface DailyObjectiveInfo {
  objectiveId: ObjectiveActionId;
  description: string;
  category: ObjectiveCategory;
  target: number;
  current: number;
  completed: boolean;
  pointsReward: number;
}

/** Response from GET /api/game/daily/objectives */
export interface DailyObjectivesResponse {
  date: string;
  objectives: DailyObjectiveInfo[];
  allCompleted: boolean;
  bonusAwarded: boolean;
}
