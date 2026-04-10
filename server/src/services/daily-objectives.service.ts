import { randomUUID } from "node:crypto";
import type {
  ObjectiveActionId,
  ObjectiveCategory,
  DailyObjectiveInfo,
  DailyObjectivesResponse,
} from "@gamenite/shared";
import { DailyObjectiveProgressModel } from "../mongoose-models.ts";
import { awardPoints } from "./points.service.ts";
import { getTodayDateString } from "./daily.service.ts";
import { seededRandomForDaily } from "../games/seededRandom.ts";
import { eventBus, type ObjectiveEventName, type ObjectiveEventPayloads } from "./eventBus.ts";

// ---------------------------------------------------------------------------
// Objective Catalog (static, in-memory)
// ---------------------------------------------------------------------------

interface ObjectiveDefinition {
  id: ObjectiveActionId;
  category: ObjectiveCategory;
  descriptionTemplate: string;
  events: ObjectiveEventName[];
  minTarget: number;
  maxTarget: number;
  pointsReward: number;
  matchPayload?: (
    payload: ObjectiveEventPayloads[ObjectiveEventName],
    resolvedParams?: Record<string, string>,
  ) => boolean;
}

const GAME_TYPES = ["nim", "guess", "minesweeper", "circleconnect"] as const;

const OBJECTIVE_CATALOG: ObjectiveDefinition[] = [
  // --- GAME ---
  {
    id: "play_games",
    category: "game",
    descriptionTemplate: "Play {n} game(s)",
    events: ["gameCompleted"],
    minTarget: 1,
    maxTarget: 3,
    pointsReward: 5,
  },
  {
    id: "win_games",
    category: "game",
    descriptionTemplate: "Win {n} game(s)",
    events: ["gameWon"],
    minTarget: 1,
    maxTarget: 2,
    pointsReward: 8,
  },
  {
    id: "play_game_type",
    category: "game",
    descriptionTemplate: "Play a game of {gameType}",
    events: ["gameCompleted"],
    minTarget: 1,
    maxTarget: 1,
    pointsReward: 5,
    matchPayload: (payload, params) => {
      const p = payload as ObjectiveEventPayloads["gameCompleted"];
      return p.gameType === params?.gameType;
    },
  },
  {
    id: "complete_daily",
    category: "game",
    descriptionTemplate: "Complete a daily puzzle",
    events: ["dailyCompleted"],
    minTarget: 1,
    maxTarget: 1,
    pointsReward: 5,
  },
  // --- SOCIAL ---
  {
    id: "send_dms",
    category: "social",
    descriptionTemplate: "Send {n} direct message(s)",
    events: ["dmMessageSent"],
    minTarget: 3,
    maxTarget: 5,
    pointsReward: 5,
  },
  {
    id: "send_game_chat",
    category: "social",
    descriptionTemplate: "Send a message in game chat",
    events: ["gamechatMessageSent"],
    minTarget: 1,
    maxTarget: 1,
    pointsReward: 3,
  },
  {
    id: "create_dm_conversation",
    category: "social",
    descriptionTemplate: "Start a new DM conversation",
    events: ["dmChatCreated"],
    minTarget: 1,
    maxTarget: 1,
    pointsReward: 5,
  },
  // --- FORUM ---
  {
    id: "create_thread",
    category: "forum",
    descriptionTemplate: "Create a forum post",
    events: ["forumThreadCreated"],
    minTarget: 1,
    maxTarget: 1,
    pointsReward: 5,
  },
  {
    id: "post_comments",
    category: "forum",
    descriptionTemplate: "Post {n} comment(s) on threads",
    events: ["forumCommentPosted"],
    minTarget: 2,
    maxTarget: 3,
    pointsReward: 5,
  },
  {
    id: "vote_on_comments",
    category: "forum",
    descriptionTemplate: "Vote on {n} comment(s)",
    events: ["forumVoteCast"],
    minTarget: 1,
    maxTarget: 3,
    pointsReward: 3,
  },
  // --- FRIENDS ---
  {
    id: "send_friend_request",
    category: "friends",
    descriptionTemplate: "Send a friend request",
    events: ["friendRequestSent"],
    minTarget: 1,
    maxTarget: 1,
    pointsReward: 3,
  },
];

// ---------------------------------------------------------------------------
// Selected Objective (resolved for a specific day)
// ---------------------------------------------------------------------------

