import { calculatePayout, floorMultiplier } from "@/lib/casino/money";
import { ProvablyFair, type PublicSeeds, type SeedPair } from "@/lib/fairness/provably-fair";
import { nextId, randomBotAmount, randomBotUser, randomCrashTarget, randomInt } from "@/lib/realtime/bots";
import type { ChatUser } from "@/lib/realtime/types";

/**
 * Crash rounds as a state machine:
 *
 *   betting (6 s countdown) → running (multiplier climbs) → crashed (3.5 s) → betting …
 *
 * The multiplier grows exponentially: M(t) = e^(k·t), k = ln(2) / 10 s.
 * After 10 s it reads 2×, after 20 s 4×, after 33 s 10×.
 * The crash point comes from the provably fair system and is fixed at the start.
 *
 * Everything runs on timestamps instead of frame counters, so every cashout
 * is exact even when a background tab gets throttled.
 */

export const GROWTH_PER_MS = Math.LN2 / 10_000;
export const BETTING_MS = 6_000;
export const CRASHED_MS = 3_500;
const HISTORY_LIMIT = 30;

export type CrashPhase = "betting" | "running" | "crashed";

export interface CrashPlayer {
  id: string;
  user: ChatUser;
  amount: number;
  /** Auto cashout target (null = manual) */
  target: number | null;
  cashedOutAt: number | null;
  isYou: boolean;
}

export type MyBetStatus = "waiting" | "active" | "cashed" | "lost";

export interface CrashMyBet {
  roundId: number;
  amount: number;
  autoCashout: number | null;
  status: MyBetStatus;
  cashedOutAt: number | null;
  payout: number;
}

export interface CrashSnapshot {
  roundId: number;
  phase: CrashPhase;
  /** All times are performance.now() timestamps */
  bettingEndsAt: number;
  runningStartedAt: number;
  crashedAt: number;
  /** Only known after the crash */
  crashPoint: number | null;
  players: CrashPlayer[];
  history: { roundId: number; crashPoint: number; nonce: number }[];
  myBet: CrashMyBet | null;
  queuedBet: { amount: number; autoCashout: number | null } | null;
}

export interface CrashSettlement {
  status: "cashed" | "lost" | "refunded";
  amount: number;
  multiplier: number;
  /** Payout − stake in cents */
  profit: number;
}

export type CrashEvent =
  | { type: "betting" }
  | { type: "countdown"; secondsLeft: number }
  | { type: "running" }
  | { type: "crash"; crashPoint: number; hadBet: boolean }
  | { type: "cashout"; multiplier: number; payout: number };

export interface CrashEngineDeps {
  drawSeeds: () => SeedPair & PublicSeeds;
  debit: (amount: number) => boolean;
  refund: (amount: number) => void;
  settle: (bet: {
    amount: number;
    multiplier: number;
    seeds: PublicSeeds;
    crashPoint: number;
    cashedOutAt: number | null;
    autoCashout: number | null;
  }) => void;
  me: () => ChatUser | null;
  onEvent?: (event: CrashEvent) => void;
}

export function multiplierAt(elapsedMs: number): number {
  return Math.exp(GROWTH_PER_MS * Math.max(0, elapsedMs));
}

export function timeForMultiplier(multiplier: number): number {
  return Math.log(multiplier) / GROWTH_PER_MS;
}

interface PendingBet {
  resolve: (settlement: CrashSettlement) => void;
}

export class CrashEngine {
  private snapshot: CrashSnapshot = {
    roundId: 0,
    phase: "betting",
    bettingEndsAt: 0,
    runningStartedAt: 0,
    crashedAt: 0,
    crashPoint: null,
    players: [],
    history: [],
    myBet: null,
    queuedBet: null,
  };

  private readonly listeners = new Set<() => void>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private started = false;

  // Secret until the crash
  private crashPoint = 1;
  private crashAt = 0;
  private roundSeeds: (SeedPair & PublicSeeds) | null = null;

  private myPending: PendingBet | null = null;
  private queuedPending: PendingBet | null = null;

  constructor(private readonly deps: CrashEngineDeps) {}

  // ---------------------------------------------------------------------------
  // React binding (useSyncExternalStore)
  // ---------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): CrashSnapshot => this.snapshot;

  /** Current multiplier for rendering (60–120 times per second). */
  getMultiplier(now: number): number {
    const { phase, runningStartedAt } = this.snapshot;
    if (phase === "betting") return 1;
    if (phase === "crashed") return this.crashPoint;
    return Math.min(this.crashPoint, multiplierAt(now - runningStartedAt));
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    if (this.started) return;
    this.started = true;
    this.beginBetting();
  }

  /** Stops all timers and settles open bets cleanly. */
  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.clearTimers();

