import { ROULETTE_POCKETS } from "@/lib/fairness/provably-fair";

export type RouletteColor = "red" | "black" | "green";

/** Red pockets on a European wheel. Everything else 1…36 is black, 0 is green. */
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const ROULETTE_NUMBERS = Array.from({ length: ROULETTE_POCKETS }, (_, i) => i);

export function rouletteColor(n: number): RouletteColor {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

/**
 * A bet "spot". Straight bets are `n:<number>`; the outside bets have fixed ids.
 * `payout` is the total returned per chip when it wins (stake included), so a
 * straight bet returns 36× (the classic 35:1) and an even-money bet 2×.
 */
export interface RouletteSpot {
  id: string;
  /** Total return per chip on a win, stake included. */
  payout: number;
  /** Which pockets this spot covers. */
  covers: (n: number) => boolean;
}

const inRange = (lo: number, hi: number) => (n: number) => n >= lo && n <= hi;

export function straightSpot(n: number): RouletteSpot {
  return { id: `n:${n}`, payout: 36, covers: (r) => r === n };
}

/** The outside bets, in board order. */
export const ROULETTE_OUTSIDE: { id: string; label: string; spot: RouletteSpot }[] = [
  { id: "dozen:1", label: "1st 12", spot: { id: "dozen:1", payout: 3, covers: inRange(1, 12) } },
  { id: "dozen:2", label: "2nd 12", spot: { id: "dozen:2", payout: 3, covers: inRange(13, 24) } },
  { id: "dozen:3", label: "3rd 12", spot: { id: "dozen:3", payout: 3, covers: inRange(25, 36) } },
  { id: "low", label: "1–18", spot: { id: "low", payout: 2, covers: inRange(1, 18) } },
  { id: "even", label: "Even", spot: { id: "even", payout: 2, covers: (n) => n !== 0 && n % 2 === 0 } },
  { id: "red", label: "Red", spot: { id: "red", payout: 2, covers: (n) => rouletteColor(n) === "red" } },
  { id: "black", label: "Black", spot: { id: "black", payout: 2, covers: (n) => rouletteColor(n) === "black" } },
  { id: "odd", label: "Odd", spot: { id: "odd", payout: 2, covers: (n) => n % 2 === 1 } },
  { id: "high", label: "19–36", spot: { id: "high", payout: 2, covers: inRange(19, 36) } },
];

/** Column bets ("2 to 1" at the end of each row). Column 1 = 1,4,7,…; etc. */
export const ROULETTE_COLUMNS: { id: string; spot: RouletteSpot }[] = [
  { id: "col:1", spot: { id: "col:1", payout: 3, covers: (n) => n !== 0 && n % 3 === 1 } },
  { id: "col:2", spot: { id: "col:2", payout: 3, covers: (n) => n !== 0 && n % 3 === 2 } },
  { id: "col:3", spot: { id: "col:3", payout: 3, covers: (n) => n !== 0 && n % 3 === 0 } },
];

const SPOT_BY_ID = new Map<string, RouletteSpot>();
for (const n of ROULETTE_NUMBERS) SPOT_BY_ID.set(`n:${n}`, straightSpot(n));
for (const { spot } of ROULETTE_OUTSIDE) SPOT_BY_ID.set(spot.id, spot);
for (const { spot } of ROULETTE_COLUMNS) SPOT_BY_ID.set(spot.id, spot);

export function rouletteSpot(id: string): RouletteSpot | undefined {
  return SPOT_BY_ID.get(id);
}

export interface RouletteOutcome {
  totalStake: number;
  totalReturn: number;
  /** Spot ids that won (for highlighting). */
  winning: string[];
}

/** Evaluate a set of placed chips against the winning pocket. */
export function evaluateRoulette(result: number, chips: Record<string, number>): RouletteOutcome {
  let totalStake = 0;
  let totalReturn = 0;
  const winning: string[] = [];
  for (const [id, amount] of Object.entries(chips)) {
    if (amount <= 0) continue;
    totalStake += amount;
    const spot = SPOT_BY_ID.get(id);
    if (spot?.covers(result)) {
      totalReturn += amount * spot.payout;
      winning.push(id);
    }
  }
  return { totalStake, totalReturn, winning };
}
