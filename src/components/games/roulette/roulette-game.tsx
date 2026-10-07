"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { BetPanel, type BetAction } from "@/components/casino/bet-panel/bet-panel";
import { ChipStack } from "@/components/casino/ui/chip";
import { PerspectiveGrid } from "@/components/fx/perspective-grid";
import { audio, vibrate } from "@/lib/audio/audio-engine";
import { placeBet, settleBet } from "@/lib/casino/bets";
import type { ScreenPoint } from "@/lib/casino/celebrations";
import { formatAmount, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { ProvablyFair } from "@/lib/fairness/provably-fair";
import {
  evaluateRoulette,
  rouletteColor,
  rouletteSpot,
  ROULETTE_COLUMNS,
  ROULETTE_OUTSIDE,
} from "@/lib/games/roulette/roulette-math";
import type { WheelRenderer } from "@/lib/games/roulette/wheel-renderer";
import { consumeSeeds, toPublicSeeds } from "@/lib/stores/fairness-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useWalletStore, type BetRecord } from "@/lib/stores/wallet-store";
import { useActiveGame } from "../use-active-game";
import { COLOR_FILL, RouletteWheel } from "./roulette-wheel";

interface LastRound {
  result: number;
  profit: number;
  winning: string[];
  /** The chips of the round, so winning stacks can stay on the board */
  placed: Record<string, number>;
}

type RouletteRecord = Extract<BetRecord, { game: "roulette" }>;

function centerOf(ref: RefObject<HTMLElement | null>): ScreenPoint | undefined {
  const rect = ref.current?.getBoundingClientRect();
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
}

export function RouletteGame() {
  useActiveGame("roulette");
  const chip = useSettingsStore((s) => s.betAmounts.roulette);
  const history = useWalletStore((s) => s.history);
  const [chips, setChips] = useState<Record<string, number>>({});
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<LastRound | null>(null);
  const [hasLastBet, setHasLastBet] = useState(false);
  const lastChips = useRef<Record<string, number>>({});
  const rendererRef = useRef<WheelRenderer | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  /** Settlement of the spin in progress; flushed when the ball lands or when leaving */
  const pending = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      const settle = pending.current;
      pending.current = null;
      settle?.();
    },
    [],
  );

  const recent = useMemo(
    () => history.filter((bet): bet is RouletteRecord => bet.game === "roulette").slice(0, 14),
    [history],
  );

  const totalStake = useMemo(() => Object.values(chips).reduce((sum, n) => sum + n, 0), [chips]);
  const locked = spinning;

  const place = (id: string) => {
    if (locked) return;
    setLast(null);
    setChips((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + chip }));
    audio.play("chip", { pitch: 0.95 + Math.random() * 0.1 });
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
    audio.play("chip");
  };

  const spin = async () => {
    const renderer = rendererRef.current;
    if (locked || totalStake <= 0 || !renderer) return;
    if (!placeBet(totalStake)) {
      audio.play("lose");
      return;
    }
    const placed = { ...chips };
    lastChips.current = placed;
    setHasLastBet(true);
    setSpinning(true);
    setLast(null);
    audio.play("bet");

    const seeds = consumeSeeds();
    const result = ProvablyFair.rouletteResult(seeds);
    const outcome = evaluateRoulette(result, placed);
    pending.current = () =>
      settleBet(
        {
          game: "roulette",
          amount: outcome.totalStake,
          multiplier: outcome.totalStake > 0 ? outcome.totalReturn / outcome.totalStake : 0,
          payout: outcome.totalReturn,
          seeds: toPublicSeeds(seeds),
          result,
          bets: Object.keys(placed).length,
        },
        { origin: centerOf(wheelRef) },
      );

    await renderer.launch(result);

    const settle = pending.current;
    pending.current = null;
    if (!settle) return; // already settled on the way out
    settle();
    audio.play("land");
    if (outcome.totalReturn > 0) audio.play("cashout");
    else {
      audio.play("lose");
      vibrate(40);
    }
    setSpinning(false);
    setChips({});
    setLast({ result, profit: outcome.totalReturn - outcome.totalStake, winning: outcome.winning, placed });
  };

  const action: BetAction = {
    label: spinning ? "Spinning…" : "Spin",
    sublabel: totalStake > 0 ? `${formatAmount(totalStake)} RBX on ${Object.keys(chips).length} spots` : "Place a bet",
    variant: "bet",
    disabled: spinning || totalStake <= 0,
    onClick: () => void spin(),
  };

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
        <div className="flex items-center gap-3">
          <ChipStack amount={chip} size="md" count={1} />
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Chip value = bet amount above
          </p>
        </div>
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
        <div
          data-game-stage
          className="glass glass-edge relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl p-4 sm:p-6"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgb(214_26_60/0.14),transparent_70%)]" />
          <PerspectiveGrid className="h-[45%] opacity-50" glow={false} />

          <RecentResults recent={recent} />

          <div ref={wheelRef} className="relative w-full">
            <RouletteWheel rendererRef={rendererRef} result={last?.result ?? null} />
          </div>

          <div className="relative flex h-9 items-center justify-center [perspective:600px]">
            <AnimatePresence mode="wait">
              {last ? (
                <motion.p
                  key={`res-${last.result}-${last.profit}`}
                  initial={{ rotateX: -90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ rotateX: 90, opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className={cn(
                    "rounded-xl border px-4 py-1.5 font-mono text-sm font-semibold",
                    last.profit > 0
                      ? "border-toxic/40 bg-toxic/10 text-toxic shadow-glow-toxic"
                      : last.profit < 0
                        ? "border-neon-red/30 bg-neon-red/10 text-neon-red"
                        : "border-white/10 bg-white/5 text-zinc-300",
                  )}
                >
                  {last.profit === 0 ? "No win" : `${formatSignedAmount(last.profit)} RBX`}
                </motion.p>
              ) : (
                <motion.p
                  key={spinning ? "spinning" : "idle"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500"
                >
                  {spinning ? "No more bets" : "Place your chips"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Board chips={chips} last={last} onPlace={place} disabled={locked} />
      </section>
    </div>
  );
}

/** Strip of the latest results, newest first. New numbers flip in from the left. */
function RecentResults({ recent }: { recent: RouletteRecord[] }) {
  return (
    <div className="relative flex w-full items-center gap-2">
      <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Last</span>
      <ol className="flex min-w-0 flex-1 gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,black_80%,transparent)] [perspective:500px]">
        {recent.length === 0 && <li className="text-xs text-zinc-600">No spins yet</li>}
        <AnimatePresence initial={false} mode="popLayout">
          {recent.map((bet, i) => (
            <motion.li
              key={bet.id}
              layout
              initial={{ rotateY: -120, scale: 0.4, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: i === 0 ? 1 : Math.max(0.35, 1 - i * 0.06) }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-md font-mono text-xs font-bold text-white ring-1 ring-white/10",
                i === 0 && "ring-2 ring-gold/70",
              )}
              style={{ backgroundColor: COLOR_FILL[rouletteColor(bet.result)] }}
            >
              {bet.result}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

function Board({
  chips,
  last,
  onPlace,
  disabled,
}: {
  chips: Record<string, number>;
  last: LastRound | null;
  onPlace: (id: string) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const covers = hovered ? rouletteSpot(hovered)?.covers : undefined;
  const rows = Array.from({ length: 12 }, (_, r) => [1 + r * 3, 2 + r * 3, 3 + r * 3]);
  const winning = last?.winning ?? [];

  const cell = (id: string) => ({
    chips: chips[id],
    won: winning.includes(id) ? (last?.placed[id] ?? 0) : 0,
    onPlace: () => onPlace(id),
    onHover: (on: boolean) => setHovered(on ? id : null),
    disabled,
  });

  return (
    <div className="[perspective:1400px]">
      <div className="glass glass-edge origin-bottom rounded-2xl p-3 sm:p-4 lg:[transform:rotateX(8deg)]">
        {/* Explicit placement: zero spans the 12 number rows, the 2:1 bets sit below their columns */}
        <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1">
          <Spot
            {...cell("n:0")}
            className="px-2.5 font-mono text-sm font-bold text-white"
            style={{ backgroundColor: COLOR_FILL.green, gridColumn: 1, gridRow: "1 / span 12" }}
            highlight={covers?.(0) ?? false}
            dolly={last?.result === 0}
          >
            0
          </Spot>

          {rows.map((row) =>
            row.map((n) => (
              <Spot
                key={n}
                {...cell(`n:${n}`)}
                className="aspect-[4/3] font-mono text-sm font-bold text-white"
                style={{
                  backgroundColor: COLOR_FILL[rouletteColor(n)],
                  gridColumn: ((n - 1) % 3) + 2,
                  gridRow: Math.floor((n - 1) / 3) + 1,
                }}
                highlight={covers?.(n) ?? false}
                dolly={last?.result === n}
              >
                {n}
              </Spot>
            )),
          )}

          {ROULETTE_COLUMNS.map(({ id }, i) => (
            <Spot
              key={id}
              {...cell(id)}
              style={{ gridColumn: i + 2, gridRow: 13 }}
              className="border border-white/10 bg-white/[0.04] py-1.5 font-mono text-[11px] font-semibold text-zinc-200"
            >
              2:1
            </Spot>
          ))}
        </div>

        {/* dozens */}
        <div className="mt-1 grid grid-cols-3 gap-1">
          {ROULETTE_OUTSIDE.slice(0, 3).map(({ id, label }) => (
            <Spot key={id} {...cell(id)} className="border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-zinc-200">
              {label}
            </Spot>
          ))}
        </div>

        {/* even money + red/black */}
        <div className="mt-1 grid grid-cols-6 gap-1">
          {ROULETTE_OUTSIDE.slice(3).map(({ id, label }) => (
            <Spot
              key={id}
              {...cell(id)}
              className={cn(
                "border py-2 text-xs font-semibold",
                id === "red" || id === "black" ? "border-transparent text-white" : "border-white/10 bg-white/[0.04] text-zinc-200",
              )}
              style={id === "red" || id === "black" ? { backgroundColor: COLOR_FILL[id] } : undefined}
            >
              {label}
            </Spot>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One betting spot: lifts on hover, shows the chips on it and the win marker. */
function Spot({
  children,
  className,
  style,
  chips,
  won,
  highlight = false,
  dolly = false,
  onPlace,
  onHover,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  chips: number | undefined;
  /** Stake that won on this spot in the last round (0 = none) */
  won: number;
  highlight?: boolean;
  dolly?: boolean;
  onPlace: () => void;
  onHover: (on: boolean) => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPlace}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2, scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      style={style}
      className={cn(
        "relative grid place-items-center rounded-md transition-[filter,box-shadow] disabled:cursor-default",
        !disabled && "hover:z-10 hover:brightness-125",
        highlight && "z-10 brightness-125 shadow-[0_0_0_1px_rgb(255_255_255/0.6),0_0_14px_rgb(255_255_255/0.25)]",
        won > 0 && "z-10 shadow-[0_0_0_2px_var(--color-toxic),0_0_18px_rgb(57_255_20/0.6)]",
        className,
      )}
    >
      {children}

      <AnimatePresence>
        {chips ? (
          <motion.span
            key="chips"
            className="pointer-events-none absolute -right-1.5 -top-2 z-10"
            initial={{ y: -28, scale: 1.6, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -36, scale: 0.6, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 520, damping: 20 }}
          >
            <motion.span key={chips} className="block" initial={{ scale: 1.25 }} animate={{ scale: 1 }}>
              <ChipStack amount={chips} size="xs" count={Math.min(3, 1 + Math.floor(Math.log2(chips / 100 + 1)))} />
            </motion.span>
          </motion.span>
        ) : won > 0 ? (
          <motion.span
            key="won"
            className="pointer-events-none absolute -right-1.5 -top-2 z-10"
            initial={{ y: -40, opacity: 0, scale: 1.4 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.25 }}
          >
            <ChipStack amount={won} size="xs" count={3} glow />
          </motion.span>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {dolly && (
          <motion.span
            key="dolly"
            aria-label="Winning number"
            className="pointer-events-none absolute bottom-0.5 left-0.5 z-10 size-3.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d4d4d8)] shadow-[0_2px_0_#71717a,0_3px_6px_rgb(0_0_0/0.6)]"
            initial={{ y: -40, scale: 1.8, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 16 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
