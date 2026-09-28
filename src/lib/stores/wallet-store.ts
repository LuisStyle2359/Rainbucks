import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeStorage } from "./safe-storage";
import type { BetDetails } from "@/lib/casino/games";
import { calculatePayout, STARTING_BALANCE } from "@/lib/casino/money";
import type { PublicSeeds } from "@/lib/fairness/provably-fair";

const HISTORY_LIMIT = 100;

export type BetRecord = {
  id: string;
  /** Einsatz in Cent */
  amount: number;
  /** Ausgezahlter Multiplikator, 0 bei Verlust */
  multiplier: number;
  /** Auszahlung in Cent (inkl. Einsatz), 0 bei Verlust */
  payout: number;
  createdAt: number;
  seeds: PublicSeeds;
} & BetDetails;

// Omit, das die Spiel-Varianten (Union) erhält.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type SettleInput = DistributiveOmit<BetRecord, "id" | "createdAt" | "payout">;

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
}

interface WalletActions {
  /** Bucht den Einsatz ab. Gibt false zurück, wenn das Guthaben nicht reicht. */
  debit: (amount: number) => boolean;
  /** Schreibt die Auszahlung gut und speichert die Wette in der Historie. */
  settle: (input: SettleInput) => BetRecord;
  /** Gibt einen Einsatz zurück (z. B. abgebrochene Crash-Wette). */
  refund: (amount: number) => void;
  /** Demo-Aufladung, wenn das Spielgeld fast aufgebraucht ist. */
  refill: () => void;
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
        const payout = calculatePayout(input.amount, input.multiplier);
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

      reset: () => set(createWalletData()),
    }),
    {
      // Der Name wird pro Nutzer gesetzt, siehe hydratePlayerStores().
      name: "rainbucks:wallet",
      storage: createSafeStorage(),
      skipHydration: true,
      version: 1,
      partialize: ({ balance, history, stats, refills }) => ({ balance, history, stats, refills }),
      // Kein gespeicherter Stand (neuer Nutzer) → frisches Startguthaben
      // statt des Stands eines vorher eingeloggten Nutzers.
      merge: (persisted, current) => ({
        ...current,
        ...createWalletData(),
        ...(persisted as Partial<WalletData> | undefined),
      }),
    },
  ),
);
