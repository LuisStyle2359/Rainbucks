"use client";

import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { BetPanel, type BetAction } from "@/components/casino/bet-panel/bet-panel";
import { audio, vibrate } from "@/lib/audio/audio-engine";
import { placeBet, settleBet } from "@/lib/casino/bets";
import { formatAmount, formatCompactAmount, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { ProvablyFair, ROULETTE_POCKETS } from "@/lib/fairness/provably-fair";
import {
  evaluateRoulette,
  rouletteColor,
  ROULETTE_COLUMNS,
  ROULETTE_OUTSIDE,
  type RouletteColor,
} from "@/lib/games/roulette/roulette-math";
import { consumeSeeds, toPublicSeeds } from "@/lib/stores/fairness-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useActiveGame } from "../use-active-game";

/** Physical pocket order of a European single-zero wheel (clockwise). */
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
];
const SEG = 360 / ROULETTE_POCKETS;
const WHEEL_SIZE = 300;
const C = WHEEL_SIZE / 2;
const R = 138;

const COLOR_FILL: Record<RouletteColor, string> = { red: "#d61a3c", black: "#15171b", green: "#0b8a3a" };

function point(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)];
}
function wedge(i: number): string {
  const [x1, y1] = point(i * SEG - SEG / 2, R);
  const [x2, y2] = point(i * SEG + SEG / 2, R);
  return `M${C} ${C}L${x1.toFixed(2)} ${y1.toFixed(2)}A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`;
}
/** Which pocket sits under the top pointer for a given wheel rotation. */
function pocketAt(rotation: number): number {
  const idx = Math.round((((-rotation % 360) + 360) % 360) / SEG) % ROULETTE_POCKETS;
  return WHEEL_ORDER[idx];
}

interface LastRound {
  result: number;
  profit: number;
  winning: string[];
}

