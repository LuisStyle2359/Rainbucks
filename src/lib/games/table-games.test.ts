import { describe, expect, it } from "vitest";
import type { PublicSeeds, SeedPair } from "@/lib/fairness/provably-fair";
import { ProvablyFair } from "@/lib/fairness/provably-fair";
import {
  BlackjackGame,
  cardRank,
  cardValue,
  handValue,
  isBlackjack,
} from "@/lib/games/blackjack/blackjack-game";
import { evaluateRoulette, rouletteColor } from "@/lib/games/roulette/roulette-math";

const SEEDS: SeedPair = { serverSeed: "a".repeat(64), clientSeed: "player-seed", nonce: 7 };

describe("Roulette", () => {
  it("lands in a valid European pocket and is deterministic", () => {
    const result = ProvablyFair.rouletteResult(SEEDS);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(36);
    expect(ProvablyFair.rouletteResult(SEEDS)).toBe(result);
    expect(ProvablyFair.rouletteResult({ ...SEEDS, nonce: 8 })).toBeTypeOf("number");
  });

  it("colors pockets like a European wheel", () => {
    expect(rouletteColor(0)).toBe("green");
    expect(rouletteColor(1)).toBe("red");
    expect(rouletteColor(17)).toBe("black");
    expect(rouletteColor(36)).toBe("red");
  });

  it("pays straight bets 35:1 (36× total)", () => {
    const out = evaluateRoulette(1, { "n:1": 100 });
    expect(out).toEqual({ totalStake: 100, totalReturn: 3600, winning: ["n:1"] });
    expect(evaluateRoulette(2, { "n:1": 100 })).toEqual({ totalStake: 100, totalReturn: 0, winning: [] });
  });

  it("settles even-money, dozen and mixed bets", () => {
    expect(evaluateRoulette(1, { red: 100 }).totalReturn).toBe(200);
    expect(evaluateRoulette(1, { black: 100 }).totalReturn).toBe(0);
    expect(evaluateRoulette(5, { "dozen:1": 100 }).totalReturn).toBe(300);
    const mixed = evaluateRoulette(0, { "n:0": 100, red: 100 });
    expect(mixed.totalStake).toBe(200);
    expect(mixed.totalReturn).toBe(3600);
    expect(mixed.winning).toEqual(["n:0"]);
  });

  it("keeps the wheel house edge near 2.7%", () => {
    let staked = 0;
    let returned = 0;
    for (let n = 0; n < 37; n++) {
      const out = evaluateRoulette(n, { red: 100 });
      staked += out.totalStake;
      returned += out.totalReturn;
    }
    // 18 of 37 reds win 2× → RTP = 36/37 ≈ 0.973
    expect(returned / staked).toBeCloseTo(36 / 37, 5);
  });
});

describe("Blackjack math", () => {
  it("values cards with soft aces", () => {
    expect(cardValue(0)).toBe(11); // ace
    expect(cardValue(9)).toBe(10); // ten
    expect(cardValue(12)).toBe(10); // king
    expect(cardValue(1)).toBe(2);
    expect(cardRank(13)).toBe(0); // second-suit ace
  });

  it("computes hand totals and reduces aces to avoid busting", () => {
    expect(handValue([0, 12])).toEqual({ total: 21, soft: true }); // A + K = blackjack
    expect(isBlackjack([0, 12])).toBe(true);
    expect(handValue([0, 0, 9])).toEqual({ total: 12, soft: false }); // A + A + 10 → 12 hard
    expect(handValue([9, 9, 1])).toEqual({ total: 22, soft: false }); // 10 + 10 + 2 bust
    expect(isBlackjack([0, 8, 1])).toBe(false); // three cards
  });
});

describe("BlackjackGame", () => {
  const publicSeeds = (nonce: number): SeedPair & PublicSeeds => ({
    serverSeed: "b".repeat(64),
    clientSeed: "bj",
    nonce,
    serverSeedHash: "hash",
  });

  it("plays a round to a valid, cent-consistent result", () => {
    let settled: { multiplier: number; result: string } | null = null;
    let nonce = 1;
    const game = new BlackjackGame({
      drawSeeds: () => publicSeeds(nonce++),
      debit: () => true,
      settle: (bet) => (settled = bet),
    });

    expect(game.start(100)).toBe(true);
    if (game.getSnapshot().status === "player") game.stand();

    const snap = game.getSnapshot();
    expect(snap.status).toBe("done");
    expect(["blackjack", "win", "push", "lose"]).toContain(snap.result);
    expect(settled).not.toBeNull();
    const MULT: Record<string, number> = { blackjack: 2.5, win: 2, push: 1, lose: 0 };
    expect(snap.multiplier).toBe(MULT[snap.result!]);
    expect(snap.payout).toBe(Math.floor((100 * Math.floor(snap.multiplier * 100)) / 100));
  });

  it("deals the same cards for the same seed", () => {
    const make = () =>
      new BlackjackGame({ drawSeeds: () => publicSeeds(42), debit: () => true, settle: () => {} });
    const a = make();
    const b = make();
    a.start(100);
    b.start(100);
    expect(a.getSnapshot().player).toEqual(b.getSnapshot().player);
    expect(a.getSnapshot().dealer[0]).toEqual(b.getSnapshot().dealer[0]);
  });
});
