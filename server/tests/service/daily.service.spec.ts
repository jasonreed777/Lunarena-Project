import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { randomUUID } from "crypto";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import {
  getTodayDateString,
  getOrCreateDailyGame,
  getDailyStatus,
  markDailyCompleted,
} from "../../src/services/daily.service.ts";
import {
  DailyGameModel,
  GameModel,
  PointsLedgerModel,
  UserPointsModel,
} from "../../src/mongoose-models.ts";
import { initializeAchievements } from "../../src/services/achievement.service.ts";
import type { UserWithId } from "../../src/types.ts";

let user0: UserWithId;

beforeEach(async () => {
  await DailyGameModel.deleteMany({});
  await UserPointsModel.deleteMany({});
  await PointsLedgerModel.deleteMany({});

  const u0 = await getUserByUsername("user0");
  user0 = { userId: u0!.userId, username: u0!.username };
  await initializeAchievements();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getTodayDateString", () => {
  it("should return a date string in YYYY-MM-DD format", () => {
    const result = getTodayDateString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should match today's UTC date", () => {
    const expected = new Date().toISOString().split("T")[0];
    expect(getTodayDateString()).toBe(expected);
  });
});

describe("getOrCreateDailyGame", () => {
  it("should create a minesweeper daily game", async () => {
    const game = await getOrCreateDailyGame(user0, "minesweeper");
    expect(game).toBeDefined();
    expect(game.type).toBe("minesweeper");
    expect(game.status).toBe("active");
  });

  it("should create a circleconnect daily game", async () => {
    const game = await getOrCreateDailyGame(user0, "circleconnect");
    expect(game).toBeDefined();
    expect(game.type).toBe("circleconnect");
    expect(game.status).toBe("active");
  });

  it("should return the same game on subsequent calls for the same day/type", async () => {
    const first = await getOrCreateDailyGame(user0, "minesweeper");
    const second = await getOrCreateDailyGame(user0, "minesweeper");
    expect(first.gameId).toBe(second.gameId);
  });

  it("should mark the game as daily in the database", async () => {
    const game = await getOrCreateDailyGame(user0, "minesweeper");
    const doc = await GameModel.findById(game.gameId).lean();
    expect(doc?.isDaily).toBe(true);
  });
});

describe("getDailyStatus", () => {
  it("should return status for all daily game types", async () => {
    const status = await getDailyStatus(user0.username);
    expect(status.date).toBe(getTodayDateString());
    expect(status.games).toHaveLength(2);
    expect(status.games.map((g) => g.gameType)).toContain("minesweeper");
    expect(status.games.map((g) => g.gameType)).toContain("circleconnect");
    expect(status.streak).toBe(0);
  });

  it("should show a game as started but not completed", async () => {
    await getOrCreateDailyGame(user0, "minesweeper");
    const status = await getDailyStatus(user0.username);
    const msGame = status.games.find((g) => g.gameType === "minesweeper")!;
    expect(msGame.gameId).toBeTruthy();
    expect(msGame.completed).toBe(false);
  });

  it("should recover completed games that were not marked", async () => {
    const game = await getOrCreateDailyGame(user0, "minesweeper");
    // Manually mark the game as done in GameModel but not in DailyGameModel
    await GameModel.findByIdAndUpdate(game.gameId, { done: true });

    const status = await getDailyStatus(user0.username);
    const msGame = status.games.find((g) => g.gameType === "minesweeper")!;
    expect(msGame.completed).toBe(true);
  });
});

