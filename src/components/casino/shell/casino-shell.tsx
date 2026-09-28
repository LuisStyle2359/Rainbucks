"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { audio } from "@/lib/audio/audio-engine";
import { hydratePlayerStores, syncPlayerStoresAcrossTabs } from "@/lib/stores/hydrate";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { LiveDrawer, LivePanel } from "./live-panel";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";
import { useLiveConnection } from "./use-live-connection";

export interface ShellUser {
  id: string;
  name: string;
}

/**
 * Rahmen des Casinos: Top-Bar, Navigation, Live-Panel.
 * Lädt zuerst Guthaben & Seeds des Nutzers aus dem localStorage und rendert
 * die Spiele erst danach, damit nie ein Standardwert gespeicherte Daten überschreibt.
 */
export function CasinoShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void hydratePlayerStores(user.id).then(() => {
      if (active) setReady(true);
    });
    const stopSync = syncPlayerStoresAcrossTabs(user.id);
    return () => {
      active = false;
      stopSync();
    };
  }, [user.id]);

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

  useLiveConnection(user.name);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh bg-oled">
        {/* Ambientes Neon-Licht im Hintergrund */}
        <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 size-[36rem] rounded-full bg-toxic/[0.06] blur-[120px]" />
          <div className="absolute -right-40 top-1/3 size-[32rem] rounded-full bg-cyan/[0.04] blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 size-[28rem] rounded-full bg-neon-red/[0.03] blur-[120px]" />
        </div>

        <TopBar name={user.name} ready={ready} />
        <div className="relative mx-auto flex w-full max-w-[1800px]">
          <SideNav />
          <main className="min-w-0 flex-1 px-3 pb-10 pt-4 sm:px-5 lg:px-6 lg:pt-6">
            {ready ? children : <ShellSkeleton />}
          </main>
          <LivePanel />
        </div>
        <LiveDrawer />
      </div>
    </MotionConfig>
  );
}

function ShellSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]" aria-busy="true" aria-label="Lädt">
      <div className="glass hidden h-[30rem] animate-pulse rounded-2xl lg:block" />
      <div className="glass h-[26rem] animate-pulse rounded-2xl" />
    </div>
  );
}
