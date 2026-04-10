import { GameService } from "./gameServiceManager.ts";
import {
  type CircleConnectState,
  type CircleConnectView,
  type GridPosition,
  zCircleConnectPathMove,
  zCircleConnectFirstMove,
  zCircleConnectForfeit,
} from "@gamenite/shared";
import { type GameLogic } from "./gameLogic.ts";

const difficultyConfigs = {
  easy: { gridSize: 5, numPairs: 4 },
  standard: { gridSize: 7, numPairs: 6 },
  hard: { gridSize: 9, numPairs: 8 },
} as const;

// ─── Utility helpers ─────────────────────────────────────────────

/** Convert a grid position to a string key for Set/Map lookups */
function key(p: GridPosition): string {
  return `${p.row},${p.col}`;
}

/** Check whether two grid positions are orthogonally adjacent */
function areAdjacent(a: GridPosition, b: GridPosition): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/** Return all orthogonal neighbors of a position that are within the grid bounds */
function gridNeighbors(pos: GridPosition, size: number): GridPosition[] {
  const out: GridPosition[] = [];
  if (pos.row > 0) out.push({ row: pos.row - 1, col: pos.col });
  if (pos.row < size - 1) out.push({ row: pos.row + 1, col: pos.col });
  if (pos.col > 0) out.push({ row: pos.row, col: pos.col - 1 });
  if (pos.col < size - 1) out.push({ row: pos.row, col: pos.col + 1 });
  return out;
}

// ─── Random-walk grid-filling generation ─────────────────────────

/** Return neighbors of a position that are not yet occupied */
function emptyNeighbors(pos: GridPosition, size: number, occupied: boolean[][]): GridPosition[] {
  return gridNeighbors(pos, size).filter((p) => !occupied[p.row][p.col]);
}

/** Find an empty cell with at least one empty neighbor so a path can reach length >= 2 */
function findGoodStart(
  size: number,
  occupied: boolean[][],
  random: () => number,
): GridPosition | null {
  const candidates: GridPosition[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!occupied[r][c] && emptyNeighbors({ row: r, col: c }, size, occupied).length > 0) {
        candidates.push({ row: r, col: c });
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(random() * candidates.length)];
}

/** Grow a path via random walk. Always produces length >= 2. */
function growPath(
  start: GridPosition,
  size: number,
  occupied: boolean[][],
  minLength: number,
  maxLength: number,
  stopChance: number,
  random: () => number,
): GridPosition[] {
  const cells: GridPosition[] = [start];
  occupied[start.row][start.col] = true;

  while (cells.length < maxLength) {
    const head = cells[cells.length - 1];
    const empty = emptyNeighbors(head, size, occupied);
    if (empty.length === 0) break;
    if (cells.length >= minLength && random() < stopChance) break;

    const next = empty[Math.floor(random() * empty.length)];
    occupied[next.row][next.col] = true;
    cells.push(next);
  }

  return cells;
}

/** Attach isolated empty cells to an adjacent path's endpoint */
function mergeIsolatedCells(size: number, occupied: boolean[][], paths: GridPosition[][]): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (occupied[r][c]) continue;
        if (emptyNeighbors({ row: r, col: c }, size, occupied).length > 0) continue;

        const cell: GridPosition = { row: r, col: c };
        for (const path of paths) {
          if (areAdjacent(cell, path[0])) {
            path.unshift(cell);
            occupied[r][c] = true;
            changed = true;
            break;
          }
          if (areAdjacent(cell, path[path.length - 1])) {
            path.push(cell);
            occupied[r][c] = true;
            changed = true;
            break;
          }
        }
      }
    }
  }
}

/**
 * Merge excess paths into neighbors by joining at adjacent endpoints.
 * Returns true if successfully reduced to targetCount.
 */
function mergeDownTo(paths: GridPosition[][], targetCount: number): boolean {
  while (paths.length > targetCount) {
    paths.sort((a, b) => a.length - b.length);
    const shortest = paths.shift()!;
    const sFirst = shortest[0];
    const sLast = shortest[shortest.length - 1];

    let merged = false;
    for (const other of paths) {
      const oFirst = other[0];
      const oLast = other[other.length - 1];

      if (areAdjacent(sLast, oFirst)) {
        other.unshift(...shortest);
        merged = true;
        break;
      }
      if (areAdjacent(sFirst, oLast)) {
        other.push(...shortest);
        merged = true;
        break;
      }
      if (areAdjacent(sFirst, oFirst)) {
        shortest.reverse();
        other.unshift(...shortest);
        merged = true;
        break;
      }
      if (areAdjacent(sLast, oLast)) {
        shortest.reverse();
        other.push(...shortest);
        merged = true;
        break;
      }
    }

    if (!merged) return false;
  }
  return true;
}

