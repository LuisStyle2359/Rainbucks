import type { PlinkoRisk } from "@/lib/casino/games";

export const PLINKO_ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
export type PlinkoRows = (typeof PLINKO_ROWS)[number];

export const PLINKO_RISKS: { id: PlinkoRisk; label: string }[] = [
  { id: "low", label: "Niedrig" },
  { id: "medium", label: "Mittel" },
  { id: "high", label: "Hoch" },
];

/**
 * Auszahlungstabellen (Multiplikator pro Fach, von links nach rechts).
 *
 * Erzeugt mit einer Formel: Mitte fest (0,5 / 0,4 / 0,2), Ränder wachsen
 * exponentiell mit der Reihenanzahl, dazwischen eine Potenzkurve. Die Kurve
 * wurde so gewählt, dass der erwartete Rückfluss (RTP) knapp unter 99 % liegt.
 * Die Tests in payouts.test.ts rechnen das für alle 27 Tabellen nach.
 */
export const PLINKO_PAYOUTS: Record<PlinkoRisk, Record<PlinkoRows, readonly number[]>> = {
  low: {
    8: [5.6, 3.1, 1.4, 0.7, 0.5, 0.7, 1.4, 3.1, 5.6],
    9: [6.4, 4, 2, 0.9, 0.5, 0.5, 0.9, 2, 4, 6.4],
    10: [7.3, 4.5, 2.7, 1.2, 0.6, 0.5, 0.6, 1.2, 2.7, 4.5, 7.3],
    11: [8.3, 5.4, 3.1, 1.7, 0.8, 0.5, 0.5, 0.8, 1.7, 3.1, 5.4, 8.3],
    12: [9.5, 6.3, 3.8, 2, 1.1, 0.6, 0.5, 0.6, 1.1, 2, 3.8, 6.3, 9.5],
    13: [11, 7.7, 4.9, 2.8, 1.4, 0.7, 0.5, 0.5, 0.7, 1.4, 2.8, 4.9, 7.7, 11],
    14: [12, 8.8, 5.6, 3.3, 1.8, 0.9, 0.6, 0.5, 0.6, 0.9, 1.8, 3.3, 5.6, 8.8, 12],
    15: [14, 9.9, 6.5, 4.2, 2.3, 1.2, 0.7, 0.5, 0.5, 0.7, 1.2, 2.3, 4.2, 6.5, 9.9, 14],
    16: [16, 11, 7.7, 4.9, 2.8, 1.6, 0.8, 0.6, 0.5, 0.6, 0.8, 1.6, 2.8, 4.9, 7.7, 11, 16],
  },
  medium: {
    8: [13, 4.7, 1.2, 0.5, 0.4, 0.5, 1.2, 4.7, 13],
    9: [17, 6.6, 2.1, 0.6, 0.4, 0.4, 0.6, 2.1, 6.6, 17],
    10: [22, 9.3, 3.3, 0.9, 0.4, 0.4, 0.4, 0.9, 3.3, 9.3, 22],
    11: [29, 13, 4.7, 1.4, 0.5, 0.4, 0.4, 0.5, 1.4, 4.7, 13, 29],
    12: [38, 17, 6.8, 2.2, 0.7, 0.4, 0.4, 0.4, 0.7, 2.2, 6.8, 17, 38],
    13: [49, 23, 9.5, 3.2, 1, 0.5, 0.4, 0.4, 0.5, 1, 3.2, 9.5, 23, 49],
    14: [64, 32, 13, 5, 1.5, 0.6, 0.4, 0.4, 0.4, 0.6, 1.5, 5, 13, 32, 64],
    15: [84, 43, 19, 7.1, 2.4, 0.8, 0.4, 0.4, 0.4, 0.4, 0.8, 2.4, 7.1, 19, 43, 84],
    16: [110, 57, 26, 10, 3.7, 1.1, 0.5, 0.4, 0.4, 0.4, 0.5, 1.1, 3.7, 10, 26, 57, 110],
  },
  high: {
    8: [29, 6.7, 0.9, 0.2, 0.2, 0.2, 0.9, 6.7, 29],
    9: [45, 11, 1.6, 0.3, 0.2, 0.2, 0.3, 1.6, 11, 45],
    10: [70, 18, 3.1, 0.4, 0.2, 0.2, 0.2, 0.4, 3.1, 18, 70],
    11: [110, 29, 5.6, 0.7, 0.2, 0.2, 0.2, 0.2, 0.7, 5.6, 29, 110],
    12: [170, 46, 9.3, 1.3, 0.3, 0.2, 0.2, 0.2, 0.3, 1.3, 9.3, 46, 170],
    13: [270, 74, 16, 2.4, 0.4, 0.2, 0.2, 0.2, 0.2, 0.4, 2.4, 16, 74, 270],
    14: [410, 120, 26, 4.4, 0.7, 0.2, 0.2, 0.2, 0.2, 0.2, 0.7, 4.4, 26, 120, 410],
    15: [640, 190, 44, 8.1, 1.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1.1, 8.1, 44, 190, 640],
    16: [1000, 300, 72, 14, 2, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 2, 14, 72, 300, 1000],
  },
};

export function plinkoMultipliers(rows: PlinkoRows, risk: PlinkoRisk): readonly number[] {
  return PLINKO_PAYOUTS[risk][rows];
}

export function plinkoMultiplier(rows: PlinkoRows, risk: PlinkoRisk, bin: number): number {
  return PLINKO_PAYOUTS[risk][rows][bin];
}

/** Wahrscheinlichkeit je Fach: Binomialverteilung B(rows, 0,5). */
export function plinkoBinProbabilities(rows: number): number[] {
  const probabilities: number[] = [];
  let coefficient = 1;
  for (let k = 0; k <= rows; k++) {
    probabilities.push(coefficient / 2 ** rows);
    coefficient = (coefficient * (rows - k)) / (k + 1);
  }
  return probabilities;
}

/** Erwarteter Rückfluss (Return to Player) einer Tabelle. */
export function plinkoRtp(rows: PlinkoRows, risk: PlinkoRisk): number {
  const probabilities = plinkoBinProbabilities(rows);
  return plinkoMultipliers(rows, risk).reduce((sum, m, i) => sum + m * probabilities[i], 0);
}

export function isPlinkoRows(value: number): value is PlinkoRows {
  return (PLINKO_ROWS as readonly number[]).includes(value);
}
