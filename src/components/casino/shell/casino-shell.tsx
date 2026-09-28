"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { BonusWheelDialog } from "@/components/casino/bonus/bonus-wheel";
import { CelebrationLayer } from "@/components/casino/celebrations/celebration-layer";
import { LiveDrawer, LivePanel } from "./live-panel";
import { AmbientLight, ShellSkeleton } from "./shell-parts";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";
import { useCasinoRuntime } from "./use-casino-runtime";

export interface ShellUser {
  id: string;
  name: string;
}

/**
 * Casino frame: top bar, navigation, live panel, win celebrations, bonus wheel.
 * Loads the user's balance and seeds from localStorage first and only then
 * renders the games, so a default value never overwrites saved data.
 */
export function CasinoShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const ready = useCasinoRuntime(user.id, user.name);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh bg-oled">
        <AmbientLight />
        <TopBar name={user.name} ready={ready} />
        <div className="relative mx-auto flex w-full max-w-[1800px]">
          <SideNav />
          <main className="min-w-0 flex-1 px-3 pb-10 pt-4 sm:px-5 lg:px-6 lg:pt-6">
            {ready ? children : <ShellSkeleton />}
          </main>
          <LivePanel />
        </div>
        <LiveDrawer />
        {ready && <BonusWheelDialog />}
        <CelebrationLayer />
      </div>
    </MotionConfig>
  );
}
