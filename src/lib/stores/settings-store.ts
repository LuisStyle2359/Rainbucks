import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeStorage } from "./safe-storage";
import type { GameId } from "@/lib/casino/games";

interface SettingsData {
  muted: boolean;
  volume: number;
  /** Faster animations (e.g. Limbo roll, Mines auto). */
  turbo: boolean;
  livePanelOpen: boolean;
  betAmounts: Record<GameId, number>;
}

interface SettingsActions {
  toggleMuted: () => void;
  setVolume: (volume: number) => void;
  setTurbo: (turbo: boolean) => void;
  setLivePanelOpen: (open: boolean) => void;
  setBetAmount: (game: GameId, amount: number) => void;
}

export type SettingsState = SettingsData & SettingsActions;

const DEFAULT_BET = 1_00;

const createSettingsData = (): SettingsData => ({
  muted: false,
  volume: 0.7,
  turbo: false,
  livePanelOpen: true,
  betAmounts: {
    crash: DEFAULT_BET,
    mines: DEFAULT_BET,
    limbo: DEFAULT_BET,
    plinko: DEFAULT_BET,
    blackjack: DEFAULT_BET,
    roulette: DEFAULT_BET,
  },
});

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...createSettingsData(),
      toggleMuted: () => set((state) => ({ muted: !state.muted })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setTurbo: (turbo) => set({ turbo }),
      setLivePanelOpen: (livePanelOpen) => set({ livePanelOpen }),
      setBetAmount: (game, amount) =>
        set((state) => ({ betAmounts: { ...state.betAmounts, [game]: amount } })),
    }),
    {
      name: "rainbucks:settings",
      storage: createSafeStorage(),
      skipHydration: true,
      version: 1,
      partialize: ({ muted, volume, turbo, livePanelOpen, betAmounts }) => ({
        muted,
        volume,
        turbo,
        livePanelOpen,
        betAmounts,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsData>;
        return {
          ...current,
          ...saved,
          betAmounts: { ...current.betAmounts, ...saved.betAmounts },
        };
      },
    },
  ),
);

/** UI state that is not persisted. */
interface UiState {
  activeGame: GameId | null;
  mobileLiveOpen: boolean;
  bonusWheelOpen: boolean;
  setActiveGame: (game: GameId | null) => void;
  setMobileLiveOpen: (open: boolean) => void;
  setBonusWheelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  activeGame: null,
  mobileLiveOpen: false,
  bonusWheelOpen: false,
  setActiveGame: (activeGame) => set({ activeGame }),
  setMobileLiveOpen: (mobileLiveOpen) => set({ mobileLiveOpen }),
  setBonusWheelOpen: (bonusWheelOpen) => set({ bonusWheelOpen }),
}));
