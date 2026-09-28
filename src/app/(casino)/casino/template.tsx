"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Weicher Seitenwechsel zwischen Lobby und Spielen.
 * Bewusst nur Opacity: Ein transform würde für die Dauer der Animation den
 * Bezugsrahmen der fixierten Handy-Wettleiste ändern und sie springen lassen.
 */
export default function CasinoTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
