"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll reveal: the block swings up out of the page in 3D the first time it
 * scrolls into view. With "reduce motion" only the fade remains.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  depth = 1,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Strength of the swing (0 = fade and rise only) */
  depth?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36, rotateX: -16 * depth, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", stiffness: 110, damping: 19, mass: 0.9, delay }}
      style={{ transformPerspective: 1100, transformOrigin: "50% 100%" }}
    >
      {children}
    </motion.div>
  );
}
