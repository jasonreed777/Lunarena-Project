import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
  getLeaderboard,
  getPointsByUsername,
  getDailyPointsByUsername,
  getStreakByUsername,
} from "../src/controllers/points.controller.ts";
import {
  getUserPoints,
  getLeaderboard as getLeaderboardService,
  getOrUpdateStreak,
  getUserDailyPoints,
} from "../src/services/points.service.ts";

vi.mock("../src/services/points.service.ts", () => ({
  getUserPoints: vi.fn(),
  getLeaderboard: vi.fn(),
  getOrUpdateStreak: vi.fn(),
  getUserDailyPoints: vi.fn(),
}));

function createMockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe("points.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLeaderboard", () => {
    it("should return 200 with leaderboard data", async () => {
      const req = {} as Request;
      const res = createMockResponse();
      const leaderboard = [
        { username: "user1", display: "User One", pointsTotal: 20 },
        { username: "user2", display: "User Two", pointsTotal: 10 },
      ];

      vi.mocked(getLeaderboardService).mockResolvedValue(leaderboard);

      await getLeaderboard(req, res);

      expect(getLeaderboardService).toHaveBeenCalledOnce();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(leaderboard);
    });

    it("should return 500 when service throws", async () => {
      const req = {} as Request;
      const res = createMockResponse();

      vi.mocked(getLeaderboardService).mockRejectedValue(new Error("db failed"));

      await getLeaderboard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: expect.stringContaining("failed to fetch leaderboard"),
      });
    });
  });

  describe("getPointsByUsername", () => {
    it("should return 200 with user points", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(getUserPoints).mockResolvedValue(25);

      await getPointsByUsername(req, res);

      expect(getUserPoints).toHaveBeenCalledWith("user0");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(25);
    });

    it("should return 400 when username is invalid", async () => {
      const req = { params: { username: undefined } } as unknown as Request;
      const res = createMockResponse();

      await getPointsByUsername(req, res);

      expect(getUserPoints).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "invalid username" });
    });

    it("should return 500 when service throws", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(getUserPoints).mockRejectedValue(new Error("db failed"));

      await getPointsByUsername(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: expect.stringContaining("failed to fetch user points"),
      });
    });
  });

  describe("getDailyPointsByUsername", () => {
    it("should return 200 with daily points data", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();
      const dailyPoints = [{ date: new Date("2026-04-09"), points: 10 }];
      vi.mocked(getUserDailyPoints).mockResolvedValue(dailyPoints);

      await getDailyPointsByUsername(req, res);

      expect(getUserDailyPoints).toHaveBeenCalledWith("user0");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(dailyPoints);
    });

    it("should return 400 when username is invalid", async () => {
      const req = { params: { username: undefined } } as unknown as Request;
      const res = createMockResponse();

      await getDailyPointsByUsername(req, res);

      expect(getUserDailyPoints).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "invalid username" });
    });

    it("should return 500 when service throws", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(getUserDailyPoints).mockRejectedValue(new Error("db failed"));

      await getDailyPointsByUsername(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: expect.stringContaining("failed to fetch user points"),
      });
    });
  });

  describe("getStreakByUsername", () => {
    it("should return 200 with streak value", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(getOrUpdateStreak).mockResolvedValue(3);

      await getStreakByUsername(req, res);

      expect(getOrUpdateStreak).toHaveBeenCalledWith("user0");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(3);
    });

    it("should return 400 when username is invalid", async () => {
      const req = { params: { username: undefined } } as unknown as Request;
      const res = createMockResponse();

      await getStreakByUsername(req, res);

      expect(getOrUpdateStreak).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "username must be a string" });
    });

    it("should return 500 when service throws", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(getOrUpdateStreak).mockRejectedValue(new Error("db failed"));

      await getStreakByUsername(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: expect.stringContaining("failed to fetch streak"),
      });
    });
  });
});
