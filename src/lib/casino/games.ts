export type GameId = "crash" | "mines" | "limbo" | "plinko";

export type PlinkoRisk = "low" | "medium" | "high";

export interface GameInfo {
  id: GameId;
  name: string;
  href: `/casino/${GameId}`;
  tagline: string;
  description: string;
}

export const GAMES: Record<GameId, GameInfo> = {
  crash: {
    id: "crash",
    name: "Crash",
    href: "/casino/crash",
    tagline: "Steig aus, bevor die Rakete explodiert.",
    description: "Der Multiplikator steigt exponentiell. Cashe rechtzeitig aus.",
  },
  mines: {
    id: "mines",
    name: "Mines",
    href: "/casino/mines",
    tagline: "Finde Diamanten, meide die Minen.",
    description: "5×5 Felder, 1 bis 24 Minen. Jeder Diamant erhöht den Gewinn.",
  },
  limbo: {
    id: "limbo",
    name: "Limbo",
    href: "/casino/limbo",
    tagline: "Wähle dein Ziel. Das Glück entscheidet.",
    description: "Liegt das Ergebnis über deinem Ziel-Multiplikator, gewinnst du.",
  },
  plinko: {
    id: "plinko",
    name: "Plinko",
    href: "/casino/plinko",
    tagline: "Echte Physik, fallende Kugeln.",
    description: "Kugeln prallen an Pins ab und landen in Multiplikator-Fächern.",
  },
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];

/** Details, die je nach Spiel zu einer Wette gespeichert werden. */
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
