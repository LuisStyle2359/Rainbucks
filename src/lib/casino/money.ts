// All amounts are stored as integer cents.
// That avoids floating point drift like 0.1 + 0.2 = 0.30000000000000004.

export const CURRENCY = "RBX";
export const STARTING_BALANCE = 1_000_00; // 1,000.00 RBX
export const MIN_BET = 1; // 0.01 RBX
export const MAX_BET = 1_000_000_00; // 1,000,000.00 RBX

const LOCALE = "en-US";

const amountFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormat = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});

const multiplierFormat = new Intl.NumberFormat(LOCALE, {
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

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits });
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/**
 * Parses user input such as "12.5", "1,234.56", "12,5" or "1.234,56".
 * With both separators present, the last one is the decimal separator.
 * A lone comma counts as a thousands separator only in the "1,000" pattern.
 */
export function parseDecimalInput(raw: string): number | null {
  let normalized = raw.trim().replace(/\s|×|x|%|RBX/gi, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (lastComma !== -1) {
    normalized = /^\d{1,3}(,\d{3})+$/.test(normalized)
      ? normalized.replace(/,/g, "")
      : normalized.replace(",", ".");
  }

  if (normalized === "" || !/^\d*\.?\d*$/.test(normalized) || normalized === ".") return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

/** Truncates to 2 decimals (never round up, or the house pays too much). */
export function floorMultiplier(multiplier: number): number {
  return Math.floor(multiplier * 100 + 1e-9) / 100;
}

/**
 * Payout = bet × multiplier, computed exactly with integer arithmetic.
 * The multiplier is truncated to 2 decimals.
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
