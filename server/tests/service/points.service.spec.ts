import { describe, it, expect, vi, afterEach } from "vitest";
import { UserPointsModel, PointsLedgerModel, UserModel } from "../../src/mongoose-models.ts";
import * as authService from "../../src/services/auth.service.ts";

import * as pointsService from "../../src/services/points.service.ts";

describe("points.service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("awardPoints", () => {
    it("adds points to a user's total and creates a ledger entry", async () => {
      // Pretend the user exists
      vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
        username: "testuser",
      } as never);

      // Fake an existing user points record that can be updated and saved
      const saveSpy = vi.fn().mockResolvedValue(undefined);

      vi.spyOn(UserPointsModel, "findById").mockResolvedValue({
        _id: "testuser",
        pointsTotal: 10,
        updatedAt: "",
        save: saveSpy,
      } as never);

      // Pretend creating the ledger entry succeeds
      const ledgerSpy = vi.spyOn(PointsLedgerModel, "create").mockResolvedValue({} as never);
      // Award 5 points for an achievement
      await pointsService.awardPoints("testuser", 5, "achievement", "First Win", "first-win");
      // The user's points total should be updated and saved, and a ledger entry should be created
      expect(saveSpy).toHaveBeenCalled();
      expect(ledgerSpy).toHaveBeenCalled();
    });

    it("creates a new points record if one does not exist", async () => {
      // Pretend the user exists
      vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
        username: "testuser",
      } as never);

      // Pretend no points record exists yet
      vi.spyOn(UserPointsModel, "findById").mockResolvedValue(null);

      // Fake the newly created points record
      const saveSpy = vi.fn().mockResolvedValue(undefined);

      const createSpy = vi.spyOn(UserPointsModel, "create").mockResolvedValue({
        _id: "testuser",
        pointsTotal: 0,
        updatedAt: "",
        currentStreak: 0,
        lastStreakReceivedDate: new Date(0).toISOString(),
        save: saveSpy,
      } as never);

      // Pretend creating the ledger entry succeeds
      vi.spyOn(PointsLedgerModel, "create").mockResolvedValue({} as never);
      // Award 5 points for an achievement
      await pointsService.awardPoints("testuser", 5, "achievement", "First Win", "first-win");
      // A new points record should be created for the user, then updated and saved, and a ledger entry should be created
      expect(createSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
    });

    it("does not award duplicate points when the refId was already used", async () => {
      // Pretend the user exists
      vi.spyOn(PointsLedgerModel, "findOne").mockResolvedValue({ _id: "existing" } as never);
      // Spy on the points record find and ledger create methods to ensure they are not called
      const ledgerCreateSpy = vi.spyOn(PointsLedgerModel, "create");
      const findByIdSpy = vi.spyOn(UserPointsModel, "findById");
      // Try to award points with a refId that already exists
      await pointsService.awardPoints("testuser", 5, "achievement", "First Win", "first-win");
      // No new ledger entry should be created and user's points should not be updated
      expect(ledgerCreateSpy).not.toHaveBeenCalled();
      expect(findByIdSpy).not.toHaveBeenCalled();
    });
  });

  describe("getUserPoints", () => {
    it("returns the user's current points total", async () => {
      // Pretend the user exists
      vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
        username: "testuser",
      } as never);

      // Pretend the user already has a points record
      vi.spyOn(UserPointsModel, "findById").mockResolvedValue({
        _id: "testuser",
        pointsTotal: 42,
      } as never);
      // Get the user's points total
      const result = await pointsService.getUserPoints("testuser");

      expect(result).toBe(42);
    });
  });

  describe("getUserDailyPoints", () => {
    it("groups point awards by day and sums points from the same day", async () => {
      // Pretend the user has three ledger entries:
      // two on the same day, one on a different day
      vi.spyOn(PointsLedgerModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            pointsAdded: 5,
            createdAt: "2026-04-09T10:00:00.000Z",
          },
          {
            pointsAdded: 3,
            createdAt: "2026-04-09T18:30:00.000Z",
          },
          {
            pointsAdded: 2,
            createdAt: "2026-04-10T09:00:00.000Z",
          },
        ]),
      } as never);
      // Get the user's daily points
      const result = await pointsService.getUserDailyPoints("testuser");
      // Combined points for 2026-04-09 should be 8, and points for 2026-04-10 should be 2
      expect(result).toEqual([
        {
          date: new Date("2026-04-09T04:00:00.000Z"),
          points: 8,
        },
        {
          date: new Date("2026-04-10T04:00:00.000Z"),
          points: 2,
        },
      ]);
    });

    describe("getOrCreatePointRecord", () => {
      it("throws an error if the user does not exist", async () => {
        // Pretend no user with this username exists
        vi.spyOn(authService, "getUserByUsername").mockResolvedValue(null);

        await expect(pointsService.getOrCreatePointRecord("fakeuser")).rejects.toThrow(
          "User does not exist",
        );
      });

      it("creates a new points record if the user does not already have one", async () => {
        // Pretend the user exists
        vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
          username: "testuser",
        } as never);

        // Pretend the user has no existing points record yet
        vi.spyOn(UserPointsModel, "findById").mockResolvedValue(null);

        // Watch the database create call and fake the new record being returned
        const createSpy = vi.spyOn(UserPointsModel, "create").mockResolvedValue({
          _id: "testuser",
          pointsTotal: 0,
          currentStreak: 0,
          lastStreakReceivedDate: new Date(0).toISOString(),
        } as never);
        // Get or create the user's points record, which should trigger creation since we pretended it doesn't exist
        await pointsService.getOrCreatePointRecord("testuser");

        expect(createSpy).toHaveBeenCalled();
      });
    });
    describe("getLeaderboard", () => {
      it("returns top users with their display names", async () => {
        // Pretend the points table returns two users sorted by total points
        vi.spyOn(UserPointsModel, "find").mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { _id: "user1", pointsTotal: 20 },
              { _id: "user2", pointsTotal: 10 },
            ]),
          }),
        } as never);

        // Pretend both users exist and have display names
        vi.spyOn(UserModel, "findOne")
          .mockReturnValueOnce({
            lean: vi.fn().mockResolvedValue({ display: "Yāo" }),
          } as never)
          .mockReturnValueOnce({
            lean: vi.fn().mockResolvedValue({ display: "Sénior Dos" }),
          } as never);

        const result = await pointsService.getLeaderboard();

        expect(result).toEqual([
          { username: "user1", display: "Yāo", pointsTotal: 20 },
          { username: "user2", display: "Sénior Dos", pointsTotal: 10 },
        ]);
      });
      it("falls back to the username when a display name is missing", async () => {
        // Pretend the points table returns one top user
        vi.spyOn(UserPointsModel, "find").mockReturnValue({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ _id: "user1", pointsTotal: 20 }]),
          }),
        } as never);

        // Pretend the user lookup returns no display name
        vi.spyOn(UserModel, "findOne").mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        } as never);
        // Get the leaderboard, which should use the username as the display since no display name was found
        const result = await pointsService.getLeaderboard();
        expect(result).toEqual([{ username: "user1", display: "user1", pointsTotal: 20 }]);
      });
    });

    describe("getOrUpdateStreak", () => {
      it("starts a new streak at 1 when there is no valid last streak date", async () => {
        // Pretend the user exists
        vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
          username: "testuser",
        } as never);

        // Fake the user's points record with no valid last streak date
        const saveSpy = vi.fn().mockResolvedValue(undefined);
        const pointsRecord = {
          _id: "testuser",
          pointsTotal: 0,
          updatedAt: "",
          currentStreak: 0,
          lastStreakReceivedDate: null,
          save: saveSpy,
        };

        // Let getOrCreatePointRecord return this existing record
        vi.spyOn(UserPointsModel, "findById").mockResolvedValue(pointsRecord as never);

        // Let the internal awardPoints path succeed
        vi.spyOn(PointsLedgerModel, "findOne").mockResolvedValue(null);
        vi.spyOn(PointsLedgerModel, "create").mockResolvedValue({} as never);

        const result = await pointsService.getOrUpdateStreak("testuser");

        expect(result).toBe(1);
        expect(pointsRecord.currentStreak).toBe(1);
        expect(pointsRecord.lastStreakReceivedDate).toBeTruthy();
        expect(saveSpy).toHaveBeenCalled();
      });

      it("returns the current streak without updating if the streak was already received today", async () => {
        // Pretend the user exists
        vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
          username: "testuser",
        } as never);

        const today = new Date().toISOString();
        const saveSpy = vi.fn().mockResolvedValue(undefined);

        // Fake a points record that already received today's streak
        const pointsRecord = {
          _id: "testuser",
          pointsTotal: 10,
          updatedAt: "",
          currentStreak: 3,
          lastStreakReceivedDate: today,
          save: saveSpy,
        };
        // Spy on UserPointsModel.findById to return this record
        vi.spyOn(UserPointsModel, "findById").mockResolvedValue(pointsRecord as never);

        const ledgerCreateSpy = vi.spyOn(PointsLedgerModel, "create");
        // Get or update the streak, which should return the existing streak without updating since it was already received today
        const result = await pointsService.getOrUpdateStreak("testuser");

        expect(result).toBe(3);
        expect(saveSpy).not.toHaveBeenCalled();
        expect(ledgerCreateSpy).not.toHaveBeenCalled();
      });

      it("increments the streak when the last streak date was yesterday", async () => {
        // Pretend the user exists
        vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
          username: "testuser",
        } as never);
        // Create a date for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        // Create a spy for saving the points record after updating the streak
        const saveSpy = vi.fn().mockResolvedValue(undefined);

        // Fake a points record whose last streak was yesterday
        const pointsRecord = {
          _id: "testuser",
          pointsTotal: 10,
          updatedAt: "",
          currentStreak: 3,
          lastStreakReceivedDate: yesterday.toISOString(),
          save: saveSpy,
        };
        // Spy on UserPointsModel.findById to return this record
        vi.spyOn(UserPointsModel, "findById").mockResolvedValue(pointsRecord as never);

        // Let the internal awardPoints path succeed
        vi.spyOn(PointsLedgerModel, "findOne").mockResolvedValue(null);
        vi.spyOn(PointsLedgerModel, "create").mockResolvedValue({} as never);

        const result = await pointsService.getOrUpdateStreak("testuser");
        // The streak should be incremented to 4, and the last streak date should be updated to today
        expect(result).toBe(4);
        expect(pointsRecord.currentStreak).toBe(4);
        expect(pointsRecord.lastStreakReceivedDate).toBeTruthy();
        expect(saveSpy).toHaveBeenCalled();
      });

      it("resets the streak to 1 when the last streak date was before yesterday", async () => {
        // Pretend the user exists
        vi.spyOn(authService, "getUserByUsername").mockResolvedValue({
          username: "testuser",
        } as never);
        // Create a date for 3 days ago
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 3);

        const saveSpy = vi.fn().mockResolvedValue(undefined);

        // Fake a points record whose last streak was too long ago
        const pointsRecord = {
          _id: "testuser",
          pointsTotal: 10,
          updatedAt: "",
          currentStreak: 5,
          lastStreakReceivedDate: oldDate.toISOString(),
          save: saveSpy,
        };
        // Spy on UserPointsModel.findById to return this record
        vi.spyOn(UserPointsModel, "findById").mockResolvedValue(pointsRecord as never);

        // Let the internal awardPoints path succeed
        vi.spyOn(PointsLedgerModel, "findOne").mockResolvedValue(null);
        vi.spyOn(PointsLedgerModel, "create").mockResolvedValue({} as never);

        const result = await pointsService.getOrUpdateStreak("testuser");
        // The streak should be reset to 1, and the last streak date should be updated to today
        expect(result).toBe(1);
        expect(pointsRecord.currentStreak).toBe(1);
        expect(pointsRecord.lastStreakReceivedDate).toBeTruthy();
        expect(saveSpy).toHaveBeenCalled();
      });
    });
  });
});
