import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BetDetails } from "@/lib/casino/games";
import { calculatePayout, STARTING_BALANCE } from "@/lib/casino/money";
import type { PublicSeeds } from "@/lib/fairness/provably-fair";
import { createSafeStorage } from "./safe-storage";

const HISTORY_LIMIT = 100;

export type BetRecord = {
  id: string;
  /** Stake in cents */
  amount: number;
  /** Paid multiplier, 0 on a loss */
  multiplier: number;
  /** Payout in cents (includes the stake), 0 on a loss */
  payout: number;
  createdAt: number;
  seeds: PublicSeeds;
} & BetDetails;

// Omit that keeps the per-game union intact.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type SettleInput = DistributiveOmit<BetRecord, "id" | "createdAt" | "payout"> & {
  /**
   * Exact payout in cents. When omitted it is computed from amount × multiplier.
   * Games that combine several bets in one round (e.g. roulette) pass it so the
   * credited amount stays cent-exact instead of losing sub-cent truncation.
   */
  payout?: number;
};

export interface WalletStats {
  bets: number;
  wins: number;
  wagered: number;
  profit: number;
  biggestWin: number;
  biggestMultiplier: number;
}

interface WalletData {
  balance: number;
  history: BetRecord[];
  stats: WalletStats;
  refills: number;
  /** Play money received from level-ups and free spins (cents) */
  bonuses: number;
  /** Timestamp of the last free spin, null = never spun */
  lastSpinAt: number | null;
}

interface WalletActions {
  /** Takes the stake. Returns false if the balance is too low. */
  debit: (amount: number) => boolean;
  /** Credits the payout and stores the bet in the history. */
  settle: (input: SettleInput) => BetRecord;
  /** Returns a stake (e.g. a cancelled Crash bet). */
  refund: (amount: number) => void;
  /** Demo top-up when the play money is almost gone. */
  refill: () => void;
  /** Level-up reward. */
  grantBonus: (amount: number) => void;
  /** Free spin reward, starts the cooldown. */
  claimSpin: (amount: number) => void;
  reset: () => void;
}

export type WalletState = WalletData & WalletActions;

const emptyStats = (): WalletStats => ({
  bets: 0,
  wins: 0,
  wagered: 0,
  profit: 0,
  biggestWin: 0,
  biggestMultiplier: 0,
});

export const createWalletData = (): WalletData => ({
  balance: STARTING_BALANCE,
  history: [],
  stats: emptyStats(),
  refills: 0,
  bonuses: 0,
  lastSpinAt: null,
});

let idCounter = 0;
const createBetId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...createWalletData(),

      debit: (amount) => {
        if (!Number.isInteger(amount) || amount <= 0 || amount > get().balance) return false;
        set((state) => ({ balance: state.balance - amount }));
        return true;
      },

      settle: (input) => {
        const payout = input.payout ?? calculatePayout(input.amount, input.multiplier);
        const record = {
          ...input,
          id: createBetId(),
          createdAt: Date.now(),
          payout,
        } as BetRecord;
        const profit = payout - input.amount;

        set((state) => ({
          balance: state.balance + payout,
          history: [record, ...state.history].slice(0, HISTORY_LIMIT),
          stats: {
            bets: state.stats.bets + 1,
            wins: state.stats.wins + (profit > 0 ? 1 : 0),
            wagered: state.stats.wagered + input.amount,
            profit: state.stats.profit + profit,
            biggestWin: Math.max(state.stats.biggestWin, profit),
            biggestMultiplier: Math.max(state.stats.biggestMultiplier, input.multiplier),
          },
        }));
        return record;
      },

      refund: (amount) => set((state) => ({ balance: state.balance + amount })),

      refill: () =>
        set((state) => ({
          balance: state.balance + STARTING_BALANCE,
          refills: state.refills + 1,
        })),

      grantBonus: (amount) =>
        set((state) => ({ balance: state.balance + amount, bonuses: state.bonuses + amount })),

      claimSpin: (amount) =>
        set((state) => ({
          balance: state.balance + amount,
          bonuses: state.bonuses + amount,
          lastSpinAt: Date.now(),
        })),

      reset: () => set(createWalletData()),
    }),
    {
      // The name is set per user, see hydratePlayerStores().
      name: "rainbucks:wallet",
      storage: createSafeStorage(),
      skipHydration: true,
      version: 1,
      partialize: ({ balance, history, stats, refills, bonuses, lastSpinAt }) => ({
        balance,
        history,
        stats,
        refills,
        bonuses,
        lastSpinAt,
      }),
      // Nothing stored (new user) → fresh starting balance instead of
      // whatever a previously logged-in user left in memory.
      merge: (persisted, current) => ({
        ...current,
        ...createWalletData(),
        ...(persisted as Partial<WalletData> | undefined),
      }),
    },
  ),
);
