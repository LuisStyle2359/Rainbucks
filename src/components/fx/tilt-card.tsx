"use client";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Card that tilts towards the mouse in 3D, with a glare that follows the pointer.
 * Touch and pen input leave it flat, so scrolling on phones never wobbles it.
 * Carries its own perspective, so it works under any parent.
 */
export function TiltCard({
  children,
  className,
  max = 14,
  lift = 6,
  radius = "rounded-2xl",
}: {
  children: ReactNode;
  className?: string;
  /** Strongest tilt in degrees */
  max?: number;
  /** Pixels the card rises on hover */
  lift?: number;
  /** Corner radius of the glare, matching the card */
  radius?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const rotateX = useSpring(0, { stiffness: 260, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 22 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.14), transparent 55%)`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateY.set((x - 0.5) * max);
    rotateX.set((0.5 - y) * max * 0.85);
    glareX.set(x * 100);
    glareY.set(y * 100);
  };
  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      whileHover={{ y: -lift }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      className={cn("group relative min-w-0 [transform-style:preserve-3d]", className)}
    >
      {children}
      <motion.div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100", radius)}
        style={{ background: glare }}
      />
    </motion.div>
  );
}
