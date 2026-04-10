import { randomUUID } from "node:crypto";
import {
  type GameInfo,
  type GameKey,
  type TaggedGameView,
  type NimState,
  type GuessState,
  type MineFinderState,
} from "@gamenite/shared";
import { createChat } from "./game-chat.service.ts";
import { populateSafeUserInfo } from "./user.service.ts";
import { type GameServicer } from "../games/gameServiceManager.ts";
import { nimGameService } from "../games/nim.ts";
import { guessGameService } from "../games/guess.ts";
import { mineFinderGameService, getStatus as getMineFinderStatus } from "../games/minefinder.ts";
import { circleconnectGameService } from "../games/circleconnect.ts";
import { type GameViewUpdates, type UserWithId } from "../types.ts";
import { ClanMemberModel, DailyGameModel, GameModel } from "../mongoose-models.ts";
import { updateProfile } from "./profile.service.ts";
import { awardPoints } from "./points.service.ts";
import { checkWinAchievements } from "./achievement.service.ts";
import { recordWin, recordGamePlayed } from "./game-stats.service.ts";
import { getUserByUsername } from "./auth.service.ts";
import { markDailyCompleted } from "./daily.service.ts";

const TUTORIAL_BOT_USERNAME = "tutorialbot";

/**
 * The service interface for individual games
 */
export const gameServices: { [key in GameKey]: GameServicer } = {
  nim: nimGameService,
  guess: guessGameService,
  minesweeper: mineFinderGameService,
  circleconnect: circleconnectGameService,
};

/**
 * Get the tutorial bot's move for a given game state
 * @param gameType type of game the bot is playing
 * @param state state of the game
 * @returns the tutorial bot's move
 */
function getTutorialBotMove(gameType: GameKey, state: unknown): unknown {
  if (gameType === "nim") {
    const nimState = state as NimState;
    // Only take 1 object if there is 5 or less remaining. Allows user to practice more strategy and not have bot end game abruptly
    if (nimState.remaining === 4) {
      return 3;
    } else if (nimState.remaining === 3) {
      return 2;
    } else if (nimState.remaining === 2 || nimState.remaining === 1) {
      return 1;
    }
    // The bot takes a random valid number of sticks, between 1 and either 3 or the number of remaining sticks (if less than 3)
    const maxTake = Math.min(3, nimState.remaining);
    // The bot strategy is not optimized, just random valid moves, to make the tutorial more approachable for beginners
    return Math.floor(Math.random() * maxTake) + 1;
  }

  if (gameType === "guess") {
    // Just select random number from 1-100
    return Math.floor(Math.random() * 100) + 1;
  }

  return null;
}

/**
 * Expand a stored game
 *
 * @param gameId - Valid game id
 * @returns the expanded game info object
 */
async function populateGameInfo(gameId: string): Promise<GameInfo> {
  const doc = await GameModel.findById(gameId).lean();
  if (!doc) throw new Error(`Failed to find game ${gameId}`);
  return {
    gameId,
    createdBy: await populateSafeUserInfo(doc.createdBy),
    chat: doc.chat,
    createdAt: new Date(doc.createdAt),
    players: await Promise.all(doc.players.map(populateSafeUserInfo)),
    type: doc.type,
    status: !doc.state ? "waiting" : doc.done ? "done" : "active",
    minPlayers: gameServices[doc.type].minPlayers,
  };
}

/**
 * Create and store a new game
 *
 * @param user - Initial player in the game's waiting room
 * @param type - Game key
 * @param createdAt - Creation time for this game
 * @param isTutorial - Whether this game is a tutorial (includes a bot player and awards no points)
 * @returns the new game's info object
 */
export async function createGame(
  user: UserWithId,
  type: GameKey,
  createdAt: Date,
  isTutorial: boolean = false,
): Promise<GameInfo> {
  const chat = await createChat(createdAt);
  const gameId = randomUUID().toString();
  let players = [user.userId];
  let botPlayerIndex: number | null = null;
  let state: unknown = undefined;
  if (isTutorial) {
    // Single-player games don't support tutorial bots
    if (gameServices[type].maxPlayers !== null && gameServices[type].maxPlayers <= 1) {
      throw new Error(`${type} is a single-player game and does not support tutorials`);
    }
    const bot = await getUserByUsername(TUTORIAL_BOT_USERNAME);
    if (!bot) throw new Error("Tutorial bot user not found");

    players = [user.userId, bot.userId];
    botPlayerIndex = 1;
    // Tutorial games skip waiting room state
    state = gameServices[type].create(players).state;
  }

  await GameModel.create({
    _id: gameId,
    type,
    done: false,
    chat: chat.chatId,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    players,
    isTutorial,
    botPlayerIndex,
    state,
  });
  return populateGameInfo(gameId);
}

