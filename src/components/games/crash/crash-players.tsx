"use client";

import { AnimatePresence, motion } from "motion/react";
import { Coin } from "@/components/casino/ui/coin";
import { calculatePayout, formatAmount, formatCompactAmount, formatMultiplier } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import type { CrashPlayer, CrashSnapshot } from "@/lib/games/crash/crash-engine";

const byRelevance = (a: CrashPlayer, b: CrashPlayer) =>
  Number(b.isYou) - Number(a.isYou) || b.amount - a.amount;

/** Live list of the players in the current round (simulated). */
export function CrashPlayers({ snapshot }: { snapshot: CrashSnapshot }) {
  const players = [...snapshot.players].sort(byRelevance);
  const total = players.reduce((sum, p) => sum + p.amount, 0);
  const crashed = snapshot.phase === "crashed";

  return (
    <section className="glass glass-edge rounded-2xl p-4">
      <header className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-zinc-500">
        <span>
          Players <span className="text-zinc-200">{players.length}</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono normal-case tracking-normal text-zinc-300">
          <Coin className="size-3.5" />
          {formatCompactAmount(total)}
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 px-2 pb-2 text-[11px] uppercase tracking-widest text-zinc-600">
        <span>Name</span>
        <span className="text-right">Bet</span>
        <span className="w-20 text-right">Cashout</span>
      </div>

      <ul className="max-h-72 space-y-1 overflow-y-auto scrollbar-none">
        <AnimatePresence initial={false}>
          {players.map((player) => {
            const cashed = player.cashedOutAt !== null;
            const lost = crashed && !cashed;
            return (
              <motion.li
                key={player.id}
                layout="position"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 rounded-lg px-2 py-1.5 text-sm",
                  player.isYou && "bg-toxic/[0.06] ring-1 ring-toxic/25",
                  cashed && !player.isYou && "bg-toxic/[0.04]",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: player.user.color, boxShadow: `0 0 8px ${player.user.color}` }}
                  />
                  <span className={cn("truncate", player.isYou ? "font-semibold text-white" : "text-zinc-300")}>
                    {player.isYou ? `${player.user.name} (you)` : player.user.name}
                  </span>
                </span>
                <span className="font-mono text-xs text-zinc-400 tabular">{formatAmount(player.amount)}</span>
                <span
                  className={cn(
                    "w-20 text-right font-mono text-xs font-semibold tabular",
                    cashed ? "text-toxic" : lost ? "text-neon-red" : "text-zinc-600",
                  )}
                >
                  {cashed ? (
                    <span title={`+${formatAmount(calculatePayout(player.amount, player.cashedOutAt ?? 0))}`}>
                      {formatMultiplier(player.cashedOutAt ?? 0)}
                    </span>
                  ) : lost ? (
                    "✕"
                  ) : (
                    "–"
                  )}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
