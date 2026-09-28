import { useFairnessStore } from "./fairness-store";
import { useSettingsStore } from "./settings-store";
import { useWalletStore } from "./wallet-store";

const walletKey = (userId: string) => `rainbucks:${userId}:wallet`;
const fairnessKey = (userId: string) => `rainbucks:${userId}:fairness`;

/**
 * Lädt Guthaben, Historie und Seeds des eingeloggten Nutzers aus dem localStorage.
 * Jeder Nutzer hat eigene Schlüssel, damit sich Konten im selben Browser nicht mischen.
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

/** Übernimmt Änderungen aus anderen Tabs (z. B. Guthaben nach einer Wette). */
export function syncPlayerStoresAcrossTabs(userId: string): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === walletKey(userId)) void useWalletStore.persist.rehydrate();
    if (event.key === fairnessKey(userId)) void useFairnessStore.persist.rehydrate();
    if (event.key === "rainbucks:settings") void useSettingsStore.persist.rehydrate();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
