"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logout } from "@/app/auth/actions";
import { ChatIcon, LogoutIcon, ShieldIcon, SoundOffIcon, SoundOnIcon, UserIcon } from "@/components/casino/ui/icons";
import { audio } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/cn";
import { useLiveStore } from "@/lib/stores/live-store";
import { useSettingsStore, useUiStore } from "@/lib/stores/settings-store";
import { Balance } from "./balance";
import { ALL_ITEMS, isActive } from "./nav-items";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-bold uppercase tracking-[0.18em] text-white", className)}>
      Rain<span className="neon-text-toxic">bucks</span>
    </span>
  );
}

export function TopBar({ name, ready }: { name: string; ready: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-3 sm:px-5">
        <Link href="/casino" className="flex items-center gap-2.5" onClick={() => audio.play("click")}>
          <span className="grid size-8 place-items-center rounded-lg bg-toxic/10 ring-1 ring-toxic/40 shadow-[0_0_20px_-4px_rgb(57_255_20/0.7)]">
            <span className="font-display text-sm font-bold text-toxic">R</span>
          </span>
          <Logo className="hidden sm:inline" />
        </Link>
        <span className="hidden rounded-md border border-toxic/30 bg-toxic/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-toxic md:inline">
          Demo · Spielgeld
        </span>

        <div className="ml-auto flex items-center gap-2">
          {ready ? <Balance /> : <div className="glass h-10 w-32 animate-pulse rounded-xl" />}
          <SoundToggle />
          <LiveToggle />
          <UserMenu name={name} />
        </div>
      </div>
      <MobileNav />
    </header>
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

function SoundToggle() {
  const muted = useSettingsStore((s) => s.muted);
  const toggleMuted = useSettingsStore((s) => s.toggleMuted);
  return (
    <IconButton label={muted ? "Ton einschalten" : "Ton ausschalten"} onClick={toggleMuted} active={!muted}>
      {muted ? <SoundOffIcon className="size-5" /> : <SoundOnIcon className="size-5" />}
    </IconButton>
  );
}

function LiveToggle() {
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

function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          audio.play("click");
          setOpen((value) => !value);
        }}
        className="glass flex h-10 items-center gap-2 rounded-xl pl-1.5 pr-1.5 transition hover:border-toxic/40 sm:pr-3"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-toxic to-cyan font-display text-sm font-bold text-black">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-28 truncate text-sm text-zinc-200 sm:inline">{name}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass-strong absolute right-0 top-12 w-56 origin-top-right overflow-hidden rounded-xl p-1.5 shadow-glow-soft"
          >
            <p className="px-3 py-2 text-xs text-zinc-500">
              Eingeloggt als <span className="text-zinc-200">{name}</span>
            </p>
            <MenuLink href="/dashboard" onNavigate={() => setOpen(false)}>
              <UserIcon className="size-4" /> Dashboard
            </MenuLink>
            <MenuLink href="/casino/fairness" onNavigate={() => setOpen(false)}>
              <ShieldIcon className="size-4" /> Provably Fair
            </MenuLink>
            <form action={logout}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-neon-red-300 transition hover:bg-neon-red/10"
              >
                <LogoutIcon className="size-4" /> Ausloggen
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </Link>
  );
}

/** Horizontale Navigation für Handy und Tablet. */
function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 pb-2.5 lg:hidden" aria-label="Spiele">
      {ALL_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => audio.play("click")}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "text-black" : "text-zinc-400",
            )}
          >
            {active && (
              <motion.span
                layoutId="mobile-nav-active"
                className="absolute inset-0 rounded-lg bg-toxic shadow-[0_0_16px_-2px_rgb(57_255_20/0.7)]"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
