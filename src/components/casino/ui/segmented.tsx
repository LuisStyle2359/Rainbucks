"use client";

import { motion } from "motion/react";
import { audio } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/cn";

interface SegmentedProps<T extends string | number> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Unique id for the shared layout animation of the active background. */
  layoutId: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Toggle whose active marker glides via a shared layout animation. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  layoutId,
  disabled,
  size = "md",
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "flex rounded-xl border border-white/[0.06] bg-black/40 p-1",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => {
              if (active) return;
              audio.play("click", { pitch: 1.2 });
              onChange(option.value);
            }}
            className={cn(
              "relative flex-1 rounded-lg font-medium transition-colors",
              size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
              active ? "text-black" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-toxic shadow-[0_0_18px_-2px_rgb(57_255_20/0.6)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
