"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * The auth card rises out of the floor grid. It ends without any transform,
 * so the form text renders crisp (needs a parent with perspective).
 */
export function AuthCardFrame({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="relative w-full max-w-md"
      initial={{ opacity: 0, rotateX: 32, y: 48, scale: 0.94 }}
      animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 110, damping: 17 }}
      style={{ transformOrigin: "50% 100%" }}
    >
      {children}
    </motion.div>
  );
}
