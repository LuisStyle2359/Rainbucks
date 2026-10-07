"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { CardBack, CardFace } from "@/components/casino/ui/card-face";
import { cn } from "@/lib/cn";
import { Chip3D, Coin3D } from "./coin-3d";

interface SceneObject {
  key: string;
  /** Position in % of the scene box */
  left: string;
  top: string;
  /** Depth in px (towards the viewer is positive) */
  z: number;
  /** Seconds the float loop is offset by, so objects drift out of step */
  delay: number;
  className?: string;
  content: ReactNode;
}

function Card({ card, turning = false, tilt }: { card: number; turning?: boolean; tilt: number }) {
  return (
    <div className="relative aspect-[5/7] w-full [transform-style:preserve-3d]" style={{ transform: `rotateZ(${tilt}deg)` }}>
      <div className={cn("absolute inset-0 [transform-style:preserve-3d]", turning && "animate-card-turn")}>
        <CardFace card={card} />
        <CardBack className="[transform:rotateY(180deg)]" />
      </div>
    </div>
  );
}

const Ball = () => (
  <div className="aspect-square w-full rounded-full bg-[radial-gradient(circle_at_34%_30%,#ffffff,#e5e7eb_38%,#9ca3af_72%,#374151)] shadow-[0_0_24px_rgb(255_255_255/0.35)]" />
);

// card ids: suit * 13 + rank (rank 0 = ace, 12 = king)
const HERO: SceneObject[] = [
  { key: "coin", left: "78%", top: "8%", z: 120, delay: 0, className: "w-14 sm:w-36", content: <Coin3D className="aspect-square w-full" thickness={12} /> },
  { key: "ace", left: "6%", top: "14%", z: 70, delay: -2, className: "hidden w-20 sm:block sm:w-28", content: <Card card={0} tilt={-16} /> },
  { key: "king", left: "13%", top: "56%", z: -30, delay: -4, className: "hidden w-20 sm:block sm:w-24", content: <Card card={25} tilt={12} turning /> },
  { key: "gold", left: "84%", top: "60%", z: 60, delay: -1, className: "hidden w-14 sm:block sm:w-20", content: <Chip3D amount={1_000_00} className="aspect-square w-full" /> },
  { key: "pink", left: "24%", top: "80%", z: 110, delay: -3, className: "hidden w-12 sm:block sm:w-16", content: <Chip3D amount={250_00} className="aspect-square w-full" /> },
  { key: "cyan", left: "66%", top: "82%", z: 10, delay: -5, className: "hidden w-10 md:block md:w-14", content: <Chip3D amount={5_00} className="aspect-square w-full" /> },
  { key: "ball", left: "60%", top: "6%", z: 160, delay: -2.5, className: "hidden w-5 md:block md:w-7", content: <Ball /> },
];

/** Fits around a left-aligned headline: corners and the gap beside the title. */
const COMPACT: SceneObject[] = [
  { key: "coin", left: "71%", top: "5%", z: 90, delay: 0, className: "w-20 lg:w-24", content: <Coin3D className="aspect-square w-full" thickness={12} /> },
  { key: "pink", left: "60%", top: "6%", z: 50, delay: -3, className: "w-9", content: <Chip3D amount={250_00} className="aspect-square w-full" /> },
  { key: "ace", left: "66%", top: "31%", z: 40, delay: -2, className: "w-16 lg:w-[4.5rem]", content: <Card card={0} tilt={-14} /> },
  { key: "king", left: "83%", top: "37%", z: 0, delay: -4, className: "w-14 lg:w-16", content: <Card card={25} tilt={10} turning /> },
  { key: "gold", left: "84%", top: "80%", z: 70, delay: -1, className: "w-11", content: <Chip3D amount={1_000_00} className="aspect-square w-full" /> },
];

/**
 * Casino objects floating in 3D: a spinning coin, cards that turn over, chips
 * with thick rims. The whole scene leans towards the mouse and drifts with
 * the scroll position. Decorative only.
 */
export function FloatingScene({ variant = "hero", className }: { variant?: "hero" | "compact"; className?: string }) {
  const reducedMotion = useReducedMotion() ?? false;
  const pointerX = useSpring(0, { stiffness: 50, damping: 16 });
  const pointerY = useSpring(0, { stiffness: 50, damping: 16 });
  const rotateY = useTransform(pointerX, (v) => v * 20);
  const rotateX = useTransform(pointerY, (v) => v * -14);
  const { scrollY } = useScroll();
  const drift = useTransform(scrollY, (v) => (reducedMotion ? 0 : v * -0.18));

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion, pointerX, pointerY]);

  const objects = variant === "hero" ? HERO : COMPACT;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 [perspective:1100px]", className)}>
      <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ rotateX, rotateY, y: drift }}>
        {objects.map((object, i) => (
          <motion.div
            key={object.key}
            className={cn("absolute [transform-style:preserve-3d]", object.className)}
            style={{ left: object.left, top: object.top, z: object.z }}
            initial={{ opacity: 0, scale: 0.4, rotateX: 60 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 14, delay: 0.25 + i * 0.09 }}
          >
            <div className="animate-hover-3d [transform-style:preserve-3d]" style={{ animationDelay: `${object.delay}s` }}>
              {object.content}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