/**
 * Retrieves a single game from the database. If you expect the id to be valid, use `forceGameById`.
 *
 * @param gameId - Ostensible game id
 * @returns the game's info object, or null
 */
export async function getGameById(gameId: string): Promise<GameInfo | null> {
  const exists = await GameModel.exists({ _id: gameId });
  if (!exists) return null;
  return populateGameInfo(gameId);
}

/**
 * Adds a user to a game that hasn't started yet. If the resulting game object has the maximum
 * allowed number of players, it is the responsibility of the caller to start the game.
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the game's info object, with the `user` listed among the players
 * @throws if the game id is not valid, if the game has started, or if the game cannot accept more
 * players
 */
export async function joinGame(gameId: string, user: UserWithId): Promise<GameInfo> {
  const game = await GameModel.findById(gameId).lean();
  if (!game) throw new Error(`user ${user.username} joining invalid game`);
  if (game.isDaily) {
    throw new Error(`user ${user.username} cannot join a daily game`);
  }
  if (game.state) {
    throw new Error(`user ${user.username} joining game that started`);
  }
  if (game.players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} joining game they are in already`);
  }
  if (game.players.length === gameServices[game.type].maxPlayers) {
    throw new Error(`user ${user.username} joining full`);
  }

  await GameModel.findByIdAndUpdate(gameId, { $push: { players: user.userId } });
  return populateGameInfo(gameId);
}

/**
 * Initializes a game that hasn't started yet
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns the necessary views for everyone watching the game
 * @throws if the game id is not valid, if the game already started, or if the game lacks enough
 * players to start
 */
export async function startGame(gameId: string, user: UserWithId): Promise<GameViewUpdates> {
  const game = await GameModel.findById(gameId).lean();
  if (!game) throw new Error(`user ${user.username} starting invalid game`);
  if (game.state) {
    throw new Error(`user ${user.username} starting game that started`);
  }

  const key = game.type;
  const players = game.players;

  if (players.length < gameServices[key].minPlayers) {
    throw new Error(`user ${user.username} starting underpopulated game`);
  }
  if (!players.some((userId) => userId === user.userId)) {
    throw new Error(`user ${user.username} starting game they're not in`);
  }
  const { state, views } = gameServices[key].create(players);

  await GameModel.findByIdAndUpdate(gameId, { state });
  return views;
}

export interface GameListFilter {
  clanId?: string;
  userId?: string;
  limit?: number;
  status?: "waiting" | "active" | "done";
}

/**
 * Get a list of games, optionally filtered by clan or user
 *
 * @param filter - optional filters (clanId, userId, limit)
 * @returns a list of game summaries, ordered reverse chronologically
 */
export async function getGames(
  filter: GameListFilter = {},
): Promise<GameInfo[] | { error: string }> {
  if (filter.clanId && filter.userId) {
    return { error: "Cannot filter by both clanId and userId" };
  }

  const query: Record<string, unknown> = { isDaily: { $ne: true } };

  if (filter.clanId) {
    const members = await ClanMemberModel.find({ clanId: filter.clanId }, { userId: 1 }).lean();
    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) return [];
    query.players = { $in: memberIds };
  }

  if (filter.userId) {
    query.players = filter.userId;
  }

  if (filter.status === "done") {
    query.done = true;
  } else if (filter.status === "active") {
    query.done = false;
    query.state = { $ne: null };
  } else if (filter.status === "waiting") {
    query.done = false;
    query.state = null;
  }

  let dbQuery = GameModel.find(query, { _id: 1 }).sort({ createdAt: -1 });
  if (filter.limit) {
    dbQuery = dbQuery.limit(filter.limit);
  }

  const docs = await dbQuery.lean();
  const unsorted = await Promise.all(docs.map((d) => populateGameInfo(d._id)));

  return unsorted.toSorted((game1, game2) => game2.createdAt.getTime() - game1.createdAt.getTime());
}

/**
 * Represents the result of a game update, including view updates and the
 * move description suffix (the display name is prepended by the caller).
 */
export interface GameUpdateResult {
  views: GameViewUpdates;
  // Changed to moveLogs to handle showing bot moves in tutorial games
  moveLogs: {
    user: UserWithId;
    moveDescription: string;
  }[];
  chatId: string;
}