/**
 * Generates a puzzle by growing random-walk paths until the grid is full.
 *
 * 1. Pick an empty cell with at least one empty neighbor
 * 2. Random-walk to grow a path (length >= 2)
 * 3. Repeat until grid is full
 * 4. Merge isolated cells into adjacent path endpoints
 * 5. If too many paths, merge shortest ones into neighbors
 * 6. Endpoints of each path become the puzzle's colored dot pairs
 *
 * Because the paths tile the grid without overlap, a solution is guaranteed.
 */
export function generatePuzzle(
  gridSize: number,
  numPairs: number,
  random: () => number = Math.random,
): CircleConnectState {
  const numCells = gridSize * gridSize;
  const avgLen = numCells / numPairs;
  const minLen = Math.max(2, Math.floor(avgLen * 0.4));
  const maxLen = Math.floor(avgLen * 2);

  for (let attempt = 0; attempt < 20; attempt++) {
    const occupied: boolean[][] = Array.from({ length: gridSize }, () =>
      Array<boolean>(gridSize).fill(false),
    );
    const paths: GridPosition[][] = [];

    // Grow paths via random walk
    while (paths.length < numPairs * 2) {
      const start = findGoodStart(gridSize, occupied, random);
      if (!start) break;

      const path = growPath(start, gridSize, occupied, minLen, maxLen, 0.15, random);
      if (path.length < 2) {
        occupied[path[0].row][path[0].col] = false;
        continue;
      }
      paths.push(path);
    }

    // Absorb isolated cells
    mergeIsolatedCells(gridSize, occupied, paths);

    // Must fully cover the grid
    if (!occupied.every((row) => row.every((v) => v))) continue;
    if (paths.some((p) => p.length < 2)) continue;
    if (paths.length < numPairs) continue;

    // Merge excess paths down to the target count
    if (!mergeDownTo(paths, numPairs)) continue;

    const markers = paths.map((path, i) => ({
      id: i,
      positions: [path[0], path[path.length - 1]] as [GridPosition, GridPosition],
    }));

    return {
      gridSize,
      markers,
      paths: Array.from({ length: numPairs }, () => []),
      moveCount: 0,
      solved: false,
    };
  }

  // Fallback: snake traversal split into equal segments
  return generateFallbackPuzzle(gridSize, numPairs, random);
}

/**
 * Fallback puzzle generator: creates a snake-traversal path across the grid
 * and splits it into equal segments. Guaranteed to produce a valid puzzle.
 */
function generateFallbackPuzzle(
  gridSize: number,
  numPairs: number,
  random: () => number,
): CircleConnectState {
  const path: GridPosition[] = [];
  const flipRow = random() < 0.5;
  const flipCol = random() < 0.5;
  for (let r = 0; r < gridSize; r++) {
    const row = flipRow ? gridSize - 1 - r : r;
    const evenRow = r % 2 === 0;
    for (let c = 0; c < gridSize; c++) {
      const col = evenRow === !flipCol ? c : gridSize - 1 - c;
      path.push({ row, col });
    }
  }

  const segSize = Math.floor(path.length / numPairs);
  const markers = [];
  for (let i = 0; i < numPairs; i++) {
    const start = i * segSize;
    const end = i === numPairs - 1 ? path.length - 1 : (i + 1) * segSize - 1;
    markers.push({
      id: i,
      positions: [path[start], path[end]] as [GridPosition, GridPosition],
    });
  }

  return {
    gridSize,
    markers,
    paths: Array.from({ length: numPairs }, () => []),
    moveCount: 0,
    solved: false,
  };
}

// ─── Win check ───────────────────────────────────────────────────

