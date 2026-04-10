import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import { app } from "../src/app.ts";
import { randomUUID } from "crypto";
import { getUserByUsername } from "../src/services/auth.service.ts";
import type { GameServer, GameServerSocket, SocketData, UserWithId } from "../src/types.ts";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import {
  socketWatch,
  socketJoinAsPlayer,
  socketStart,
  socketMakeMove,
} from "../src/controllers/game.controller.ts";
import { createGame, joinGame, startGame } from "../src/services/game.service.ts";
import { GameModel } from "../src/mongoose-models.ts";
import { initializeAchievements } from "../src/services/achievement.service.ts";

vi.mock(import("../src/controllers/socket.controller.ts"), () => {
  return { logSocketError: vi.fn() };
});

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

  it("should return 400 for invalid query parameters", async () => {
    response = await supertest(app).get(`/api/game/list?limit=-1`);
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: "Invalid query parameters" });
  });

  it("should return 400 when both clanId and userId are provided", async () => {
    response = await supertest(app).get(`/api/game/list?clanId=abc&userId=def`);
    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: "Cannot filter by both clanId and userId" });
  });
});

describe("POST /api/game/create (tutorial)", () => {
  it("should create a tutorial game with bot player", async () => {
    await loginAs("user0");
    response = await supertest(app)
      .post(`/api/game/create`)
      .send({ payload: "nim", isTutorial: true });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("active");
    expect(response.body.players).toHaveLength(2);
    expect(response.body.players[1].username).toBe("tutorialbot");
  });
});

// ============================================================
// Socket controller tests
// ============================================================

const MockGameServer = vi.fn(
  class {
    to = vi.fn(() => this);
    emit = vi.fn();
  },
);

const MockGameServerSocket = vi.fn(
  class {
    id = "mockGameServerSocket";
    data = { user: null as never };
    join = vi.fn();
    emit = vi.fn();
    to = vi.fn(() => this);
    rooms = new Set<string>();
  },
);

const mockServer = new MockGameServer() as unknown as GameServer;
const mockSocket = new MockGameServerSocket() as unknown as GameServerSocket;

// Helper to get a UserWithId
async function getUser(username: string): Promise<UserWithId> {
  const u = await getUserByUsername(username);
  return { userId: u!.userId, username: u!.username };
}

// Helper to find a seeded game
async function findSeededGame(criteria: Record<string, unknown>) {
  const doc = await GameModel.findOne(criteria).lean();
  return doc!._id;
}

afterEach(() => {
  (mockServer.to as ReturnType<typeof vi.fn>).mockClear();
  (mockServer.emit as ReturnType<typeof vi.fn>).mockClear();
  (mockSocket.join as ReturnType<typeof vi.fn>).mockClear();
  (mockSocket.emit as ReturnType<typeof vi.fn>).mockClear();
  (mockSocket.to as ReturnType<typeof vi.fn>).mockClear();
  vi.mocked(logSocketError).mockClear();
  mockSocket.data = { user: null } as unknown as SocketData;
  (mockSocket as { rooms: Set<string> }).rooms = new Set<string>();
});

describe("socketWatch", () => {
  it("should join game room + user room for a player and emit gameWatched", async () => {
    const user1 = await getUser("user1");
    mockSocket.data = { user: user1 };
    const activeId = await findSeededGame({ type: "guess", state: { $ne: null }, done: false });

    await socketWatch(mockSocket, mockServer)(activeId);

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.join).toHaveBeenCalledWith([activeId, `${activeId}-${user1.userId}`]);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "gameWatched",
      expect.objectContaining({ gameId: activeId, players: expect.any(Array) }),
    );
  });

  it("should join only game room for a non-player watcher", async () => {
    const bot = await getUser("tutorialbot");
    mockSocket.data = { user: bot };
    const activeId = await findSeededGame({ type: "guess", state: { $ne: null }, done: false });

    await socketWatch(mockSocket, mockServer)(activeId);

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.join).toHaveBeenCalledWith([activeId]);
  });

  it("should log error for an invalid game id", async () => {
    const user1 = await getUser("user1");
    mockSocket.data = { user: user1 };

    await socketWatch(mockSocket, mockServer)("nonexistent");

    expect(logSocketError).toHaveBeenCalledOnce();
  });
});

