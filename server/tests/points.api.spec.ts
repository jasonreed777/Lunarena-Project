import { describe, expect, it, beforeEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import { app } from "../src/app.ts";
import { awardPoints } from "../src/services/points.service.ts";

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

beforeEach(() => logout());

describe("GET /api/points/leaderboard", () => {
  it("should return 200 with an empty array when no users have points", async () => {
    response = await supertest(app).get("/api/points/leaderboard");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return users sorted by pointsTotal descending after awards", async () => {
    await awardPoints("user0", 5, "win", "Won a game");
    await awardPoints("user1", 20, "win", "Won a game");
    await awardPoints("user2", 10, "win", "Won a game");

    response = await supertest(app).get("/api/points/leaderboard");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toMatchObject({ username: "user1", pointsTotal: 20 });
    expect(response.body[1]).toMatchObject({ username: "user2", pointsTotal: 10 });
    expect(response.body[2]).toMatchObject({ username: "user0", pointsTotal: 5 });
  });

  it("should not require authentication", async () => {
    logout();
    response = await supertest(app).get("/api/points/leaderboard");
    expect(response.status).toBe(200);
  });
});

describe("GET /api/points/:username", () => {
  it("should return 500 for a nonexistent username", async () => {
    response = await supertest(app).get("/api/points/nonexistent_user_xyz");
    expect(response.status).toBe(500);
  });

  it("should return 200 with a number for a user's points", async () => {
    response = await supertest(app).get("/api/points/user0");
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe("number");
  });

  it("should return higher total after points are awarded", async () => {
    response = await supertest(app).get("/api/points/user1");
    const before = response.body as number;

    await awardPoints("user1", 15, "win", "Won a game of nim");

    response = await supertest(app).get("/api/points/user1");
    expect(response.status).toBe(200);
    expect(response.body).toBe(before + 15);
  });

  it("should reflect cumulative points from multiple awards", async () => {
    response = await supertest(app).get("/api/points/user2");
    const before = response.body as number;

    await awardPoints("user2", 10, "win", "Won game 1");
    await awardPoints("user2", 7, "win", "Won game 2");
    await awardPoints("user2", 3, "achievement", "Earned an achievement");

    response = await supertest(app).get("/api/points/user2");
    expect(response.status).toBe(200);
    expect(response.body).toBe(before + 20);
  });

  it("should not require authentication", async () => {
    logout();
    response = await supertest(app).get("/api/points/user0");
    expect(response.status).toBe(200);
  });
});

describe("GET /api/points/streak/:username", () => {
  it("should return 200 with a streak value", async () => {
    response = await supertest(app).get("/api/points/streak/user0");
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe("number");
  });

  it("should not require authentication", async () => {
    logout();
    response = await supertest(app).get("/api/points/streak/user1");
    expect(response.status).toBe(200);
  });
});

describe("GET /api/points/daily/:username", () => {
  it("should return 200 with points data for a user", async () => {
    await awardPoints("user0", 10, "win", "Won a game");

    response = await supertest(app).get("/api/points/daily/user0");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body[0]).toHaveProperty("points");
    expect(response.body[0]).toHaveProperty("date");
  });

  it("should not require authentication", async () => {
    logout();
    response = await supertest(app).get("/api/points/daily/user0");
    expect(response.status).toBe(200);
  });
});
