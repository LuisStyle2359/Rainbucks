import { calculatePayout } from "@/lib/casino/money";
import { MINES_TILES, ProvablyFair, type PublicSeeds, type SeedPair } from "@/lib/fairness/provably-fair";
import { gemCount, minesMultiplier } from "./mines-math";

export type MinesStatus = "idle" | "playing" | "busted" | "cashed";

export interface MinesSnapshot {
  roundId: number;
  status: MinesStatus;
  mines: number;
  amount: number;
  /** Tiles revealed by the player, in click order */
  revealed: number[];
  /** Only known after the round ends */
  minePositions: number[] | null;
  bustedTile: number | null;
  /** Multiplier for the gems found so far */
  multiplier: number;
  payout: number;
}

export interface MinesGameDeps {
  drawSeeds: () => SeedPair & PublicSeeds;
  debit: (amount: number) => boolean;
  settle: (bet: {
    amount: number;
    multiplier: number;
    seeds: PublicSeeds;
    mines: number;
    revealed: number;
  }) => void;
}

export type RevealResult = "gem" | "mine" | null;

/** Mines game logic, independent of React. */
export class MinesGame {
  private snapshot: MinesSnapshot = {
    roundId: 0,
    status: "idle",
    mines: 3,
    amount: 0,
    revealed: [],
    minePositions: null,
    bustedTile: null,
    multiplier: 1,
    payout: 0,
  };
  private readonly listeners = new Set<() => void>();
  // Secret while the round is running
  private mineSet = new Set<number>();
  private seeds: (SeedPair & PublicSeeds) | null = null;

  constructor(private readonly deps: MinesGameDeps) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): MinesSnapshot => this.snapshot;

  start(amount: number, mines: number): boolean {
    if (this.snapshot.status === "playing") return false;
    if (!this.deps.debit(amount)) return false;

    this.seeds = this.deps.drawSeeds();
    this.mineSet = new Set(ProvablyFair.minePositions(this.seeds, mines));
    this.commit({
      roundId: this.snapshot.roundId + 1,
      status: "playing",
      mines,
      amount,
      revealed: [],
      minePositions: null,
      bustedTile: null,
      multiplier: 1,
      payout: 0,
    });
    return true;
  }

  reveal(tile: number): RevealResult {
    const { status, revealed, mines } = this.snapshot;
    if (status !== "playing" || tile < 0 || tile >= MINES_TILES || revealed.includes(tile)) return null;

    if (this.mineSet.has(tile)) {
      this.finish("busted", [...revealed, tile], 0, tile);
      return "mine";
    }

    const nextRevealed = [...revealed, tile];
    const multiplier = minesMultiplier(mines, nextRevealed.length);
    this.commit({ revealed: nextRevealed, multiplier });

    // All gems found → cash out automatically
    if (nextRevealed.length === gemCount(mines)) this.cashOut();
    return "gem";
  }

  cashOut(): boolean {
    const { status, revealed, multiplier } = this.snapshot;
    if (status !== "playing" || revealed.length === 0) return false;
    this.finish("cashed", revealed, multiplier, null);
    return true;
  }

  /** A random tile that is still hidden (for "Random tile"). */
  randomHiddenTile(): number | null {
    const hidden = Array.from({ length: MINES_TILES }, (_, i) => i).filter(
      (tile) => !this.snapshot.revealed.includes(tile),
    );
    return hidden.length ? hidden[Math.floor(Math.random() * hidden.length)] : null;
  }

  private finish(status: "busted" | "cashed", revealed: number[], multiplier: number, bustedTile: number | null): void {
    const seeds = this.seeds;
    if (!seeds) return;
    const { amount, mines } = this.snapshot;
    const gems = status === "cashed" ? revealed.length : revealed.length - 1;

    this.deps.settle({
      amount,
      multiplier,
      seeds: { serverSeedHash: seeds.serverSeedHash, clientSeed: seeds.clientSeed, nonce: seeds.nonce },
      mines,
      revealed: gems,
    });
    this.commit({
      status,
      revealed,
      bustedTile,
      multiplier,
      payout: calculatePayout(amount, multiplier),
      minePositions: [...this.mineSet].sort((a, b) => a - b),
    });
    this.seeds = null;
  }

  private commit(patch: Partial<MinesSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
}
