import { GAME_IDS, type GameId, type PlinkoRisk } from "@/lib/casino/games";
import { calculatePayout } from "@/lib/casino/money";
import { ProvablyFair } from "@/lib/fairness/provably-fair";
import { minesMultiplier, minesWinChance } from "@/lib/games/mines/mines-math";
import { PLINKO_ROWS, plinkoMultiplier } from "@/lib/games/plinko/payouts";
import type { ChatMessage, ChatUser, LiveBet } from "./types";

// Fiktive Spieler für die Live-Simulation. Alle Einsätze sind virtuell.

const NAMES = [
  "NeonWhale", "SatoshiGhost", "0xDegen", "LunaLambo", "HodlHelga", "PixelPunk",
  "CryptoKatze", "MoonBoi99", "DiamondDieter", "ByteBandit", "RektRalf", "BlockBaron",
  "ChainChiller", "VaporVlad", "TurboTina", "GridRunner", "NullPointer", "SynthSara",
  "KryptoKarl", "AcidAnna", "LambdaLena", "HashHannes", "OrbitOtto", "QuantumQuinn",
  "RoninRudi", "ShadowShiba", "VoltVera", "WagmiWendy", "ZeroCoolZoe", "FudFighter",
  "AlphaAlina", "GammaGreta", "SeedSeeker", "NonceNinja", "LaserLars", "GlitchGabi",
];

export const AVATAR_COLORS = [
  "#39ff14", "#22e4ff", "#ff4fd8", "#b26bff", "#ffd23f", "#ff8a3d", "#7cf5ff", "#a4ff8e",
];

const CHAT_LINES = [
  "Wer ist gerade auf Crash? 🚀",
  "LFG 🚀🚀",
  "{mult} auf Limbo getroffen, let's go!",
  "Mines mit {n} Bomben ist mein Ding 💎",
  "Crash direkt bei 1,00× … klassisch 😭",
  "gg",
  "nice cashout 👏",
  "Plinko auf hohem Risiko ist komplett wild",
  "Server-Seed rotiert und nachgerechnet: passt ✅",
  "Nur Spielgeld hier, einfach entspannt bleiben 😎",
  "Diamant nach Diamant 💎💎💎",
  "Wie hoch ging die letzte Crash-Runde?",
  "Auto-Bet läuft, ich hol mir 'nen Kaffee ☕",
  "Heute ist Plinko-Tag",
  "{mult}!!! ich zitter",
  "Stop-Loss ist für Feiglinge 🙃 (Spaß, nutzt ihn)",
  "Client-Seed ändern bringt Glück … nicht wirklich 😅",
  "Limbo auf 2× und chillen",
  "rip, Bombe beim letzten Feld 💥",
  "ok, eine Runde noch",
  "GM Leute ☀️",
  "Das Grid bei Crash sieht heute extra neon aus",
  "Wer hat den {mult}-Crash gesehen?? 🤯",
  "Plinko 16 Reihen, Kugel ganz außen, unfassbar",
];

const REPLIES: { pattern: RegExp; answers: string[] }[] = [
  { pattern: /\b(hi|hallo|hey|moin|servus|gm|hello)\b/i, answers: ["Hey {user} 👋", "Moin {user}!", "GM {user} ☀️", "Willkommen, {user}!"] },
  { pattern: /\bgg\b/i, answers: ["gg 🔥", "gg wp", "ggs"] },
  { pattern: /crash/i, answers: ["Crash ist heute spicy 🌶️", "Ich cashe immer bei 2× aus", "Nie gierig werden bei Crash 😅"] },
  { pattern: /mines|bombe|diamant/i, answers: ["3 Minen ist der Sweet Spot", "Diamanten-Sound ist so gut 💎"] },
  { pattern: /plinko/i, answers: ["Plinko-Physik ist echt smooth", "Hohes Risiko oder gar nicht"] },
  { pattern: /limbo/i, answers: ["Limbo 10× ist mein Ritual", "Die Zahlen rollen so schön"] },
  { pattern: /\?\s*$/, answers: ["gute Frage 🤔", "probier's einfach aus", "würde ich auch gern wissen"] },
];

const REACTIONS = ["😂", "true", "real", "haha", "🔥🔥", "💯", "same"];