export function RouletteGame() {
  useActiveGame("roulette");
  const chip = useSettingsStore((s) => s.betAmounts.roulette);
  const reducedMotion = useReducedMotion() ?? false;
  const [chips, setChips] = useState<Record<string, number>>({});
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<LastRound | null>(null);
  const [hasLastBet, setHasLastBet] = useState(false);
  const lastChips = useRef<Record<string, number>>({});
  const rotation = useMotionValue(0);
  const [rotationDeg, setRotationDeg] = useState(0);

  const totalStake = useMemo(() => Object.values(chips).reduce((sum, n) => sum + n, 0), [chips]);
  const locked = spinning;

  const place = (id: string) => {
    if (locked) return;
    setLast(null);
    setChips((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + chip }));
    audio.play("click", { pitch: 1.2 });
  };

  const clear = () => {
    if (locked) return;
    setChips({});
    audio.play("click", { pitch: 0.8 });
  };

  const rebet = () => {
    if (locked || !hasLastBet) return;
    setChips({ ...lastChips.current });
    setLast(null);
    audio.play("click", { pitch: 1.1 });
  };

  const spin = () => {
    if (locked || totalStake <= 0) return;
    if (!placeBet(totalStake)) {
      audio.play("lose");
      return;
    }
    lastChips.current = { ...chips };
    setHasLastBet(true);
    const placedChips = { ...chips };
    setSpinning(true);
    setLast(null);
    audio.play("bet");

    const seeds = consumeSeeds();
    const result = ProvablyFair.rouletteResult(seeds);
    const index = WHEEL_ORDER.indexOf(result);
    const from = rotation.get();
    const jitter = (Math.random() - 0.5) * SEG * 0.6;
    const base = -index * SEG + jitter;
    const turns = reducedMotion ? 1 : 6;
    const delta = ((((base - from) % 360) + 360) % 360) + turns * 360;
    let lastPocket = pocketAt(from);

    void animate(rotation, from + delta, {
      duration: reducedMotion ? 1 : 4.2,
      ease: [0.12, 0.85, 0.15, 1],
      onUpdate: (value) => {
        setRotationDeg(value);
        const pocket = pocketAt(value);
        if (pocket !== lastPocket) {
          lastPocket = pocket;
          audio.play("wheelTick", { pitch: 0.9 + Math.random() * 0.2 });
        }
      },
      onComplete: () => {
        const outcome = evaluateRoulette(result, placedChips);
        settleBet({
          game: "roulette",
          amount: outcome.totalStake,
          multiplier: outcome.totalStake > 0 ? outcome.totalReturn / outcome.totalStake : 0,
          payout: outcome.totalReturn,
          seeds: toPublicSeeds(seeds),
          result,
          bets: Object.keys(placedChips).length,
        });
        if (outcome.totalReturn > 0) audio.play("cashout");
        else {
          audio.play("lose");
          vibrate(40);
        }
        setSpinning(false);
        setChips({});
        setLast({ result, profit: outcome.totalReturn - outcome.totalStake, winning: outcome.winning });
      },
    });
  };

  const action: BetAction = {
    label: spinning ? "Spinning…" : "Spin",
    sublabel: totalStake > 0 ? `${formatAmount(totalStake)} RBX on ${Object.keys(chips).length} spots` : "Place a bet",
    variant: "bet",
    disabled: spinning || totalStake <= 0,
    onClick: spin,
  };

  const winning = last?.winning ?? [];

  return (
    <div className="grid gap-4 pb-60 lg:grid-cols-[340px_minmax(0,1fr)] lg:pb-0">
      <BetPanel
        game="roulette"
        mode="manual"
        onModeChange={() => {}}
        action={action}
        locked={locked}
        summary={totalStake > 0 ? `${formatAmount(totalStake)} RBX staked` : "European roulette"}
      >
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Chip = bet amount above</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clear}
            disabled={locked || totalStake === 0}
            className="h-10 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm font-medium text-zinc-300 transition hover:border-neon-red/40 hover:text-neon-red disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={rebet}
            disabled={locked || !hasLastBet}
            className="h-10 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm font-medium text-zinc-300 transition hover:border-toxic/40 hover:text-toxic disabled:opacity-40"
          >
            Rebet
          </button>
        </div>
        <p className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
          Straight 35:1 · dozens & columns 2:1 · red/black, even/odd, 1–18/19–36 pay 1:1. Single zero, 2.7% house edge.
        </p>
      </BetPanel>

      <section className="flex min-w-0 flex-col gap-4">
        <div data-game-stage className="glass glass-edge relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl p-4 sm:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgb(214_26_60/0.12),transparent_70%)]" />
          <Wheel rotationDeg={rotationDeg} result={last?.result ?? null} spinning={spinning} />

          <AnimatePresence>
            {last && (
              <motion.div
                key={`res-${last.result}-${last.profit}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 font-mono text-sm"
              >
                <span
                  className="grid size-9 place-items-center rounded-lg font-bold text-white"
                  style={{ backgroundColor: COLOR_FILL[rouletteColor(last.result)] }}
                >
                  {last.result}
                </span>
                <span className={cn("font-semibold", last.profit > 0 ? "text-toxic" : last.profit < 0 ? "text-neon-red" : "text-zinc-300")}>
                  {last.profit === 0 ? "No win" : `${formatSignedAmount(last.profit)} RBX`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Board chips={chips} winning={winning} onPlace={place} disabled={locked} />
      </section>
    </div>
  );
}

function Wheel({ rotationDeg, result, spinning }: { rotationDeg: number; result: number | null; spinning: boolean }) {
  return (
    <div className="relative aspect-square w-full max-w-[19rem]">
      {/* pointer */}
      <div className="absolute left-1/2 top-[-2px] z-10 -ml-3 h-8 w-6 drop-shadow-[0_0_8px_rgb(255_255_255/0.7)]">
        <svg viewBox="0 0 24 32" className="size-full" aria-hidden>
          <path d="M2 2h20L12 30Z" fill="#ffffff" stroke="#9ca3af" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <svg viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} className="size-full" style={{ transform: `rotate(${rotationDeg}deg)` }} aria-hidden>
        <circle cx={C} cy={C} r={R + 8} fill="#07080a" stroke="#3a2a12" strokeWidth="4" />
        {WHEEL_ORDER.map((n, i) => (
          <path key={n} d={wedge(i)} fill={COLOR_FILL[rouletteColor(n)]} stroke="#00000055" strokeWidth="0.5" />
        ))}
        {WHEEL_ORDER.map((n, i) => {
          const [x, y] = point(i * SEG, R - 12);
          return (
            <text
              key={`t${n}`}
              x={x}
              y={y}
              fontSize="9"
              fontWeight="700"
              fill="#ffffff"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${i * SEG} ${x} ${y})`}
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {n}
            </text>
          );
        })}
        <circle cx={C} cy={C} r="46" fill="#0a0b0d" stroke="#3a2a12" strokeWidth="3" />
        <circle cx={C} cy={C} r="30" fill="url(#hub)" />
        <defs>
          <radialGradient id="hub" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#e2ffd8" />
            <stop offset="0.5" stopColor="#39ff14" />
            <stop offset="1" stopColor="#1a8f00" />
          </radialGradient>
        </defs>
      </svg>
      {/* center readout */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="font-display text-2xl font-bold text-black">{spinning || result === null ? "" : result}</span>
      </div>
    </div>
  );
}

