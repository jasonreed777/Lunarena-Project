import { z } from "zod";

export type MineFinderState =
  | { state: "waiting" }
  | {
      state: "started";
      width: number;
      height: number;
      board: boolean[][]; // each array is one row
      clicked: boolean[][]; // each array is one row
      difficulty?: "easy" | "standard" | "hard";
      forfeited?: boolean;
    };

/**
 * Unrevealed grid positions are recorded as `?`, swept and exploded bombs are
 * recorded as `*`, and all other positions record the number of bombs in the
 * eight neighboring squares.
 */
export interface MineFinderView {
  difficulty: "easy" | "standard" | "hard";
  height: number;
  width: number;
  state: "waiting" | "playing" | "won" | "lost" | "forfeited";
  field: ("?" | number | "*")[][]; // each array is one row
}

/**
 * A minefinder move: first the row number, then the column number.
 */
export const zMineFinderMove = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);
export const zMineFinderFirstMove = z.enum(["easy", "standard", "hard"]);
export const zMineFinderForfeit = z.literal("forfeit");
export const zMineFinderMoveOrFirst = z.union([
  zMineFinderMove,
  zMineFinderFirstMove,
  zMineFinderForfeit,
]);
export type MineFinderMove = z.infer<typeof zMineFinderMoveOrFirst>;