/** Check whether all paths cover every cell exactly once (puzzle is solved) */
function isSolved(state: CircleConnectState): boolean {
  const { gridSize, paths } = state;
  if (paths.some((p) => p.length === 0)) return false;

  const grid: boolean[][] = Array.from({ length: gridSize }, () =>
    Array<boolean>(gridSize).fill(false),
  );

  for (const path of paths) {
    for (const cell of path) {
      if (grid[cell.row][cell.col]) return false;
      grid[cell.row][cell.col] = true;
    }
  }

  return grid.every((row) => row.every((v) => v));
}

// ─── Game logic ──────────────────────────────────────────────────

export const circleconnectLogic: GameLogic<CircleConnectState, CircleConnectView> = {
  minPlayers: 1,
  maxPlayers: 1,

  start: () => ({
    gridSize: 0,
    markers: [],
    paths: [],
    moveCount: 0,
    solved: false,
  }),

  update: (state, payload, _playerIndex) => {
    // Handle forfeit
    const forfeit = zCircleConnectForfeit.safeParse(payload);
    if (forfeit.success) {
      return { ...state, forfeited: true };
    }

    if (state.gridSize === 0) {
      const first = zCircleConnectFirstMove.safeParse(payload);
      if (first.error) return null;
      const config = difficultyConfigs[first.data];
      return {
        ...generatePuzzle(config.gridSize, config.numPairs),
        difficulty: first.data,
      };
    }

    const move = zCircleConnectPathMove.safeParse(payload);
    if (move.error) return null;

    const { pairId, path } = move.data;
    if (pairId < 0 || pairId >= state.markers.length) return null;

    if (path.length === 0) {
      const newPaths = state.paths.map((p, i) => (i === pairId ? [] : p));
      return { ...state, paths: newPaths, moveCount: state.moveCount + 1, solved: false };
    }

    const [endA, endB] = state.markers[pairId].positions;
    const startsAtA = path[0].row === endA.row && path[0].col === endA.col;
    const startsAtB = path[0].row === endB.row && path[0].col === endB.col;
    if (!startsAtA && !startsAtB) return null;

    const expectedEnd = startsAtA ? endB : endA;
    const last = path[path.length - 1];
    if (last.row !== expectedEnd.row || last.col !== expectedEnd.col) return null;

    for (const cell of path) {
      if (cell.row < 0 || cell.row >= state.gridSize) return null;
      if (cell.col < 0 || cell.col >= state.gridSize) return null;
    }

    for (let i = 1; i < path.length; i++) {
      if (!areAdjacent(path[i - 1], path[i])) return null;
    }

    const seen = new Set<string>();
    for (const cell of path) {
      const k = key(cell);
      if (seen.has(k)) return null;
      seen.add(k);
    }

    // Reject paths that pass through any other pair's marker positions
    const otherMarkers = new Set<string>();
    for (let i = 0; i < state.markers.length; i++) {
      if (i === pairId) continue;
      for (const pos of state.markers[i].positions) otherMarkers.add(key(pos));
    }
    for (const cell of path) {
      if (otherMarkers.has(key(cell))) return null;
    }

    const otherCells = new Set<string>();
    for (let i = 0; i < state.paths.length; i++) {
      if (i === pairId) continue;
      for (const cell of state.paths[i]) otherCells.add(key(cell));
    }
    for (const cell of path) {
      if (otherCells.has(key(cell))) return null;
    }

    const newPaths = state.paths.map((p, i) => (i === pairId ? path : p));
    const newState: CircleConnectState = {
      ...state,
      paths: newPaths,
      moveCount: state.moveCount + 1,
      solved: false,
    };
    newState.solved = isSolved(newState);
    return newState;
  },

  isDone: (state) => state.solved || state.forfeited === true,
  viewAs: (state) => state,
  tagView: (view) => ({ type: "circleconnect", view }),

  describeMove: (_prevState, newState, payload) => {
    const first = zCircleConnectFirstMove.safeParse(payload);
    if (first.success) return ` selected ${first.data} difficulty`;
    if (newState.solved) return ` completed the CircleConnect puzzle!`;
    const move = zCircleConnectPathMove.safeParse(payload);
    if (move.success) {
      if (move.data.path.length === 0) return ` cleared pair ${move.data.pairId + 1}`;
      return ` drew a path for pair ${move.data.pairId + 1}`;
    }
    return " made a move";
  },

  winnerIndex: (state) => (state.solved ? 0 : undefined),
};

export const circleconnectGameService = new GameService<CircleConnectState, CircleConnectView>(
  circleconnectLogic,
);
