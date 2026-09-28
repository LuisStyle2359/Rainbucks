// VIP progression: every 1.00 RBX wagered earns 1 XP.
// Early levels come quickly, later ones need more XP (power curve).

export interface Rank {
  name: string;
  minLevel: number;
  color: string;
}

export const RANKS: readonly Rank[] = [
  { name: "Rookie", minLevel: 1, color: "#39ff14" },
  { name: "Bronze", minLevel: 5, color: "#e59560" },
  { name: "Silver", minLevel: 10, color: "#dfe6ef" },
  { name: "Gold", minLevel: 20, color: "#ffd23f" },
  { name: "Platinum", minLevel: 35, color: "#7cf5ff" },
  { name: "Diamond", minLevel: 50, color: "#c084fc" },
  { name: "Neon Legend", minLevel: 75, color: "#ff4fd8" },
];

const MAX_LEVEL = 999;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(50 * level ** 1.35);
}

export function xpFromWagered(wageredCents: number): number {
  return Math.floor(wageredCents / 100);
}

export interface LevelProgress {
  level: number;
  /** XP collected inside the current level */
  current: number;
  /** XP needed for the next level */
  needed: number;
  /** 0 … 1 */
  progress: number;
}

export function levelFromXp(xp: number): LevelProgress {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  const needed = xpToNext(level);
  return { level, current: remaining, needed, progress: Math.min(1, remaining / needed) };
}

export function rankFor(level: number): Rank {
  let rank = RANKS[0];
  for (const candidate of RANKS) if (level >= candidate.minLevel) rank = candidate;
  return rank;
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((rank) => rank.minLevel > level) ?? null;
}

/** Play-money bonus for reaching `level` (in cents): 25 RBX × level. */
export function levelUpBonus(level: number): number {
  return level * 25_00;
}
