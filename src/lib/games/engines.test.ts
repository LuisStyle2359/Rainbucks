import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProvablyFair, type PublicSeeds, type SeedPair } from "@/lib/fairness/provably-fair";
import { CrashEngine, timeForMultiplier, BETTING_MS } from "./crash/crash-engine";
import { MinesGame } from "./mines/mines-game";
import { PEG_GAP, PlinkoWorld } from "./plinko/plinko-physics";

/** Seed-Paar, das einen bestimmten Crash-Punkt ergibt (per Suche über die Nonce). */
function seedsWithCrashPoint(predicate: (crashPoint: number) => boolean): SeedPair & PublicSeeds {
  const base = { serverSeed: "test-server-seed", clientSeed: "client", serverSeedHash: "hash" };
  for (let nonce = 0; nonce < 10_000; nonce++) {
    if (predicate(ProvablyFair.crashPoint({ ...base, nonce }))) return { ...base, nonce };
  }
  throw new Error("Kein passender Seed gefunden");
}

function createWallet(balance: number) {
  const wallet = {
    balance,
    settled: [] as { amount: number; multiplier: number }[],
    debit: (amount: number) => {
      if (amount > wallet.balance) return false;
      wallet.balance -= amount;
      return true;
    },
    refund: (amount: number) => {
      wallet.balance += amount;
    },
  };
  return wallet;
}

describe("CrashEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(seeds: SeedPair & PublicSeeds) {
    const wallet = createWallet(10_000);
    const engine = new CrashEngine({
      drawSeeds: () => seeds,
      debit: wallet.debit,
      refund: wallet.refund,
      settle: ({ amount, multiplier }) => {
        wallet.settled.push({ amount, multiplier });
        wallet.balance += Math.floor((amount * Math.round(multiplier * 100)) / 100);
      },
      me: () => null,
    });
    engine.start();
    return { engine, wallet };
  }

  it("zahlt beim Auto-Cashout genau den Ziel-Multiplikator aus", async () => {
    const seeds = seedsWithCrashPoint((cp) => cp >= 3);
    const { engine, wallet } = setup(seeds);
    const result = engine.placeBet(1_000, 2)!;
    expect(wallet.balance).toBe(9_000);

    await vi.advanceTimersByTimeAsync(BETTING_MS + timeForMultiplier(2) + 10);
    await expect(result).resolves.toMatchObject({ status: "cashed", multiplier: 2, profit: 1_000 });
    expect(wallet.balance).toBe(11_000);
    engine.stop();
  });

  it("verliert den Einsatz, wenn die Rakete vor dem Ziel explodiert", async () => {
    const seeds = seedsWithCrashPoint((cp) => cp < 1.5);
    const { engine, wallet } = setup(seeds);
    const result = engine.placeBet(1_000, 5)!;

    await vi.advanceTimersByTimeAsync(BETTING_MS + timeForMultiplier(1.5) + 10);
    await expect(result).resolves.toMatchObject({ status: "lost", profit: -1_000 });
    expect(wallet.balance).toBe(9_000);
    expect(engine.getSnapshot().phase).toBe("crashed");
    engine.stop();
  });

  it("erlaubt manuellen Cashout während der Runde", async () => {
    const seeds = seedsWithCrashPoint((cp) => cp >= 5);
    const { engine } = setup(seeds);
    const result = engine.placeBet(1_000, null)!;

    await vi.advanceTimersByTimeAsync(BETTING_MS + 10_000);
    expect(engine.cashOut()).toBe(true);
    const settlement = await result;
    expect(settlement.status).toBe("cashed");
    expect(settlement.multiplier).toBeGreaterThanOrEqual(1.99);
    expect(settlement.multiplier).toBeLessThanOrEqual(2.01);
    engine.stop();
  });

  it("gibt Wetten zurück, die abgebrochen oder beim Verlassen noch nicht gestartet waren", async () => {
    const seeds = seedsWithCrashPoint((cp) => cp >= 2);
    const { engine, wallet } = setup(seeds);
    engine.placeBet(1_000, null);
    engine.cancelBet();
    expect(wallet.balance).toBe(10_000);

    const pending = engine.placeBet(500, null)!;
    engine.stop();
    await expect(pending).resolves.toMatchObject({ status: "refunded" });
    expect(wallet.balance).toBe(10_000);
  });
});

describe("MinesGame", () => {
  const seeds = { serverSeed: "mines-seed", clientSeed: "client", nonce: 7, serverSeedHash: "hash" };
  const mines = ProvablyFair.minePositions(seeds, 3);
  const safe = Array.from({ length: 25 }, (_, i) => i).filter((tile) => !mines.includes(tile));

  function setup() {
    const wallet = createWallet(10_000);
    const game = new MinesGame({
      drawSeeds: () => seeds,
      debit: wallet.debit,
      settle: ({ amount, multiplier }) => wallet.settled.push({ amount, multiplier }),
    });
    return { game, wallet };
  }

  it("deckt Diamanten auf und zahlt beim Cashout aus", () => {
    const { game, wallet } = setup();
    expect(game.start(1_000, 3)).toBe(true);
    expect(game.reveal(safe[0])).toBe("gem");
    expect(game.reveal(safe[1])).toBe("gem");
    expect(game.getSnapshot().multiplier).toBeGreaterThan(1);
    expect(game.cashOut()).toBe(true);
    expect(wallet.settled).toEqual([{ amount: 1_000, multiplier: game.getSnapshot().multiplier }]);
    expect(game.getSnapshot().minePositions).toEqual(mines);
  });

  it("beendet die Runde bei einer Mine ohne Auszahlung", () => {
    const { game, wallet } = setup();
    game.start(1_000, 3);
    expect(game.reveal(mines[0])).toBe("mine");
    expect(game.getSnapshot().status).toBe("busted");
    expect(wallet.settled).toEqual([{ amount: 1_000, multiplier: 0 }]);
    expect(game.reveal(safe[0])).toBeNull();
  });
});

describe("PlinkoWorld", () => {
  it("lenkt jede Kugel in ihr faires Fach", () => {
    const landed: number[] = [];
    const world = new PlinkoWorld<null>(12, {
      onLand: (ball) => landed.push(Math.abs(ball.body.position.x - world.geometry.binCenters[ball.bin])),
    });
    for (let i = 0; i < 60; i++) {
      const path = Array.from({ length: 12 }, () => (Math.random() < 0.5 ? -1 : 1) as -1 | 1);
      world.drop(path, null);
    }
    for (let frame = 0; frame < 60 * 20 && landed.length < 60; frame++) world.step(1000 / 60);
    expect(landed).toHaveLength(60);
    expect(Math.max(...landed)).toBeLessThan(PEG_GAP / 2);
    world.destroy();
  });
});