describe("markDailyCompleted", () => {
  it("should mark a daily game as completed", async () => {
    const game = await getOrCreateDailyGame(user0, "minesweeper");
    await markDailyCompleted(user0.username, "minesweeper", game.gameId, true);

    const record = await DailyGameModel.findOne({
      username: user0.username,
      gameType: "minesweeper",
    }).lean();
    expect(record?.completed).toBe(true);
    expect(record?.won).toBe(true);
    expect(record?.completionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should not double-complete an already completed game", async () => {
    const game = await getOrCreateDailyGame(user0, "minesweeper");
    await markDailyCompleted(user0.username, "minesweeper", game.gameId, true);
    // Call again — should be a no-op
    await markDailyCompleted(user0.username, "minesweeper", game.gameId, false);

    const record = await DailyGameModel.findOne({
      username: user0.username,
      gameType: "minesweeper",
    }).lean();
    // Should still be won=true from the first call
    expect(record?.won).toBe(true);
  });

  it("should award streak points when all daily games are completed", async () => {
    // Create and complete both daily game types
    const ms = await getOrCreateDailyGame(user0, "minesweeper");
    const cc = await getOrCreateDailyGame(user0, "circleconnect");

    await markDailyCompleted(user0.username, "minesweeper", ms.gameId, true);
    await markDailyCompleted(user0.username, "circleconnect", cc.gameId, true);

    // After completing both, streak should be 1
    const status = await getDailyStatus(user0.username);
    expect(status.streak).toBe(1);
  });

  it("should compute a multi-day streak from seeded daily records", async () => {
    const today = getTodayDateString();
    const yesterday = new Date(new Date(today + "T00:00:00Z").getTime() - 86400000)
      .toISOString()
      .split("T")[0];

    // Seed yesterday's completed records directly
    for (const gameType of ["minesweeper", "circleconnect"]) {
      await DailyGameModel.create({
        _id: randomUUID(),
        username: user0.username,
        gameType,
        date: yesterday,
        gameId: randomUUID(),
        completed: true,
        won: true,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }

    // Complete today's games
    const ms = await getOrCreateDailyGame(user0, "minesweeper");
    const cc = await getOrCreateDailyGame(user0, "circleconnect");
    await markDailyCompleted(user0.username, "minesweeper", ms.gameId, true);
    await markDailyCompleted(user0.username, "circleconnect", cc.gameId, true);

    const status = await getDailyStatus(user0.username);
    expect(status.streak).toBe(2);
  });

  it("should not count a no-record day when computing streak", async () => {
    // Only complete today — no yesterday records
    const ms = await getOrCreateDailyGame(user0, "minesweeper");
    const cc = await getOrCreateDailyGame(user0, "circleconnect");
    await markDailyCompleted(user0.username, "minesweeper", ms.gameId, true);
    await markDailyCompleted(user0.username, "circleconnect", cc.gameId, true);

    const status = await getDailyStatus(user0.username);
    expect(status.streak).toBe(1);
  });

  it("should return no-op when record does not exist for markDailyCompleted", async () => {
    // Call with a date/type that has no record — should not throw
    await markDailyCompleted(user0.username, "minesweeper", "nonexistent-game", true);
    const records = await DailyGameModel.find({ username: user0.username }).lean();
    expect(records).toHaveLength(0);
  });

  it("should award streak milestone points at 3+ day streak", async () => {
    const today = getTodayDateString();

    // Seed 2 previous days of completed records
    for (let daysAgo = 1; daysAgo <= 2; daysAgo++) {
      const d = new Date(new Date(today + "T00:00:00Z").getTime() - daysAgo * 86400000)
        .toISOString()
        .split("T")[0];
      for (const gameType of ["minesweeper", "circleconnect"]) {
        await DailyGameModel.create({
          _id: randomUUID(),
          username: user0.username,
          gameType,
          date: d,
          gameId: randomUUID(),
          completed: true,
          won: true,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
      }
    }

    // Complete today — should make streak=3 and trigger milestone award
    const ms = await getOrCreateDailyGame(user0, "minesweeper");
    const cc = await getOrCreateDailyGame(user0, "circleconnect");
    await markDailyCompleted(user0.username, "minesweeper", ms.gameId, true);
    await markDailyCompleted(user0.username, "circleconnect", cc.gameId, true);

    const status = await getDailyStatus(user0.username);
    expect(status.streak).toBe(3);

    // Verify streak points were awarded via ledger
    const ledger = await PointsLedgerModel.find({ username: user0.username }).lean();
    const streakEntry = ledger.find(
      (e) => (e as unknown as { reason: string }).reason === "Daily streak: 3 days",
    );
    expect(streakEntry).toBeDefined();
  });
});

describe("getOrCreateDailyGame — race condition", () => {
  it("should handle duplicate key error and return existing game", async () => {
    // Create the first game normally
    const first = await getOrCreateDailyGame(user0, "minesweeper");

    // Spy on DailyGameModel.create to throw a duplicate key error
    const dupError = new Error("dup") as Error & { code: number };
    dupError.code = 11000;
    vi.spyOn(DailyGameModel, "create").mockRejectedValueOnce(dupError);

    // Should recover by finding the existing record
    const second = await getOrCreateDailyGame(user0, "minesweeper");
    expect(second.gameId).toBe(first.gameId);
  });

  it("should rethrow non-duplicate-key errors from create", async () => {
    // First call creates the game document and game model, but spy on create to fail
    vi.spyOn(DailyGameModel, "create").mockRejectedValueOnce(new Error("some other error"));

    await expect(getOrCreateDailyGame(user0, "minesweeper")).rejects.toThrow("some other error");
  });
});
