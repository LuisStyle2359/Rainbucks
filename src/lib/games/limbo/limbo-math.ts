import { HOUSE_EDGE, MAX_MULTIPLIER } from "@/lib/fairness/provably-fair";

export const LIMBO_MIN_TARGET = 1.01;
export const LIMBO_MAX_TARGET = MAX_MULTIPLIER;

/** RTP in percent (99). Rounded so no floating point residue sneaks in. */
const RTP_PERCENT = Math.round((1 - HOUSE_EDGE) * 10_000) / 100;

/** Win chance in percent: 99 / target. Example: 2.00× → 49.5%. */
export function limboWinChance(target: number): number {
  return RTP_PERCENT / target;
}

/** Inverse: target multiplier from a win chance (in %). */
export function limboTargetForChance(chancePercent: number): number {
  return clampTarget(Math.floor((RTP_PERCENT * 100) / chancePercent + 1e-9) / 100);
}

export function clampTarget(target: number): number {
  if (!Number.isFinite(target)) return LIMBO_MIN_TARGET;
  return Math.min(LIMBO_MAX_TARGET, Math.max(LIMBO_MIN_TARGET, Math.round(target * 100) / 100));
}

/** Slider position 0…1 ↔ target (logarithmic, 1.01× … 1,000×). */
const SLIDER_MAX = 1_000;

export function targetFromSlider(position: number): number {
  return clampTarget(LIMBO_MIN_TARGET * (SLIDER_MAX / LIMBO_MIN_TARGET) ** position);
}

export function sliderFromTarget(target: number): number {
  const clamped = Math.min(SLIDER_MAX, Math.max(LIMBO_MIN_TARGET, target));
  return Math.log(clamped / LIMBO_MIN_TARGET) / Math.log(SLIDER_MAX / LIMBO_MIN_TARGET);
}
