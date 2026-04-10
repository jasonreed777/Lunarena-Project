import { describe, it, expect, vi, afterEach } from "vitest";
import { mineFinderLogic, generateMineBoard, getStatus } from "../../src/games/minefinder.ts";
import type { MineFinderState } from "@gamenite/shared";

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────

/** Create a small board with no mines for testing */
function emptyBoard(height: number, width: number): MineFinderState & { state: "started" } {
  return {
    state: "started",
    height,
    width,
    difficulty: "easy",
    board: Array.from({ length: height }, () => Array(width).fill(false) as boolean[]),
    clicked: Array.from({ length: height }, () => Array(width).fill(false) as boolean[]),
  };
}

/** Create a small board with mines at specific positions */
function boardWithMines(
  height: number,
  width: number,
  mines: [number, number][],
  difficulty: "easy" | "standard" | "hard" = "standard",
): MineFinderState & { state: "started" } {
  const state = emptyBoard(height, width);
  state.difficulty = difficulty;
  for (const [r, c] of mines) {
    state.board[r][c] = true;
  }
  return state;
}

// ── generateMineBoard ────────────────────────────────────────────

describe("generateMineBoard", () => {
  it("should generate an easy board (6x6 with 3 mines)", () => {
    const board = generateMineBoard("easy");
    expect(board.height).toBe(6);
    expect(board.width).toBe(6);
    expect(board.difficulty).toBe("easy");
    const mineCount = board.board.flat().filter(Boolean).length;
    expect(mineCount).toBe(3);
  });

  it("should generate a standard board", () => {
    const board = generateMineBoard("standard");
    expect([5, 6]).toContain(board.height);
    expect([6, 7]).toContain(board.width);
    expect(board.difficulty).toBe("standard");
  });

  it("should generate a hard board (8x5)", () => {
    const board = generateMineBoard("hard");
    expect(board.height).toBe(8);
    expect(board.width).toBe(5);
    expect(board.difficulty).toBe("hard");
  });

  it("should use a seeded random for deterministic boards", () => {
    let i = 0;
    const seed = () => {
      i = (i * 1103515245 + 12345) & 0x7fffffff;
      return i / 0x7fffffff;
    };
    const reset = () => {
      i = 0;
    };

    const board1 = generateMineBoard("easy", seed);
    reset();
    const board2 = generateMineBoard("easy", seed);
    expect(board1.board).toEqual(board2.board);
  });

  it("should initialize all cells as unclicked", () => {
    const board = generateMineBoard("easy");
    expect(board.clicked.flat().every((c) => c === false)).toBe(true);
  });
});

// ── getStatus ────────────────────────────────────────────────────

describe("getStatus", () => {
  it("should return 'playing' when there are unclicked non-mine cells", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    expect(getStatus(state)).toBe("playing");
  });

  it("should return 'won' when all non-mine cells are clicked", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    // Click all cells except the mine
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r !== 1 || c !== 1) state.clicked[r][c] = true;
      }
    }
    expect(getStatus(state)).toBe("won");
  });

  it("should return 'lost' on standard when one mine is clicked", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    state.clicked[1][1] = true;
    expect(getStatus(state)).toBe("lost");
  });

  it("should return 'playing' on easy when only one mine is clicked", () => {
    const state = boardWithMines(
      3,
      3,
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      "easy",
    );
    state.clicked[0][0] = true;
    expect(getStatus(state)).toBe("playing");
  });

  it("should return 'lost' on easy when two mines are clicked", () => {
    const state = boardWithMines(
      3,
      3,
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      "easy",
    );
    state.clicked[0][0] = true;
    state.clicked[1][1] = true;
    expect(getStatus(state)).toBe("lost");
  });

  it("should return 'forfeited' when the game is forfeited", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    (state as unknown as Record<string, unknown>).forfeited = true;
    expect(getStatus(state)).toBe("forfeited");
  });
});

// ── start ────────────────────────────────────────────────────────

describe("mineFinderLogic.start", () => {
  it("should return a waiting state", () => {
    const state = mineFinderLogic.start(1);
    expect(state).toEqual({ state: "waiting" });
  });
});

// ── update ───────────────────────────────────────────────────────

describe("mineFinderLogic.update", () => {
  it("should accept a difficulty first move from waiting state", () => {
    const waiting: MineFinderState = { state: "waiting" };
    const result = mineFinderLogic.update(waiting, "easy", 0);
    expect(result).not.toBeNull();
    expect(result!.state).toBe("started");
    expect((result as { difficulty: string }).difficulty).toBe("easy");
  });

  it("should reject invalid first move", () => {
    const waiting: MineFinderState = { state: "waiting" };
    expect(mineFinderLogic.update(waiting, "invalid", 0)).toBeNull();
  });

  it("should accept a valid cell click", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    const result = mineFinderLogic.update(state, [0, 0], 0) as MineFinderState & {
      state: "started";
    };
    expect(result).not.toBeNull();
    expect(result.clicked[0][0]).toBe(true);
  });

  it("should reject clicking an already-clicked cell", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    state.clicked[0][0] = true;
    expect(mineFinderLogic.update(state, [0, 0], 0)).toBeNull();
  });

  it("should reject out-of-bounds click", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    expect(mineFinderLogic.update(state, [5, 5], 0)).toBeNull();
  });

  it("should reject an invalid move payload", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    expect(mineFinderLogic.update(state, "not-a-move", 0)).toBeNull();
  });

  it("should reject moves after the game is lost", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    state.clicked[1][1] = true; // hit the mine
    expect(mineFinderLogic.update(state, [0, 0], 0)).toBeNull();
  });

  it("should reject moves from a negative playerIndex", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    expect(mineFinderLogic.update(state, [0, 0], -1)).toBeNull();
  });

  it("should handle forfeit", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    const result = mineFinderLogic.update(state, "forfeit", 0);
    expect(result).not.toBeNull();
    expect((result as Record<string, unknown>).forfeited).toBe(true);
  });

  it("should flood-fill when clicking a cell with zero neighboring bombs", () => {
    // 3x3 board with mine only at [2,2]
    const state = boardWithMines(3, 3, [[2, 2]]);
    const result = mineFinderLogic.update(state, [0, 0], 0) as MineFinderState & {
      state: "started";
    };
    expect(result).not.toBeNull();
    // [0,0] has 0 neighbor bombs → should flood to reveal adjacent non-mine cells
    expect(result.clicked[0][0]).toBe(true);
    expect(result.clicked[0][1]).toBe(true);
    expect(result.clicked[1][0]).toBe(true);
  });
});

