"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { audio } from "@/lib/audio/audio-engine";
import { formatMultiplier } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { BombIcon, GemIcon } from "./mines-icons";

export type TileFace = "hidden" | "gem" | "mine";

interface MinesTileProps {
  index: number;
  face: TileFace;
  /** Revealed by the player (otherwise only shown dimmed when the round ends) */
  picked: boolean;
  busted: boolean;
  selected: boolean;
  interactive: boolean;
  /** Flip delay in seconds (ripple effect at the end of a round) */
  delay: number;
  /** Multiplier reached with this gem, floats up above the tile */
  reward: number | null;
  onPick: (index: number) => void;
}

// Fixed spark and shard directions, so every reveal looks the same (and renders stay pure)
const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 + 0.3;
  const distance = 36 + (i % 3) * 11;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: i % 2 ? 4 : 6 };
});

const SHARD_COLORS = ["#ffd23f", "#ff8a3d", "#ff2d55"];
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const distance = 48 + (i % 4) * 14;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance + 24,
    rotate: (i % 2 ? 1 : -1) * (140 + i * 18),
    color: SHARD_COLORS[i % SHARD_COLORS.length],
  };
});

/**
 * Tile with a 3D flip: front and back sit on top of each other,
 * the back is rotated by 180° and hidden via backface-visibility.
 */
export const MinesTile = memo(function MinesTile({
  index,
  face,
  picked,
  busted,
  selected,
  interactive,
  delay,
  reward,
  onPick,
}: MinesTileProps) {
  const revealed = face !== "hidden";
  const foundGem = picked && face === "gem";

  return (
    <div className="relative aspect-square [perspective:900px]">
      <motion.button
        type="button"
        aria-label={revealed ? (face === "gem" ? "Gem" : "Mine") : `Tile ${index + 1}`}
        aria-pressed={selected}
        disabled={!interactive}
        onClick={() => onPick(index)}
        onPointerEnter={() => interactive && !revealed && audio.play("hover")}
        initial={false}
        animate={{ rotateY: revealed ? 180 : 0 }}
        whileHover={interactive && !revealed ? { y: -4, scale: 1.05 } : undefined}
        whileTap={interactive && !revealed ? { scale: 0.92 } : undefined}
        transition={{
          rotateY: { type: "spring", stiffness: 260, damping: 22, delay: revealed ? delay : 0 },
          default: { type: "spring", stiffness: 500, damping: 26 },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className={cn(
          "group absolute inset-0 rounded-xl outline-none sm:rounded-2xl",
          interactive && !revealed ? "cursor-pointer" : "cursor-default",
        )}
      >
        {/* Front */}
        <span
          className={cn(
            "absolute inset-0 rounded-[inherit] border bg-gradient-to-b from-white/[0.1] to-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_8px_20px_-12px_rgb(0_0_0/0.9)] [backface-visibility:hidden]",
            selected
              ? "border-toxic/70 shadow-[0_0_0_1px_rgb(57_255_20/0.4),0_0_22px_-4px_rgb(57_255_20/0.6)]"
              : "border-white/[0.08] group-hover:border-toxic/50 group-hover:shadow-[0_0_28px_-4px_rgb(57_255_20/0.55)]",
          )}
        >
          <span className="absolute inset-[18%] rounded-lg bg-black/25 transition group-hover:bg-toxic/[0.08]" />
          {selected && (
            <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-toxic shadow-[0_0_12px_rgb(57_255_20)]" />
          )}
        </span>

        {/* Back */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] border [backface-visibility:hidden] [transform:rotateY(180deg)]",
            face === "mine"
              ? "border-neon-red/50 bg-[radial-gradient(circle_at_50%_45%,rgb(255_45_85/0.35),rgb(40_4_12/0.95)_70%)]"
              : foundGem
                ? "border-toxic/60 bg-[radial-gradient(circle_at_50%_42%,rgb(57_255_20/0.42),rgb(4_22_2/0.95)_72%)] shadow-[inset_0_0_18px_rgb(57_255_20/0.25)]"
                : "border-toxic/40 bg-[radial-gradient(circle_at_50%_45%,rgb(57_255_20/0.22),rgb(4_22_2/0.95)_70%)]",
            !picked && "opacity-35 saturate-50",
            busted && "shadow-[0_0_40px_-4px_rgb(255_45_85/0.9)]",
          )}
        >
          {face === "gem" && (
            <motion.span
              initial={false}
              animate={
                revealed
                  ? foundGem
                    ? { scale: [0.2, 1.3, 0.94, 1], rotate: [-14, 8, -2, 0] }
                    : { scale: [0.3, 1.1, 1], rotate: 0 }
                  : { scale: 0.3 }
              }
              transition={{ duration: foundGem ? 0.6 : 0.45, delay: revealed ? delay + 0.1 : 0, ease: "easeOut" }}
              className="block w-[82%]"
            >
              <GemIcon className="w-full" alive={foundGem} />
            </motion.span>
          )}
          {face === "mine" && (
            <motion.span
              initial={false}
              animate={revealed ? { scale: [0.3, 1.25, 1] } : { scale: 0.3 }}
              transition={{ duration: 0.45, delay: revealed ? delay + 0.1 : 0 }}
              className="block w-[70%]"
            >
              <BombIcon className="w-full" lit={busted} />
            </motion.span>
          )}
          {busted && (
            <motion.span
              className="absolute inset-0 bg-neon-red"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          )}
        </span>
      </motion.button>

      {/* Sparks and the reached multiplier, outside the flipping card so they can fly over neighbours */}
      {foundGem && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {SPARKS.map((spark, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgb(57_255_20/0.9)]"
              style={{ width: spark.size, height: spark.size, marginLeft: -spark.size / 2, marginTop: -spark.size / 2 }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: spark.x, y: spark.y, opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.65, delay: 0.14, ease: [0.2, 0.8, 0.3, 1] }}
            />
          ))}
          {reward !== null && (
            <motion.span
              className="absolute inset-x-0 top-0 mx-auto w-max rounded-md border border-toxic/40 bg-black/80 px-1.5 py-0.5 font-mono text-[11px] font-bold text-toxic shadow-glow-toxic sm:text-xs"
              initial={{ opacity: 0, y: 6, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: [6, -12, -20, -32], scale: [0.6, 1.15, 1, 0.95] }}
              transition={{ duration: 1.15, times: [0, 0.2, 0.7, 1], delay: 0.15 }}
            >
              {formatMultiplier(reward)}
            </motion.span>
          )}
        </span>
      )}

      {busted && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {SHARDS.map((shard, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 -ml-1 -mt-1 size-2 rounded-[2px]"
              style={{ backgroundColor: shard.color, boxShadow: `0 0 10px ${shard.color}` }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: shard.x, y: shard.y, opacity: 0, rotate: shard.rotate }}
              transition={{ duration: 0.85, delay: 0.08, ease: [0.15, 0.7, 0.4, 1] }}
            />
          ))}
        </span>
      )}
    </div>
  );
});
