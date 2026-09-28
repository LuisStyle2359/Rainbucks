import { describe, expect, it, vi } from "vitest";
import { holdBalance, takeBalanceHold } from "./balance-sync";
import { formatCountdown, pickSegment, SPIN_COOLDOWN_MS, spinAvailableIn, WHEEL_SEGMENTS } from "./bonus";
import { winTier } from "./celebrations";
import { levelFromXp, levelUpBonus, nextRank, rankFor, xpFromWagered, xpToNext } from "./levels";

describe("Levels", () => {
  it("starts at level 1 and fills up with XP", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, current: 0, needed: xpToNext(1), progress: 0 });
    expect(levelFromXp(xpToNext(1)).level).toBe(2);
    expect(levelFromXp(xpToNext(1) + xpToNext(2) - 1).level).toBe(2);
    expect(levelFromXp(xpToNext(1) + xpToNext(2)).level).toBe(3);
  });

  it("needs more XP for every further level", () => {
    for (let level = 1; level < 100; level++) expect(xpToNext(level + 1)).toBeGreaterThan(xpToNext(level));
  });

  it("earns 1 XP per whole RBX wagered", () => {
    expect(xpFromWagered(99)).toBe(0);
    expect(xpFromWagered(1_00)).toBe(1);
    expect(xpFromWagered(12_345)).toBe(123);
  });

  it("maps levels to ranks", () => {
    expect(rankFor(1).name).toBe("Rookie");
    expect(rankFor(5).name).toBe("Bronze");
    expect(rankFor(19).name).toBe("Silver");
    expect(rankFor(20).name).toBe("Gold");
    expect(rankFor(500).name).toBe("Neon Legend");
    expect(nextRank(4)?.name).toBe("Bronze");
    expect(nextRank(75)).toBeNull();
  });

  it("pays 25 RBX per level reached", () => {
    expect(levelUpBonus(2)).toBe(50_00);
    expect(levelUpBonus(10)).toBe(250_00);
  });
});

describe("Bonus wheel", () => {
  it("has twelve play-money prizes", () => {
    expect(WHEEL_SEGMENTS).toHaveLength(12);
    expect(Math.max(...WHEEL_SEGMENTS)).toBe(5_000_00);
  });

  it("allows one spin per hour", () => {
    expect(spinAvailableIn(null, 1_000)).toBe(0);
    expect(spinAvailableIn(1_000, 1_000)).toBe(SPIN_COOLDOWN_MS);
    expect(spinAvailableIn(1_000, 1_000 + SPIN_COOLDOWN_MS)).toBe(0);
    expect(spinAvailableIn(1_000, 400)).toBe(SPIN_COOLDOWN_MS);
  });

  it("picks every segment with the same chance", () => {
    const counts = new Array(WHEEL_SEGMENTS.length).fill(0);
    const draws = 120_000;
    for (let i = 0; i < draws; i++) counts[pickSegment()]++;
    const expected = draws / WHEEL_SEGMENTS.length;
    for (const count of counts) expect(Math.abs(count - expected) / expected).toBeLessThan(0.06);
  });

  it("formats the countdown as minutes and seconds", () => {
    expect(formatCountdown(SPIN_COOLDOWN_MS)).toBe("60:00");
    expect(formatCountdown(61_000)).toBe("1:01");
    expect(formatCountdown(500)).toBe("0:01");
  });
});

describe("Celebrations", () => {
  it("sorts wins into tiers by multiplier", () => {
    expect(winTier(1.5)).toBe("small");
    expect(winTier(2)).toBe("nice");
    expect(winTier(5)).toBe("big");
    expect(winTier(25)).toBe("mega");
    expect(winTier(100)).toBe("epic");
  });

  it("merges coin holds and forgets stale ones", () => {
    vi.useFakeTimers();
    holdBalance(700, 300);
    holdBalance(750, 900);
    expect(takeBalanceHold()).toEqual({ delay: 700, duration: 950 });
    expect(takeBalanceHold()).toBeNull();
    holdBalance(700, 300);
    vi.advanceTimersByTime(1_000);
    expect(takeBalanceHold()).toBeNull();
    vi.useRealTimers();
  });
});
