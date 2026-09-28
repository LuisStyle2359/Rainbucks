"use client";

import { AnimatePresence, motion } from "motion/react";
import { formatMultiplier } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import type { CrashSnapshot } from "@/lib/games/crash/crash-engine";

export function crashTone(crashPoint: number): string {
  if (crashPoint >= 10) return "border-gold/40 bg-gold/10 text-gold";
  if (crashPoint >= 2) return "border-toxic/35 bg-toxic/10 text-toxic";
  return "border-neon-red/35 bg-neon-red/10 text-neon-red";
}

/** Recent crash points. New chips push the old ones along with a layout animation. */
export function CrashHistory({ history }: { history: CrashSnapshot["history"] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none" aria-label="Recent rounds">
      {history.length === 0 && (
        <span className="text-xs uppercase tracking-widest text-zinc-600">No rounds played yet</span>
      )}
      <AnimatePresence initial={false} mode="popLayout">
        {history.slice(0, 18).map((round) => (
          <motion.span
            key={round.roundId}
            layout
            initial={{ opacity: 0, scale: 0.6, x: -16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            title={`Round ${round.roundId} · Nonce ${round.nonce}`}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold tabular",
              crashTone(round.crashPoint),
            )}
          >
            {formatMultiplier(round.crashPoint)}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
