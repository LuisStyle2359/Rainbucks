// Free bonus wheel: one spin per hour, play money only.
// Every segment has exactly the same chance (1 in 12), and the page says so.

/** Prizes in cents, clockwise starting at the top */
export const WHEEL_SEGMENTS: readonly number[] = [
  100_00, 250_00, 150_00, 500_00, 100_00, 1_000_00, 200_00, 250_00, 150_00, 2_500_00, 100_00, 5_000_00,
];

export const SPIN_COOLDOWN_MS = 60 * 60 * 1000;

/** ms until the next free spin (0 = available now). */
export function spinAvailableIn(lastSpinAt: number | null, now: number): number {
  if (lastSpinAt === null) return 0;
  // Clamped: the shared clock ticks once per second and can lag behind the spin itself
  return Math.min(SPIN_COOLDOWN_MS, Math.max(0, lastSpinAt + SPIN_COOLDOWN_MS - now));
}

/** Uniformly random segment from the crypto RNG (rejection sampling, no modulo bias). */
export function pickSegment(count = WHEEL_SEGMENTS.length): number {
  const limit = Math.floor(0x1_0000_0000 / count) * count;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % count;
  }
}

/** "59:07" */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
