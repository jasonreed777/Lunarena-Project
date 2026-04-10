import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import supertest from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import { app } from "../src/app.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import * as dailyService from "../src/services/daily.service.ts";
import * as dailyObjService from "../src/services/daily-objectives.service.ts";
import { DailyGameModel } from "../src/mongoose-models.ts";
import { initializeAchievements } from "../src/services/achievement.service.ts";

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

async function loginAs(username: string) {
  const u = await getUserByUsername(username);
  if (!u) throw new Error(`test user ${username} not found`);
  testAuth.user = { userId: u.userId, username: u.username };
}

function logout() {
  testAuth.user = null;
}

beforeEach(async () => {
  logout();
  await DailyGameModel.deleteMany({});
  await initializeAchievements();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/game/daily/:gameType
// ---------------------------------------------------------------------------
describe("GET /api/game/daily/:gameType", () => {
  it("should return 401 when not authenticated", async () => {
    const res = await supertest(app).get("/api/game/daily/minesweeper");
    expect(res.status).toBe(401);
  });

  it("should return 400 for an invalid game type", async () => {
    await loginAs("user0");
    const res = await supertest(app).get("/api/game/daily/nim");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid daily game type");
  });

  it("should return 200 with a minesweeper daily game", async () => {
    await loginAs("user0");
    const res = await supertest(app).get("/api/game/daily/minesweeper");
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("minesweeper");
    expect(res.body.gameId).toBeDefined();
  });

  it("should return 200 with a circleconnect daily game", async () => {
    await loginAs("user0");
    const res = await supertest(app).get("/api/game/daily/circleconnect");
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("circleconnect");
  });

  it("should return 500 when getOrCreateDailyGame throws", async () => {
    await loginAs("user0");
    vi.spyOn(dailyService, "getOrCreateDailyGame").mockRejectedValue(new Error("db down"));
    const res = await supertest(app).get("/api/game/daily/minesweeper");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Failed to get daily game");
  });
});

// ---------------------------------------------------------------------------
// GET /api/game/daily/status
// ---------------------------------------------------------------------------
describe("GET /api/game/daily/status", () => {
  it("should return 401 when not authenticated", async () => {
    const res = await supertest(app).get("/api/game/daily/status");
    expect(res.status).toBe(401);
  });

  it("should return 200 with daily status", async () => {
    await loginAs("user0");
    const res = await supertest(app).get("/api/game/daily/status");
    expect(res.status).toBe(200);
    expect(res.body.date).toBeDefined();
    expect(res.body.games).toHaveLength(2);
    expect(res.body.streak).toBeDefined();
  });

  it("should return 500 when getDailyStatus throws", async () => {
    await loginAs("user0");
    vi.spyOn(dailyService, "getDailyStatus").mockRejectedValue(new Error("db down"));
    const res = await supertest(app).get("/api/game/daily/status");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Failed to get daily status");
  });
});

// ---------------------------------------------------------------------------
// GET /api/game/daily/objectives
// ---------------------------------------------------------------------------
describe("GET /api/game/daily/objectives", () => {
  it("should return 401 when not authenticated", async () => {
    const res = await supertest(app).get("/api/game/daily/objectives");
    expect(res.status).toBe(401);
  });

  it("should return 200 with daily objectives", async () => {
    await loginAs("user0");
    const res = await supertest(app).get("/api/game/daily/objectives");
    expect(res.status).toBe(200);
    expect(res.body.objectives).toHaveLength(3);
    expect(res.body.allCompleted).toBe(false);
    expect(res.body.date).toBeDefined();
  });

  it("should return 500 when getDailyObjectives throws", async () => {
    await loginAs("user0");
    vi.spyOn(dailyObjService, "getDailyObjectives").mockRejectedValue(new Error("db down"));
    const res = await supertest(app).get("/api/game/daily/objectives");
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Failed to get daily objectives");
  });
});
