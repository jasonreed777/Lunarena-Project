import { randomUUID } from "node:crypto";
import type {
  DailyGameType,
  DailyGameStatus,
  DailyStatusResponse,
  GameInfo,
} from "@gamenite/shared";
import { DailyGameModel, GameModel } from "../mongoose-models.ts";
import { createGame, getGameById } from "./game.service.ts";
import { awardPoints } from "./points.service.ts";
import { eventBus } from "./eventBus.ts";
import { seededRandomForDaily } from "../games/seededRandom.ts";
import { generateMineBoard } from "../games/minefinder.ts";
import { generatePuzzle as generateCircleConnectPuzzle } from "../games/circleconnect.ts";
import type { UserWithId } from "../types.ts";

const DAILY_GAME_TYPES: DailyGameType[] = ["minesweeper", "circleconnect"];

/** Get today's date as "YYYY-MM-DD" in UTC */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get or create a daily game for the given user and game type.
 * All users get the same puzzle for the same date (deterministic seed).
 */
export async function getOrCreateDailyGame(
  user: UserWithId,
  gameType: DailyGameType,
): Promise<GameInfo> {
  const date = getTodayDateString();

  // Check for existing daily game
  const existing = await DailyGameModel.findOne({
    username: user.username,
    gameType,
    date,
  }).lean();

  if (existing) {
    const game = await getGameById(existing.gameId);
    if (game) return game;
  }

  // Create a new game document
  const now = new Date();
  const gameInfo = await createGame(user, gameType, now);

  // Generate seeded state and inject it directly
  const random = seededRandomForDaily(date, gameType);
  let state: unknown;
  if (gameType === "minesweeper") {
    state = generateMineBoard("standard", random);
  } else {
    // circleconnect: standard difficulty (7x7, 6 pairs)
    state = { ...generateCircleConnectPuzzle(7, 6, random), difficulty: "standard" };
  }

  await GameModel.findByIdAndUpdate(gameInfo.gameId, { state, isDaily: true });

  // Create the daily tracking record
  try {
    await DailyGameModel.create({
      _id: randomUUID().toString(),
      username: user.username,
      gameType,
      date,
      gameId: gameInfo.gameId,
      completed: false,
      won: false,
      startedAt: now.toISOString(),
    });
  } catch (err: unknown) {
    // Duplicate key = race condition, return the existing record
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      const race = await DailyGameModel.findOne({ username: user.username, gameType, date }).lean();
      if (race) {
        const raceGame = await getGameById(race.gameId);
        if (raceGame) return raceGame;
      }
    }
    throw err;
  }

  // Re-fetch to get accurate status (state is now set)
  const result = await getGameById(gameInfo.gameId);
  if (!result) throw new Error("Failed to retrieve daily game after creation");
  return result;
}

/**
 * Get the daily game status for a user: which games are started/completed today + streak.
 */
export async function getDailyStatus(username: string): Promise<DailyStatusResponse> {
  const date = getTodayDateString();

  const records = await DailyGameModel.find({ username, date }).lean();

  // Recover any records where the game finished but the daily wasn't marked complete
  for (const record of records) {
    if (record.completed || !record.gameId) continue;
    const game = await GameModel.findById(record.gameId).lean();
    if (game?.done) {
      await markDailyCompleted(record.username, record.gameType, record.gameId, true);
      record.completed = true;
      record.won = true;
    }
  }

  const games: DailyGameStatus[] = DAILY_GAME_TYPES.map((gameType) => {
    const record = records.find((r) => r.gameType === gameType);
    return {
      gameType,
      date,
      gameId: record?.gameId ?? null,
      completed: record?.completed ?? false,
      won: record?.won,
      completionTimeMs: record?.completionTimeMs,
    };
  });

  const streak = await computeStreak(username, date);

  return { date, games, streak };
}

/**
 * Mark a daily game as completed. Awards streak points if all dailies are done today.
 */
export async function markDailyCompleted(
  username: string,
  gameType: string,
  gameId: string,
  won: boolean,
): Promise<void> {
  const date = getTodayDateString();
  const now = new Date();

  const record = await DailyGameModel.findOne({ username, gameType, date });
  if (!record || record.completed) return;

  const completionTimeMs = now.getTime() - new Date(record.startedAt).getTime();

  record.completed = true;
  record.won = won;
  record.completedAt = now.toISOString();
  record.completionTimeMs = completionTimeMs;
  await record.save();

  eventBus.emitEvent("dailyCompleted", { username, gameType, gameId, won });

  // Check if all dailies are completed for today
  const allRecords = await DailyGameModel.find({ username, date }).lean();
  const allCompleted =
    DAILY_GAME_TYPES.length === allRecords.length && allRecords.every((r) => r.completed);

  if (allCompleted) {
    const streak = await computeStreak(username, date);
    await awardStreakPoints(username, streak, date);
  }
}

/**
 * Compute the consecutive day streak ending at (and including) the given date.
 */
async function computeStreak(username: string, currentDate: string): Promise<number> {
  let streak = 0;
  const date = new Date(currentDate + "T00:00:00Z");

  for (let i = 0; i < 365; i++) {
    const dateStr = date.toISOString().split("T")[0];
    const records = await DailyGameModel.find({ username, date: dateStr }).lean();

    const allCompleted =
      records.length === DAILY_GAME_TYPES.length && records.every((r) => r.completed);

    if (allCompleted) {
      streak++;
      date.setUTCDate(date.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** Award increasing streak bonuses*/
async function awardStreakPoints(username: string, streak: number, date: string): Promise<void> {
  const milestones: [number, number][] = [
    [30, 25],
    [14, 10],
    [7, 5],
    [3, 2],
  ];
  const match = milestones.find(([days]) => streak >= days);

  if (match) {
    const [days, points] = match;
    await awardPoints(
      username,
      points,
      "streak",
      `Daily streak: ${days} days`,
      `daily-streak-${days}-${date}`,
    );
  }
}
