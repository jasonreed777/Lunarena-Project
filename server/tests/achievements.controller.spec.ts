import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { getAchievementsByUsername } from "../src/controllers/achievement.controller.ts";
import * as achievementService from "../src/services/achievement.service.ts";

vi.mock("../../src/services/achievement.service.ts", () => ({
  getUserAchievements: vi.fn(),
}));

function createMockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe("achievement.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAchievementsByUsername", () => {
    it("should return 200 with user achievements", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();

      const achievements = [
        {
          achievementId: "first-win",
          title: "First Win",
          description: "Win your first game",
          achievedAt: "2026-04-09T00:00:00.000Z",
        },
      ];

      vi.mocked(achievementService.getUserAchievements).mockResolvedValue(achievements);

      await getAchievementsByUsername(req, res);

      expect(achievementService.getUserAchievements).toHaveBeenCalledWith("user0");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(achievements);
    });

    it("should return 400 when username is invalid", async () => {
      const req = { params: { username: undefined } } as unknown as Request;
      const res = createMockResponse();

      await getAchievementsByUsername(req, res);

      expect(achievementService.getUserAchievements).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "invalid username" });
    });

    it("should return 500 when service throws", async () => {
      const req = { params: { username: "user0" } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(achievementService.getUserAchievements).mockRejectedValue(new Error("db failed"));

      await getAchievementsByUsername(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: expect.stringContaining("failed to fetch user achievements"),
      });
    });
  });
});
