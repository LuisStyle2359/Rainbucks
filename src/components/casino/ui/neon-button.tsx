"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { audio } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/cn";

export type NeonVariant = "bet" | "cashout" | "stop" | "ghost";

const VARIANTS: Record<NeonVariant, string> = {
  bet: "bg-toxic text-black shadow-glow-toxic hover:bg-[#5bff3d] enabled:animate-glow-breathe",
  cashout:
    "bg-gold text-black shadow-[0_0_0_1px_rgb(255_210_63/0.5),0_0_28px_-4px_rgb(255_210_63/0.6)] hover:bg-[#ffdd66] enabled:animate-glow-breathe-gold",
  stop: "bg-neon-red text-white shadow-glow-red hover:bg-[#ff4d6d]",
  ghost: "glass text-zinc-100 hover:bg-white/[0.07]",
};

/** Variants that get the glossy light sweep */
const SHINE: Record<NeonVariant, boolean> = { bet: true, cashout: true, stop: false, ghost: false };

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: NeonVariant;
  children: ReactNode;
  /** Play the click sound (default: yes) */
  sound?: boolean;
}

export function NeonButton({
  variant = "bet",
  className,
  children,
  sound = true,
  onPointerDown,
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      disabled={disabled}
      onPointerDown={(event) => {
        if (sound && !disabled) audio.play("click");
        onPointerDown?.(event);
      }}
      className={cn(
        "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-xl px-4 font-display font-semibold uppercase tracking-wider transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
      {SHINE[variant] && !disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sweep bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.75),transparent)] mix-blend-overlay"
        />
      )}
    </motion.button>
  );
}
