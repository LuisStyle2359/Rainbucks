import { calculatePayout, floorMultiplier } from "@/lib/casino/money";
import { ProvablyFair, type PublicSeeds, type SeedPair } from "@/lib/fairness/provably-fair";
import { nextId, randomBotAmount, randomBotUser, randomCrashTarget, randomInt } from "@/lib/realtime/bots";
import type { ChatUser } from "@/lib/realtime/types";

/**
 * Crash-Runden als Zustandsautomat:
 *
 *   betting (6 s Countdown) → running (Multiplikator steigt) → crashed (3,5 s) → betting …
 *
 * Der Multiplikator wächst exponentiell: M(t) = e^(k·t), k = ln(2) / 10 s.
 * Nach 10 s steht er bei 2×, nach 20 s bei 4×, nach 33 s bei 10×.
 * Der Crash-Punkt stammt aus dem Provably-Fair-System und steht beim Start fest.
 *
 * Alles basiert auf Zeitstempeln statt auf Frame-Zählern. Dadurch stimmt jeder
 * Cashout exakt, auch wenn der Tab im Hintergrund gedrosselt wird.
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
  /** Auto-Cashout-Ziel (null = manuell) */
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
  /** Alle Zeiten als performance.now()-Zeitstempel */
  bettingEndsAt: number;
  runningStartedAt: number;
  crashedAt: number;
  /** Erst nach dem Crash bekannt */
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
  /** Auszahlung − Einsatz in Cent */
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

  // Geheim bis zum Crash
  private crashPoint = 1;
  private crashAt = 0;
  private roundSeeds: (SeedPair & PublicSeeds) | null = null;

  private myPending: PendingBet | null = null;
  private queuedPending: PendingBet | null = null;

  constructor(private readonly deps: CrashEngineDeps) {}

  // ---------------------------------------------------------------------------
  // React-Anbindung (useSyncExternalStore)
  // ---------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): CrashSnapshot => this.snapshot;

  /** Aktueller Multiplikator für das Rendering (60–120 × pro Sekunde). */
  getMultiplier(now: number): number {
    const { phase, runningStartedAt } = this.snapshot;
    if (phase === "betting") return 1;
    if (phase === "crashed") return this.crashPoint;
    return Math.min(this.crashPoint, multiplierAt(now - runningStartedAt));
  }

  // ---------------------------------------------------------------------------
  // Lebenszyklus
  // ---------------------------------------------------------------------------

  start(): void {
    if (this.started) return;
    this.started = true;
    this.beginBetting();
  }

  /** Stoppt alle Timer und rechnet offene Wetten sauber ab. */
  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.clearTimers();

    const { myBet, queuedBet, phase } = this.snapshot;
    if (myBet && myBet.status === "waiting") {
      this.deps.refund(myBet.amount);
      this.resolveMine({ status: "refunded", amount: myBet.amount, multiplier: 0, profit: 0 });
    } else if (myBet && myBet.status === "active" && phase === "running") {
      // Seite verlassen: Die Runde läuft weiter. Auto-Cashout greift, sonst verloren.
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
  // Spieler-Aktionen
  // ---------------------------------------------------------------------------

  /**
   * Wette platzieren. In der Countdown-Phase gilt sie für diese Runde,
   * sonst für die nächste. Liefert ein Promise, das nach der Abrechnung erfüllt wird.
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

  /** Wette zurückziehen, solange die Runde noch nicht läuft. */
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

  /** Manueller Cashout zum aktuellen Multiplikator. */
  cashOut(now: number = performance.now()): boolean {
    const { phase, myBet, runningStartedAt } = this.snapshot;
    if (phase !== "running" || myBet?.status !== "active") return false;
    if (now >= this.crashAt) return false; // zu spät, die Rakete ist schon explodiert
    const multiplier = Math.min(this.crashPoint, floorMultiplier(multiplierAt(now - runningStartedAt)));
    this.cashOutMine(multiplier);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Phasen
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

    // Bots steigen nach und nach ein
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

    // Auto-Cashouts planen (eigener und Bots)
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

    // Gleichstand: Auto-Cashout genau am Crash-Punkt zählt als Gewinn
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
  // Abrechnung
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
  // Hilfen
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
    const me = this.deps.me() ?? { name: "Du", color: "#39ff14", level: 1 };
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

  /** Events (für Sounds) nur, solange die Engine läuft, nicht beim Verlassen der Seite. */
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
