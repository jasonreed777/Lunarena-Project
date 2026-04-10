import { describe, it, expect } from "vitest";
import { circleconnectLogic, generatePuzzle } from "../../src/games/circleconnect.ts";
import type { CircleConnectState, GridPosition } from "@gamenite/shared";

// ── Helpers ──────────────────────────────────────────────────────

/** Create a minimal solved puzzle state for a 3x3 grid with 1 pair */
function makeSolvedState(): CircleConnectState {
  // A single path covering all cells in a 3x3 grid
  const path: GridPosition[] = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 1, col: 1 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ];
  return {
    gridSize: 3,
    markers: [
      {
        id: 0,
        positions: [
          { row: 0, col: 0 },
          { row: 2, col: 2 },
        ],
      },
    ],
    paths: [path],
    moveCount: 1,
    solved: true,
  };
}

/** Create a simple unsolved 3x3 puzzle state with 1 pair */
function makeUnsolvedState(): CircleConnectState {
  return {
    gridSize: 3,
    markers: [
      {
        id: 0,
        positions: [
          { row: 0, col: 0 },
          { row: 2, col: 2 },
        ],
      },
    ],
    paths: [[]],
    moveCount: 0,
    solved: false,
  };
}

// ── generatePuzzle ───────────────────────────────────────────────

describe("generatePuzzle", () => {
  it("should generate a puzzle with the correct grid size", () => {
    const puzzle = generatePuzzle(5, 4);
    expect(puzzle.gridSize).toBe(5);
  });

  it("should generate the correct number of marker pairs", () => {
    const puzzle = generatePuzzle(5, 4);
    expect(puzzle.markers).toHaveLength(4);
  });

  it("should initialize all paths as empty", () => {
    const puzzle = generatePuzzle(5, 4);
    for (const path of puzzle.paths) {
      expect(path).toHaveLength(0);
    }
  });

  it("should start unsolved with moveCount 0", () => {
    const puzzle = generatePuzzle(5, 4);
    expect(puzzle.solved).toBe(false);
    expect(puzzle.moveCount).toBe(0);
  });

  it("should have markers with two positions each", () => {
    const puzzle = generatePuzzle(7, 6);
    for (const marker of puzzle.markers) {
      expect(marker.positions).toHaveLength(2);
      for (const pos of marker.positions) {
        expect(pos.row).toBeGreaterThanOrEqual(0);
        expect(pos.row).toBeLessThan(7);
        expect(pos.col).toBeGreaterThanOrEqual(0);
        expect(pos.col).toBeLessThan(7);
      }
    }
  });

  it("should fall back to a snake puzzle when random growth fails", () => {
    // Use a random that always returns 0 — this makes path growth fail quickly
    // because growPath always picks the same neighbor, causing many short paths
    // that can't merge down to the target count on a large grid with many pairs
    const badRandom = () => 0;
    // Request a difficult configuration that's unlikely to succeed with random=0
    const puzzle = generatePuzzle(9, 8, badRandom);
    // Should still produce a valid puzzle via fallback
    expect(puzzle.gridSize).toBe(9);
    expect(puzzle.markers).toHaveLength(8);
    expect(puzzle.solved).toBe(false);
    // Verify markers are within bounds
    for (const m of puzzle.markers) {
      for (const p of m.positions) {
        expect(p.row).toBeGreaterThanOrEqual(0);
        expect(p.row).toBeLessThan(9);
        expect(p.col).toBeGreaterThanOrEqual(0);
        expect(p.col).toBeLessThan(9);
      }
    }
  });

  it("should produce deterministic results with seeded random", () => {
    let i = 42;
    const seed = () => {
      i = (i * 1103515245 + 12345) & 0x7fffffff;
      return i / 0x7fffffff;
    };
    const reset = () => {
      i = 42;
    };

    const p1 = generatePuzzle(5, 4, seed);
    reset();
    const p2 = generatePuzzle(5, 4, seed);
    expect(p1.markers).toEqual(p2.markers);
  });
});

// ── start ────────────────────────────────────────────────────────

describe("circleconnectLogic.start", () => {
  it("should return an empty state with gridSize 0", () => {
    const state = circleconnectLogic.start(1);
    expect(state.gridSize).toBe(0);
    expect(state.markers).toEqual([]);
    expect(state.paths).toEqual([]);
    expect(state.moveCount).toBe(0);
    expect(state.solved).toBe(false);
  });
});

