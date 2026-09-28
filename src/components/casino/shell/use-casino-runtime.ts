"use client";

import { useEffect, useState } from "react";
import { audio } from "@/lib/audio/audio-engine";
import { hydratePlayerStores, syncPlayerStoresAcrossTabs } from "@/lib/stores/hydrate";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useLiveConnection } from "./use-live-connection";

/**
 * Startet alles, was das Casino im Browser braucht:
 * gespeicherte Daten laden, Tabs synchronisieren, Audio freischalten, Live-Verbindung.
 * Gibt true zurück, sobald die Daten geladen sind und die Spiele rendern dürfen.
 */
export function useCasinoRuntime(userId: string, name: string): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void hydratePlayerStores(userId).then(() => {
      if (active) setReady(true);
    });
    const stopSync = syncPlayerStoresAcrossTabs(userId);
    return () => {
      active = false;
      stopSync();
    };
  }, [userId]);

  // Audio erst nach der ersten Interaktion starten (Autoplay-Regeln der Browser)
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    const apply = ({ muted, volume }: { muted: boolean; volume: number }) => {
      audio.setMuted(muted);
      audio.setVolume(volume);
    };
    apply(useSettingsStore.getState());
    const unsubscribe = useSettingsStore.subscribe(apply);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      unsubscribe();
    };
  }, []);

  useLiveConnection(name);
  return ready;
}
