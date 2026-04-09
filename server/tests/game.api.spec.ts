import { describe, expect, it, beforeEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import { app } from "../src/app.ts";
import { randomUUID } from "crypto";
import { getUserByUsername } from "../src/services/auth.service.ts";

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

let response: Response;

beforeEach(() => logout());

describe("POST /api/game/create", () => {
  it("should return 400 on ill-formed payload or invalid game key", async () => {
    await loginAs("user3");
    response = await supertest(app).post(`/api/game/create`).send({ payload: 9 });
    expect(response.status).toBe(400);

    response = await supertest(app)
      .post(`/api/game/create`)
      .send({ payload: "gameThatDoesNotExist" });
    expect(response.status).toBe(400);
  });

  it("should return 401 when not authenticated", async () => {
    response = await supertest(app).post(`/api/game/create`).send({ payload: "nim" });
    expect(response.status).toBe(401);
  });

  it("should succeed when asked to create a game of nim", async () => {
    await loginAs("user3");
    response = await supertest(app).post(`/api/game/create`).send({ payload: "nim" });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      gameId: expect.anything(),
      chat: expect.anything(),
      type: "nim",
      status: "waiting",
      createdBy: {
        username: "user3",
        display: "Frau Drei",
        createdAt: expect.anything(),
        profileBorderColor: "#8d8d8d",
      },
      createdAt: expect.anything(),
      minPlayers: 2,
      players: [
        {
          username: "user3",
          display: "Frau Drei",
          createdAt: expect.anything(),
          profileBorderColor: "#8d8d8d",
        },
      ],
    });
  });
});

describe("GET /api/game/:id", () => {
  it("should 404 given a nonexistent id", async () => {
    response = await supertest(app).get(`/api/game/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("should succeed if a created game is requested", async () => {
    await loginAs("user3");
    response = await supertest(app).post(`/api/game/create`).send({ payload: "nim" });
    expect(response.status).toBe(200);
    const gameInfo = response.body;

    response = await supertest(app).get(`/api/game/${gameInfo.gameId}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(gameInfo);
  });
});

describe("GET /api/game/list", () => {
  it("should return created games in reverse chronological order", async () => {
    response = await supertest(app).get(`/api/game/list`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      {
        type: "nim",
        status: "waiting",
        players: [{ username: "user1" }],
      },
      {
        type: "guess",
        status: "active",
        players: [
          { username: "user1" },
          { username: "user0" },
          { username: "user3" },
          { username: "user2" },
        ],
      },
      {
        type: "nim",
        status: "done",
        createdAt: new Date("2025-04-21").toISOString(),
        players: [{ username: "user2" }, { username: "user3" }],
      },
    ]);
  });
});
