import type { BlackjackResult } from "@/lib/casino/games";
import { calculatePayout } from "@/lib/casino/money";
import { ProvablyFair, type PublicSeeds, type SeedPair } from "@/lib/fairness/provably-fair";

/** Cards drawn per round. More than any single hand (player + dealer) can use. */
const STREAM = 32;

export type BlackjackStatus = "idle" | "player" | "dealer" | "done";

export function cardRank(card: number): number {
  return card % 13; // 0 = Ace, 1…8 = 2…9, 9 = 10, 10 = J, 11 = Q, 12 = K
}

export function cardSuit(card: number): number {
  return Math.floor(card / 13); // 0…3
}

/** Ace counts as 11 here; handValue reduces it to 1 when needed. */
export function cardValue(rank: number): number {
  if (rank === 0) return 11;
  if (rank >= 9) return 10;
  return rank + 1;
}

export interface HandValue {
  total: number;
  /** True when an ace is still counted as 11 (a "soft" hand). */
  soft: boolean;
}

export function handValue(cards: number[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = cardRank(card);
    total += cardValue(rank);
    if (rank === 0) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 && total <= 21 };
}

export function isBlackjack(cards: number[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export interface BlackjackSnapshot {
  roundId: number;
  status: BlackjackStatus;
  /** Total wagered (doubles the stake after a double down). */
  amount: number;
  doubled: boolean;
  player: number[];
  dealer: number[];
  /** Dealer hole card is hidden until this is true. */
  revealed: boolean;
  playerTotal: number;
  dealerTotal: number;
  result: BlackjackResult | null;
  multiplier: number;
  payout: number;
}

export interface BlackjackDeps {
  drawSeeds: () => SeedPair & PublicSeeds;
  debit: (amount: number) => boolean;
  settle: (bet: {
    amount: number;
    multiplier: number;
    seeds: PublicSeeds;
    playerTotal: number;
    dealerTotal: number;
    result: BlackjackResult;
    doubled: boolean;
  }) => void;
}

const MULTIPLIER: Record<BlackjackResult, number> = { blackjack: 2.5, win: 2, push: 1, lose: 0 };

/** Blackjack round logic, independent of React. Stands on all 17s, infinite shoe. */
export class BlackjackGame {
  private snapshot: BlackjackSnapshot = {
    roundId: 0,
    status: "idle",
    amount: 0,
    doubled: false,
    player: [],
    dealer: [],
    revealed: false,
    playerTotal: 0,
    dealerTotal: 0,
    result: null,
    multiplier: 0,
    payout: 0,
  };
  private readonly listeners = new Set<() => void>();
  private cards: number[] = [];
  private cursor = 0;
  private seeds: (SeedPair & PublicSeeds) | null = null;
  private baseStake = 0;

  constructor(private readonly deps: BlackjackDeps) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): BlackjackSnapshot => this.snapshot;

  /** True while the player may act. */
  get canDouble(): boolean {
    return this.snapshot.status === "player" && this.snapshot.player.length === 2;
  }

  start(amount: number): boolean {
    if (this.snapshot.status === "player" || this.snapshot.status === "dealer") return false;
    if (!this.deps.debit(amount)) return false;

    this.seeds = this.deps.drawSeeds();
    this.cards = ProvablyFair.blackjackCards(this.seeds, STREAM);
    this.cursor = 0;
    this.baseStake = amount;

    const player = [this.draw(), this.draw()];
    const dealer = [this.draw(), this.draw()];
    this.snapshot = {
      roundId: this.snapshot.roundId + 1,
      status: "player",
      amount,
      doubled: false,
      player,
      dealer,
      revealed: false,
      playerTotal: handValue(player).total,
      dealerTotal: handValue([dealer[0]]).total,
      result: null,
      multiplier: 0,
      payout: 0,
    };
    this.emit();

    // Naturals resolve immediately.
    if (isBlackjack(player) || isBlackjack(dealer)) {
      const result: BlackjackResult = isBlackjack(player)
        ? isBlackjack(dealer)
          ? "push"
          : "blackjack"
        : "lose";
      this.finish(result);
    } else if (handValue(player).total === 21) {
      this.stand();
    }
    return true;
  }

  hit(): void {
    if (this.snapshot.status !== "player") return;
    const player = [...this.snapshot.player, this.draw()];
    const { total } = handValue(player);
    this.commit({ player, playerTotal: total });
    if (total > 21) this.finish("lose");
    else if (total === 21) this.stand();
  }

  double(): boolean {
    if (!this.canDouble) return false;
    if (!this.deps.debit(this.baseStake)) return false;
    const player = [...this.snapshot.player, this.draw()];
    this.commit({ player, playerTotal: handValue(player).total, amount: this.snapshot.amount + this.baseStake, doubled: true });
    if (handValue(player).total > 21) this.finish("lose");
    else this.stand();
    return true;
  }

  stand(): void {
    if (this.snapshot.status !== "player") return;
    const dealer = [...this.snapshot.dealer];
    while (handValue(dealer).total < 17) dealer.push(this.draw());
    const dealerTotal = handValue(dealer).total;
    const playerTotal = this.snapshot.playerTotal;

    let result: BlackjackResult;
    if (dealerTotal > 21 || playerTotal > dealerTotal) result = "win";
    else if (playerTotal < dealerTotal) result = "lose";
    else result = "push";

    this.commit({ dealer, dealerTotal, revealed: true, status: "dealer" });
    this.finish(result);
  }

  // ---------------------------------------------------------------------------

  private draw(): number {
    // The stream is generous, but guard the tail just in case.
    return this.cards[Math.min(this.cursor++, this.cards.length - 1)];
  }

  private finish(result: BlackjackResult): void {
    const seeds = this.seeds;
    if (!seeds) return;
    const multiplier = MULTIPLIER[result];
    const dealer = this.snapshot.dealer;
    const dealerTotal = handValue(dealer).total;

    this.deps.settle({
      amount: this.snapshot.amount,
      multiplier,
      seeds: { serverSeedHash: seeds.serverSeedHash, clientSeed: seeds.clientSeed, nonce: seeds.nonce },
      playerTotal: this.snapshot.playerTotal,
      dealerTotal,
      result,
      doubled: this.snapshot.doubled,
    });
    this.commit({
      status: "done",
      revealed: true,
      dealerTotal,
      result,
      multiplier,
      payout: calculatePayout(this.snapshot.amount, multiplier),
    });
    this.seeds = null;
  }

  private commit(patch: Partial<BlackjackSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
