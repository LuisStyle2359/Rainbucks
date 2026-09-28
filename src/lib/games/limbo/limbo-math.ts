import { HOUSE_EDGE, MAX_MULTIPLIER } from "@/lib/fairness/provably-fair";

export const LIMBO_MIN_TARGET = 1.01;
export const LIMBO_MAX_TARGET = MAX_MULTIPLIER;

/** RTP in Prozent (99). Gerundet, damit keine Gleitkomma-Reste entstehen. */
const RTP_PERCENT = Math.round((1 - HOUSE_EDGE) * 10_000) / 100;

/** Gewinnchance in Prozent: 99 / Ziel. Beispiel: 2,00× → 49,5 %. */
export function limboWinChance(target: number): number {
  return RTP_PERCENT / target;
}

/** Umkehrung: aus einer Gewinnchance (in %) den Ziel-Multiplikator berechnen. */
export function limboTargetForChance(chancePercent: number): number {
  return clampTarget(Math.floor((RTP_PERCENT * 100) / chancePercent + 1e-9) / 100);
}

export function clampTarget(target: number): number {
  if (!Number.isFinite(target)) return LIMBO_MIN_TARGET;
  return Math.min(LIMBO_MAX_TARGET, Math.max(LIMBO_MIN_TARGET, Math.round(target * 100) / 100));
}

/** Slider-Position 0…1 ↔ Ziel (logarithmisch, 1,01× … 1.000×). */
const SLIDER_MAX = 1_000;

export function targetFromSlider(position: number): number {
  return clampTarget(LIMBO_MIN_TARGET * (SLIDER_MAX / LIMBO_MIN_TARGET) ** position);
}

export function sliderFromTarget(target: number): number {
  const clamped = Math.min(SLIDER_MAX, Math.max(LIMBO_MIN_TARGET, target));
  return Math.log(clamped / LIMBO_MIN_TARGET) / Math.log(SLIDER_MAX / LIMBO_MIN_TARGET);
}
