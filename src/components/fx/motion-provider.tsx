"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Respect the visitor's "reduce motion" setting in every motion component below. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
