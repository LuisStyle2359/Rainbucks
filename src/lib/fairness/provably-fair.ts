import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Provably Fair – how it works
 * ----------------------------
 * 1. The "server" rolls a secret server seed and publishes only its SHA-256
 *    hash upfront. The seed is fixed from that moment, but still unknown.
 * 2. The player picks their own client seed (changeable at any time).
 * 3. Every bet increments the nonce by 1.
 * 4. Result = HMAC_SHA256(key = server seed, msg = "clientSeed:nonce:cursor").
 *    The bytes are turned into random numbers in [0, 1).
 * 5. Rotating reveals the server seed. Anyone can now check that
 *    SHA-256(server seed) matches the published hash and recompute every
 *    result exactly.
 *
 * Neither the server (does not know the client seed in advance) nor the player
 * (does not know the server seed in advance) can steer the outcome alone.
 *
 * Note: in this demo simulator the "server" runs in the browser. In a real
 * application the server seed stays on the server until rotation.
 */

export const HOUSE_EDGE = 0.01; // 1 % Hausvorteil → RTP 99 %
export const MAX_MULTIPLIER = 1_000_000;
export const MINES_TILES = 25;

const BYTES_PER_FLOAT = 4;
const HMAC_OUTPUT_BYTES = 32;

export interface SeedPair {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

/** What the player sees before a bet (without the secret server seed). */
export interface PublicSeeds {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export type PlinkoStep = -1 | 1; // -1 = links, 1 = rechts

export type VerifyParams =
  | { game: "crash" }
  | { game: "limbo" }
  | { game: "mines"; mines: number }
  | { game: "plinko"; rows: number };

export type VerifyOutcome =
  | { game: "crash"; crashPoint: number }
  | { game: "limbo"; result: number }
  | { game: "mines"; minePositions: number[] }
  | { game: "plinko"; path: PlinkoStep[]; bin: number };

export interface VerifyResult {
  serverSeedHash: string;
  /** null when no hash was given to compare against. */
  hashMatches: boolean | null;
  outcome: VerifyOutcome;
}

export class ProvablyFair {
  // ---------------------------------------------------------------------------
  // Seeds
  // ---------------------------------------------------------------------------

  static generateServerSeed(): string {
    return randomHex(32);
  }

  static generateClientSeed(): string {
    return randomHex(10);
  }

  static hashServerSeed(serverSeed: string): string {
    return bytesToHex(sha256(utf8ToBytes(serverSeed)));
  }

  static hmacSha256(key: string, message: string): Uint8Array {
    return hmac(sha256, utf8ToBytes(key), utf8ToBytes(message));
  }

  // ---------------------------------------------------------------------------
  // Random numbers
  // ---------------------------------------------------------------------------

  /**
   * Deterministic bytes. If 32 bytes (one HMAC) are not enough,
   * the cursor is incremented and another HMAC is appended.
   */
  static bytes({ serverSeed, clientSeed, nonce }: SeedPair, count: number): Uint8Array {
    const out = new Uint8Array(count);
    const blocks = Math.ceil(count / HMAC_OUTPUT_BYTES);
    for (let cursor = 0; cursor < blocks; cursor++) {
      const block = ProvablyFair.hmacSha256(serverSeed, `${clientSeed}:${nonce}:${cursor}`);
      const offset = cursor * HMAC_OUTPUT_BYTES;
      out.set(block.subarray(0, Math.min(HMAC_OUTPUT_BYTES, count - offset)), offset);
    }
    return out;
  }

  /**
   * Every 4 bytes form a number in [0, 1):
   * f = b0/256 + b1/256² + b2/256³ + b3/256⁴
   */
  static floats(seeds: SeedPair, count: number): number[] {
    const bytes = ProvablyFair.bytes(seeds, count * BYTES_PER_FLOAT);
    const floats = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      let value = 0;
      let divisor = 1;
      for (let b = 0; b < BYTES_PER_FLOAT; b++) {
        divisor *= 256;
        value += bytes[i * BYTES_PER_FLOAT + b] / divisor;
      }
      floats[i] = value;
    }
    return floats;
  }

  static float(seeds: SeedPair): number {
    return ProvablyFair.floats(seeds, 1)[0];
  }

  // ---------------------------------------------------------------------------
  // Game outcomes
  // ---------------------------------------------------------------------------

  /**
   * Multiplier with a 1% house edge: M = 0.99 / (1 − f), at least 1.00×.
   * This gives P(M ≥ x) = 0.99 / x. Example: 2× is reached 49.5% of the time.
   */
  static multiplierFromFloat(float: number): number {
    const raw = (1 - HOUSE_EDGE) / (1 - float);
    const floored = Math.floor(raw * 100 + 1e-9) / 100;
    return Math.min(MAX_MULTIPLIER, Math.max(1, floored));
  }

  static crashPoint(seeds: SeedPair): number {
    return ProvablyFair.multiplierFromFloat(ProvablyFair.float(seeds));
  }

  static limboResult(seeds: SeedPair): number {
    return ProvablyFair.multiplierFromFloat(ProvablyFair.float(seeds));
  }

  /** Fisher-Yates shuffle of the 25 tiles. The first `mines` tiles are mines. */
  static minePositions(seeds: SeedPair, mines: number): number[] {
    if (!Number.isInteger(mines) || mines < 1 || mines >= MINES_TILES) {
      throw new RangeError(`Invalid mine count: ${mines}`);
    }
    const tiles = Array.from({ length: MINES_TILES }, (_, i) => i);
    const floats = ProvablyFair.floats(seeds, MINES_TILES - 1);
    for (let i = 0; i < MINES_TILES - 1; i++) {
      const j = i + Math.floor(floats[i] * (MINES_TILES - i));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles.slice(0, mines).sort((a, b) => a - b);
  }

  /** One number per pin row: < 0.5 → left, otherwise right. */
  static plinkoPath(seeds: SeedPair, rows: number): PlinkoStep[] {
    return ProvablyFair.floats(seeds, rows).map((f) => (f < 0.5 ? -1 : 1));
  }

  /** Slot index = number of bounces to the right (0 … rows). */
  static plinkoBin(path: PlinkoStep[]): number {
    return path.reduce<number>((bin, step) => bin + (step === 1 ? 1 : 0), 0);
  }

  // ---------------------------------------------------------------------------
  // Verification
  // ---------------------------------------------------------------------------

  static verify(
    seeds: SeedPair & { expectedServerSeedHash?: string },
    params: VerifyParams,
  ): VerifyResult {
    const serverSeedHash = ProvablyFair.hashServerSeed(seeds.serverSeed);
    const expected = seeds.expectedServerSeedHash?.trim().toLowerCase();
    return {
      serverSeedHash,
      hashMatches: expected ? expected === serverSeedHash : null,
      outcome: ProvablyFair.outcome(seeds, params),
    };
  }

  static outcome(seeds: SeedPair, params: VerifyParams): VerifyOutcome {
    switch (params.game) {
      case "crash":
        return { game: "crash", crashPoint: ProvablyFair.crashPoint(seeds) };
      case "limbo":
        return { game: "limbo", result: ProvablyFair.limboResult(seeds) };
      case "mines":
        return { game: "mines", minePositions: ProvablyFair.minePositions(seeds, params.mines) };
      case "plinko": {
        const path = ProvablyFair.plinkoPath(seeds, params.rows);
        return { game: "plinko", path, bin: ProvablyFair.plinkoBin(path) };
      }
    }
  }
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
