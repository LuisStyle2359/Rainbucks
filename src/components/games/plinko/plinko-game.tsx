"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BetPanel, type BetMode } from "@/components/casino/bet-panel/bet-panel";
import { useAutoBet } from "@/components/casino/bet-panel/use-auto-bet";
import { Segmented } from "@/components/casino/ui/segmented";
import { audio } from "@/lib/audio/audio-engine";
import { placeBet, settleBet } from "@/lib/casino/bets";
import type { PlinkoRisk } from "@/lib/casino/games";
import type { ScreenPoint } from "@/lib/casino/celebrations";
import { calculatePayout, formatMultiplier, formatPercent } from "@/lib/casino/money";
import { ProvablyFair } from "@/lib/fairness/provably-fair";
import {
  PLINKO_RISKS,
  PLINKO_ROWS,
  plinkoMultiplier,
  plinkoMultipliers,
  plinkoRtp,
  type PlinkoRows,
} from "@/lib/games/plinko/payouts";
import { createGeometry, PlinkoWorld, type PlinkoBall } from "@/lib/games/plinko/plinko-physics";
import { binColor, PlinkoRenderer } from "@/lib/games/plinko/plinko-renderer";
import { consumeSeeds, toPublicSeeds, type RoundSeeds } from "@/lib/stores/fairness-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useActiveGame } from "../use-active-game";

interface BallPayload {
  amount: number;
  seeds: RoundSeeds;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  multiplier: number;
  resolve?: (profit: number) => void;
}

const INITIAL_ROWS: PlinkoRows = 12;
const INITIAL_RISK: PlinkoRisk = "medium";

/** Settle the bet of a landed ball. `origin` = where the win coins start. */
function settleBall(ball: PlinkoBall<BallPayload>, origin?: ScreenPoint): number {
  const { amount, seeds, rows, risk, multiplier, resolve } = ball.payload;
  settleBet({ game: "plinko", amount, multiplier, seeds: toPublicSeeds(seeds), rows, risk, bin: ball.bin }, { origin });
  const profit = calculatePayout(amount, multiplier) - amount;
  resolve?.(profit);
  return profit;
}

