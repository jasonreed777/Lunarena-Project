/** Return true half the time, false half the time */
export function coinFlip(random: () => number = Math.random) {
  return random() < 0.5;
}
