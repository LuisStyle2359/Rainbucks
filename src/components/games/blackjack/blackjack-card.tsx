"use client";

import { motion } from "motion/react";
import { cardRank, cardSuit } from "@/lib/games/blackjack/blackjack-game";
import { cn } from "@/lib/cn";

const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUIT_GLYPHS = ["♠", "♥", "♦", "♣"];

/** A single playing card. `hidden` shows the neon back (the dealer hole card). */
export function PlayingCard({
  card,
  hidden = false,
  index = 0,
}: {
  card: number;
  hidden?: boolean;
  index?: number;
}) {
  const rank = RANK_LABELS[cardRank(card)];
  const suit = SUIT_GLYPHS[cardSuit(card)];
  const red = cardSuit(card) === 1 || cardSuit(card) === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -28, rotateZ: -8, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, rotateZ: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 26, delay: index * 0.08 }}
      className="relative aspect-[5/7] w-14 shrink-0 [perspective:700px] sm:w-[4.5rem]"
    >
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        {/* Face */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-between rounded-lg border border-black/10 bg-gradient-to-b from-white to-zinc-200 p-1.5 shadow-[0_6px_16px_-6px_rgb(0_0_0/0.8)] [backface-visibility:hidden]",
            red ? "text-neon-red" : "text-zinc-900",
          )}
        >
          <span className="font-display text-sm font-bold leading-none sm:text-base">{rank}</span>
          <span className="text-center text-xl leading-none sm:text-2xl">{suit}</span>
          <span className="rotate-180 self-end font-display text-sm font-bold leading-none sm:text-base">{rank}</span>
        </div>
        {/* Back */}
        <div className="absolute inset-0 grid place-items-center overflow-hidden rounded-lg border border-toxic/30 bg-[repeating-linear-gradient(45deg,rgb(57_255_20/0.12)_0_6px,rgb(6_7_9/0.9)_6px_12px)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="grid size-7 place-items-center rounded-md bg-black/60 font-display text-xs font-bold text-toxic ring-1 ring-toxic/40">
            R
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
