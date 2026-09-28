/**
 * Lets the coin animation and the balance counter work together:
 * the balance only counts up while the coins are landing in it,
 * and every coin that arrives makes the balance pill pop.
 */

interface Hold {
  /** ms until the first coin lands */
  delay: number;
  /** ms from the first to the last coin */
  duration: number;
  at: number;
}

/** A hold older than this belongs to an update nobody picked up. */
const HOLD_TTL_MS = 250;

let pending: Hold | null = null;

export function holdBalance(delay: number, duration: number): void {
  const now = performance.now();
  if (!pending || now - pending.at > HOLD_TTL_MS) {
    pending = { delay, duration, at: now };
    return;
  }
  const end = Math.max(pending.delay + pending.duration, delay + duration);
  pending.delay = Math.min(pending.delay, delay);
  pending.duration = end - pending.delay;
}

/** Called by the balance right after a balance increase (one microtask later). */
export function takeBalanceHold(): { delay: number; duration: number } | null {
  const hold = pending;
  pending = null;
  if (!hold || performance.now() - hold.at > HOLD_TTL_MS) return null;
  return { delay: hold.delay, duration: hold.duration };
}

export const BALANCE_POP_EVENT = "rbx:balance-pop";

export function popBalance(): void {
  window.dispatchEvent(new Event(BALANCE_POP_EVENT));
}

/** Center of the coin icon in the balance pill, where flying coins land. */
export function balanceTarget(): { x: number; y: number } | null {
  const element = document.querySelector("[data-coin-target]");
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
