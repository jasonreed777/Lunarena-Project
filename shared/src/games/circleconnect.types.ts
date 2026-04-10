import { z } from "zod";

/** A position on the grid */
export interface GridPosition {
  row: number;
  col: number;
}

/** A pair of markers that must be connected */
export interface MarkerPair {
  id: number;
  positions: [GridPosition, GridPosition];
}

/** The internal state of a CircleConnect game */
export interface CircleConnectState {
  gridSize: number;
  markers: MarkerPair[];
  /** paths[i] is the ordered list of cells for marker pair i (empty = not drawn) */
  paths: GridPosition[][];
  /** Number of moves made (each draw or clear counts as one) */
  moveCount: number;
  solved: boolean;
  forfeited?: boolean;
  difficulty?: "easy" | "standard" | "hard";
}

/** View is identical to state (single-player, perfect information) */
export type CircleConnectView = CircleConnectState;

/** A move submits a complete path for one marker pair */
export interface CircleConnectPathMove {
  pairId: number;
  path: GridPosition[];
}

export const zGridPosition = z.object({
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
});

export const zCircleConnectPathMove = z.object({
  pairId: z.number().int().nonnegative(),
  path: z.array(zGridPosition),
});

export const zCircleConnectFirstMove = z.enum(["easy", "standard", "hard"]);
export const zCircleConnectForfeit = z.literal("forfeit");

export const zCircleConnectMove = z.union([
  zCircleConnectPathMove,
  zCircleConnectFirstMove,
  zCircleConnectForfeit,
]);
export type CircleConnectMove = z.infer<typeof zCircleConnectMove>;