    const { myBet, queuedBet, phase } = this.snapshot;
    if (myBet && myBet.status === "waiting") {
      this.deps.refund(myBet.amount);
      this.resolveMine({ status: "refunded", amount: myBet.amount, multiplier: 0, profit: 0 });
    } else if (myBet && myBet.status === "active" && phase === "running") {
      // Page left: the round keeps going. Auto cashout applies, otherwise the bet is lost.
      const target = myBet.autoCashout;
      if (target !== null && target <= this.crashPoint) this.cashOutMine(target);
      else this.loseMine();
    }
    if (queuedBet) {
      this.deps.refund(queuedBet.amount);
      this.queuedPending?.resolve({ status: "refunded", amount: queuedBet.amount, multiplier: 0, profit: 0 });
      this.queuedPending = null;
    }
    this.commit({ myBet: null, queuedBet: null });
  }

  // ---------------------------------------------------------------------------
  // Player actions
  // ---------------------------------------------------------------------------

  /**
   * Place a bet. During the countdown it counts for this round, otherwise
   * for the next one. Returns a promise that resolves once the bet is settled.
   */
  placeBet(amount: number, autoCashout: number | null): Promise<CrashSettlement> | null {
    const { phase, myBet, queuedBet } = this.snapshot;
    const target = autoCashout !== null && autoCashout >= 1.01 ? autoCashout : null;

    if (phase === "betting" && !myBet) {
      if (!this.deps.debit(amount)) return null;
      return new Promise((resolve) => {
        this.myPending = { resolve };
        this.commit({
          myBet: this.createMyBet(amount, target),
          players: [this.createMyPlayer(amount, target), ...this.snapshot.players],
        });
      });
    }

    if (phase !== "betting" && !queuedBet) {
      if (!this.deps.debit(amount)) return null;
      return new Promise((resolve) => {
        this.queuedPending = { resolve };
        this.commit({ queuedBet: { amount, autoCashout: target } });
      });
    }

    return null;
  }

  /** Withdraw a bet while the round has not started yet. */
  cancelBet(): void {
    const { phase, myBet, queuedBet } = this.snapshot;
    if (queuedBet) {
      this.deps.refund(queuedBet.amount);
      this.queuedPending?.resolve({ status: "refunded", amount: queuedBet.amount, multiplier: 0, profit: 0 });
      this.queuedPending = null;
      this.commit({ queuedBet: null });
      return;
    }
    if (phase === "betting" && myBet?.status === "waiting") {
      this.deps.refund(myBet.amount);
      this.resolveMine({ status: "refunded", amount: myBet.amount, multiplier: 0, profit: 0 });
      this.commit({ myBet: null, players: this.snapshot.players.filter((p) => !p.isYou) });
    }
  }

  /** Manual cashout at the current multiplier. */
  cashOut(now: number = performance.now()): boolean {
    const { phase, myBet, runningStartedAt } = this.snapshot;
    if (phase !== "running" || myBet?.status !== "active") return false;
    if (now >= this.crashAt) return false; // too late, the rocket already exploded
    const multiplier = Math.min(this.crashPoint, floorMultiplier(multiplierAt(now - runningStartedAt)));
    this.cashOutMine(multiplier);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------------------

  private beginBetting(): void {
    const now = performance.now();
    const { queuedBet } = this.snapshot;
    const roundId = this.snapshot.roundId + 1;

    let myBet: CrashMyBet | null = null;
    const players: CrashPlayer[] = [];
    if (queuedBet) {
      myBet = { ...this.createMyBet(queuedBet.amount, queuedBet.autoCashout), roundId };
      players.push(this.createMyPlayer(queuedBet.amount, queuedBet.autoCashout));
      this.myPending = this.queuedPending;
      this.queuedPending = null;
    }

    this.commit({
      roundId,
      phase: "betting",
      bettingEndsAt: now + BETTING_MS,
      crashPoint: null,
      players,
      myBet,
      queuedBet: null,
    });
    this.emit({ type: "betting" });

    // Bots join one by one
    const botCount = randomInt(5, 14);
    for (let i = 0; i < botCount; i++) {
      this.after(randomInt(0, BETTING_MS - 400), () => {
        if (this.snapshot.phase !== "betting") return;
        this.commit({ players: [...this.snapshot.players, this.createBot()] });
      });
    }

    for (const secondsLeft of [3, 2, 1]) {
      this.after(BETTING_MS - secondsLeft * 1_000, () =>
        this.emit({ type: "countdown", secondsLeft }),
      );
    }
    this.after(BETTING_MS, () => this.beginRunning());
  }

  private beginRunning(): void {
    const now = performance.now();
    this.roundSeeds = this.deps.drawSeeds();
    this.crashPoint = ProvablyFair.crashPoint(this.roundSeeds);
    this.crashAt = now + timeForMultiplier(this.crashPoint);

    const myBet = this.snapshot.myBet;
    this.commit({
      phase: "running",
      runningStartedAt: now,
      myBet: myBet ? { ...myBet, status: "active" } : null,
    });
    this.emit({ type: "running" });

    // Schedule auto cashouts (yours and the bots)
    if (myBet?.autoCashout && myBet.autoCashout <= this.crashPoint) {
      const target = myBet.autoCashout;
      this.after(timeForMultiplier(target), () => {
        if (this.snapshot.myBet?.status === "active") this.cashOutMine(target);
      });
    }
    for (const player of this.snapshot.players) {
      if (player.isYou || player.target === null || player.target > this.crashPoint) continue;
      const { id, target } = player;
      this.after(timeForMultiplier(target), () => this.cashOutPlayer(id, target));
    }

    this.after(this.crashAt - now, () => this.crash());
  }

  private crash(): void {
    const crashPoint = this.crashPoint;
    const seeds = this.roundSeeds;
    const myBet = this.snapshot.myBet;

    // Tie: an auto cashout exactly at the crash point counts as a win
    if (myBet?.status === "active" && myBet.autoCashout !== null && myBet.autoCashout <= crashPoint) {
      this.cashOutMine(myBet.autoCashout);
    } else if (myBet?.status === "active") {
      this.loseMine();
    }

    const history = [
      { roundId: this.snapshot.roundId, crashPoint, nonce: seeds?.nonce ?? 0 },
      ...this.snapshot.history,
    ].slice(0, HISTORY_LIMIT);

    this.commit({ phase: "crashed", crashedAt: performance.now(), crashPoint, history });
    this.emit({ type: "crash", crashPoint, hadBet: myBet !== null });
    this.after(CRASHED_MS, () => this.beginBetting());
  }

  // ---------------------------------------------------------------------------
  // Settlement
  // ---------------------------------------------------------------------------

  private cashOutMine(multiplier: number): void {
    const myBet = this.snapshot.myBet;
    const seeds = this.roundSeeds;
    if (!myBet || myBet.status !== "active" || !seeds) return;
    const payout = calculatePayout(myBet.amount, multiplier);

    this.deps.settle({
      amount: myBet.amount,
      multiplier,
      seeds: this.publicSeeds(seeds),
      crashPoint: this.crashPoint,
      cashedOutAt: multiplier,
      autoCashout: myBet.autoCashout,
    });
    this.commit({
      myBet: { ...myBet, status: "cashed", cashedOutAt: multiplier, payout },
      players: this.snapshot.players.map((p) => (p.isYou ? { ...p, cashedOutAt: multiplier } : p)),
    });
    this.emit({ type: "cashout", multiplier, payout });
    this.resolveMine({ status: "cashed", amount: myBet.amount, multiplier, profit: payout - myBet.amount });
  }

  private loseMine(): void {
    const myBet = this.snapshot.myBet;
    const seeds = this.roundSeeds;
    if (!myBet || myBet.status !== "active" || !seeds) return;
    this.deps.settle({
      amount: myBet.amount,
      multiplier: 0,
      seeds: this.publicSeeds(seeds),
      crashPoint: this.crashPoint,
      cashedOutAt: null,
      autoCashout: myBet.autoCashout,
    });
    this.commit({ myBet: { ...myBet, status: "lost" } });
    this.resolveMine({ status: "lost", amount: myBet.amount, multiplier: 0, profit: -myBet.amount });
  }

  private cashOutPlayer(id: string, multiplier: number): void {
    if (this.snapshot.phase !== "running") return;
    this.commit({
      players: this.snapshot.players.map((p) => (p.id === id ? { ...p, cashedOutAt: multiplier } : p)),
    });
  }

  private resolveMine(settlement: CrashSettlement): void {
    const pending = this.myPending;
    this.myPending = null;
    pending?.resolve(settlement);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private publicSeeds(seeds: PublicSeeds): PublicSeeds {
    const { serverSeedHash, clientSeed, nonce } = seeds;
    return { serverSeedHash, clientSeed, nonce };
  }

  private createMyBet(amount: number, autoCashout: number | null): CrashMyBet {
    return {
      roundId: this.snapshot.roundId,
      amount,
      autoCashout,
      status: "waiting",
      cashedOutAt: null,
      payout: 0,
    };
  }

  private createMyPlayer(amount: number, target: number | null): CrashPlayer {
    const me = this.deps.me() ?? { name: "You", color: "#39ff14", level: 1 };
    return { id: "you", user: { ...me, isYou: true }, amount, target, cashedOutAt: null, isYou: true };
  }

  private createBot(): CrashPlayer {
    const taken = new Set(this.snapshot.players.map((player) => player.user.name));
    return {
      id: nextId("crash"),
      user: randomBotUser(taken),
      amount: randomBotAmount(),
      target: randomCrashTarget(),
      cashedOutAt: null,
      isYou: false,
    };
  }

  /** Events (for sounds) only while the engine runs, not when leaving the page. */
  private emit(event: CrashEvent): void {
    if (this.started) this.deps.onEvent?.(event);
  }

  private commit(patch: Partial<CrashSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  private after(ms: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.started) fn();
    }, Math.max(0, ms));
    this.timers.add(timer);
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}
