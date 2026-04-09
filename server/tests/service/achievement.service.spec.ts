import { describe, it, expect, vi, beforeEach } from "vitest";
import * as achievementService from "../../src/services/achievement.service.ts";
import {
  UserGameStatsModel,
  AchievementModel,
  UserAchievementModel,
} from "../../src/mongoose-models.ts";
import { awardPoints } from "../../src/services/points.service.ts";

vi.mock("../../src/services/points.service.ts", () => ({
  awardPoints: vi.fn(),
}));

describe("achievement.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards first overall and first Nim win achievements on first win", async () => {
    // Mock user game stats to indicate this is the user's first win overall and in Nim
    vi.spyOn(UserGameStatsModel, "findOne").mockResolvedValue({
      winsTotal: 1,
      byGame: new Map([["nim", { wins: 1, gamesPlayed: 1 }]]),
    } as never);
    vi.spyOn(UserAchievementModel, "findOne").mockResolvedValue(null);
    // Mock achievement details
    vi.spyOn(AchievementModel, "findById")
      .mockResolvedValueOnce({ _id: "first-win", pointsAwarded: 5 } as never)
      .mockResolvedValueOnce({ _id: "nim-1-wins", pointsAwarded: 1 } as never);

    const createSpy = vi.spyOn(UserAchievementModel, "create").mockResolvedValue({} as never);

    await achievementService.checkWinAchievements("testuser", "nim");

    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(awardPoints).toHaveBeenCalledTimes(2);
  });

  it("does not award duplicate achievements", async () => {
    // Pretend the user already has the "first-win" achievement
    vi.spyOn(UserAchievementModel, "findOne").mockResolvedValue({ _id: "existing" } as never);

    const achievementFindSpy = vi.spyOn(AchievementModel, "findById");
    const createSpy = vi.spyOn(UserAchievementModel, "create");
    const awardPointsMock = vi.mocked(awardPoints);
    // try to award the "first-win" achievement again
    await achievementService.awardAchievement("testuser", "first-win");
    // Since user already has it, nothing should happen
    expect(achievementFindSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    expect(awardPointsMock).not.toHaveBeenCalled();
  });

  it("throws an error if trying to award a non-existent achievement", async () => {
    // Pretend the user does not already have this achievement
    vi.spyOn(UserAchievementModel, "findOne").mockResolvedValue(null);
    // Pretend the achievement definition does not exist in the database
    vi.spyOn(AchievementModel, "findById").mockResolvedValue(null);
    // Trying to award a missing achievement should throw the expected error
    await expect(
      achievementService.awardAchievement("testuser", "non-existent-achievement"),
    ).rejects.toThrow("achievement non-existent-achievement not found");
  });

  it("returns without awarding anything if user stats are not found", async () => {
    // Mock user game stats to be not found
    vi.spyOn(UserGameStatsModel, "findById").mockResolvedValue(null);

    const createSpy = vi.spyOn(UserAchievementModel, "create");
    const awardPointsMock = vi.mocked(awardPoints);
    // Check win achievements should return early without awarding anything
    await achievementService.checkWinAchievements("testuser", "nim");
    // No achievement should be created or points awarded
    expect(createSpy).not.toHaveBeenCalled();
    expect(awardPointsMock).not.toHaveBeenCalled();
  });

  it("does not award achievements when win counts are not milestone values", async () => {
    // Pretend the user has stats, but neither total wins nor nim wins hit a milestone/achievement
    vi.spyOn(UserGameStatsModel, "findById").mockResolvedValue({
      winsTotal: 2,
      byGame: new Map([["nim", { wins: 2, gamesPlayed: 2 }]]),
    } as never);

    const createSpy = vi.spyOn(UserAchievementModel, "create");
    const awardPointsMock = vi.mocked(awardPoints);

    // Since 2 is not a milestone/achievement for either overall wins or nim wins, nothing should be awarded
    await achievementService.checkWinAchievements("testuser", "nim");

    expect(createSpy).not.toHaveBeenCalled();
    expect(awardPointsMock).not.toHaveBeenCalled();
  });

  it("initializes all achievement definitions in the database", async () => {
    // Spy on the database call that inserts or updates each achievement definition
    // Fake successful result
    const upsertSpy = vi.spyOn(AchievementModel, "findByIdAndUpdate").mockResolvedValue(null);
    // Seed all achievements
    await achievementService.initializeAchievements();

    expect(upsertSpy).toHaveBeenCalled();
    // Check that upsert was called with the expected achievement definitions (only including some)
    // Check first overall win achievement
    expect(upsertSpy).toHaveBeenCalledWith(
      "first-win",
      {
        _id: "first-win",
        title: "First Win",
        description: "Win your first game.",
        pointsAwarded: 5,
      },
      { upsert: true, new: true },
    );
    // Check first Nim win achievement
    expect(upsertSpy).toHaveBeenCalledWith(
      "nim-1-wins",
      {
        _id: "nim-1-wins",
        title: "Nim Newbie",
        description: "Win 1 Nim game.",
        pointsAwarded: 1,
      },
      { upsert: true, new: true },
    );
    // Check first number guesser win achievement
    expect(upsertSpy).toHaveBeenCalledWith(
      "guess-1-wins",
      {
        _id: "guess-1-wins",
        title: "Number Guesser Newbie",
        description: "Win 1 Number Guesser game.",
        pointsAwarded: 1,
      },
      { upsert: true, new: true },
    );
  });

  it("returns earned achievements with title and description", async () => {
    // Pretend this user has one earned achievement record in the database
    vi.spyOn(UserAchievementModel, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          achievementId: "first-win",
          achievedAt: "2026-04-09T12:00:00.000Z",
        },
      ]),
    } as never);

    // Pretend the achievement definition exists, so title and description can be loaded
    vi.spyOn(AchievementModel, "findById").mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        title: "First Win",
        description: "Win your first game.",
      }),
    } as never);
    // Call the service function to get user achievements
    const result = await achievementService.getUserAchievements("testuser");
    // Should return the user's earned achievement with title and description included
    expect(result).toEqual([
      {
        achievementId: "first-win",
        title: "First Win",
        description: "Win your first game.",
        achievedAt: "2026-04-09T12:00:00.000Z",
      },
    ]);
  });

  it("awards only overall milestone achievement", async () => {
    // Mock user game stats to indicate this is the user's 10th win overall but only 2nd win in Nim
    vi.spyOn(UserGameStatsModel, "findById").mockResolvedValue({
      winsTotal: 10,
      byGame: new Map([["nim", { wins: 2, gamesPlayed: 2 }]]),
    } as never);
    const createSpy = vi.spyOn(UserAchievementModel, "create").mockResolvedValue({} as never);
    // Check achievements for nim
    await achievementService.checkWinAchievements("testuser", "nim");

    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("awards only specific game milestone achievement", async () => {
    // Mock user game stats to indicate this is the user's 5th win in Nim but 7th win overall
    // Hence only achiement that should be awarded is the "nim-5-wins" achievement
    vi.spyOn(UserGameStatsModel, "findById").mockResolvedValue({
      winsTotal: 7,
      byGame: new Map([["nim", { wins: 5, gamesPlayed: 5 }]]),
    } as never);

    const createSpy = vi.spyOn(UserAchievementModel, "create").mockResolvedValue({} as never);

    await achievementService.checkWinAchievements("testuser", "nim");

    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("treats missing game stats as zero wins", async () => {
    vi.spyOn(UserGameStatsModel, "findById").mockResolvedValue({
      winsTotal: 2,
      byGame: new Map(), // no nim entry purposely to simulate missing game stats
    } as never);

    const createSpy = vi.spyOn(UserAchievementModel, "create");
    // Check achievements for nim, should not throw an error even though nim stats are missing
    await achievementService.checkWinAchievements("testuser", "nim");
    // Correctly treats missing nim stats as zero wins, so no achievements should be awarded
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("falls back to achievement id when title is missing", async () => {
    // Pretend the user has an earned achievement
    vi.spyOn(UserAchievementModel, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          achievementId: "first-win",
          achievedAt: "2026-04-09T12:00:00.000Z",
        },
      ]),
    } as never);

    // Pretend the achievement definition exists, but title is missing
    vi.spyOn(AchievementModel, "findById").mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        description: "Win your first game.",
      }),
    } as never);

    const result = await achievementService.getUserAchievements("testuser");
    // Title should be same as id
    expect(result).toEqual([
      {
        achievementId: "first-win",
        title: "first-win",
        description: "Win your first game.",
        achievedAt: "2026-04-09T12:00:00.000Z",
      },
    ]);
  });
});
