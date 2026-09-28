"use client";

import { animate, motion, useMotionValue, useTransform, useVelocity } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Höhe einer Ziffern-Zelle in em. Etwas über 1em, damit nichts abgeschnitten wird. */
const CELL = 1.12;
const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

interface OdometerProps {
  /** Fertig formatierter Wert, z. B. "1.234,56" */
  text: string;
  /** Neue ID = neue Rollanimation */
  rollId: number;
  durationMs: number;
  className?: string;
}

/**
 * Zahlen, die wie Walzen einer Slot-Maschine vertikal rollen.
 * Jede Ziffer ist ein Streifen 0–9, verschoben per translateY.
 * Die Walzen stoppen von links nach rechts, rechts drehen sie am meisten.
 */
export function Odometer({ text, rollId, durationMs, className }: OdometerProps) {
  const chars = [...text];
  const digitCount = chars.filter((c) => /\d/.test(c)).length;
  let digitIndex = 0;

  return (
    <span className={cn("inline-flex items-start font-mono tabular leading-none", className)} aria-label={text}>
      {chars.map((char, i) => {
        const fromRight = chars.length - 1 - i;
        if (!/\d/.test(char)) {
          return (
            <span key={`s${fromRight}`} className="block" style={{ height: `${CELL}em`, lineHeight: `${CELL}em` }}>
              {char}
            </span>
          );
        }
        const index = digitIndex++;
        const share = (index + 1) / digitCount;
        return (
          <DigitColumn
            key={`d${fromRight}`}
            digit={Number(char)}
            rollId={rollId}
            spins={1 + Math.round(share * 3)}
            durationMs={durationMs * (0.55 + 0.45 * share)}
          />
        );
      })}
    </span>
  );
}

function DigitColumn({
  digit,
  rollId,
  spins,
  durationMs,
}: {
  digit: number;
  rollId: number;
  spins: number;
  durationMs: number;
}) {
  // Position in "Ziffern": 0 = "0", 7 = "7", 13 = "3" nach einer vollen Umdrehung
  const position = useMotionValue(digit);
  const y = useTransform(position, (value) => `${-(((value % 10) + 10) % 10) * CELL}em`);
  // Bewegungsunschärfe proportional zur Drehgeschwindigkeit
  const velocity = useVelocity(position);
  const filter = useTransform(velocity, (v) => `blur(${Math.min(Math.abs(v) * 0.018, 3.2).toFixed(2)}px)`);
  const lastRoll = useRef(rollId);

  useEffect(() => {
    if (lastRoll.current === rollId) return;
    lastRoll.current = rollId;
    const from = Math.round(position.get());
    const target = from + spins * 10 + ((digit - (from % 10) + 10) % 10);
    const controls = animate(position, target, {
      duration: durationMs / 1000,
      ease: [0.12, 0.8, 0.22, 1],
      onComplete: () => position.jump(digit),
    });
    return () => controls.stop();
  }, [rollId, digit, spins, durationMs, position]);

  return (
    <span className="relative block overflow-hidden" style={{ height: `${CELL}em` }}>
      <motion.span className="flex flex-col will-change-transform" style={{ y, filter }}>
        {STRIP.map((value, i) => (
          <span key={i} className="block text-center" style={{ height: `${CELL}em`, lineHeight: `${CELL}em` }}>
            {value}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
