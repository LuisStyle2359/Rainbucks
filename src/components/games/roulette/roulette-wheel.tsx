"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, type RefObject } from "react";
import { audio } from "@/lib/audio/audio-engine";
import { rouletteColor, type RouletteColor } from "@/lib/games/roulette/roulette-math";
import { POCKET_ANGLE, WHEEL_ORDER } from "@/lib/games/roulette/wheel-motion";
import { WHEEL_PERSPECTIVE, WHEEL_TILT, WheelRenderer } from "@/lib/games/roulette/wheel-renderer";

export const COLOR_FILL: Record<RouletteColor, string> = { red: "#d61a3c", black: "#15171b", green: "#0b8a3a" };
const POCKET_FILL: Record<RouletteColor, string> = { red: "#8c0f27", black: "#0a0b0e", green: "#05602a" };

const C = 200;

function point(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)];
}

/** Ring segment of pocket i between two radii. */
function segment(i: number, inner: number, outer: number): string {
  const a0 = i * POCKET_ANGLE - POCKET_ANGLE / 2;
  const a1 = i * POCKET_ANGLE + POCKET_ANGLE / 2;
  const [x1, y1] = point(a0, outer);
  const [x2, y2] = point(a1, outer);
  const [x3, y3] = point(a1, inner);
  const [x4, y4] = point(a0, inner);
  const f = (n: number) => n.toFixed(2);
  return `M${f(x1)} ${f(y1)}A${outer} ${outer} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${inner} ${inner} 0 0 0 ${f(x4)} ${f(y4)}Z`;
}

/**
 * A European wheel in 3D: a tilted plane with a wooden bowl and real
 * thickness, a turning rotor and a ball that is thrown, bounces over the
 * frets and drops into its pocket. The motion runs in WheelRenderer.
 */
