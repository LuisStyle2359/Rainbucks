import { floorMultiplier } from "@/lib/casino/money";
import { HOUSE_EDGE, MAX_MULTIPLIER, MINES_TILES } from "@/lib/fairness/provably-fair";

export const MIN_MINES = 1;
export const MAX_MINES = MINES_TILES - 1;

/** Anzahl Diamanten auf dem Feld. */
export function gemCount(mines: number): number {
  return MINES_TILES - mines;
}

/**
 * Wahrscheinlichkeit, `gems` Diamanten hintereinander aufzudecken:
 * P = Π (25 − Minen − i) / (25 − i)   für i = 0 … gems−1
 */
export function minesWinChance(mines: number, gems: number): number {
  let chance = 1;
  for (let i = 0; i < gems; i++) {
    chance *= (MINES_TILES - mines - i) / (MINES_TILES - i);
  }
  return chance;
}

/**
 * Fairer Multiplikator = (1 − Hausvorteil) / Gewinnwahrscheinlichkeit,
 * auf 2 Nachkommastellen abgeschnitten.
 * Beispiel: 3 Minen, 1 Diamant → 0,99 × 25/22 = 1,125 → 1,12×
 */
export function minesMultiplier(mines: number, gems: number): number {
  if (gems <= 0) return 1;
  if (gems > gemCount(mines)) return 0;
  const multiplier = (1 - HOUSE_EDGE) / minesWinChance(mines, gems);
  return Math.min(MAX_MULTIPLIER, floorMultiplier(multiplier));
}
