import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MINES_TILES, ProvablyFair, type SeedPair } from "./provably-fair";

const seeds: SeedPair = {
  serverSeed: "8f14e45fceea167a5a36dedd4bea2543a2b5c3f1d0e9876543210fedcba98765",
  clientSeed: "rainbucks-test",
  nonce: 42,
};

describe("ProvablyFair", () => {
  it("computes HMAC-SHA256 exactly like Node crypto", () => {
    const expected = createHmac("sha256", seeds.serverSeed).update("rainbucks-test:42:0").digest();
    expect(Buffer.from(ProvablyFair.hmacSha256(seeds.serverSeed, "rainbucks-test:42:0"))).toEqual(expected);
  });

  it("hashes the server seed with SHA-256", () => {
    const expected = createHash("sha256").update(seeds.serverSeed).digest("hex");
    expect(ProvablyFair.hashServerSeed(seeds.serverSeed)).toBe(expected);
  });

  it("appends more HMAC blocks with a cursor for more than 32 bytes", () => {
    const bytes = ProvablyFair.bytes(seeds, 40);
    const second = createHmac("sha256", seeds.serverSeed).update("rainbucks-test:42:1").digest();
    expect(Buffer.from(bytes.subarray(32))).toEqual(second.subarray(0, 8));
  });

  it("yields deterministic floats in [0, 1)", () => {
    const a = ProvablyFair.floats(seeds, 50);
    const b = ProvablyFair.floats(seeds, 50);
    expect(a).toEqual(b);
    for (const f of a) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it("changes the result for another nonce or client seed", () => {
    const base = ProvablyFair.float(seeds);
    expect(ProvablyFair.float({ ...seeds, nonce: 43 })).not.toBe(base);
    expect(ProvablyFair.float({ ...seeds, clientSeed: "anders" })).not.toBe(base);
  });

  it("computes multipliers with a 1% house edge", () => {
    expect(ProvablyFair.multiplierFromFloat(0)).toBe(1);
    expect(ProvablyFair.multiplierFromFloat(0.5)).toBe(1.98);
    expect(ProvablyFair.multiplierFromFloat(0.505)).toBe(2);
    expect(ProvablyFair.multiplierFromFloat(0.99)).toBe(99);
  });

  it("hits 2× in about 49.5% of cases (Monte Carlo)", () => {
    const runs = 100_000;
    let hits = 0;
    for (let nonce = 0; nonce < runs; nonce++) {
      if (ProvablyFair.crashPoint({ ...seeds, nonce }) >= 2) hits++;
    }
    expect(hits / runs).toBeGreaterThan(0.485);
    expect(hits / runs).toBeLessThan(0.505);
  });

  it("places mines uniquely and reproducibly", () => {
    for (let mines = 1; mines < MINES_TILES; mines++) {
      const positions = ProvablyFair.minePositions(seeds, mines);
      expect(positions).toHaveLength(mines);
      expect(new Set(positions).size).toBe(mines);
      expect(positions.every((p) => p >= 0 && p < MINES_TILES)).toBe(true);
      expect(ProvablyFair.minePositions(seeds, mines)).toEqual(positions);
    }
    expect(() => ProvablyFair.minePositions(seeds, 0)).toThrow(RangeError);
  });

  it("builds Plinko paths with the matching slot", () => {
    const path = ProvablyFair.plinkoPath(seeds, 16);
    expect(path).toHaveLength(16);
    expect(ProvablyFair.plinkoBin(path)).toBe(path.filter((step) => step === 1).length);
  });

  it("verifies hash and result", () => {
    const hash = ProvablyFair.hashServerSeed(seeds.serverSeed);
    const ok = ProvablyFair.verify({ ...seeds, expectedServerSeedHash: hash.toUpperCase() }, { game: "limbo" });
    expect(ok.hashMatches).toBe(true);
    expect(ok.outcome).toEqual({ game: "limbo", result: ProvablyFair.limboResult(seeds) });

    const bad = ProvablyFair.verify({ ...seeds, expectedServerSeedHash: "abc" }, { game: "crash" });
    expect(bad.hashMatches).toBe(false);
  });
});