// ── update ───────────────────────────────────────────────────────

describe("circleconnectLogic.update", () => {
  it("should accept a difficulty first move from initial state", () => {
    const state = circleconnectLogic.start(1);
    const result = circleconnectLogic.update(state, "easy", 0);
    expect(result).not.toBeNull();
    expect(result!.gridSize).toBe(5);
    expect(result!.markers).toHaveLength(4);
    expect((result as { difficulty: string }).difficulty).toBe("easy");
  });

  it("should accept 'standard' difficulty", () => {
    const state = circleconnectLogic.start(1);
    const result = circleconnectLogic.update(state, "standard", 0);
    expect(result).not.toBeNull();
    expect(result!.gridSize).toBe(7);
  });

  it("should accept 'hard' difficulty", () => {
    const state = circleconnectLogic.start(1);
    const result = circleconnectLogic.update(state, "hard", 0);
    expect(result).not.toBeNull();
    expect(result!.gridSize).toBe(9);
  });

  it("should reject an invalid first move", () => {
    const state = circleconnectLogic.start(1);
    expect(circleconnectLogic.update(state, "invalid", 0)).toBeNull();
  });

  it("should accept clearing a path (empty path)", () => {
    const state = makeUnsolvedState();
    const result = circleconnectLogic.update(state, { pairId: 0, path: [] }, 0);
    expect(result).not.toBeNull();
    expect(result!.paths[0]).toEqual([]);
    expect(result!.moveCount).toBe(1);
  });

  it("should reject a path that doesn't start at a marker endpoint", () => {
    const state = makeUnsolvedState();
    const result = circleconnectLogic.update(
      state,
      {
        pairId: 0,
        path: [
          { row: 1, col: 1 },
          { row: 2, col: 2 },
        ],
      },
      0,
    );
    expect(result).toBeNull();
  });

  it("should reject a path that doesn't end at the other marker endpoint", () => {
    const state = makeUnsolvedState();
    const result = circleconnectLogic.update(
      state,
      {
        pairId: 0,
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      },
      0,
    );
    expect(result).toBeNull();
  });

  it("should reject a path with non-adjacent cells", () => {
    const state = makeUnsolvedState();
    const result = circleconnectLogic.update(
      state,
      {
        pairId: 0,
        path: [
          { row: 0, col: 0 },
          { row: 2, col: 2 },
        ],
      },
      0,
    );
    expect(result).toBeNull();
  });

  it("should reject a path with duplicate cells", () => {
    const state = makeUnsolvedState();
    const result = circleconnectLogic.update(
      state,
      {
        pairId: 0,
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 2, col: 0 },
          { row: 2, col: 1 },
          { row: 2, col: 2 },
        ],
      },
      0,
    );
    expect(result).toBeNull();
  });

  it("should reject a path with out-of-bounds cells", () => {
    const state = makeUnsolvedState();
    const result = circleconnectLogic.update(
      state,
      {
        pairId: 0,
        path: [
          { row: 0, col: 0 },
          { row: -1, col: 0 },
        ],
      },
      0,
    );
    expect(result).toBeNull();
  });

  it("should reject an invalid pairId", () => {
    const state = makeUnsolvedState();
    expect(circleconnectLogic.update(state, { pairId: 5, path: [] }, 0)).toBeNull();
  });

  it("should accept a valid path connecting markers", () => {
    const state = makeUnsolvedState();
    const validPath: GridPosition[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ];
    const result = circleconnectLogic.update(state, { pairId: 0, path: validPath }, 0);
    expect(result).not.toBeNull();
    expect(result!.paths[0]).toEqual(validPath);
    expect(result!.moveCount).toBe(1);
    expect(result!.solved).toBe(true);
  });

  it("should handle forfeit", () => {
    const state = makeUnsolvedState();
    const result = circleconnectLogic.update(state, "forfeit", 0);
    expect(result).not.toBeNull();
    expect(result!.forfeited).toBe(true);
  });

  it("should reject paths that overlap with other pairs' paths", () => {
    // 2-pair puzzle on a 3x3 grid
    const state: CircleConnectState = {
      gridSize: 3,
      markers: [
        {
          id: 0,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 2 },
          ],
        },
        {
          id: 1,
          positions: [
            { row: 2, col: 0 },
            { row: 2, col: 2 },
          ],
        },
      ],
      paths: [
        // Pair 0 already has a path through the middle
        [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        [],
      ],
      moveCount: 1,
      solved: false,
    };
    // Try to draw pair 1's path through a cell already used by pair 0
    const overlapping: GridPosition[] = [
      { row: 2, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: 0 }, // overlap with pair 0's marker
    ];
    const result = circleconnectLogic.update(state, { pairId: 1, path: overlapping }, 0);
    expect(result).toBeNull();
  });

  it("should reject paths that pass through other pair marker positions", () => {
    const state: CircleConnectState = {
      gridSize: 4,
      markers: [
        {
          id: 0,
          positions: [
            { row: 0, col: 0 },
            { row: 0, col: 3 },
          ],
        },
        {
          id: 1,
          positions: [
            { row: 0, col: 1 },
            { row: 3, col: 0 },
          ],
        },
      ],
      paths: [[], []],
      moveCount: 0,
      solved: false,
    };
    // Pair 0 path goes through pair 1's marker at (0,1)
    const throughMarker: GridPosition[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 }, // pair 1's marker!
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ];
    expect(circleconnectLogic.update(state, { pairId: 0, path: throughMarker }, 0)).toBeNull();
  });
});

