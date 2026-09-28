import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeStorage } from "./safe-storage";
import { ProvablyFair, type PublicSeeds, type SeedPair } from "@/lib/fairness/provably-fair";

const REVEALED_LIMIT = 20;

export interface RevealedSeed {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  /** Number of bets played with this seed pair. */
  nonce: number;
  revealedAt: number;
}

interface FairnessData {
  /** Secret until rotation (simulated server). */
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  revealed: RevealedSeed[];
}

export type RoundSeeds = SeedPair & PublicSeeds;

interface FairnessActions {
  /** Returns the seeds for the next bet and increments the nonce. */
  consume: () => RoundSeeds;
  /** Reveals the current server seed and starts a new seed pair. */
  rotate: (nextClientSeed?: string) => RevealedSeed;
}

export type FairnessState = FairnessData & FairnessActions;

export const createFairnessData = (): FairnessData => {
  const serverSeed = ProvablyFair.generateServerSeed();
  return {
    serverSeed,
    serverSeedHash: ProvablyFair.hashServerSeed(serverSeed),
    clientSeed: ProvablyFair.generateClientSeed(),
    nonce: 0,
    revealed: [],
  };
};

export const useFairnessStore = create<FairnessState>()(
  persist(
    (set, get) => ({
      ...createFairnessData(),

      consume: () => {
        const { serverSeed, serverSeedHash, clientSeed, nonce } = get();
        set({ nonce: nonce + 1 });
        return { serverSeed, serverSeedHash, clientSeed, nonce };
      },

      rotate: (nextClientSeed) => {
        const current = get();
        const revealed: RevealedSeed = {
          serverSeed: current.serverSeed,
          serverSeedHash: current.serverSeedHash,
          clientSeed: current.clientSeed,
          nonce: current.nonce,
          revealedAt: Date.now(),
        };
        const fresh = createFairnessData();
        const clientSeed = nextClientSeed?.trim() || fresh.clientSeed;
        set({
          serverSeed: fresh.serverSeed,
          serverSeedHash: fresh.serverSeedHash,
          clientSeed,
          nonce: 0,
          revealed: [revealed, ...current.revealed].slice(0, REVEALED_LIMIT),
        });
        return revealed;
      },
    }),
    {
      name: "rainbucks:fairness",
      storage: createSafeStorage(),
      skipHydration: true,
      version: 1,
      partialize: ({ serverSeed, serverSeedHash, clientSeed, nonce, revealed }) => ({
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        revealed,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...createFairnessData(),
        ...(persisted as Partial<FairnessData> | undefined),
      }),
    },
  ),
);

/** Shorthand for game engines outside of React. */
export const consumeSeeds = (): RoundSeeds => useFairnessStore.getState().consume();

export const toPublicSeeds = ({ serverSeedHash, clientSeed, nonce }: RoundSeeds): PublicSeeds => ({
  serverSeedHash,
  clientSeed,
  nonce,
});
