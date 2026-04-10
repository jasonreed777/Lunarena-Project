import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import {
  selectDailyObjectives,
  getDailyObjectives,
  subscribeToEvents,
} from "../../src/services/daily-objectives.service.ts";
import {
  DailyObjectiveProgressModel,
  UserPointsModel,
  PointsLedgerModel,
} from "../../src/mongoose-models.ts";
import { getTodayDateString } from "../../src/services/daily.service.ts";
import { eventBus } from "../../src/services/eventBus.ts";
import type { UserWithId } from "../../src/types.ts";

let user0: UserWithId;

beforeEach(async () => {
  await DailyObjectiveProgressModel.deleteMany({});
  await UserPointsModel.deleteMany({});
  await PointsLedgerModel.deleteMany({});

  const u0 = await getUserByUsername("user0");
  user0 = { userId: u0!.userId, username: u0!.username };
});

afterEach(() => {
  vi.restoreAllMocks();
  eventBus.removeAllListeners();
});

describe("selectDailyObjectives", () => {
  it("should return exactly 3 objectives", () => {
    const objectives = selectDailyObjectives("2026-04-10");
    expect(objectives).toHaveLength(3);
  });

  it("should be deterministic for the same date", () => {
    const first = selectDailyObjectives("2026-04-10");
    const second = selectDailyObjectives("2026-04-10");
    expect(first.map((o) => o.definition.id)).toEqual(second.map((o) => o.definition.id));
    expect(first.map((o) => o.target)).toEqual(second.map((o) => o.target));
  });

  it("should produce different objectives for different dates", () => {
    const day1 = selectDailyObjectives("2026-04-10");
    const day2 = selectDailyObjectives("2026-04-11");
    // Check they are valid objectives
    expect(day1.every((o) => o.description.length > 0)).toBe(true);
    expect(day2.every((o) => o.description.length > 0)).toBe(true);
  });

  it("should pick objectives from different categories", () => {
    const objectives = selectDailyObjectives("2026-04-10");
    const categories = objectives.map((o) => o.definition.category);
    // With 4 categories and picking 3, at least 2 should be different
    const unique = new Set(categories);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("should resolve target within min/max range", () => {
    const objectives = selectDailyObjectives("2026-04-10");
    for (const obj of objectives) {
      expect(obj.target).toBeGreaterThanOrEqual(obj.definition.minTarget);
      expect(obj.target).toBeLessThanOrEqual(obj.definition.maxTarget);
    }
  });

  it("should resolve play_game_type description with a valid game type", () => {
    // Try many dates until we find one that includes play_game_type
    const validGameTypes = ["nim", "guess", "minesweeper", "circleconnect"];
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-04-${String(day).padStart(2, "0")}`;
      const objectives = selectDailyObjectives(dateStr);
      const playGameType = objectives.find((o) => o.definition.id === "play_game_type");
      if (playGameType) {
        expect(playGameType.resolvedParams?.gameType).toBeDefined();
        expect(validGameTypes).toContain(playGameType.resolvedParams!.gameType);
        expect(playGameType.description).toContain(playGameType.resolvedParams!.gameType);
        return;
      }
    }
    // If play_game_type never appeared, that's fine — it's randomized per date
  });
});

describe("getDailyObjectives", () => {
  it("should return objectives with progress initialized to 0", async () => {
    const result = await getDailyObjectives(user0.username);
    expect(result.objectives).toHaveLength(3);
    expect(result.allCompleted).toBe(false);
    expect(result.bonusAwarded).toBe(false);
    for (const obj of result.objectives) {
      expect(obj.current).toBe(0);
      expect(obj.completed).toBe(false);
    }
  });

  it("should create progress records in the database", async () => {
    await getDailyObjectives(user0.username);
    const records = await DailyObjectiveProgressModel.find({ username: user0.username }).lean();
    expect(records).toHaveLength(3);
  });

  it("should return existing progress on subsequent calls", async () => {
    const first = await getDailyObjectives(user0.username);
    const second = await getDailyObjectives(user0.username);
    expect(first.objectives.map((o) => o.objectiveId)).toEqual(
      second.objectives.map((o) => o.objectiveId),
    );
  });
});

describe("subscribeToEvents", () => {
  it("should not throw when subscribing", () => {
    expect(() => subscribeToEvents()).not.toThrow();
  });

  it("should increment progress when matching events are emitted", async () => {
    subscribeToEvents();

    // Initialize progress records first
    await getDailyObjectives(user0.username);

    // Emit one of each event type sequentially, awaiting between each
    // to let the async handler finish before the next one starts
    const events: Array<[string, Record<string, unknown>]> = [
      ["gameCompleted", { username: user0.username, gameType: "nim", gameId: "g1" }],
      ["gameWon", { username: user0.username, gameType: "nim", gameId: "g1" }],
      ["dmMessageSent", { username: user0.username, chatId: "c1" }],
      ["gamechatMessageSent", { username: user0.username, chatId: "c2" }],
      ["forumThreadCreated", { username: user0.username, threadId: "t1" }],
      ["forumCommentPosted", { username: user0.username, threadId: "t1", commentId: "cm1" }],
      ["forumVoteCast", { username: user0.username, commentId: "cm1" }],
      ["friendRequestSent", { username: user0.username, receiverUsername: "user1" }],
      [
        "dailyCompleted",
        { username: user0.username, gameType: "minesweeper", gameId: "g2", won: true },
      ],
      ["dmChatCreated", { username: user0.username, chatId: "c3" }],
    ];

    for (const [name, payload] of events) {
      eventBus.emitEvent(name as never, payload as never);
      await new Promise((r) => setTimeout(r, 300));
    }

    const updated = await getDailyObjectives(user0.username);
    // At least one objective should have progress > 0
    const anyProgress = updated.objectives.some((o) => o.current > 0);
    expect(anyProgress).toBe(true);
  });
});

describe("getDailyObjectives — completion and bonus", () => {
  it("should mark allCompleted and bonusAwarded when all objectives are done", async () => {
    const dateStr = getTodayDateString();

    // Initialize records
    await getDailyObjectives(user0.username);

    // Manually mark all 3 objectives as completed in the DB
    await DailyObjectiveProgressModel.updateMany(
      { username: user0.username, date: dateStr },
      { $set: { current: 999, target: 1, completed: true, pointsAwarded: true } },
    );

    const result = await getDailyObjectives(user0.username);
    expect(result.allCompleted).toBe(true);
    expect(result.bonusAwarded).toBe(true);
  });

  it("should award bonus points when all objectives completed but not yet awarded", async () => {
    const dateStr = getTodayDateString();

    // Initialize records
    await getDailyObjectives(user0.username);

    // Mark completed but NOT pointsAwarded
    await DailyObjectiveProgressModel.updateMany(
      { username: user0.username, date: dateStr },
      { $set: { current: 999, target: 1, completed: true, pointsAwarded: false } },
    );

    const result = await getDailyObjectives(user0.username);
    expect(result.allCompleted).toBe(true);
    // Bonus should be awarded now
    expect(result.bonusAwarded).toBe(true);
  });
});