// ---------------------------------------------------------------------------

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function gaussian(): number {
  // Box-Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Zufälliger Bot; Namen aus `exclude` werden nach Möglichkeit vermieden. */
export function randomBotUser(exclude?: ReadonlySet<string>): ChatUser {
  let name = pick(NAMES);
  for (let attempt = 0; exclude?.has(name) && attempt < 20; attempt++) name = pick(NAMES);
  return { name, color: colorFor(name), level: randomInt(3, 99) };
}

/** Log-normal verteilte Einsätze: meist kleine Beträge, selten High Roller. */
export function randomBotAmount(): number {
  const cents = Math.exp(Math.log(800) + gaussian() * 1.35);
  return Math.min(250_000_00, Math.max(10, Math.round(cents)));
}

let idCounter = 0;
export const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

function fillTemplate(text: string, user?: ChatUser): string {
  return text
    .replace("{mult}", `${pick([12.4, 25, 57.3, 100, 250, 1337]).toLocaleString("de-DE")}×`)
    .replace("{n}", String(pick([2, 3, 5, 8, 12, 24])))
    .replace("{user}", user?.name ?? "du");
}

export function randomBotMessage(): ChatMessage {
  return {
    id: nextId("msg"),
    user: randomBotUser(),
    text: fillTemplate(pick(CHAT_LINES)),
    createdAt: Date.now(),
  };
}

/** Antwort eines Bots auf eine Nachricht des Spielers (oder null). */
export function botReplyTo(text: string, author: ChatUser): ChatMessage | null {
  const match = REPLIES.find((reply) => reply.pattern.test(text));
  const answer = match ? pick(match.answers) : Math.random() < 0.25 ? pick(REACTIONS) : null;
  if (!answer) return null;
  return {
    id: nextId("msg"),
    user: randomBotUser(),
    text: fillTemplate(answer, author),
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Simulierte Wetten anderer Spieler
// ---------------------------------------------------------------------------

const GAME_WEIGHTS: Record<GameId, number> = { crash: 0.3, limbo: 0.25, mines: 0.25, plinko: 0.2 };
const TARGETS = [1.2, 1.5, 2, 2, 2, 3, 5, 10, 20, 50, 100];

function randomGame(): GameId {
  let roll = Math.random();
  for (const game of GAME_IDS) {
    roll -= GAME_WEIGHTS[game];
    if (roll <= 0) return game;
  }
  return "crash";
}

function simulateMultiplier(game: GameId): number {
  switch (game) {
    case "crash":
    case "limbo": {
      const target = pick(TARGETS);
      return ProvablyFair.multiplierFromFloat(Math.random()) >= target ? target : 0;
    }
    case "mines": {
      const mines = pick([1, 2, 3, 3, 5, 8, 10, 24]);
      const gems = randomInt(1, Math.min(6, 25 - mines));
      return Math.random() < minesWinChance(mines, gems) ? minesMultiplier(mines, gems) : 0;
    }
    case "plinko": {
      const rows = pick(PLINKO_ROWS);
      const risk = pick<PlinkoRisk>(["low", "medium", "high"]);
      let bin = 0;
      for (let row = 0; row < rows; row++) bin += Math.random() < 0.5 ? 0 : 1;
      return plinkoMultiplier(rows, risk, bin);
    }
  }
}

export function randomBotBet(): LiveBet {
  const game = randomGame();
  const amount = randomBotAmount();
  const multiplier = simulateMultiplier(game);
  return {
    id: nextId("bet"),
    user: randomBotUser(),
    game,
    amount,
    multiplier,
    payout: calculatePayout(amount, multiplier),
    createdAt: Date.now(),
  };
}

/** Ziel-Multiplikator eines Bots in einer Crash-Runde. */
export function randomCrashTarget(): number {
  const roll = Math.random();
  if (roll < 0.45) return Math.round((1.1 + Math.random() * 1.4) * 100) / 100;
  if (roll < 0.8) return Math.round((2.5 + Math.random() * 5) * 100) / 100;
  if (roll < 0.95) return Math.round((8 + Math.random() * 40) * 100) / 100;
  return Math.round((50 + Math.random() * 500) * 100) / 100;
}
