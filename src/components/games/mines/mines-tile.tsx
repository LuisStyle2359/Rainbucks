"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { audio } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/cn";
import { BombIcon, GemIcon } from "./mines-icons";

export type TileFace = "hidden" | "gem" | "mine";

interface MinesTileProps {
  index: number;
  face: TileFace;
  /** Vom Spieler aufgedeckt (sonst nur zur Auflösung gezeigt, gedimmt) */
  picked: boolean;
  busted: boolean;
  selected: boolean;
  interactive: boolean;
  /** Verzögerung der Flip-Animation in Sekunden (Wellen-Effekt am Rundenende) */
  delay: number;
  onPick: (index: number) => void;
}

/**
 * Kachel mit 3D-Flip: Vorder- und Rückseite liegen übereinander,
 * die Rückseite ist um 180° gedreht und per backface-visibility versteckt.
 */
export const MinesTile = memo(function MinesTile({
  index,
  face,
  picked,
  busted,
  selected,
  interactive,
  delay,
  onPick,
}: MinesTileProps) {
  const revealed = face !== "hidden";

  return (
    <div className="relative aspect-square [perspective:900px]">
      <motion.button
        type="button"
        aria-label={revealed ? (face === "gem" ? "Diamant" : "Mine") : `Feld ${index + 1}`}
        aria-pressed={selected}
        disabled={!interactive}
        onClick={() => onPick(index)}
        onPointerEnter={() => interactive && !revealed && audio.play("hover")}
        initial={false}
        animate={{ rotateY: revealed ? 180 : 0 }}
        whileHover={interactive && !revealed ? { y: -3, scale: 1.035 } : undefined}
        whileTap={interactive && !revealed ? { scale: 0.94 } : undefined}
        transition={{
          rotateY: { type: "spring", stiffness: 260, damping: 24, delay: revealed ? delay : 0 },
          default: { type: "spring", stiffness: 500, damping: 28 },
        }}
        style={{ transformStyle: "preserve-3d" }}
        className={cn(
          "group absolute inset-0 rounded-xl outline-none sm:rounded-2xl",
          interactive && !revealed ? "cursor-pointer" : "cursor-default",
        )}
      >
        {/* Vorderseite */}
        <span
          className={cn(
            "absolute inset-0 rounded-[inherit] border bg-gradient-to-b from-white/[0.09] to-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_8px_20px_-12px_rgb(0_0_0/0.9)] [backface-visibility:hidden]",
            selected
              ? "border-toxic/70 shadow-[0_0_0_1px_rgb(57_255_20/0.4),0_0_22px_-4px_rgb(57_255_20/0.6)]"
              : "border-white/[0.08] group-hover:border-toxic/40 group-hover:shadow-[0_0_24px_-6px_rgb(57_255_20/0.45)]",
          )}
        >
          <span className="absolute inset-[18%] rounded-lg bg-black/25 transition group-hover:bg-toxic/[0.06]" />
          {selected && (
            <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-toxic shadow-[0_0_12px_rgb(57_255_20)]" />
          )}
        </span>

        {/* Rückseite */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] border [backface-visibility:hidden] [transform:rotateY(180deg)]",
            face === "mine"
              ? "border-neon-red/50 bg-[radial-gradient(circle_at_50%_45%,rgb(255_45_85/0.35),rgb(40_4_12/0.95)_70%)]"
              : "border-toxic/40 bg-[radial-gradient(circle_at_50%_45%,rgb(57_255_20/0.22),rgb(4_22_2/0.95)_70%)]",
            !picked && "opacity-35 saturate-50",
            busted && "shadow-[0_0_40px_-4px_rgb(255_45_85/0.9)]",
          )}
        >
          {face === "gem" && (
            <motion.span
              initial={false}
              animate={revealed ? { scale: [0.3, 1.18, 1], rotate: [-12, 6, 0] } : { scale: 0.3 }}
              transition={{ duration: 0.5, delay: revealed ? delay + 0.12 : 0, ease: "easeOut" }}
              className="block w-[64%]"
            >
              <GemIcon className="w-full" />
            </motion.span>
          )}
          {face === "mine" && (
            <motion.span
              initial={false}
              animate={revealed ? { scale: [0.3, 1.25, 1] } : { scale: 0.3 }}
              transition={{ duration: 0.45, delay: revealed ? delay + 0.1 : 0 }}
              className="block w-[66%]"
            >
              <BombIcon className="w-full" />
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
    </div>
  );
});
