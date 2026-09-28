import { floorMultiplier } from "@/lib/casino/money";
import { HOUSE_EDGE, MAX_MULTIPLIER, MINES_TILES } from "@/lib/fairness/provably-fair";

export const MIN_MINES = 1;
export const MAX_MINES = MINES_TILES - 1;

/** Number of gems on the board. */
export function gemCount(mines: number): number {
  return MINES_TILES - mines;
}

/**
 * Probability of revealing `gems` gems in a row:
 * P = Π (25 − mines − i) / (25 − i)   for i = 0 … gems−1
 */
export function minesWinChance(mines: number, gems: number): number {
  let chance = 1;
  for (let i = 0; i < gems; i++) {
    chance *= (MINES_TILES - mines - i) / (MINES_TILES - i);
  }
  return chance;
}

/**
 * Fair multiplier = (1 − house edge) / win probability,
 * truncated to 2 decimals.
 * Example: 3 mines, 1 gem → 0.99 × 25/22 = 1.125 → 1.12×
 */
export function minesMultiplier(mines: number, gems: number): number {
  if (gems <= 0) return 1;
  if (gems > gemCount(mines)) return 0;
  const multiplier = (1 - HOUSE_EDGE) / minesWinChance(mines, gems);
  return Math.min(MAX_MULTIPLIER, floorMultiplier(multiplier));
}
