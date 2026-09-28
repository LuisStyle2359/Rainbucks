"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { audio } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/cn";
import { ACCOUNT_ITEMS, GAME_ITEMS, isActive, LOBBY_ITEM, type NavItem } from "./nav-items";

/** Desktop navigation. The active marker glides from item to item via layoutId. */
export function SideNav() {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => audio.play("click")}
        onPointerEnter={() => audio.play("hover")}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "text-white" : "text-zinc-400 hover:text-white",
        )}
      >
        {active && (
          <motion.span
            layoutId="side-nav-active"
            className="absolute inset-0 rounded-xl border border-toxic/30 bg-toxic/[0.08] shadow-[inset_3px_0_0_var(--color-toxic),0_0_24px_-10px_rgb(57_255_20/0.8)]"
            transition={{ type: "spring", stiffness: 480, damping: 38 }}
          />
        )}
        <Icon
          className={cn(
            "relative size-[18px] transition",
            active ? "text-toxic drop-shadow-[0_0_6px_rgb(57_255_20/0.8)]" : "group-hover:text-toxic",
          )}
        />
        <span className="relative">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Casino"
      className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/[0.06] px-3 py-5 lg:flex"
    >
      <div className="space-y-1">{renderItem(LOBBY_ITEM)}</div>
      <div>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-600">Games</p>
        <div className="space-y-1">{GAME_ITEMS.map(renderItem)}</div>
      </div>
      <div>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-600">Account</p>
        <div className="space-y-1">{ACCOUNT_ITEMS.map(renderItem)}</div>
      </div>
      <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-relaxed text-zinc-500">
        <p className="mb-1 font-semibold text-zinc-300">Play money only</p>
        Portfolio demo with virtual Rainbucks (RBX). No deposits, no withdrawals, no real money.
      </div>
    </nav>
  );
}
