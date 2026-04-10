import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordWin, recordGamePlayed } from "../../src/services/game-stats.service.ts";
import * as mongooseModels from "../../src/mongoose-models.ts";

describe("game-stats.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("recordWin", () => {
    it("should create stats if none exist", async () => {
      // Mock to simulate a user with no existing stats record
      const findByIdSpy = vi.spyOn(mongooseModels.UserGameStatsModel, "findById");
      const createSpy = vi.spyOn(mongooseModels.UserGameStatsModel, "create");

      findByIdSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue({} as never);

      await recordWin("user0", "nim");

      // Verify a new stats record is created with the correct initial values
      expect(findByIdSpy).toHaveBeenCalledWith("user0");
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "user0",
          winsTotal: 1,
          gamesPlayedTotal: 1,
          byGame: {
            nim: {
              wins: 1,
              gamesPlayed: 1,
            },
          },
          updatedAt: expect.any(String),
        }),
      );
    });

    it("should update existing stats for an existing game type", async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const stats = {
        winsTotal: 2,
        gamesPlayedTotal: 5,
        byGame: new Map([["nim", { wins: 2, gamesPlayed: 5 }]]),
        updatedAt: "",
        save,
      };

      // Mock to return an existing stats record for this user
      vi.spyOn(mongooseModels.UserGameStatsModel, "findById").mockResolvedValue(stats as never);

      await recordWin("user0", "nim");

      // Verify total wins and per-game wins increase, then changes are saved
      expect(stats.winsTotal).toBe(3);
      expect(stats.byGame.get("nim")).toEqual({ wins: 3, gamesPlayed: 5 });
      expect(typeof stats.updatedAt).toBe("string");
      expect(save).toHaveBeenCalled();
    });

    it("should create per-game stats if game type does not exist", async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const stats = {
        winsTotal: 0,
        gamesPlayedTotal: 2,
        byGame: new Map(),
        updatedAt: "",
        save,
      };

      // Mock existing overall stats, but no entry yet for this specific game
      vi.spyOn(mongooseModels.UserGameStatsModel, "findById").mockResolvedValue(stats as never);

      await recordWin("user0", "guess");

      // Verify a new per-game entry is added for the new game type
      expect(stats.winsTotal).toBe(1);
      expect(stats.byGame.get("guess")).toEqual({ wins: 1, gamesPlayed: 0 });
      expect(save).toHaveBeenCalled();
    });
  });

  describe("recordGamePlayed", () => {
    it("should create stats if none exist", async () => {
      // Mock to simulate first recorded game for this user
      const findByIdSpy = vi.spyOn(mongooseModels.UserGameStatsModel, "findById");
      const createSpy = vi.spyOn(mongooseModels.UserGameStatsModel, "create");

      findByIdSpy.mockResolvedValue(null);
      createSpy.mockResolvedValue({} as never);

      await recordGamePlayed("user1", "nim");

      // Verify a new stats record is created with one game played
      expect(findByIdSpy).toHaveBeenCalledWith("user1");
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "user1",
          winsTotal: 0,
          gamesPlayedTotal: 1,
          byGame: {
            nim: {
              wins: 0,
              gamesPlayed: 1,
            },
          },
          updatedAt: expect.any(String),
        }),
      );
    });

    it("should update existing stats for an existing game type", async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const stats = {
        winsTotal: 1,
        gamesPlayedTotal: 4,
        byGame: new Map([["nim", { wins: 1, gamesPlayed: 4 }]]),
        updatedAt: "",
        save,
      };

      // Mock an existing stats record for a game the user has already played
      vi.spyOn(mongooseModels.UserGameStatsModel, "findById").mockResolvedValue(stats as never);

      await recordGamePlayed("user1", "nim");

      // Verify total games played and per-game games played increase
      expect(stats.gamesPlayedTotal).toBe(5);
      expect(stats.byGame.get("nim")).toEqual({ wins: 1, gamesPlayed: 5 });
      expect(typeof stats.updatedAt).toBe("string");
      expect(save).toHaveBeenCalled();
    });

    it("should create per-game stats if game type does not exist", async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const stats = {
        winsTotal: 1,
        gamesPlayedTotal: 4,
        byGame: new Map(),
        updatedAt: "",
        save,
      };

      // Mock existing overall stats with no record yet for this game type
      vi.spyOn(mongooseModels.UserGameStatsModel, "findById").mockResolvedValue(stats as never);

      await recordGamePlayed("user1", "guess");

      // Verify a new per-game entry is created with one game played
      expect(stats.gamesPlayedTotal).toBe(5);
      expect(stats.byGame.get("guess")).toEqual({ wins: 0, gamesPlayed: 1 });
      expect(save).toHaveBeenCalled();
    });
  });
});
