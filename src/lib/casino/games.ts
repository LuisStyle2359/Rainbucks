export type GameId = "crash" | "mines" | "limbo" | "plinko";

export type PlinkoRisk = "low" | "medium" | "high";

export interface GameInfo {
  id: GameId;
  name: string;
  href: `/casino/${GameId}`;
  tagline: string;
  description: string;
  /** Short label on the lobby card */
  badge: string;
}

export const GAMES: Record<GameId, GameInfo> = {
  crash: {
    id: "crash",
    name: "Crash",
    href: "/casino/crash",
    tagline: "Cash out before the rocket explodes.",
    description: "The multiplier climbs exponentially. Get out in time.",
    badge: "Live rounds",
  },
  mines: {
    id: "mines",
    name: "Mines",
    href: "/casino/mines",
    tagline: "Find the gems, dodge the mines.",
    description: "5×5 tiles, 1 to 24 mines. Every gem raises your win.",
    badge: "Strategy",
  },
  limbo: {
    id: "limbo",
    name: "Limbo",
    href: "/casino/limbo",
    tagline: "Pick your target. Let the numbers roll.",
    description: "Win when the result lands above your target multiplier.",
    badge: "Instant",
  },
  plinko: {
    id: "plinko",
    name: "Plinko",
    href: "/casino/plinko",
    tagline: "Real physics, falling balls.",
    description: "Balls bounce off pins and drop into multiplier slots.",
    badge: "Physics",
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

/** Game-specific details stored with every bet. */
export type BetDetails =
  | {
      game: "crash";
      crashPoint: number;
      cashedOutAt: number | null;
      autoCashout: number | null;
    }
  | { game: "limbo"; target: number; result: number }
  | { game: "mines"; mines: number; revealed: number }
  | { game: "plinko"; rows: number; risk: PlinkoRisk; bin: number };