/**
 * Updates a game state and returns the necessary view updates
 *
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @param move - Unsanitized game move
 * @returns the view updates and move descriptions to send to players and watchers
 * @throws if the game id or move is not valid
 */
export async function updateGame(
  gameId: string,
  user: UserWithId,
  move: unknown,
): Promise<GameUpdateResult> {
  const game = await GameModel.findById(gameId).lean();
  if (!game) throw new Error(`user ${user.username} acted on an invalid game`);
  if (!game.state) {
    throw new Error(`user ${user.username} made a move in game of that hadn't started`);
  }

  const players = game.players;
  const playerIndex = players.findIndex((userId) => userId === user.userId);
  if (playerIndex < 0) {
    throw new Error(`user ${user.username} made a move in a game they weren't playing`);
  }

  let result = gameServices[game.type].update(game.state, move, playerIndex, players);
  if (!result) throw new Error(`user ${user.username} made an invalid move in ${game.type}`);

  const moveLogs: {
    user: UserWithId;
    moveDescription: string;
  }[] = [
    {
      user,
      moveDescription: result.moveDescription,
    },
  ];

  const isBotTurn =
    game.isTutorial &&
    !result.done &&
    game.botPlayerIndex !== null &&
    ((game.type === "nim" && (result.state as NimState).nextPlayer === game.botPlayerIndex) ||
      (game.type === "guess" &&
        (result.state as GuessState).guesses[game.botPlayerIndex] === null));

  if (isBotTurn) {
    const botMove = getTutorialBotMove(game.type, result.state);
    if (botMove !== null) {
      const botResult = gameServices[game.type].update(
        result.state,
        botMove,
        game.botPlayerIndex!,
        players,
      );

      if (!botResult) {
        throw new Error(`tutorial bot made an invalid move in ${game.type}`);
      }

      const bot = await getUserByUsername(TUTORIAL_BOT_USERNAME);
      if (!bot) {
        throw new Error("Tutorial bot user not found while logging move");
      }

      moveLogs.push({
        user: bot,
        moveDescription: botResult.moveDescription,
      });

      result = botResult;
    }
  }

  await GameModel.findByIdAndUpdate(gameId, {
    state: result.state,
    done: game.done || result.done,
  });

  // If the game just transitioned to done, handle completion
  if (!game.isTutorial && !game.done && result.done) {
    try {
      for (const playerUserId of players) {
        const player = await populateSafeUserInfo(playerUserId);
        await recordGamePlayed(player.username, game.type);
      }

      // Award win points if there's a winner
      if (result.winnerIndex !== undefined) {
        const winnerUserId = players[result.winnerIndex];
        const winner = await populateSafeUserInfo(winnerUserId);

        await awardPoints(winner.username, 1, "win", `Won ${game.type} game`, gameId);
        await recordWin(winner.username, game.type);
        await checkWinAchievements(winner.username, game.type);
      }
    } catch {
      // Not failing game update if stats fail
    }

    // Check if this is a daily game and mark it complete
    const dailyRecord = await DailyGameModel.findOne({ gameId }).lean();
    if (dailyRecord && !dailyRecord.completed) {
      let won = result.winnerIndex !== undefined;
      const gameState = result.state as Record<string, unknown>;
      if (game.type === "minesweeper" && gameState.state === "started") {
        won =
          getMineFinderStatus(gameState as unknown as MineFinderState & { state: "started" }) ===
          "won";
      }
      if (game.type === "circleconnect" && gameState.forfeited) {
        won = false;
      }
      await markDailyCompleted(dailyRecord.username, dailyRecord.gameType, gameId, won);
    }
  }

  return {
    views: result.views,
    moveLogs,
    chatId: game.chat,
  };
}

/**
 * View a game as a specific user
 * @param gameId - Ostensible game id
 * @param user - Authenticated user
 * @returns A boolean for whether that user is a player, the player's view, and the list of players
 */
export async function viewGame(gameId: string, user: UserWithId) {
  const game = await GameModel.findById(gameId).lean();
  if (!game) throw new Error(`user ${user.username} viewed an invalid game id`);
  // Update user presence to active in this game
  await updateProfile(user.username, {
    onlinePresence: {
      status: "active",
      activeGameId: gameId,
      lastActive: new Date().toISOString(),
    },
  });
  const players = game.players;
  const playerIndex = players.findIndex((userId) => userId === user.userId);
  let view: TaggedGameView | null = null;
  if (game.state) {
    view = gameServices[game.type].view(game.state, playerIndex);
  }
  return {
    isPlayer: playerIndex >= 0,
    view,
    players: await Promise.all(players.map(populateSafeUserInfo)),
  };
}