// ── isDone ───────────────────────────────────────────────────────

describe("circleconnectLogic.isDone", () => {
  it("should return false for unsolved state", () => {
    expect(circleconnectLogic.isDone(makeUnsolvedState())).toBe(false);
  });

  it("should return true when solved", () => {
    expect(circleconnectLogic.isDone(makeSolvedState())).toBe(true);
  });

  it("should return true when forfeited", () => {
    const state = makeUnsolvedState();
    state.forfeited = true;
    expect(circleconnectLogic.isDone(state)).toBe(true);
  });
});

// ── viewAs / tagView ─────────────────────────────────────────────

describe("circleconnectLogic.viewAs", () => {
  it("should return the state as-is", () => {
    const state = makeUnsolvedState();
    expect(circleconnectLogic.viewAs(state, 0)).toBe(state);
  });
});

describe("circleconnectLogic.tagView", () => {
  it("should tag with type 'circleconnect'", () => {
    const state = makeUnsolvedState();
    const tagged = circleconnectLogic.tagView(state);
    expect(tagged.type).toBe("circleconnect");
    expect(tagged.view).toBe(state);
  });
});

// ── winnerIndex ──────────────────────────────────────────────────

describe("circleconnectLogic.winnerIndex", () => {
  it("should return 0 when solved", () => {
    expect(circleconnectLogic.winnerIndex!(makeSolvedState(), 1)).toBe(0);
  });

  it("should return undefined when not solved", () => {
    expect(circleconnectLogic.winnerIndex!(makeUnsolvedState(), 1)).toBeUndefined();
  });
});

// ── describeMove ─────────────────────────────────────────────────

describe("circleconnectLogic.describeMove", () => {
  it("should describe selecting difficulty", () => {
    const prev = circleconnectLogic.start(1);
    const next = { ...makeUnsolvedState(), difficulty: "easy" as const };
    const result = circleconnectLogic.describeMove(prev, next, "easy", 0);
    expect(result).toBe(" selected easy difficulty");
  });

  it("should describe solving the puzzle", () => {
    const result = circleconnectLogic.describeMove(
      makeUnsolvedState(),
      makeSolvedState(),
      { pairId: 0, path: [{ row: 0, col: 0 }] },
      0,
    );
    expect(result).toBe(" completed the CircleConnect puzzle!");
  });

  it("should describe drawing a path", () => {
    const result = circleconnectLogic.describeMove(
      makeUnsolvedState(),
      makeUnsolvedState(),
      {
        pairId: 0,
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      },
      0,
    );
    expect(result).toBe(" drew a path for pair 1");
  });

  it("should describe clearing a path", () => {
    const result = circleconnectLogic.describeMove(
      makeUnsolvedState(),
      makeUnsolvedState(),
      { pairId: 0, path: [] },
      0,
    );
    expect(result).toBe(" cleared pair 1");
  });

  it("should fall back for unknown move", () => {
    const result = circleconnectLogic.describeMove(
      makeUnsolvedState(),
      makeUnsolvedState(),
      "something-weird",
      0,
    );
    expect(result).toBe(" made a move");
  });
});
