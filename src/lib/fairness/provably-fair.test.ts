import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MINES_TILES, ProvablyFair, type SeedPair } from "./provably-fair";

const seeds: SeedPair = {
  serverSeed: "8f14e45fceea167a5a36dedd4bea2543a2b5c3f1d0e9876543210fedcba98765",
  clientSeed: "rainbucks-test",
  nonce: 42,
};

describe("ProvablyFair", () => {
  it("berechnet HMAC-SHA256 identisch zu Node crypto", () => {
    const expected = createHmac("sha256", seeds.serverSeed).update("rainbucks-test:42:0").digest();
    expect(Buffer.from(ProvablyFair.hmacSha256(seeds.serverSeed, "rainbucks-test:42:0"))).toEqual(expected);
  });

  it("hasht den Server-Seed mit SHA-256", () => {
    const expected = createHash("sha256").update(seeds.serverSeed).digest("hex");
    expect(ProvablyFair.hashServerSeed(seeds.serverSeed)).toBe(expected);
  });

  it("hängt für mehr als 32 Bytes weitere HMAC-Blöcke mit Cursor an", () => {
    const bytes = ProvablyFair.bytes(seeds, 40);
    const second = createHmac("sha256", seeds.serverSeed).update("rainbucks-test:42:1").digest();
    expect(Buffer.from(bytes.subarray(32))).toEqual(second.subarray(0, 8));
  });

  it("liefert deterministische Floats in [0, 1)", () => {
    const a = ProvablyFair.floats(seeds, 50);
    const b = ProvablyFair.floats(seeds, 50);
    expect(a).toEqual(b);
    for (const f of a) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it("verändert das Ergebnis bei anderer Nonce oder anderem Client-Seed", () => {
    const base = ProvablyFair.float(seeds);
    expect(ProvablyFair.float({ ...seeds, nonce: 43 })).not.toBe(base);
    expect(ProvablyFair.float({ ...seeds, clientSeed: "anders" })).not.toBe(base);
  });

  it("berechnet Multiplikatoren mit 1 % Hausvorteil", () => {
    expect(ProvablyFair.multiplierFromFloat(0)).toBe(1);
    expect(ProvablyFair.multiplierFromFloat(0.5)).toBe(1.98);
    expect(ProvablyFair.multiplierFromFloat(0.505)).toBe(2);
    expect(ProvablyFair.multiplierFromFloat(0.99)).toBe(99);
  });

  it("trifft 2× in etwa 49,5 % der Fälle (Monte Carlo)", () => {
    const runs = 100_000;
    let hits = 0;
    for (let nonce = 0; nonce < runs; nonce++) {
      if (ProvablyFair.crashPoint({ ...seeds, nonce }) >= 2) hits++;
    }
    expect(hits / runs).toBeGreaterThan(0.485);
    expect(hits / runs).toBeLessThan(0.505);
  });

  it("verteilt Minen eindeutig und reproduzierbar", () => {
    for (let mines = 1; mines < MINES_TILES; mines++) {
      const positions = ProvablyFair.minePositions(seeds, mines);
      expect(positions).toHaveLength(mines);
      expect(new Set(positions).size).toBe(mines);
      expect(positions.every((p) => p >= 0 && p < MINES_TILES)).toBe(true);
      expect(ProvablyFair.minePositions(seeds, mines)).toEqual(positions);
    }
    expect(() => ProvablyFair.minePositions(seeds, 0)).toThrow(RangeError);
  });

  it("baut Plinko-Pfade mit passendem Fach", () => {
    const path = ProvablyFair.plinkoPath(seeds, 16);
    expect(path).toHaveLength(16);
    expect(ProvablyFair.plinkoBin(path)).toBe(path.filter((step) => step === 1).length);
  });

  it("verifiziert Hash und Ergebnis", () => {
    const hash = ProvablyFair.hashServerSeed(seeds.serverSeed);
    const ok = ProvablyFair.verify({ ...seeds, expectedServerSeedHash: hash.toUpperCase() }, { game: "limbo" });
    expect(ok.hashMatches).toBe(true);
    expect(ok.outcome).toEqual({ game: "limbo", result: ProvablyFair.limboResult(seeds) });

    const bad = ProvablyFair.verify({ ...seeds, expectedServerSeedHash: "abc" }, { game: "crash" });
    expect(bad.hashMatches).toBe(false);
  });
});
