import { getSocket } from "@/lib/realtime/simulated-socket";
import { useLiveStore } from "@/lib/stores/live-store";
import { useWalletStore, type BetRecord, type SettleInput } from "@/lib/stores/wallet-store";

/** Einsatz abbuchen. false = nicht genug Guthaben. */
export function placeBet(amount: number): boolean {
  return useWalletStore.getState().debit(amount);
}

/** Einsatz zurückbuchen (Runde fand nicht statt). */
export function refundBet(amount: number): void {
  useWalletStore.getState().refund(amount);
}

/**
 * Wette abrechnen: Auszahlung gutschreiben, in der Historie speichern
 * und im Live-Feed veröffentlichen.
 */
export function settleBet(input: SettleInput): BetRecord {
  const record = useWalletStore.getState().settle(input);
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
  return record;
}
