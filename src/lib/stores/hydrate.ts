import { useFairnessStore } from "./fairness-store";
import { useSettingsStore } from "./settings-store";
import { useWalletStore } from "./wallet-store";

const walletKey = (userId: string) => `rainbucks:${userId}:wallet`;
const fairnessKey = (userId: string) => `rainbucks:${userId}:fairness`;

/**
 * Loads balance, history and seeds of the current player from localStorage.
 * Every player gets their own keys, so accounts in one browser never mix.
 */
export async function hydratePlayerStores(userId: string): Promise<void> {
  useWalletStore.persist.setOptions({ name: walletKey(userId) });
  useFairnessStore.persist.setOptions({ name: fairnessKey(userId) });
  await Promise.all([
    useWalletStore.persist.rehydrate(),
    useFairnessStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
  ]);
}

/** Picks up changes from other tabs (e.g. the balance after a bet). */
export function syncPlayerStoresAcrossTabs(userId: string): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === walletKey(userId)) void useWalletStore.persist.rehydrate();
    if (event.key === fairnessKey(userId)) void useFairnessStore.persist.rehydrate();
    if (event.key === "rainbucks:settings") void useSettingsStore.persist.rehydrate();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
