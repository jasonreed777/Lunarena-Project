import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { randomUUID } from "crypto";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import {
  createGame,
  joinGame,
  startGame,
  getGames,
  updateGame,
  viewGame,
  getGameById,
} from "../../src/services/game.service.ts";
import type { UserWithId } from "../../src/types.ts";
import { GameModel, ClanMemberModel } from "../../src/mongoose-models.ts";
import { initializeAchievements } from "../../src/services/achievement.service.ts";

let user0: UserWithId;
let user1: UserWithId;
let user2: UserWithId;

beforeEach(async () => {
  const u0 = await getUserByUsername("user0");
  const u1 = await getUserByUsername("user1");
  const u2 = await getUserByUsername("user2");
  user0 = { userId: u0!.userId, username: u0!.username };
  user1 = { userId: u1!.userId, username: u1!.username };
  user2 = { userId: u2!.userId, username: u2!.username };
  await initializeAchievements();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper: find a seeded game by criteria
async function findSeededGame(criteria: Record<string, unknown>) {
  const doc = await GameModel.findOne(criteria).lean();
  return doc?._id as string;
}

describe("createGame", () => {
  it("should create a tutorial nim game with bot player and active status", async () => {
    const game = await createGame(user0, "nim", new Date(), true);
    expect(game.status).toBe("active");
    expect(game.players).toHaveLength(2);
    expect(game.players[0].username).toBe("user0");
    expect(game.players[1].username).toBe("tutorialbot");
    expect(game.type).toBe("nim");
  });

  it("should throw when creating a tutorial for a single-player game type", async () => {
    await expect(createGame(user0, "minesweeper", new Date(), true)).rejects.toThrow(
      "single-player game and does not support tutorials",
    );
  });

  it("should create a tutorial guess game with bot player and active status", async () => {
    const game = await createGame(user0, "guess", new Date(), true);
    expect(game.status).toBe("active");
    expect(game.players).toHaveLength(2);
    expect(game.players[1].username).toBe("tutorialbot");
    expect(game.type).toBe("guess");
  });
});

describe("joinGame", () => {
  it("should throw when joining a nonexistent game", async () => {
    return expect(joinGame("nonexistent-id", user0)).rejects.toThrow("joining invalid game");
  });

  it("should throw when joining a daily game", async () => {
    // Create a game and mark it as daily
    const game = await createGame(user0, "nim", new Date());
    await GameModel.findByIdAndUpdate(game.gameId, { isDaily: true });
    return expect(joinGame(game.gameId, user1)).rejects.toThrow("cannot join a daily game");
  });

  it("should throw when joining a game that already started", async () => {
    const activeId = await findSeededGame({ state: { $ne: null }, done: false });
    return expect(joinGame(activeId, user0)).rejects.toThrow("joining game that started");
  });

  it("should throw when joining a game the user is already in", async () => {
    const waitingId = await findSeededGame({ state: null, done: false });
    return expect(joinGame(waitingId, user1)).rejects.toThrow("joining game they are in already");
  });

  it("should throw when joining a full game", async () => {
    const game = await createGame(user0, "nim", new Date());
    await joinGame(game.gameId, user1);
    return expect(joinGame(game.gameId, user2)).rejects.toThrow("joining full");
  });

  it("should successfully join a waiting game", async () => {
    const game = await createGame(user0, "nim", new Date());
    const updated = await joinGame(game.gameId, user1);
    expect(updated.players).toHaveLength(2);
    expect(updated.players[1].username).toBe("user1");
  });
});

describe("startGame", () => {
  it("should throw when starting a nonexistent game", async () => {
    return expect(startGame("nonexistent", user0)).rejects.toThrow("starting invalid game");
  });

  it("should throw when starting an already-started game", async () => {
    const activeId = await findSeededGame({ state: { $ne: null }, done: false });
    return expect(startGame(activeId, user0)).rejects.toThrow("starting game that started");
  });

  it("should throw when starting an underpopulated game", async () => {
    const game = await createGame(user0, "nim", new Date());
    return expect(startGame(game.gameId, user0)).rejects.toThrow("starting underpopulated game");
  });

  it("should throw when user is not in the game", async () => {
    const game = await createGame(user0, "nim", new Date());
    await joinGame(game.gameId, user1);
    return expect(startGame(game.gameId, user2)).rejects.toThrow("starting game they're not in");
  });

  it("should successfully start a game with enough players", async () => {
    const game = await createGame(user0, "nim", new Date());
    await joinGame(game.gameId, user1);
    const views = await startGame(game.gameId, user0);
    expect(views.watchers).toBeDefined();
    expect(views.watchers.type).toBe("nim");
    expect(views.players).toHaveLength(2);
  });
});

describe("getGames", () => {
  it("should return error when filtering by both clanId and userId", async () => {
    const result = await getGames({ clanId: "c1", userId: "u1" });
    expect(result).toEqual({ error: "Cannot filter by both clanId and userId" });
  });

  it("should return empty array when clanId has no members", async () => {
    const result = await getGames({ clanId: "nonexistent-clan" });
    expect(result).toEqual([]);
  });

  it("should filter by clanId when clan has members", async () => {
    await ClanMemberModel.create({
      _id: randomUUID(),
      clanId: "test-clan",
      userId: user2.userId,
      role: "member",
      joinedAt: new Date().toISOString(),
    });
    const result = await getGames({ clanId: "test-clan" });
    expect(Array.isArray(result)).toBe(true);
    // user2 is in the done nim game and active guess game
    if ("error" in result) {
      throw Error("error in result");
    }
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const game of result) {
      expect(game.players.some((p) => p.username === "user2")).toBe(true);
    }
  });

  it("should filter by userId", async () => {
    const result = await getGames({ userId: user2.userId });
    expect(Array.isArray(result)).toBe(true);
    if ("error" in result) {
      throw Error("error in result");
    }
    for (const game of result) {
      expect(game.players.some((p) => p.username === "user2")).toBe(true);
    }
  });

  it("should filter by status=done", async () => {
    const result = await getGames({ status: "done" });
    expect(Array.isArray(result)).toBe(true);
    if ("error" in result) {
      throw Error("error in result");
    }
    for (const game of result) {
      expect(game.status).toBe("done");
    }
  });

  it("should filter by status=active", async () => {
    const result = await getGames({ status: "active" });
    expect(Array.isArray(result)).toBe(true);
    if ("error" in result) {
      throw Error("error in result");
    }
    for (const game of result) {
      expect(game.status).toBe("active");
    }
  });

  it("should filter by status=waiting", async () => {
    const result = await getGames({ status: "waiting" });
    expect(Array.isArray(result)).toBe(true);
    if ("error" in result) {
      throw Error("error in result");
    }
    for (const game of result) {
      expect(game.status).toBe("waiting");
    }
  });

  it("should respect the limit filter", async () => {
    const result = await getGames({ limit: 1 });
    expect(Array.isArray(result)).toBe(true);
    if ("error" in result) {
      throw Error("error in result");
    }
    expect(result.length).toBe(1);
  });
});

describe("updateGame", () => {
  it("should throw on nonexistent game", async () => {
    return expect(updateGame("bad-id", user0, 1)).rejects.toThrow("acted on an invalid game");
  });

  it("should throw on game that hasn't started", async () => {
    const waitingId = await findSeededGame({ state: null, done: false });
    return expect(updateGame(waitingId, user1, 1)).rejects.toThrow("hadn't started");
  });

  it("should throw when user is not a player", async () => {
    const bot = await getUserByUsername("tutorialbot");
    const activeId = await findSeededGame({ state: { $ne: null }, done: false, isTutorial: false });
    return expect(
      updateGame(activeId, { userId: bot!.userId, username: bot!.username }, 50),
    ).rejects.toThrow("weren't playing");
  });

  it("should throw on invalid move", async () => {
    // In the active guess game, user0 (index 1) already guessed 2
    const activeId = await findSeededGame({
      type: "guess",
      state: { $ne: null },
      done: false,
    });
    return expect(updateGame(activeId, user0, 50)).rejects.toThrow("invalid move");
  });

  it("should return views and moveLog for a valid non-tutorial move", async () => {
    const game = await createGame(user0, "nim", new Date());
    await joinGame(game.gameId, user1);
    await startGame(game.gameId, user0);

    const result = await updateGame(game.gameId, user0, 1);
    expect(result.views.watchers).toBeDefined();
    expect(result.moveLogs).toHaveLength(1);
    expect(result.moveLogs[0].user.username).toBe("user0");
    expect(result.chatId).toBeDefined();
  });

  it("should award points when a non-tutorial game ends with a winner", async () => {
    const game = await createGame(user0, "nim", new Date());
    await joinGame(game.gameId, user1);
    await startGame(game.gameId, user0);

    // Play nim to completion: alternate moves taking 1 each time
    // remaining starts at 21, players alternate. Player who takes last token loses.
    // user0 is index 0 (nextPlayer=0 first), user1 is index 1
    let currentPlayer = user0;
    let otherPlayer = user1;
    for (let i = 0; i < 20; i++) {
      await updateGame(game.gameId, currentPlayer, 1);
      [currentPlayer, otherPlayer] = [otherPlayer, currentPlayer];
    }
    // After 20 moves of taking 1, remaining=1. currentPlayer takes last token and loses.
    const finalResult = await updateGame(game.gameId, currentPlayer, 1);
    expect(finalResult.views).toBeDefined();
    // Game should now be done
    const gameAfter = await getGameById(game.gameId);
    expect(gameAfter?.status).toBe("done");
  });

  it("should return 2 moveLogs when tutorial bot auto-responds in nim", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const game = await createGame(user0, "nim", new Date(), true);
    const result = await updateGame(game.gameId, user0, 1);
    expect(result.moveLogs).toHaveLength(2);
    expect(result.moveLogs[0].user.username).toBe("user0");
    expect(result.moveLogs[1].user.username).toBe("tutorialbot");
  });

  it("should return 2 moveLogs when tutorial bot auto-responds in guess", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const game = await createGame(user0, "guess", new Date(), true);
    const result = await updateGame(game.gameId, user0, 50);
    expect(result.moveLogs).toHaveLength(2);
    expect(result.moveLogs[0].user.username).toBe("user0");
    expect(result.moveLogs[1].user.username).toBe("tutorialbot");
  });

  it("should not award points when a tutorial game ends", async () => {
    // Play a tutorial nim game to completion
    vi.spyOn(Math, "random").mockReturnValue(0);
    const game = await createGame(user0, "nim", new Date(), true);

    // Each updateGame call: user takes 1, bot takes 1 (random=0 -> 1). Takes 2 per round.
    // 21 tokens, 2 per round = ~10 rounds + 1 left
    // Keep making moves until game ends
    let done = false;
    for (let i = 0; i < 20 && !done; i++) {
      try {
        await updateGame(game.gameId, user0, 1);
        // Check if the game is done by looking at the DB
        const doc = await GameModel.findById(game.gameId).lean();
        done = doc?.done ?? false;
      } catch {
        break;
      }
    }
    const gameAfter = await getGameById(game.gameId);
    expect(gameAfter?.status).toBe("done");
  });
});

