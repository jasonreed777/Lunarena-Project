import {
  zMineFinderFirstMove,
  zMineFinderForfeit,
  zMineFinderMove,
  type MineFinderState,
  type MineFinderView,
} from "@gamenite/shared";
import type { GameLogic } from "./gameLogic.ts";
import { GameService } from "./gameServiceManager.ts";
import { coinFlip } from "./util.ts";

/**
 * Checks whether a (row, col) coordinate is in scope of a given board
 *
 * @param param0 - Minefield state
 * @param row - the row number
 * @param col - the column number
 */
function inBounds(state: MineFinderState & { state: "started" }, row: number, col: number) {
  const { height, width } = state;
  return 0 <= row && row < height && 0 <= col && col < width;
}

/**
 * Counts the number of mines in the squares touching a given square
 * (including touching corners)
 *
 * @param state - Minefield state
 * @param row - the row number
 * @param col - the column number
 * @returns
 */
function countNeighborBombs(
  state: MineFinderState & { state: "started" },
  row: number,
  col: number,
) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (
        inBounds(state, row + dy, col + dx) &&
        !(dx === 0 && dy === 0) &&
        state.board[row + dy][col + dx]
      ) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Performs a floodfill: every click on a cell with zero neighboring bombs
 * "floods" into clicks into neighboring cells.
 *
 * @param state - Minefield state
 * @returns - A copy of `state.clicked` where each clicked 0-bomb square implies a click to the surrounding squares
 */
function floodClicks(state: MineFinderState & { state: "started" }): boolean[][] {
  const flood = state.clicked.map((row) => row.map((x) => x));
  let done = false;
  while (!done) {
    done = true;
    for (let row = 0; row < state.height; row += 1) {
      for (let col = 0; col < state.width; col += 1) {
        if (
          // Extend flood fill fill when...
          flood[row][col] && // The current cell is clicked, and
          !state.board[row][col] && // The current cell is not a bomb, and
          countNeighborBombs(state, row, col) === 0 // No neighbors are bombs
        ) {
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (inBounds(state, row + dy, col + dx) && !flood[row + dy][col + dx]) {
                done = false;
                flood[row + dy][col + dx] = true;
              }
            }
          }
        }
      }
    }
  }

  return flood;
}

/**
 * Transforms the board into a view that hides information from the player:
 * only clicked squares get the number of neighbors revealed, exploded bombs
 * get shown as '*', and unrevealed regions are '?'.
 *
 * @param state - Minefield state
 */
function makeProgressView(state: MineFinderState & { state: "started" }): ("?" | number | "*")[][] {
  const view: ("?" | number | "*")[][] = state.board.map((row, y) =>
    row.map((_, x) => {
      if (!state.clicked[y][x]) return "?";
      if (state.board[y][x]) return "*";
      return countNeighborBombs(state, y, x);
    }),
  );

  return view;
}

/**
 * Get the high-level status — `starting` | `playing`, `won`, or `lost` — for a minefield state
 *
 * @param state - Minefield state
 */
export function getStatus(
  state: MineFinderState & { state: "started" },
): "waiting" | "playing" | "won" | "lost" | "forfeited" {
  if (state.forfeited) return "forfeited";
  const { board, clicked, height, width } = state;
  let unfinished = false;
  let count = 0;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (board[row][col] && clicked[row][col]) {
        count = count + 1;
      }
      if (!board[row][col] && !clicked[row][col]) {
        unfinished = true;
      }
    }
  }
  if (state.difficulty === "easy") {
    if (count >= 2) {
      return "lost";
    }
  } else {
    if (count >= 1) {
      return "lost";
    }
  }

  return unfinished ? "playing" : "won";
}

/**
 * Generate a mine board with the given difficulty and optional seeded random.
 * Extracted so it can be called directly for daily games with deterministic seeds.
 */
export function generateMineBoard(
  difficulty: "easy" | "standard" | "hard",
  random: () => number = Math.random,
): MineFinderState & { state: "started" } {
  const [height, width] =
    difficulty === "easy"
      ? [6, 6]
      : difficulty === "standard"
        ? coinFlip(random)
          ? [5, 7]
          : [6, 6]
        : [8, 5];
  const board: boolean[][] = Array.from({ length: height }).map(() =>
    Array.from({ length: width }).map(() => false),
  );
  const clicked: boolean[][] = Array.from({ length: height }).map(() =>
    Array.from({ length: width }).map(() => false),
  );

  let nBombs = difficulty === "easy" ? 3 : (height * width) / (difficulty === "standard" ? 8 : 6);
  while (nBombs > 0) {
    const row = Math.floor(random() * height);
    const col = Math.floor(random() * width);
    if (!board[row][col]) {
      board[row][col] = true;
      nBombs -= 1;
    }
  }

  return { state: "started", height, width, board, clicked, difficulty };
}

export const mineFinderLogic: GameLogic<MineFinderState, MineFinderView> = {
  minPlayers: 1,
  maxPlayers: 1,
  start: () => {
    return { state: "waiting" };
  },
  isDone: (state) => state.state === "started" && getStatus(state) !== "playing",
  viewAs: (state) => {
    if (state.state === "waiting") {
      return {
        difficulty: "standard",
        height: 0,
        width: 0,
        state: "waiting",
        field: [],
      };
    }
    return {
      difficulty: state.difficulty ?? "standard",
      height: state.height,
      width: state.width,
      state: getStatus(state),
      field: makeProgressView(state),
    };
  },
  update: (state, move, playerIndex) => {
    if (state.state === "waiting") {
      const safeMove = zMineFinderFirstMove.safeParse(move);
      if (safeMove.error) return null;
      return generateMineBoard(safeMove.data);
    }
    // Handle forfeit
    const forfeit = zMineFinderForfeit.safeParse(move);
    if (forfeit.success) {
      return { ...state, forfeited: true };
    }
    const safeMove = zMineFinderMove.safeParse(move);
    if (safeMove.error) return null;
    const [row, col] = safeMove.data;
    if (row >= state.height || col >= state.width) return null;
    if (state.clicked[row][col]) return null;
    if (getStatus(state) !== "playing") return null;
    if (playerIndex < 0) return null;
    state.clicked[row][col] = true;
    state.clicked = floodClicks(state);
    return state;
  },
  tagView: (view) => ({ type: "minesweeper", view }),
  winnerIndex: (state) => {
    if (state.state === "started" && getStatus(state) === "won") return 0;
    return undefined;
  },
  describeMove: (_prevState, newState, payload) => {
    if (newState.state === "waiting") return " selected difficulty";
    const status = getStatus(newState);
    if (status === "forfeited") return " forfeited the game";
    if (status === "lost") return " hit a mine and lost!";
    if (status === "won") return " cleared the minefield!";
    const move = zMineFinderMove.safeParse(payload);
    if (move.success) return ` revealed cell [${move.data[0]}, ${move.data[1]}]`;
    return " made a move";
  },
};

export const mineFinderGameService = new GameService<MineFinderState, MineFinderView>(
  mineFinderLogic,
);
