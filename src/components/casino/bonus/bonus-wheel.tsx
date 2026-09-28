"use client";

import { animate, AnimatePresence, motion, useAnimate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { CloseIcon, GiftIcon } from "@/components/casino/ui/icons";
import { audio } from "@/lib/audio/audio-engine";
import { formatCountdown, pickSegment, spinAvailableIn, WHEEL_SEGMENTS } from "@/lib/casino/bonus";
import { celebrate } from "@/lib/casino/celebrations";
import { formatAmount, formatNumber } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { useNow } from "@/lib/hooks/use-now";
import { useUiStore } from "@/lib/stores/settings-store";
import { useWalletStore } from "@/lib/stores/wallet-store";

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 146;

// Segment look: jackpot gold, runner-up pink, the rest alternating neon tones
function segmentStyle(prize: number, index: number): { fill: string; text: string } {
  if (prize >= 5_000_00) return { fill: "#4d3900", text: "#ffd23f" };
  if (prize >= 2_500_00) return { fill: "#3d0836", text: "#ff4fd8" };
  if (prize >= 1_000_00) return { fill: "#06323d", text: "#22e4ff" };
  return index % 2 === 0 ? { fill: "#0d2b07", text: "#39ff14" } : { fill: "#111318", text: "#e8eaef" };
}

function point(angleDeg: number, radius: number): [number, number] {
  const radians = (angleDeg * Math.PI) / 180;
  return [CENTER + radius * Math.sin(radians), CENTER - radius * Math.cos(radians)];
}

function wedgePath(index: number): string {
  const [x1, y1] = point(index * SEGMENT_ANGLE - SEGMENT_ANGLE / 2, RADIUS);
  const [x2, y2] = point(index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2, RADIUS);
  return `M${CENTER} ${CENTER}L${x1.toFixed(2)} ${y1.toFixed(2)}A${RADIUS} ${RADIUS} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
}

/** Segment under the pointer (top) for a given wheel rotation. */
function segmentAt(rotation: number): number {
  const angle = (((-rotation % 360) + 360) % 360) + SEGMENT_ANGLE / 2;
  return Math.floor(angle / SEGMENT_ANGLE) % WHEEL_SEGMENTS.length;
}

function prizeLabel(cents: number): string {
  const value = cents / 100;
  return value >= 1000 ? `${formatNumber(value / 1000, 1)}K` : formatNumber(value);
}

function useSpinState() {
  const lastSpinAt = useWalletStore((s) => s.lastSpinAt);
  const now = useNow();
  const wait = spinAvailableIn(lastSpinAt, now);
  return { ready: wait === 0, wait };
}

/** Gift button for the top bar: wiggles while a free spin is waiting. */
export function BonusButton() {
  const { ready, wait } = useSpinState();
  return (
    <button
      type="button"
      onClick={() => {
        audio.play("click");
        useUiStore.getState().setBonusWheelOpen(true);
      }}
      aria-label={ready ? "Free spin ready" : `Next free spin in ${formatCountdown(wait)}`}
      title={ready ? "Free spin ready" : `Next free spin in ${formatCountdown(wait)}`}
      className={cn(
        "glass relative flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 transition sm:h-10 sm:px-2.5",
        ready
          ? "border-gold/50 text-gold shadow-[0_0_22px_-4px_rgb(255_210_63/0.7)]"
          : "min-w-9 text-zinc-400 hover:text-white sm:min-w-10",
      )}
    >
      <GiftIcon className={cn("size-5", ready && "animate-wiggle")} />
      {ready ? (
        <span className="hidden font-display text-xs font-bold uppercase tracking-wider md:inline">Free spin</span>
      ) : (
        <span className="hidden font-mono text-xs tabular md:inline">{formatCountdown(wait)}</span>
      )}
      {ready && (
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-neon-red shadow-[0_0_8px_rgb(255_45_85)]">
          <span className="absolute inset-0 animate-ping rounded-full bg-neon-red" />
        </span>
      )}
    </button>
  );
}

/** Lobby teaser for the wheel. */
export function FreeSpinCard({ className }: { className?: string }) {
  const { ready, wait } = useSpinState();
  return (
    <button
      type="button"
      onClick={() => {
        audio.play("click");
        useUiStore.getState().setBonusWheelOpen(true);
      }}
      className={cn(
        "group glass glass-edge relative flex w-full items-center gap-4 overflow-hidden rounded-2xl p-4 text-left transition hover:border-gold/40",
        ready && "border-gold/40 shadow-[0_0_40px_-12px_rgb(255_210_63/0.7)]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sweep bg-[linear-gradient(90deg,transparent,rgb(255_210_63/0.14),transparent)]" />
      <span
        className={cn(
          "relative grid size-12 shrink-0 place-items-center rounded-xl border",
          ready ? "border-gold/50 bg-gold/10 text-gold" : "border-white/[0.08] bg-white/[0.03] text-zinc-400",
        )}
      >
        <GiftIcon className={cn("size-6", ready && "animate-wiggle")} />
      </span>
      <span className="relative min-w-0">
        <span className="block font-display text-base font-bold uppercase tracking-wider text-white">
          {ready ? "Free spin ready!" : "Free bonus wheel"}
        </span>
        <span className="block text-xs text-zinc-400">
          {ready ? (
            <>
              Win up to <span className="font-semibold text-gold">5,000 RBX</span> play money, every hour.
            </>
          ) : (
            <>
              Next spin in <span className="font-mono text-zinc-200">{formatCountdown(wait)}</span>
            </>
          )}
        </span>
      </span>
      <span
        className={cn(
          "relative ml-auto shrink-0 rounded-lg px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider",
          ready ? "bg-gold text-black shadow-[0_0_20px_-4px_rgb(255_210_63/0.9)]" : "border border-white/10 text-zinc-400",
        )}
      >
        {ready ? "Spin" : "Open"}
      </span>
    </button>
  );
}

type Phase = "idle" | "spinning" | "won";

/** The wheel dialog. Mounted once per shell, opened via the UI store. */
export function BonusWheelDialog() {
  const open = useUiStore((s) => s.bonusWheelOpen);
  return <AnimatePresence>{open && <WheelDialog key="wheel" />}</AnimatePresence>;
}

function WheelDialog() {
  const titleId = useId();
  const { ready, wait } = useSpinState();
  const reducedMotion = useReducedMotion() ?? false;
  const rotation = useMotionValue(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const [pointerScope, animatePointer] = useAnimate<HTMLDivElement>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [prize, setPrize] = useState<number | null>(null);
  const spinButtonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    if (phase === "spinning") return;
    useUiStore.getState().setBonusWheelOpen(false);
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    spinButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const spin = () => {
    if (!ready || phase === "spinning") return;
    const index = pickSegment();
    const amount = WHEEL_SEGMENTS[index];
    // Land somewhere inside the segment, not always dead center
    const jitter = (Math.random() - 0.5) * SEGMENT_ANGLE * 0.7;
    const from = rotation.get();
    const turns = reducedMotion ? 1 : 6;
    const base = -index * SEGMENT_ANGLE + jitter;
    const delta = ((((base - from) % 360) + 360) % 360) + turns * 360;
    let lastSegment = segmentAt(from);

    setPhase("spinning");
    setPrize(null);
    audio.play("bet");
    void animate(rotation, from + delta, {
      duration: reducedMotion ? 1.2 : 5.4,
      ease: [0.12, 0.85, 0.15, 1],
      onUpdate: (value) => {
        const segment = segmentAt(value);
        if (segment === lastSegment) return;
        lastSegment = segment;
        audio.play("wheelTick", { pitch: 0.9 + Math.random() * 0.25 });
        if (pointerScope.current) void animatePointer(pointerScope.current, { rotate: [-22, 0] }, { duration: 0.14 });
      },
      onComplete: () => {
        useWalletStore.getState().claimSpin(amount);
        const rect = wheelRef.current?.getBoundingClientRect();
        celebrate({
          type: "bonus",
          amount,
          origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
        });
        setPrize(amount);
        setPhase("won");
      },
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="glass-strong glass-edge relative w-full max-w-md overflow-hidden rounded-3xl p-5 text-center shadow-glow-soft sm:p-6"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgb(255_210_63/0.18),transparent_70%)]" />
        <button
          type="button"
          onClick={close}
          disabled={phase === "spinning"}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
        >
          <CloseIcon className="size-5" />
        </button>
        <h2 id={titleId} className="relative font-display text-2xl font-bold uppercase tracking-wider text-white">
          Bonus <span className="neon-text-gold">wheel</span>
        </h2>
        <p className="relative mt-1 text-xs text-zinc-400">One free spin every hour · play money only</p>

        {/* Wheel */}
        <div className="relative mx-auto mt-5 aspect-square w-full max-w-[20rem]">
          <div
            ref={pointerScope}
            className="absolute left-1/2 top-[-6px] z-10 -ml-3.5 h-9 w-7 origin-[50%_20%] drop-shadow-[0_0_10px_rgb(255_210_63/0.9)]"
          >
            <svg viewBox="0 0 28 36" aria-hidden className="size-full">
              <path d="M2 2h24L14 34Z" fill="#ffd23f" stroke="#fff6c2" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <motion.div ref={wheelRef} className="absolute inset-0" style={{ rotate: rotation }}>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="size-full">
              <defs>
                <radialGradient id={`${titleId}-hub`} cx="0.4" cy="0.35" r="0.7">
                  <stop offset="0" stopColor="#e2ffd8" />
                  <stop offset="0.5" stopColor="#39ff14" />
                  <stop offset="1" stopColor="#1a8f00" />
                </radialGradient>
              </defs>
              <circle cx={CENTER} cy={CENTER} r={RADIUS + 10} fill="#07080a" stroke="#ffd23f" strokeOpacity="0.55" strokeWidth="3" />
              {WHEEL_SEGMENTS.map((amount, index) => {
                const style = segmentStyle(amount, index);
                return (
                  <g key={index}>
                    <path d={wedgePath(index)} fill={style.fill} stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1" />
                    <text
                      x={CENTER}
                      y={CENTER - RADIUS * 0.7}
                      transform={`rotate(${index * SEGMENT_ANGLE} ${CENTER} ${CENTER})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={style.text}
                      className="font-mono text-[17px] font-bold"
                    >
                      {prizeLabel(amount)}
                    </text>
                  </g>
                );
              })}
              {/* Rim lights */}
              {WHEEL_SEGMENTS.map((_, index) => {
                const [x, y] = point(index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2, RADIUS + 5);
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="3.2"
                    fill={index % 2 ? "#ffd23f" : "#ffffff"}
                    className="animate-glow-pulse"
                    style={{ animationDelay: `${(index % 2) * 1.3}s` }}
                  />
                );
              })}
              <circle cx={CENTER} cy={CENTER} r="30" fill="#07080a" stroke="#ffd23f" strokeOpacity="0.6" strokeWidth="3" />
              <circle cx={CENTER} cy={CENTER} r="22" fill={`url(#${titleId}-hub)`} />
              <path
                transform={`translate(${CENTER - 16} ${CENTER - 16}) scale(${32 / 24})`}
                d="M9.2 7.4h3.6a2.4 2.4 0 0 1 .5 4.75L15 16.6h-2l-1.55-4.2H11v4.2H9.2V7.4Zm1.8 1.6v1.9h1.7a.95.95 0 0 0 0-1.9H11Z"
                fill="#062b00"
              />
            </svg>
          </motion.div>
        </div>

        <div className="relative mt-5 min-h-[5.5rem]">
          <AnimatePresence mode="wait">
            {phase === "won" && prize !== null ? (
              <motion.div
                key="won"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">You won</p>
                <p className="font-mono text-4xl font-bold neon-text-toxic">+{formatAmount(prize)} RBX</p>
                <p className="mt-1 text-xs text-zinc-500">Next free spin in {formatCountdown(wait)}</p>
              </motion.div>
            ) : (
              <motion.div key="action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  ref={spinButtonRef}
                  type="button"
                  onClick={spin}
                  disabled={!ready || phase === "spinning"}
                  className="relative h-14 w-full overflow-hidden rounded-xl bg-gold font-display text-lg font-bold uppercase tracking-wider text-black shadow-[0_0_0_1px_rgb(255_210_63/0.5),0_0_32px_-4px_rgb(255_210_63/0.8)] transition hover:bg-[#ffdd66] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-zinc-400 disabled:shadow-none"
                >
                  {ready && phase === "idle" && (
                    <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sweep bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.6),transparent)]" />
                  )}
                  <span className="relative">
                    {phase === "spinning" ? "Spinning…" : ready ? "Spin for free" : `Next spin in ${formatCountdown(wait)}`}
                  </span>
                </button>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Every segment has the same 1-in-{WHEEL_SEGMENTS.length} chance.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
