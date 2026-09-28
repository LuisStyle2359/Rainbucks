import type { GameId } from "./games";

/**
 * Tiny event bus for win feedback. Games settle bets as usual; the
 * celebration layer listens here and plays coins, overlays and sounds.
 */

export type WinTier = "small" | "nice" | "big" | "mega" | "epic";

export interface ScreenPoint {
  x: number;
  y: number;
}

export type Celebration =
  | {
      type: "win";
      game: GameId;
      /** Stake in cents */
      amount: number;
      /** Payout in cents (includes the stake) */
      payout: number;
      multiplier: number;
      tier: WinTier;
      /** Where the coins start (viewport coordinates). Defaults to the game stage. */
      origin?: ScreenPoint;
    }
  | { type: "levelUp"; fromLevel: number; level: number; bonus: number }
  | { type: "bonus"; amount: number; origin?: ScreenPoint };

type Listener = (celebration: Celebration) => void;

const listeners = new Set<Listener>();

export function onCelebration(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function celebrate(celebration: Celebration): void {
  for (const listener of listeners) listener(celebration);
}

/** Only real profits are celebrated. A 0.5× Plinko slot is a loss, not a win. */
export function winTier(multiplier: number): WinTier {
  if (multiplier >= 100) return "epic";
  if (multiplier >= 25) return "mega";
  if (multiplier >= 5) return "big";
  if (multiplier >= 2) return "nice";
  return "small";
}

export const TIER_LABEL: Record<WinTier, string> = {
  small: "Win",
  nice: "Nice win",
  big: "Big win",
  mega: "Mega win",
  epic: "Epic win",
};
