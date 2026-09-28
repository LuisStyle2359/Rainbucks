"use client";

import type { ReactNode } from "react";
import { ChatIcon, SoundOffIcon, SoundOnIcon } from "@/components/casino/ui/icons";
import { audio } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/cn";
import { useLiveStore } from "@/lib/stores/live-store";
import { useSettingsStore, useUiStore } from "@/lib/stores/settings-store";

// Bedienelemente der Top-Bar ohne Next.js-Abhängigkeiten (auch in der Demo nutzbar).

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-bold uppercase tracking-[0.18em] text-white", className)}>
      Rain<span className="neon-text-toxic">bucks</span>
    </span>
  );
}

function IconButton({
  label,
  onClick,
  active,
  children,
  badge,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        audio.play("click");
        onClick();
      }}
      className={cn(
        "glass relative grid size-10 place-items-center rounded-xl transition hover:border-toxic/40 hover:text-toxic",
        active ? "text-toxic" : "text-zinc-300",
      )}
    >
      {children}
      {badge}
    </button>
  );
}

export function SoundToggle() {
  const muted = useSettingsStore((s) => s.muted);
  const toggleMuted = useSettingsStore((s) => s.toggleMuted);
  return (
    <IconButton label={muted ? "Ton einschalten" : "Ton ausschalten"} onClick={toggleMuted} active={!muted}>
      {muted ? <SoundOffIcon className="size-5" /> : <SoundOnIcon className="size-5" />}
    </IconButton>
  );
}

export function LiveToggle() {
  const online = useLiveStore((s) => s.online);
  const livePanelOpen = useSettingsStore((s) => s.livePanelOpen);
  return (
    <IconButton
      label="Chat und Live-Wetten"
      active={livePanelOpen}
      onClick={() => {
        // Ab 1280px gibt es die feste Seitenleiste, darunter eine Schublade.
        if (window.matchMedia("(min-width: 1280px)").matches) {
          useSettingsStore.getState().setLivePanelOpen(!livePanelOpen);
        } else {
          useUiStore.getState().setMobileLiveOpen(true);
        }
      }}
      badge={
        online > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-toxic px-1 font-mono text-[9px] font-bold leading-4 text-black">
            {online > 999 ? `${(online / 1000).toFixed(1)}k` : online}
          </span>
        )
      }
    >
      <ChatIcon className="size-5" />
    </IconButton>
  );
}
