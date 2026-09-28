// Alle Beträge werden als ganze Cent (Integer) gespeichert.
// So entstehen keine Rundungsfehler wie 0.1 + 0.2 = 0.30000000000000004.

export const CURRENCY = "RBX";
export const STARTING_BALANCE = 1_000_00; // 1.000,00 RBX
export const MIN_BET = 1; // 0,01 RBX
export const MAX_BET = 1_000_000_00; // 1.000.000,00 RBX

const amountFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormat = new Intl.NumberFormat("de-DE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const multiplierFormat = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(cents: number): string {
  return amountFormat.format(cents / 100);
}

export function formatSignedAmount(cents: number): string {
  if (cents > 0) return `+${formatAmount(cents)}`;
  if (cents < 0) return `−${formatAmount(-cents)}`;
  return formatAmount(0);
}

export function formatCompactAmount(cents: number): string {
  const value = cents / 100;
  return Math.abs(value) < 10_000 ? amountFormat.format(value) : compactFormat.format(value);
}

export function formatMultiplier(multiplier: number): string {
  return `${multiplierFormat.format(multiplier)}×`;
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}

/**
 * Liest Eingaben wie "12,5", "12.5" oder "1.234,56".
 * Enthält die Eingabe ein Komma, gilt der Punkt als Tausendertrenner.
 */
export function parseDecimalInput(raw: string): number | null {
  let normalized = raw.trim().replace(/\s|×|x|RBX/gi, "");
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  if (normalized === "" || !/^\d*\.?\d*$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Schneidet auf 2 Nachkommastellen ab (nie aufrunden, sonst zahlt das Casino zu viel). */
export function floorMultiplier(multiplier: number): number {
  return Math.floor(multiplier * 100 + 1e-9) / 100;
}

/**
 * Auszahlung = Einsatz × Multiplikator, exakt in Integer-Arithmetik.
 * Der Multiplikator wird auf 2 Nachkommastellen abgeschnitten.
 */
export function calculatePayout(amount: number, multiplier: number): number {
  if (multiplier <= 0 || amount <= 0) return 0;
  const hundredths = Math.floor(multiplier * 100 + 1e-9);
  const product = amount * hundredths;
  if (Number.isSafeInteger(product)) return Math.floor(product / 100);
  return Number((BigInt(amount) * BigInt(hundredths)) / BigInt(100));
}

export function clampBet(amount: number, balance: number): number {
  const upper = Math.max(MIN_BET, Math.min(MAX_BET, balance));
  return Math.min(upper, Math.max(MIN_BET, Math.round(amount)));
}
