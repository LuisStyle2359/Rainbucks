import { getSocket } from "@/lib/realtime/simulated-socket";
import { useLiveStore } from "@/lib/stores/live-store";
import { useWalletStore, type BetRecord, type SettleInput } from "@/lib/stores/wallet-store";
import { celebrate, winTier, type ScreenPoint } from "./celebrations";
import { levelFromXp, levelUpBonus, xpFromWagered } from "./levels";

/** Take the stake. false = not enough balance. */
export function placeBet(amount: number): boolean {
  return useWalletStore.getState().debit(amount);
}

/** Return a stake (the round never happened). */
export function refundBet(amount: number): void {
  useWalletStore.getState().refund(amount);
}

/**
 * Settle a bet: credit the payout, store it in the history, publish it to
 * the live feed, then trigger win celebrations and level-ups.
 */
export function settleBet(input: SettleInput, options: { origin?: ScreenPoint } = {}): BetRecord {
  const wallet = useWalletStore.getState();
  const levelBefore = levelFromXp(xpFromWagered(wallet.stats.wagered)).level;

  const record = wallet.settle(input);

  const me = useLiveStore.getState().me;
  if (me) {
    getSocket().emit("bets:publish", {
      id: record.id,
      user: me,
      game: record.game,
      amount: record.amount,
      multiplier: record.multiplier,
      payout: record.payout,
      createdAt: record.createdAt,
    });
  }

  if (record.payout > record.amount) {
    celebrate({
      type: "win",
      game: record.game,
      amount: record.amount,
      payout: record.payout,
      multiplier: record.multiplier,
      tier: winTier(record.multiplier),
      origin: options.origin,
    });
  }

  const levelAfter = levelFromXp(xpFromWagered(useWalletStore.getState().stats.wagered)).level;
  if (levelAfter > levelBefore) {
    let bonus = 0;
    for (let level = levelBefore + 1; level <= levelAfter; level++) bonus += levelUpBonus(level);
    useWalletStore.getState().grantBonus(bonus);
    celebrate({ type: "levelUp", fromLevel: levelBefore, level: levelAfter, bonus });
  }

  return record;
}