export function RouletteWheel({
  rendererRef,
  result,
}: {
  rendererRef: RefObject<WheelRenderer | null>;
  /** Number shown on the turret once the ball rests (null = nothing) */
  result: number | null;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const rotorRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const [frame, rotor, ball, shadow] = [frameRef.current, rotorRef.current, ballRef.current, shadowRef.current];
    if (!frame || !rotor || !ball || !shadow) return;
    const renderer = new WheelRenderer(
      { frame, rotor, ball, shadow },
      {
        reducedMotion,
        onTick: (kind) =>
          kind === "fret"
            ? audio.play("wheelTick", { pitch: 0.9 + Math.random() * 0.25 })
            : audio.play("tick", { pitch: 0.55, volume: 0.45 }),
      },
    );
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [reducedMotion, rendererRef]);

  return (
    <div className="relative mx-auto -my-[4%] w-full max-w-[23rem]">
      <div ref={frameRef} className="relative aspect-square w-full" style={{ perspective: `${WHEEL_PERSPECTIVE}px` }}>
        {/* Contact shadow on the table */}
        <div className="absolute inset-x-[4%] bottom-[3%] h-[34%] rounded-[50%] bg-black/80 blur-2xl" />

        <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `rotateX(${WHEEL_TILT}deg)` }}>
          {/* Side wall: stacked rims below the bowl give the wheel its thickness */}
          {[18, 14, 10, 6, 3].map((depth) => (
            <div
              key={depth}
              className="absolute inset-0 rounded-full border border-gold/25 bg-[linear-gradient(90deg,#1a0e04,#5a3812_50%,#1a0e04)]"
              style={{ transform: `translateZ(-${depth}px)` }}
            />
          ))}
          <div className="absolute inset-0 rounded-full shadow-[0_0_70px_-10px_rgb(57_255_20/0.35)]" style={{ transform: "translateZ(-18px)" }} />
          <Bowl />
          <div ref={rotorRef} className="absolute inset-0 will-change-transform">
            <Rotor />
          </div>
          <Lighting />
        </div>

        {/* The ball lives outside the tilted plane and is projected onto it */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div ref={shadowRef} className="absolute left-1/2 top-1/2 size-[3.6%] rounded-full bg-black blur-[2px] will-change-transform" />
          <div
            ref={ballRef}
            className="absolute left-1/2 top-1/2 size-[3.3%] rounded-full bg-[radial-gradient(circle_at_34%_30%,#ffffff,#eef0f3_35%,#a9aeb8_72%,#4b5563)] shadow-[0_0_8px_rgb(255_255_255/0.55)] will-change-transform"
          />
        </div>

        {/* Result on the turret */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center [perspective:600px]">
          <AnimatePresence>
            {result !== null && (
              <motion.div
                key={result}
                initial={{ rotateY: -180, scale: 0.4, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                exit={{ rotateY: 90, scale: 0.6, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 240, damping: 16 }}
                className="grid aspect-square w-[21%] place-items-center rounded-full border-[3px] border-gold font-mono text-[clamp(1.3rem,5.5vw,2rem)] font-black text-white shadow-[0_0_0_4px_rgb(0_0_0/0.5),0_0_36px_rgb(255_210_63/0.6)]"
                style={{ backgroundColor: COLOR_FILL[rouletteColor(result)] }}
              >
                {result}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Bowl() {
  const id = useId();
  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-wood`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.8" stopColor="#4a2e12" />
          <stop offset="0.9" stopColor="#2c1909" />
          <stop offset="1" stopColor="#120a03" />
        </radialGradient>
        <radialGradient id={`${id}-track`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.8" stopColor="#07080a" />
          <stop offset="0.87" stopColor="#1e2127" />
          <stop offset="0.93" stopColor="#111317" />
          <stop offset="1" stopColor="#040506" />
        </radialGradient>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#8a6510" />
        </linearGradient>
      </defs>
      <circle cx={C} cy={C} r="199.5" fill={`url(#${id}-wood)`} />
      <circle cx={C} cy={C} r="196" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="2.5" />
      <circle cx={C} cy={C} r="192" fill={`url(#${id}-track)`} />
      <circle cx={C} cy={C} r="183" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="7" />
      <circle cx={C} cy={C} r="160" fill="#050607" stroke={`url(#${id}-brass)`} strokeOpacity="0.5" strokeWidth="1" />
      {Array.from({ length: 8 }, (_, k) => {
        const angle = k * 45 + 22.5;
        const radial = k % 2 === 0;
        const [x, y] = point(angle, 168);
        const [w, h] = radial ? [3.5, 7] : [7, 3.5];
        return (
          <path
            key={k}
            d={`M${x} ${y - h}L${x + w} ${y}L${x} ${y + h}L${x - w} ${y}Z`}
            fill={`url(#${id}-brass)`}
            transform={`rotate(${angle} ${x} ${y})`}
          />
        );
      })}
    </svg>
  );
}

function Rotor() {
  const id = useId();
  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-cone`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.3" stopColor="#7a4e1d" />
          <stop offset="0.75" stopColor="#3d250b" />
          <stop offset="1" stopColor="#1d1105" />
        </radialGradient>
        <radialGradient id={`${id}-hub`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#e2ffd8" />
          <stop offset="0.5" stopColor="#39ff14" />
          <stop offset="1" stopColor="#127000" />
        </radialGradient>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#8a6510" />
        </linearGradient>
      </defs>
      <circle cx={C} cy={C} r="157" fill="#22140a" />
      {WHEEL_ORDER.map((n, i) => (
        <path key={`n${n}`} d={segment(i, 126, 155)} fill={COLOR_FILL[rouletteColor(n)]} />
      ))}
      {WHEEL_ORDER.map((n, i) => (
        <path key={`p${n}`} d={segment(i, 96, 126)} fill={POCKET_FILL[rouletteColor(n)]} />
      ))}
      {WHEEL_ORDER.map((_, i) => {
        const [x1, y1] = point(i * POCKET_ANGLE - POCKET_ANGLE / 2, 96);
        const [x2, y2] = point(i * POCKET_ANGLE - POCKET_ANGLE / 2, 155);
        return <line key={`f${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e6b94a" strokeOpacity="0.85" strokeWidth="1.2" />;
      })}
      <circle cx={C} cy={C} r="155" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="2" />
      <circle cx={C} cy={C} r="126" fill="none" stroke="#e6b94a" strokeOpacity="0.6" strokeWidth="1" />
      {WHEEL_ORDER.map((n, i) => {
        const [x, y] = point(i * POCKET_ANGLE, 140.5);
        return (
          <text
            key={`t${n}`}
            x={x}
            y={y}
            fontSize="12"
            fontWeight="700"
            fill="#ffffff"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${i * POCKET_ANGLE} ${x} ${y})`}
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {n}
          </text>
        );
      })}
      <circle cx={C} cy={C} r="96" fill={`url(#${id}-cone)`} stroke={`url(#${id}-brass)`} strokeWidth="1.5" />
      {Array.from({ length: 8 }, (_, k) => {
        const [x1, y1] = point(k * 45 + 11, 38);
        const [x2, y2] = point(k * 45 + 11, 92);
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e6b94a" strokeOpacity="0.3" strokeWidth="1.5" />;
      })}
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle} ${C} ${C})`}>
          <rect x={C - 3} y={C - 56} width="6" height="56" rx="3" fill={`url(#${id}-brass)`} />
          <circle cx={C} cy={C - 58} r="7" fill={`url(#${id}-brass)`} stroke="#5a420a" strokeWidth="0.8" />
        </g>
      ))}
      <circle cx={C} cy={C} r="32" fill={`url(#${id}-hub)`} stroke={`url(#${id}-brass)`} strokeWidth="2" />
      <circle cx={C} cy={C} r="11" fill={`url(#${id}-brass)`} />
    </svg>
  );
}

/** Fixed light from the top left: highlights don't turn with the rotor. */
function Lighting() {
  const id = useId();
  return (
    <svg viewBox="0 0 400 400" className="pointer-events-none absolute inset-0 size-full" style={{ transform: "translateZ(2px)" }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-light`} cx="0.32" cy="0.22" r="0.85">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="0.7" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r="199.5" fill={`url(#${id}-light)`} />
      <path d="M48 120 A170 170 0 0 1 150 38" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" />
      <circle cx={C} cy={C} r="199" fill="none" stroke="#39ff14" strokeOpacity="0.25" strokeWidth="1.5" />
    </svg>
  );
}