function Board({
  chips,
  winning,
  onPlace,
  disabled,
}: {
  chips: Record<string, number>;
  winning: string[];
  onPlace: (id: string) => void;
  disabled: boolean;
}) {
  const rows = Array.from({ length: 12 }, (_, r) => [1 + r * 3, 2 + r * 3, 3 + r * 3]);

  return (
    <div className="glass glass-edge rounded-2xl p-3 sm:p-4">
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))_auto] gap-1">
        {/* zero spans all rows on the left */}
        <button
          type="button"
          onClick={() => onPlace("n:0")}
          disabled={disabled}
          className={cn(
            "relative row-span-full grid place-items-center rounded-md bg-[#0b8a3a] font-mono text-sm font-bold text-white transition hover:brightness-125 disabled:cursor-default",
            winning.includes("n:0") && "ring-2 ring-white",
          )}
        >
          0
          <ChipBadge amount={chips["n:0"]} />
        </button>

        {rows.map((row) =>
          row.map((n) => {
            const id = `n:${n}`;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onPlace(id)}
                disabled={disabled}
                className={cn(
                  "relative grid aspect-[4/3] place-items-center rounded-md font-mono text-sm font-bold text-white transition hover:brightness-125 disabled:cursor-default",
                  winning.includes(id) && "ring-2 ring-white",
                )}
                style={{ backgroundColor: COLOR_FILL[rouletteColor(n)] }}
              >
                {n}
                <ChipBadge amount={chips[id]} />
              </button>
            );
          }),
        )}

        {/* column 2:1 bets, one per grid column */}
        {ROULETTE_COLUMNS.map(({ id }, i) => (
          <button
            key={id}
            type="button"
            onClick={() => onPlace(id)}
            disabled={disabled}
            style={{ gridColumn: i + 2 }}
            className={cn(
              "relative grid place-items-center rounded-md border border-white/10 bg-white/[0.04] py-1.5 font-mono text-[11px] font-semibold text-zinc-200 transition hover:border-toxic/40 disabled:cursor-default",
              winning.includes(id) && "ring-2 ring-toxic",
            )}
          >
            2:1
            <ChipBadge amount={chips[id]} />
          </button>
        ))}
      </div>

      {/* dozens */}
      <div className="mt-1 grid grid-cols-3 gap-1">
        {ROULETTE_OUTSIDE.slice(0, 3).map(({ id, label }) => (
          <OutsideCell key={id} id={id} label={label} chips={chips} winning={winning} onPlace={onPlace} disabled={disabled} />
        ))}
      </div>

      {/* even money + red/black */}
      <div className="mt-1 grid grid-cols-6 gap-1">
        {ROULETTE_OUTSIDE.slice(3).map(({ id, label }) => (
          <OutsideCell
            key={id}
            id={id}
            label={label}
            chips={chips}
            winning={winning}
            onPlace={onPlace}
            disabled={disabled}
            tone={id === "red" ? "red" : id === "black" ? "black" : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function OutsideCell({
  id,
  label,
  chips,
  winning,
  onPlace,
  disabled,
  tone,
}: {
  id: string;
  label: string;
  chips: Record<string, number>;
  winning: string[];
  onPlace: (id: string) => void;
  disabled: boolean;
  tone?: "red" | "black";
}) {
  return (
    <button
      type="button"
      onClick={() => onPlace(id)}
      disabled={disabled}
      className={cn(
        "relative grid place-items-center rounded-md border py-2 text-xs font-semibold transition hover:brightness-125 disabled:cursor-default",
        tone === "red" && "border-transparent bg-[#d61a3c] text-white",
        tone === "black" && "border-transparent bg-[#15171b] text-white",
        !tone && "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-toxic/40",
        winning.includes(id) && "ring-2 ring-white",
      )}
    >
      {label}
      <ChipBadge amount={chips[id]} />
    </button>
  );
}

function ChipBadge({ amount }: { amount: number | undefined }) {
  if (!amount) return null;
  return (
    <motion.span
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border-2 border-white bg-toxic font-mono text-[9px] font-bold text-black shadow-[0_0_8px_rgb(57_255_20/0.7)]"
    >
      {formatCompactAmount(amount).replace(/\.00$/, "")}
    </motion.span>
  );
}