describe("socketJoinAsPlayer", () => {
  it("should broadcast updated players and join user room", async () => {
    const user2 = await getUser("user2");
    mockSocket.data = { user: user2 };
    // The seeded waiting nim game has only user1
    const waitingId = await findSeededGame({ state: null, done: false });

    await socketJoinAsPlayer(mockSocket, mockServer)(waitingId);

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.to).toHaveBeenCalledWith(waitingId);
    expect(mockServer.emit).toHaveBeenCalledWith(
      "gamePlayersUpdated",
      expect.arrayContaining([expect.objectContaining({ username: "user2" })]),
    );
    expect(mockSocket.join).toHaveBeenCalledWith(`${waitingId}-${user2.userId}`);
  });

  it("should auto-start when joining fills a nim game to max players", async () => {
    const user0 = await getUser("user0");
    const user1 = await getUser("user1");
    // Create a fresh nim game (maxPlayers=2) with user0
    const game = await createGame(user0, "nim", new Date());
    mockSocket.data = { user: user1 };

    await socketJoinAsPlayer(mockSocket, mockServer)(game.gameId);

    expect(logSocketError).not.toHaveBeenCalled();
    // sendViewUpdates broadcasts to game room (watchers) and per-player rooms
    expect(mockServer.to).toHaveBeenCalledWith(game.gameId);
    expect(mockServer.emit).toHaveBeenCalledWith(
      "gameStateUpdated",
      expect.objectContaining({ type: "nim", forPlayer: false }),
    );
  });

  it("should not re-join user room if socket is already in it", async () => {
    const user0 = await getUser("user0");
    const user2 = await getUser("user2");
    mockSocket.data = { user: user2 };
    const game = await createGame(user0, "guess", new Date());
    const userRoom = `${game.gameId}-${user2.userId}`;
    (mockSocket as { rooms: Set<string> }).rooms = new Set([userRoom]);

    await socketJoinAsPlayer(mockSocket, mockServer)(game.gameId);

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.join).not.toHaveBeenCalledWith(userRoom);
  });

  it("should log error for an invalid game id", async () => {
    const user1 = await getUser("user1");
    mockSocket.data = { user: user1 };

    await socketJoinAsPlayer(mockSocket, mockServer)("nonexistent");

    expect(logSocketError).toHaveBeenCalledOnce();
  });
});

describe("socketStart", () => {
  it("should start a game and broadcast view updates", async () => {
    const user0 = await getUser("user0");
    const user1 = await getUser("user1");
    const game = await createGame(user0, "nim", new Date());
    await joinGame(game.gameId, user1);
    mockSocket.data = { user: user0 };

    await socketStart(mockSocket, mockServer)(game.gameId);

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.to).toHaveBeenCalledWith(game.gameId);
    expect(mockServer.emit).toHaveBeenCalledWith(
      "gameStateUpdated",
      expect.objectContaining({ type: "nim", forPlayer: false }),
    );
  });

  it("should log error for an invalid game", async () => {
    const user1 = await getUser("user1");
    mockSocket.data = { user: user1 };

    await socketStart(mockSocket, mockServer)("nonexistent");

    expect(logSocketError).toHaveBeenCalledOnce();
  });
});

describe("socketMakeMove", () => {
  it("should broadcast state updates and move log for a valid move", async () => {
    await initializeAchievements();
    const user0 = await getUser("user0");
    const user1 = await getUser("user1");
    const game = await createGame(user0, "nim", new Date());
    await joinGame(game.gameId, user1);
    await startGame(game.gameId, user0);
    mockSocket.data = { user: user0 };

    await socketMakeMove(mockSocket, mockServer)({ gameId: game.gameId, move: 1 });

    expect(logSocketError).not.toHaveBeenCalled();
    // Watcher view broadcast
    expect(mockServer.to).toHaveBeenCalledWith(game.gameId);
    expect(mockServer.emit).toHaveBeenCalledWith(
      "gameStateUpdated",
      expect.objectContaining({ type: "nim", forPlayer: false }),
    );
    // Move log broadcast to chat
    expect(mockServer.emit).toHaveBeenCalledWith("chatMoveLog", expect.anything());
  });

  it("should broadcast 2 chatMoveLog events for a tutorial move", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const user0 = await getUser("user0");
    const game = await createGame(user0, "nim", new Date(), true);
    mockSocket.data = { user: user0 };

    await socketMakeMove(mockSocket, mockServer)({ gameId: game.gameId, move: 1 });

    expect(logSocketError).not.toHaveBeenCalled();
    // Should have 2 chatMoveLog emissions (player + bot)
    const chatMoveLogCalls = vi
      .mocked(mockServer.emit)
      .mock.calls.filter((call) => call[0] === "chatMoveLog");
    expect(chatMoveLogCalls).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it("should log error for an invalid payload", async () => {
    const user1 = await getUser("user1");
    mockSocket.data = { user: user1 };

    await socketMakeMove(mockSocket, mockServer)({ gameId: 123, move: 1 });

    expect(logSocketError).toHaveBeenCalledOnce();
  });
});
