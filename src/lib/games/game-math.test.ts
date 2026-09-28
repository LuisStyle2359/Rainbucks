import { describe, expect, it } from "vitest";
import { calculatePayout, clampBet, floorMultiplier, parseDecimalInput } from "@/lib/casino/money";
import { limboTargetForChance, limboWinChance, sliderFromTarget, targetFromSlider } from "./limbo/limbo-math";
import { gemCount, minesMultiplier, minesWinChance } from "./mines/mines-math";
import { PLINKO_PAYOUTS, PLINKO_ROWS, plinkoBinProbabilities, plinkoRtp } from "./plinko/payouts";

describe("Money", () => {
  it("computes payouts exactly in cents", () => {
    expect(calculatePayout(1000, 2.01)).toBe(2010);
    expect(calculatePayout(1000, 1.03)).toBe(1030);
    expect(calculatePayout(333, 1.5)).toBe(499);
    expect(calculatePayout(100, 0)).toBe(0);
    expect(calculatePayout(1_000_000_000, 1_000_000)).toBe(1_000_000_000_000_000);
  });

  it("truncates multipliers instead of rounding", () => {
    expect(floorMultiplier(1.125)).toBe(1.12);
    expect(floorMultiplier(2)).toBe(2);
  });

  it("understands English and German notation", () => {
    expect(parseDecimalInput("12,5")).toBe(12.5);
    expect(parseDecimalInput("12.5")).toBe(12.5);
    expect(parseDecimalInput("1,234.56")).toBe(1234.56);
    expect(parseDecimalInput("1,000")).toBe(1000);
    expect(parseDecimalInput("1.234,56")).toBe(1234.56);
    expect(parseDecimalInput("2.00×")).toBe(2);
    expect(parseDecimalInput("2,00×")).toBe(2);
    expect(parseDecimalInput("abc")).toBeNull();
    expect(parseDecimalInput("")).toBeNull();
  });

  it("caps bets at the balance", () => {
    expect(clampBet(5000, 1000)).toBe(1000);
    expect(clampBet(0, 1000)).toBe(1);
  });
});

describe("Mines", () => {
  it("yields known multipliers", () => {
    expect(minesMultiplier(1, 1)).toBe(1.03);
    expect(minesMultiplier(3, 1)).toBe(1.12);
    expect(minesMultiplier(24, 1)).toBe(24.75);
    expect(minesMultiplier(3, 0)).toBe(1);
    expect(minesMultiplier(3, gemCount(3) + 1)).toBe(0);
  });

  it("stays at no more than 99% RTP on every step", () => {
    for (let mines = 1; mines <= 24; mines++) {
      for (let gems = 1; gems <= gemCount(mines); gems++) {
        const rtp = minesMultiplier(mines, gems) * minesWinChance(mines, gems);
        expect(rtp).toBeLessThanOrEqual(0.99 + 1e-9);
      }
    }
  });
});

describe("Limbo", () => {
  it("converts between win chance and target", () => {
    expect(limboWinChance(2)).toBeCloseTo(49.5);
    expect(limboTargetForChance(49.5)).toBe(2);
    expect(limboTargetForChance(9.9)).toBe(10);
  });

  it("maps the slider logarithmically", () => {
    expect(targetFromSlider(0)).toBe(1.01);
    expect(targetFromSlider(1)).toBe(1000);
    expect(targetFromSlider(sliderFromTarget(10))).toBeCloseTo(10, 1);
  });
});

describe("Plinko tables", () => {
  it("have the right length, symmetry and RTP for all 27 variants", () => {
    for (const risk of ["low", "medium", "high"] as const) {
      for (const rows of PLINKO_ROWS) {
        const table = PLINKO_PAYOUTS[risk][rows];
        expect(table).toHaveLength(rows + 1);
        expect([...table].reverse()).toEqual([...table]);
        const rtp = plinkoRtp(rows, risk);
        expect(rtp).toBeGreaterThan(0.98);
        expect(rtp).toBeLessThanOrEqual(0.99);
      }
    }
  });

  it("uses real binomial probabilities", () => {
    const probabilities = plinkoBinProbabilities(16);
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(probabilities[8]).toBeCloseTo(12870 / 65536, 12);
  });
});
