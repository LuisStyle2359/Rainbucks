"use client";

import { motion } from "motion/react";
import { GAME_ICONS } from "@/components/casino/ui/icons";
import { GAMES, type GameId } from "@/lib/casino/games";

/** Game title. The icon tile spins in like a coin, the text slides out from behind it. */
export function GameHeader({ game }: { game: GameId }) {
  const info = GAMES[game];
  const Icon = GAME_ICONS[game];
  return (
    <div className="mb-4 flex items-center gap-3 [perspective:600px]">
      <motion.span
        initial={{ rotateY: -200, scale: 0.6, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        whileHover={{ rotateY: 360, transition: { type: "spring", stiffness: 200, damping: 14 } }}
        transition={{ type: "spring", stiffness: 160, damping: 15 }}
        className="grid size-10 place-items-center rounded-xl bg-toxic/10 text-toxic shadow-[0_0_24px_-6px_rgb(57_255_20/0.7)] ring-1 ring-toxic/30 [transform-style:preserve-3d]"
      >
        <Icon className="size-5" />
      </motion.span>
      <motion.div
        initial={{ opacity: 0, x: -14, rotateY: 30 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.08 }}
        style={{ transformOrigin: "0% 50%" }}
      >
        <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">{info.name}</h1>
        <p className="text-sm text-zinc-500">{info.tagline}</p>
      </motion.div>
    </div>
  );
}
