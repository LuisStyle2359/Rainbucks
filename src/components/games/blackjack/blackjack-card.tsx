"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, type Ref, type RefObject } from "react";
import { CardBack, CardFace } from "@/components/casino/ui/card-face";
import { cn } from "@/lib/cn";

export type CardMood = "win" | "lose" | null;

/** Small, fixed lean per card, so a hand looks dealt by hand rather than typeset. */
function restingTilt(card: number, index: number): number {
  return (((card * 7 + index * 3) % 7) - 3) * 0.9;
}

/**
 * A dealt card. It flies out of the shoe, turns face up in the air (or stays
 * face down for the dealer's hole card) and lands with a small lean.
 * The outer element keeps the hand layout smooth as cards are added, the
 * inner one carries the flight, the innermost one the flip.
 */
export function PlayingCard({
  card,
  faceDown = false,
  index = 0,
  origin,
  mood = null,
  ref,
}: {
  /** Forwarded to the outer element (AnimatePresence "popLayout" measures it) */
  ref?: Ref<HTMLDivElement>;
  card: number;
  faceDown?: boolean;
  index?: number;
  /** Where the card comes from (the shoe) */
  origin: RefObject<HTMLElement | null>;
  mood?: CardMood;
}) {
  const flightRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const tilt = restingTilt(card, index);

  // Measure once, before the first paint: the card starts exactly over the shoe.
  useLayoutEffect(() => {
    const element = flightRef.current;
    if (!element) return;
    const from = origin.current?.getBoundingClientRect();
    if (!from || reducedMotion) {
      void animate(element, { opacity: [0, 1], y: [-10, 0], rotate: tilt }, { duration: 0.2 });
      return;
    }
    const to = element.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    element.style.transform = `translate(${dx}px, ${dy}px) rotate(-70deg) scale(0.62)`;
    void animate(
      element,
      { x: [dx, 0], y: [dy, 0], rotate: [-70, tilt], scale: [0.62, 1] },
      { duration: 0.55, ease: [0.18, 0.86, 0.32, 1] },
    );
    // All inputs are fixed for a dealt card, so this runs once per card.
  }, [origin, reducedMotion, tilt]);

  return (
    <motion.div
      ref={ref}
      layout="position"
      exit={{ x: -140, y: -110, rotate: -28, opacity: 0, scale: 0.8, transition: { duration: 0.35, ease: "easeIn" } }}
      transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
      animate={{ opacity: mood === "lose" ? 0.5 : 1 }}
      className={cn("relative aspect-[5/7] w-[3.9rem] shrink-0 sm:w-[5.1rem]", index > 0 && "-ml-8 sm:-ml-10")}
    >
      <div ref={flightRef} className="absolute inset-0 [perspective:800px]">
        <motion.div
          className={cn(
            "absolute inset-0 [transform-style:preserve-3d]",
            mood === "win" && "drop-shadow-[0_0_14px_rgb(57_255_20/0.65)]",
          )}
          initial={{ rotateY: 180 }}
          animate={{ rotateY: faceDown ? 180 : 0, y: mood === "win" ? -6 : 0 }}
          transition={{
            rotateY: { type: "spring", stiffness: 170, damping: 19, delay: faceDown ? 0 : 0.12 },
            y: { type: "spring", stiffness: 300, damping: 18, delay: index * 0.05 },
          }}
        >
          <CardFace card={card} />
          <CardBack className="[transform:rotateY(180deg)]" />
        </motion.div>
      </div>
    </motion.div>
  );
}

/** The shoe the cards come out of: a deck of backs with real thickness. */
export function CardShoe({ shoeRef }: { shoeRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="pointer-events-none relative h-16 w-12 [perspective:500px] sm:h-20 sm:w-14" aria-hidden>
      <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(52deg)_rotateZ(-24deg)]">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `translateZ(${i * 1.6}px)` }}>
            <CardBack className={i < 8 ? "brightness-[0.55]" : undefined} />
          </div>
        ))}
        <div ref={shoeRef} className="absolute inset-0" style={{ transform: "translateZ(15px)" }} />
      </div>
    </div>
  );
}
