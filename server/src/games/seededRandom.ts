import seedrandom from "seedrandom";

/** Create a seeded random function for a daily puzzle */
export function seededRandomForDaily(dateStr: string, gameType: string): () => number {
  return seedrandom(`${dateStr}:${gameType}`);
}
