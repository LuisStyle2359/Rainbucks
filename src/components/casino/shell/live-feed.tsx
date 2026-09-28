"use client";

import { AnimatePresence, motion } from "motion/react";
import { GAME_ICONS } from "@/components/casino/ui/icons";
import { GAMES } from "@/lib/casino/games";
import { formatCompactAmount, formatMultiplier } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import type { LiveBet } from "@/lib/realtime/types";
import { useLiveStore } from "@/lib/stores/live-store";

/** Echtzeit-Feed der Einsätze aller (simulierten) Spieler. */
export function LiveFeed({ limit = 30, compact = false }: { limit?: number; compact?: boolean }) {
  const feed = useLiveStore((s) => s.feed);
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto scrollbar-none", compact ? "" : "px-2 py-2")}>
      <ul className="space-y-1">
        <AnimatePresence initial={false}>
          {feed.slice(0, limit).map((bet) => (
            <LiveBetRow key={bet.id} bet={bet} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function LiveBetRow({ bet }: { bet: LiveBet }) {
  const Icon = GAME_ICONS[bet.game];
  const profit = bet.payout - bet.amount;
  const win = profit > 0;
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs",
          bet.user.isYou ? "bg-toxic/[0.07] ring-1 ring-toxic/20" : "hover:bg-white/[0.03]",
        )}
      >
        <Icon className="size-4 text-zinc-500" aria-label={GAMES[bet.game].name} />
        <span className="truncate" style={{ color: bet.user.isYou ? undefined : bet.user.color }}>
          {bet.user.isYou ? <span className="font-semibold text-white">Du</span> : bet.user.name}
        </span>
        <span className={cn("font-mono tabular", win ? "text-zinc-200" : "text-zinc-500")}>
          {bet.multiplier > 0 ? formatMultiplier(bet.multiplier) : "0,00×"}
        </span>
        <span className={cn("w-16 text-right font-mono font-semibold tabular", win ? "text-toxic" : "text-neon-red/80")}>
          {win ? "+" : "−"}
          {formatCompactAmount(Math.abs(profit))}
        </span>
      </div>
    </motion.li>
  );
}
