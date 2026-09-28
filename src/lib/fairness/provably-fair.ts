import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Provably Fair – so funktioniert es
 * ----------------------------------
 * 1. Der "Server" würfelt einen geheimen Server-Seed und veröffentlicht vorab
 *    nur dessen SHA-256-Hash. Damit ist er festgelegt, aber noch unbekannt.
 * 2. Der Spieler wählt einen eigenen Client-Seed (beliebig änderbar).
 * 3. Jede Wette erhöht die Nonce um 1.
 * 4. Ergebnis = HMAC_SHA256(key = Server-Seed, msg = "ClientSeed:Nonce:Cursor").
 *    Aus den Bytes werden Zufallszahlen in [0, 1) gebildet.
 * 5. Nach dem Rotieren wird der Server-Seed offengelegt. Jeder kann jetzt
 *    prüfen, dass SHA-256(Server-Seed) dem vorab gezeigten Hash entspricht
 *    und jedes Ergebnis exakt nachrechnen.
 *
 * Weder Server (kennt den Client-Seed nicht vorher) noch Spieler (kennt den
 * Server-Seed nicht vorher) können das Ergebnis allein beeinflussen.
 *
 * Hinweis: In diesem Demo-Simulator läuft der "Server" im Browser. In einer
 * echten Anwendung liegt der Server-Seed bis zur Rotation nur auf dem Server.
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

/** Das, was der Spieler vor der Wette sieht (ohne geheimen Server-Seed). */
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
  /** null, wenn kein Hash zum Vergleich angegeben wurde. */
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
  // Zufallszahlen
  // ---------------------------------------------------------------------------

  /**
   * Deterministische Bytes. Reichen 32 Bytes (ein HMAC) nicht aus,
   * wird der Cursor erhöht und ein weiterer HMAC angehängt.
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
   * Je 4 Bytes ergeben eine Zahl in [0, 1):
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
  // Spielergebnisse
  // ---------------------------------------------------------------------------

  /**
   * Multiplikator mit 1 % Hausvorteil: M = 0,99 / (1 − f), mindestens 1,00×.
   * Daraus folgt P(M ≥ x) = 0,99 / x. Beispiel: 2× wird in 49,5 % erreicht.
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

  /** Fisher-Yates-Mischung der 25 Felder. Die ersten `mines` Felder sind Minen. */
  static minePositions(seeds: SeedPair, mines: number): number[] {
    if (!Number.isInteger(mines) || mines < 1 || mines >= MINES_TILES) {
      throw new RangeError(`Ungültige Minenanzahl: ${mines}`);
    }
    const tiles = Array.from({ length: MINES_TILES }, (_, i) => i);
    const floats = ProvablyFair.floats(seeds, MINES_TILES - 1);
    for (let i = 0; i < MINES_TILES - 1; i++) {
      const j = i + Math.floor(floats[i] * (MINES_TILES - i));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles.slice(0, mines).sort((a, b) => a - b);
  }

  /** Pro Pin-Reihe eine Zahl: < 0,5 → links, sonst rechts. */
  static plinkoPath(seeds: SeedPair, rows: number): PlinkoStep[] {
    return ProvablyFair.floats(seeds, rows).map((f) => (f < 0.5 ? -1 : 1));
  }

  /** Fach-Index = Anzahl der Rechts-Abpraller (0 … rows). */
  static plinkoBin(path: PlinkoStep[]): number {
    return path.reduce<number>((bin, step) => bin + (step === 1 ? 1 : 0), 0);
  }

  // ---------------------------------------------------------------------------
  // Überprüfung
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
