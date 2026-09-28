import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ProvablyFair, type PublicSeeds, type SeedPair } from "@/lib/fairness/provably-fair";

const REVEALED_LIMIT = 20;

export interface RevealedSeed {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  /** Anzahl der Wetten, die mit diesem Seed-Paar gespielt wurden. */
  nonce: number;
  revealedAt: number;
}

interface FairnessData {
  /** Geheim bis zur Rotation (simulierter Server). */
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  revealed: RevealedSeed[];
}

export type RoundSeeds = SeedPair & PublicSeeds;

interface FairnessActions {
  /** Liefert die Seeds für die nächste Wette und erhöht die Nonce. */
  consume: () => RoundSeeds;
  /** Legt den aktuellen Server-Seed offen und startet ein neues Seed-Paar. */
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
      storage: createJSONStorage(() => localStorage),
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

/** Kurzform für Spiel-Engines außerhalb von React. */
export const consumeSeeds = (): RoundSeeds => useFairnessStore.getState().consume();

export const toPublicSeeds = ({ serverSeedHash, clientSeed, nonce }: RoundSeeds): PublicSeeds => ({
  serverSeedHash,
  clientSeed,
  nonce,
});