export function PlinkoGame() {
  useActiveGame("plinko");
  const amount = useSettingsStore((s) => s.betAmounts.plinko);
  const turbo = useSettingsStore((s) => s.turbo);
  const [mode, setMode] = useState<BetMode>("manual");
  const [rows, setRows] = useState<PlinkoRows>(INITIAL_ROWS);
  const [risk, setRisk] = useState<PlinkoRisk>(INITIAL_RISK);
  const [inFlight, setInFlight] = useState(0);
  const [recent, setRecent] = useState<{ id: number; multiplier: number; color: string }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<PlinkoWorld<BallPayload> | null>(null);
  const rendererRef = useRef<PlinkoRenderer<BallPayload> | null>(null);

  const geometry = useMemo(() => createGeometry(rows), [rows]);
  const multipliers = plinkoMultipliers(rows, risk);

  // Physics world and renderer live as long as the component.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const world: PlinkoWorld<BallPayload> = new PlinkoWorld<BallPayload>(INITIAL_ROWS, {
      onLand: (ball) => {
        const { x, y } = ball.body.position;
        renderer.landed(ball.bin, x, y);
        settleBall(ball, renderer.toClient(x, y));
        const { multiplier, rows: ballRows, risk: ballRisk } = ball.payload;
        const table = plinkoMultipliers(ballRows, ballRisk);
        audio.play("land", { pitch: 0.75 + Math.min(multiplier, 12) * 0.07 });
        // Big-win fanfares come from the celebration layer
        if (multiplier >= 2 && multiplier < 5) audio.play("win", { volume: 0.55 });
        setInFlight((count) => Math.max(0, count - 1));
        setRecent((items) =>
          [
            {
              id: ball.id,
              multiplier,
              color: binColor(multiplier, Math.min(...table), Math.max(...table)),
            },
            ...items,
          ].slice(0, 8),
        );
      },
      onPegHit: (pegIndex) => {
        const row = world.geometry.pegs[pegIndex]?.row ?? 0;
        audio.play("peg", { pitch: 0.8 + row * 0.035 + Math.random() * 0.06 });
      },
    });
    const renderer = new PlinkoRenderer(canvas, world);
    renderer.setMultipliers(plinkoMultipliers(INITIAL_ROWS, INITIAL_RISK));
    renderer.start();
    worldRef.current = world;
    rendererRef.current = renderer;

    return () => {
      // Balls in flight have a fixed result → settle them right away when leaving
      for (const ball of world.balls) settleBall(ball);
      renderer.destroy();
      world.destroy();
      worldRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    worldRef.current?.setRows(rows);
    rendererRef.current?.setMultipliers(plinkoMultipliers(rows, risk));
  }, [rows, risk]);

  const drop = useCallback(
    (resolve?: (profit: number) => void): boolean => {
      const world = worldRef.current;
      if (!world || world.rows !== rows) return false;
      if (!placeBet(amount)) {
        audio.play("lose");
        return false;
      }
      const seeds = consumeSeeds();
      const path = ProvablyFair.plinkoPath(seeds, rows);
      const multiplier = plinkoMultiplier(rows, risk, ProvablyFair.plinkoBin(path));
      world.drop(path, { amount, seeds, rows, risk, multiplier, resolve });
      setInFlight((count) => count + 1);
      return true;
    },
    [amount, rows, risk],
  );

  const auto = useAutoBet({
    mode: "interval",
    delayMs: turbo ? 180 : 450,
    run: () =>
      new Promise<number | null>((resolve) => {
        if (!drop(resolve)) resolve(null);
      }),
  });

  const locked = inFlight > 0 || auto.running;
  const rowsFill = ((rows - PLINKO_ROWS[0]) / (PLINKO_ROWS[PLINKO_ROWS.length - 1] - PLINKO_ROWS[0])) * 100;

  return (
    <div className="grid gap-4 pb-60 lg:grid-cols-[340px_minmax(0,1fr)] lg:pb-0">
      <BetPanel
        game="plinko"
        mode={mode}
        onModeChange={setMode}
        action={{ label: "Drop ball", variant: "bet", onClick: () => void drop() }}
        auto={auto}
        summary={`${rows} rows · ${PLINKO_RISKS.find((r) => r.id === risk)?.label} risk`}
      >
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-zinc-500">Risk</p>
          <Segmented
            options={PLINKO_RISKS.map((r) => ({ value: r.id, label: r.label }))}
            value={risk}
            onChange={setRisk}
            layoutId="plinko-risk"
            disabled={locked}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs text-zinc-500">
            <label htmlFor="plinko-rows" className="font-medium uppercase tracking-widest">
              Rows
            </label>
            <span className="font-mono text-zinc-200">{rows}</span>
          </div>
          <input
            id="plinko-rows"
            type="range"
            min={PLINKO_ROWS[0]}
            max={PLINKO_ROWS[PLINKO_ROWS.length - 1]}
            value={rows}
            disabled={locked}
            onChange={(event) => setRows(Number(event.target.value) as PlinkoRows)}
            style={{ "--fill": `${rowsFill}%` } as CSSProperties}
            className="w-full disabled:opacity-50"
          />
          {locked && inFlight > 0 && (
            <p className="mt-1 text-[11px] text-zinc-500">Settings are locked while balls are falling.</p>
          )}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 text-sm">
          <span className="text-zinc-400">RTP of this table</span>
          <span className="font-mono text-zinc-200">{formatPercent(plinkoRtp(rows, risk) * 100)}</span>
        </div>
      </BetPanel>

      <section className="relative flex min-w-0 flex-col gap-4">
        <div data-game-stage className="glass glass-edge relative overflow-hidden rounded-3xl p-2 sm:p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgb(57_255_20/0.12),transparent_70%)]" />
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Plinko board with ${rows} rows`}
            className="relative block w-full"
            style={{ aspectRatio: `${geometry.width} / ${geometry.height}` }}
          />

          {/* Recent results */}
          <div className="absolute right-3 top-3 flex flex-col gap-1.5 sm:right-5 sm:top-5">
            <AnimatePresence initial={false} mode="popLayout">
              {recent.map((item) => (
                <motion.span
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.5, y: -12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 520, damping: 32 }}
                  className="rounded-md px-2 py-1 text-center font-mono text-[11px] font-bold text-black shadow-[0_0_14px_-2px_currentColor]"
                  style={{ backgroundColor: item.color, color: "rgba(0,0,0,0.85)" }}
                >
                  {formatMultiplier(item.multiplier)}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="glass flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-xs text-zinc-400">
          <span>
            Balls in play: <span className="font-mono text-zinc-100">{inFlight}</span>
          </span>
          <span>
            Max win:{" "}
            <span className="font-mono text-toxic">{formatMultiplier(Math.max(...multipliers))}</span>
          </span>
        </div>
      </section>
    </div>
  );
}
