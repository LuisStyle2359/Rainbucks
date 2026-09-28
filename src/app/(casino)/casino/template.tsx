"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Soft page transition between the lobby and the games.
 * Opacity only on purpose: a transform would change the containing block of
 * the fixed mobile bet bar for the duration of the animation and make it jump.
 */
export default function CasinoTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
