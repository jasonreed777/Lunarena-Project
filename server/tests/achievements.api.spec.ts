import { describe, expect, it, beforeEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import { app } from "../src/app.ts";
import { initializeAchievements, awardAchievement } from "../src/services/achievement.service.ts";

const testAuth = vi.hoisted(() => ({ user: null as { userId: string; username: string } | null }));

vi.mock("../src/middleware/auth.middleware.ts", () => ({
  requireAuth: vi.fn((req: Request, res: ExpressResponse, next: NextFunction) => {
    if (!testAuth.user) {
      res.status(401).send({ error: "Not authenticated" });
      return;
    }
    req.authUser = testAuth.user;
    next();
  }),
}));

function logout() {
  testAuth.user = null;
}

let response: Response;

beforeEach(async () => {
  logout();
  await initializeAchievements();
});

describe("GET /api/achievements/:username", () => {
  it("should return 200 with an empty array for a user with no achievements", async () => {
    response = await supertest(app).get("/api/achievements/user1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return achievements after awardAchievement is called", async () => {
    await awardAchievement("user1", "first-win");

    response = await supertest(app).get("/api/achievements/user1");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toHaveProperty("achievementId", "first-win");
    expect(response.body[0]).toHaveProperty("achievedAt");
  });

  it("should include title and description from the achievement definition", async () => {
    await awardAchievement("user1", "first-win");

    response = await supertest(app).get("/api/achievements/user1");
    expect(response.status).toBe(200);
    expect(response.body[0]).toHaveProperty("title");
    expect(response.body[0]).toHaveProperty("description");
  });

  it("should return multiple achievements when user has earned several", async () => {
    await awardAchievement("user1", "first-win");
    await awardAchievement("user1", "nim-1-wins");

    response = await supertest(app).get("/api/achievements/user1");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("should not require authentication", async () => {
    logout();
    response = await supertest(app).get("/api/achievements/user1");
    expect(response.status).toBe(200);
  });

  it("should return achievements scoped per user", async () => {
    await awardAchievement("user0", "first-win");

    response = await supertest(app).get("/api/achievements/user0");
    expect(response.status).toBe(200);
    const user0Body = response.body as Array<{ achievementId: string }>;
    const user0Ids = user0Body.map((a) => a.achievementId);
    expect(user0Ids).toContain("first-win");

    // user3 should not have user0's achievement
    response = await supertest(app).get("/api/achievements/user3");
    expect(response.status).toBe(200);
    const user3Body = response.body as Array<{ achievementId: string }>;
    const user3Ids = user3Body.map((a) => a.achievementId);
    expect(user3Ids).not.toContain("first-win");
  });
});