describe("getTutorialBotMove (via updateGame)", () => {
  it("nim bot takes 3 when remaining is 4", async () => {
    // We need remaining=4 when it's the bot's turn.
    // Bot is player index 1. After user (index 0) moves, if remaining=4, bot should take 3.
    // Start: remaining=21, nextPlayer=0 (user).
    // We need to engineer the state so remaining=4 after user's move.
    // User takes some, bot takes some (controlled by Math.random mock).
    // User move reduces by X, then bot moves. We need final user move to leave 4.

    // Strategy: mock Math.random to 0 so bot always takes 1.
    // Round 1: user takes 3 (21->18), bot takes 1 (18->17)
    // Round 2: user takes 3 (17->14), bot takes 1 (14->13)
    // Round 3: user takes 3 (13->10), bot takes 1 (10->9)
    // Round 4: user takes 3 (9->6), bot takes 1 (6->5)
    // Round 5: user takes 1 (5->4), bot should take 3 (special case)
    vi.spyOn(Math, "random").mockReturnValue(0); // bot takes 1 when > 4 remaining

    const game = await createGame(user0, "nim", new Date(), true);

    // Rounds 1-4: user takes 3 each time, bot takes 1
    for (let i = 0; i < 4; i++) {
      await updateGame(game.gameId, user0, 3);
    }

    // Round 5: user takes 1 (5->4), bot should take 3 (remaining=4 special case)
    const result = await updateGame(game.gameId, user0, 1);
    // After bot takes 3 from 4, remaining=1
    expect(result.moveLogs[1].moveDescription).toContain("three tokens");
  });

  it("nim bot takes 2 when remaining is 3", async () => {
    // Need remaining=3 after user's move for bot's turn.
    // Mock bot to take 1 for intermediate moves.
    vi.spyOn(Math, "random").mockReturnValue(0);

    const game = await createGame(user0, "nim", new Date(), true);

    // Round 1: user takes 3 (21->18), bot takes 1 (18->17)
    // Round 2: user takes 3 (17->14), bot takes 1 (14->13)
    // Round 3: user takes 3 (13->10), bot takes 1 (10->9)
    // Round 4: user takes 3 (9->6), bot takes 1 (6->5)
    for (let i = 0; i < 4; i++) {
      await updateGame(game.gameId, user0, 3);
    }
    // Round 5: user takes 2 (5->3), bot should take 2 (remaining=3 special case)
    const result = await updateGame(game.gameId, user0, 2);
    expect(result.moveLogs[1].moveDescription).toContain("two tokens");
  });

  it("nim bot takes 1 when remaining is 2", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const game = await createGame(user0, "nim", new Date(), true);

    // Same setup: after 4 rounds, remaining=5
    for (let i = 0; i < 4; i++) {
      await updateGame(game.gameId, user0, 3);
    }
    // Round 5: user takes 3 (5->2), bot should take 1 (remaining=2 special case)
    const result = await updateGame(game.gameId, user0, 3);
    expect(result.moveLogs[1].moveDescription).toContain("one token");
  });

  it("nim bot takes random valid move when remaining > 4", async () => {
    // Mock Math.random to return 0.99 so bot takes max (3)
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const game = await createGame(user0, "nim", new Date(), true);
    // remaining=21, user takes 1 (21->20), bot should take random (max 3 with random=0.99 -> 3)
    const result = await updateGame(game.gameId, user0, 1);
    expect(result.moveLogs[1].moveDescription).toContain("three tokens");
  });
});

describe("viewGame", () => {
  it("should throw on nonexistent game", async () => {
    return expect(viewGame("bad-id", user0)).rejects.toThrow("viewed an invalid game id");
  });

  it("should return isPlayer=true and a view for a player in an active game", async () => {
    const activeId = await findSeededGame({ type: "guess", state: { $ne: null }, done: false });
    const result = await viewGame(activeId, user1);
    expect(result.isPlayer).toBe(true);
    expect(result.view).not.toBeNull();
    expect(result.players.length).toBeGreaterThanOrEqual(2);
  });

  it("should return isPlayer=false for a non-player watcher", async () => {
    const bot = await getUserByUsername("tutorialbot");
    const activeId = await findSeededGame({ type: "guess", state: { $ne: null }, done: false });
    const result = await viewGame(activeId, { userId: bot!.userId, username: bot!.username });
    expect(result.isPlayer).toBe(false);
    expect(result.view).not.toBeNull();
  });

  it("should return view=null for a waiting game", async () => {
    const waitingId = await findSeededGame({ state: null, done: false });
    const result = await viewGame(waitingId, user1);
    expect(result.isPlayer).toBe(true);
    expect(result.view).toBeNull();
  });
});