/** A fully resolved objective for a specific day, with its target and rendered description. */
export interface SelectedObjective {
  definition: ObjectiveDefinition;
  target: number;
  description: string;
  resolvedParams?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Daily Selection Algorithm
// ---------------------------------------------------------------------------

/**
 * Deterministically select 3 objectives for a given date.
 * All users get the same objectives on the same day.
 */
export function selectDailyObjectives(dateStr: string): SelectedObjective[] {
  const random = seededRandomForDaily(dateStr, "objectives");

  // Group objectives by category
  const byCategory = new Map<ObjectiveCategory, ObjectiveDefinition[]>();
  for (const obj of OBJECTIVE_CATALOG) {
    const list = byCategory.get(obj.category) ?? [];
    list.push(obj);
    byCategory.set(obj.category, list);
  }

  // Fisher-Yates shuffle of category keys
  const categories = [...byCategory.keys()];
  for (let i = categories.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [categories[i], categories[j]] = [categories[j], categories[i]];
  }

  const selected: SelectedObjective[] = [];
  for (const category of categories) {
    if (selected.length >= 3) break;
    const pool = byCategory.get(category)!;

    // Pick a random objective from this category
    const idx = Math.floor(random() * pool.length);
    const def = pool[idx];

    // Resolve variable target
    const target =
      def.minTarget === def.maxTarget
        ? def.minTarget
        : def.minTarget + Math.floor(random() * (def.maxTarget - def.minTarget + 1));

    // Resolve parameterized descriptions
    let description = def.descriptionTemplate.replace("{n}", String(target));
    const resolvedParams: Record<string, string> = {};

    if (def.id === "play_game_type") {
      const gameType = GAME_TYPES[Math.floor(random() * GAME_TYPES.length)];
      resolvedParams.gameType = gameType;
      description = description.replace("{gameType}", gameType);
    }

    selected.push({ definition: def, target, description, resolvedParams });
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Progress Tracking
// ---------------------------------------------------------------------------

/**
 * Load existing progress records for the given user/date, creating any missing ones.
 * Returns one record per objective in the same order as the input list.
 */
async function getOrCreateProgress(
  username: string,
  dateStr: string,
  objectives: SelectedObjective[],
) {
  const existing = await DailyObjectiveProgressModel.find({
    username,
    date: dateStr,
  }).lean();

  const records = [];
  for (const obj of objectives) {
    const found = existing.find((r) => r.objectiveId === obj.definition.id);
    if (found) {
      records.push(found);
    } else {
      const newRecord = await DailyObjectiveProgressModel.create({
        _id: randomUUID(),
        username,
        date: dateStr,
        objectiveId: obj.definition.id,
        target: obj.target,
        current: 0,
        completed: false,
        pointsAwarded: false,
      });
      records.push(newRecord.toObject());
    }
  }

  return records;
}

/**
 * Increment a single objective's progress by one. Awards points on completion.
 * Returns the updated objective info for real-time client emission, or null if unchanged.
 */
async function incrementProgress(
  username: string,
  objectiveId: string,
  dateStr: string,
): Promise<DailyObjectiveInfo | null> {
  const record = await DailyObjectiveProgressModel.findOne({
    username,
    date: dateStr,
    objectiveId,
  });

  if (!record || record.completed) return null;

  record.current = Math.min(record.current + 1, record.target);
  const justCompleted = record.current >= record.target && !record.completed;

  if (justCompleted) {
    record.completed = true;
    record.completedAt = new Date().toISOString();

    if (!record.pointsAwarded) {
      const objective = OBJECTIVE_CATALOG.find((o) => o.id === objectiveId);
      if (objective) {
        await awardPoints(
          username,
          objective.pointsReward,
          "objective",
          `Completed daily objective: ${objectiveId}`,
          `daily-obj-${objectiveId}-${dateStr}`,
        );
        record.pointsAwarded = true;
      }
    }
  }

  await record.save();

  const todayObjectives = selectDailyObjectives(dateStr);
  const selectedObj = todayObjectives.find((o) => o.definition.id === objectiveId);
  if (!selectedObj) return null;

  return {
    objectiveId: selectedObj.definition.id,
    description: selectedObj.description,
    category: selectedObj.definition.category,
    target: selectedObj.target,
    current: record.current,
    completed: record.completed,
    pointsReward: selectedObj.definition.pointsReward,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get today's objectives with the given user's progress. Awards the bonus if all are complete. */
export async function getDailyObjectives(username: string): Promise<DailyObjectivesResponse> {
  const dateStr = getTodayDateString();
  const objectives = selectDailyObjectives(dateStr);
  const progress = await getOrCreateProgress(username, dateStr, objectives);

  const objectiveInfos: DailyObjectiveInfo[] = objectives.map((obj) => {
    const record = progress.find((r) => r.objectiveId === obj.definition.id);
    return {
      objectiveId: obj.definition.id,
      description: obj.description,
      category: obj.definition.category,
      target: obj.target,
      current: record?.current ?? 0,
      completed: record?.completed ?? false,
      pointsReward: obj.definition.pointsReward,
    };
  });

  const allCompleted = objectiveInfos.every((o) => o.completed);
  const bonusAwarded = allCompleted ? progress.every((r) => r.pointsAwarded) : false;

  if (allCompleted && !bonusAwarded) {
    await awardPoints(
      username,
      5,
      "objective",
      "Completed all daily objectives",
      `daily-obj-bonus-${dateStr}`,
    );
  }

  return {
    date: dateStr,
    objectives: objectiveInfos,
    allCompleted,
    bonusAwarded: allCompleted,
  };
}

// ---------------------------------------------------------------------------
// Event Subscription (called once at server startup)
// ---------------------------------------------------------------------------

/** Wire up event bus listeners that track objective progress. */
export function subscribeToEvents(): void {
  const eventToObjectives = new Map<ObjectiveEventName, ObjectiveDefinition[]>();
  for (const def of OBJECTIVE_CATALOG) {
    for (const event of def.events) {
      const list = eventToObjectives.get(event) ?? [];
      list.push(def);
      eventToObjectives.set(event, list);
    }
  }

  for (const [eventName, defs] of eventToObjectives) {
    eventBus.onEvent(eventName, async (payload) => {
      const username = (payload as { username: string }).username;
      const dateStr = getTodayDateString();
      const todayObjectives = selectDailyObjectives(dateStr);

      for (const def of defs) {
        const selectedObj = todayObjectives.find((o) => o.definition.id === def.id);
        if (!selectedObj) continue;

        if (def.matchPayload && !def.matchPayload(payload, selectedObj.resolvedParams)) {
          continue;
        }

        await getOrCreateProgress(username, dateStr, todayObjectives);
        await incrementProgress(username, def.id, dateStr);
      }
    });
  }
}