// ── isDone ───────────────────────────────────────────────────────

describe("mineFinderLogic.isDone", () => {
  it("should return false for waiting state", () => {
    expect(mineFinderLogic.isDone({ state: "waiting" })).toBe(false);
  });

  it("should return false while playing", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    expect(mineFinderLogic.isDone(state)).toBe(false);
  });

  it("should return true when won", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r !== 1 || c !== 1) state.clicked[r][c] = true;
      }
    }
    expect(mineFinderLogic.isDone(state)).toBe(true);
  });

  it("should return true when lost", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    state.clicked[1][1] = true;
    expect(mineFinderLogic.isDone(state)).toBe(true);
  });
});

// ── viewAs ───────────────────────────────────────────────────────

describe("mineFinderLogic.viewAs", () => {
  it("should return a waiting view for waiting state", () => {
    const view = mineFinderLogic.viewAs({ state: "waiting" }, 0);
    expect(view.state).toBe("waiting");
    expect(view.field).toEqual([]);
  });

  it("should show '?' for unclicked cells", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    const view = mineFinderLogic.viewAs(state, 0);
    expect(view.field[0][0]).toBe("?");
    expect(view.state).toBe("playing");
  });

  it("should show neighbor count for clicked non-mine cells", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    state.clicked[0][0] = true;
    const view = mineFinderLogic.viewAs(state, 0);
    // [0,0] neighbors only [1,1] which is a mine → 1
    expect(view.field[0][0]).toBe(1);
  });

  it("should show '*' for clicked mine cells", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    state.clicked[1][1] = true;
    const view = mineFinderLogic.viewAs(state, 0);
    expect(view.field[1][1]).toBe("*");
  });
});

// ── tagView ──────────────────────────────────────────────────────

describe("mineFinderLogic.tagView", () => {
  it("should tag the view with type 'minesweeper'", () => {
    const view = mineFinderLogic.viewAs({ state: "waiting" }, 0);
    const tagged = mineFinderLogic.tagView(view);
    expect(tagged.type).toBe("minesweeper");
    expect(tagged.view).toBe(view);
  });
});

// ── winnerIndex ──────────────────────────────────────────────────

describe("mineFinderLogic.winnerIndex", () => {
  it("should return 0 when won", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r !== 1 || c !== 1) state.clicked[r][c] = true;
      }
    }
    expect(mineFinderLogic.winnerIndex!(state, 1)).toBe(0);
  });

  it("should return undefined when not won", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    expect(mineFinderLogic.winnerIndex!(state, 1)).toBeUndefined();
  });

  it("should return undefined when lost", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    state.clicked[1][1] = true;
    expect(mineFinderLogic.winnerIndex!(state, 1)).toBeUndefined();
  });

  it("should return undefined for waiting state", () => {
    expect(mineFinderLogic.winnerIndex!({ state: "waiting" }, 1)).toBeUndefined();
  });
});

// ── describeMove ─────────────────────────────────────────────────

describe("mineFinderLogic.describeMove", () => {
  it("should describe selecting difficulty", () => {
    const result = mineFinderLogic.describeMove(
      { state: "waiting" },
      { state: "waiting" },
      "easy",
      0,
    );
    expect(result).toBe(" selected difficulty");
  });

  it("should describe hitting a mine", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    state.clicked[1][1] = true;
    const result = mineFinderLogic.describeMove(emptyBoard(3, 3), state, [1, 1], 0);
    expect(result).toBe(" hit a mine and lost!");
  });

  it("should describe winning", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r !== 1 || c !== 1) state.clicked[r][c] = true;
      }
    }
    const result = mineFinderLogic.describeMove(emptyBoard(3, 3), state, [0, 0], 0);
    expect(result).toBe(" cleared the minefield!");
  });

  it("should describe revealing a cell", () => {
    const state = boardWithMines(3, 3, [[2, 2]]);
    state.clicked[0][0] = true;
    const result = mineFinderLogic.describeMove(emptyBoard(3, 3), state, [0, 0], 0);
    expect(result).toBe(" revealed cell [0, 0]");
  });

  it("should describe a forfeit", () => {
    const state = boardWithMines(3, 3, [[1, 1]]);
    (state as unknown as Record<string, unknown>).forfeited = true;
    const result = mineFinderLogic.describeMove(emptyBoard(3, 3), state, "forfeit", 0);
    expect(result).toBe(" forfeited the game");
  });
});
