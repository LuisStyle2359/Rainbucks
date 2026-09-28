"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { BetPanel, type BetAction, type BetMode } from "@/components/casino/bet-panel/bet-panel";
import { useAutoBet } from "@/components/casino/bet-panel/use-auto-bet";
import { audio } from "@/lib/audio/audio-engine";
import { placeBet, settleBet } from "@/lib/casino/bets";
import { calculatePayout, formatAmount, formatMultiplier, formatPercent, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { MINES_TILES } from "@/lib/fairness/provably-fair";
import { MinesGame, type MinesSnapshot } from "@/lib/games/mines/mines-game";
import { gemCount, MAX_MINES, MIN_MINES, minesMultiplier } from "@/lib/games/mines/mines-math";
import { consumeSeeds } from "@/lib/stores/fairness-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useActiveGame } from "../use-active-game";
import { MinesTile, type TileFace } from "./mines-tile";

const TILES = Array.from({ length: MINES_TILES }, (_, i) => i);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function createGame(): MinesGame {
  return new MinesGame({
    drawSeeds: consumeSeeds,
    debit: placeBet,
    settle: ({ amount, multiplier, seeds, mines, revealed }) =>
      settleBet({ game: "mines", amount, multiplier, seeds, mines, revealed }),
  });
}

function playRevealSound(result: "gem" | "mine" | null, gemsFound: number): void {
  if (result === "gem") audio.play("gem", { pitch: 1 + Math.min(gemsFound, 20) * 0.045 });
  if (result === "mine") audio.play("mine");
}

function playCashoutSound(multiplier: number): void {
  audio.play("cashout");
  if (multiplier >= 10) audio.play("bigWin");
}

export function MinesGameView() {
  useActiveGame("mines");
  const [game] = useState(createGame);
  const snapshot = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  const amount = useSettingsStore((s) => s.betAmounts.mines);
  const turbo = useSettingsStore((s) => s.turbo);
  const [mode, setMode] = useState<BetMode>("manual");
  const [mines, setMines] = useState(3);
  const [selection, setSelection] = useState<number[]>([]);
  const [boardScope, animateBoard] = useAnimate<HTMLDivElement>();

  const playing = snapshot.status === "playing";
  const ended = snapshot.status === "busted" || snapshot.status === "cashed";

  // Wackeln des Spielfelds, wenn eine Mine getroffen wurde
  useEffect(() => {
    if (snapshot.status !== "busted" || !boardScope.current) return;
    void animateBoard(boardScope.current, { x: [0, -11, 10, -7, 6, -3, 0] }, { duration: 0.45 });
  }, [snapshot.status, snapshot.roundId, animateBoard, boardScope]);

  const pick = useCallback(
    (tile: number) => {
      if (mode === "auto") {
        setSelection((current) =>
          current.includes(tile)
            ? current.filter((t) => t !== tile)
            : current.length < gemCount(mines)
              ? [...current, tile]
              : current,
        );
        audio.play("click", { pitch: 1.3 });
        return;
      }
      const result = game.reveal(tile);
      const after = game.getSnapshot();
      playRevealSound(result, after.revealed.length);
      if (after.status === "cashed") playCashoutSound(after.multiplier);
    },
    [game, mode, mines],
  );

  const auto = useAutoBet({
    delayMs: turbo ? 250 : 700,
    run: async () => {
      if (selection.length === 0 || !game.start(amount, mines)) return null;
      for (const tile of selection) {
        await sleep(turbo ? 70 : 170);
        if (game.getSnapshot().status !== "playing") break;
        playRevealSound(game.reveal(tile), game.getSnapshot().revealed.length);
      }
      if (game.cashOut()) playCashoutSound(game.getSnapshot().multiplier);
      const result = game.getSnapshot();
      return result.payout - result.amount;
    },
  });

  const changeMines = (next: number) => {
    setMines(next);
    setSelection((current) => current.slice(0, gemCount(next)));
  };

  const gemsFound = playing ? snapshot.revealed.length : 0;
  const nextMultiplier = minesMultiplier(playing ? snapshot.mines : mines, gemsFound + 1);
  const currentPayout = calculatePayout(snapshot.amount, snapshot.multiplier);

  let action: BetAction;
  if (playing) {
    action =
      snapshot.revealed.length === 0
        ? { label: "Auszahlen", sublabel: "Decke zuerst ein Feld auf", variant: "cashout", disabled: true, onClick: () => {} }
        : {
            label: "Auszahlen",
            sublabel: `${formatAmount(currentPayout)} RBX · ${formatMultiplier(snapshot.multiplier)}`,
            variant: "cashout",
            onClick: () => {
              if (game.cashOut()) playCashoutSound(game.getSnapshot().multiplier);
            },
          };
  } else {
    action = {
      label: "Wetten",
      variant: "bet",
      onClick: () => {
        if (!game.start(amount, mines)) audio.play("lose");
      },
    };
  }

  const tileFace = (tile: number): TileFace => {
    if (ended && snapshot.minePositions) return snapshot.minePositions.includes(tile) ? "mine" : "gem";
    if (playing && snapshot.revealed.includes(tile)) return "gem";
    return "hidden";
  };

  const origin = snapshot.bustedTile ?? snapshot.revealed.at(-1) ?? 12;
  const rippleDelay = (tile: number) => {
    if (!ended || snapshot.revealed.includes(tile)) return 0;
    const dx = (tile % 5) - (origin % 5);
    const dy = Math.floor(tile / 5) - Math.floor(origin / 5);
    return 0.12 + Math.hypot(dx, dy) * 0.045;
  };

  const interactive = auto.running ? false : mode === "auto" ? !playing : playing;

  return (
    <div className="grid gap-4 pb-60 lg:grid-cols-[340px_minmax(0,1fr)] lg:pb-0">
      <BetPanel
        game="mines"
        mode={mode}
        onModeChange={(next) => {
          setMode(next);
          if (next === "manual") setSelection([]);
        }}
        action={action}
        auto={auto}
        autoStartDisabled={selection.length === 0}
        autoHint={
          selection.length === 0
            ? `Tippe auf die Felder, die jede Runde aufgedeckt werden (max. ${gemCount(mines)}).`
            : `${selection.length} Feld${selection.length === 1 ? "" : "er"} gewählt → ${formatMultiplier(minesMultiplier(mines, selection.length))} pro Treffer-Runde`
        }
        locked={playing}
        summary={`${playing ? snapshot.mines : mines} Minen`}
      >
        <MinesCountField value={playing ? snapshot.mines : mines} onChange={changeMines} disabled={playing || auto.running} />
        {mode === "manual" && playing && (
          <button
            type="button"
            onClick={() => {
              const tile = game.randomHiddenTile();
              if (tile !== null) pick(tile);
            }}
            className="h-10 rounded-lg border border-white/[0.08] bg-white/[0.04] text-sm font-medium text-zinc-200 transition hover:border-toxic/40 hover:text-toxic"
          >
            Zufälliges Feld
          </button>
        )}
      </BetPanel>

      <section className="flex min-w-0 flex-col items-center gap-4">
        <MinesStats snapshot={snapshot} mines={playing ? snapshot.mines : mines} nextMultiplier={nextMultiplier} />

        <div className="relative w-full max-w-[min(100%,34rem)]">
          <div ref={boardScope} className="glass glass-edge grid grid-cols-5 gap-2 rounded-3xl p-3 sm:gap-3 sm:p-4">
            {TILES.map((tile) => (
              <MinesTile
                key={tile}
                index={tile}
                face={tileFace(tile)}
                picked={snapshot.revealed.includes(tile)}
                busted={snapshot.bustedTile === tile}
                selected={mode === "auto" && selection.includes(tile)}
                interactive={interactive}
                delay={rippleDelay(tile)}
                onPick={pick}
              />
            ))}
          </div>

          {/* Roter Blitz bei einer Mine */}
          <AnimatePresence>
            {snapshot.status === "busted" && (
              <motion.div
                key={`flash-${snapshot.roundId}`}
                className="pointer-events-none absolute inset-0 rounded-3xl bg-neon-red mix-blend-screen"
                initial={{ opacity: 0.55 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Gewinn-Karte nach dem Cashout */}
          <AnimatePresence>
            {snapshot.status === "cashed" && mode === "manual" && (
              <motion.div
                key={`win-${snapshot.roundId}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 380, damping: 24, delay: 0.25 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="glass-strong rounded-2xl border-toxic/40 px-8 py-5 text-center shadow-glow-toxic">
                  <p className="font-mono text-4xl font-bold neon-text-toxic tabular">
                    {formatMultiplier(snapshot.multiplier)}
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-200">
                    Gewinn {formatSignedAmount(snapshot.payout - snapshot.amount)} RBX
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function MinesCountField({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  const fill = ((value - MIN_MINES) / (MAX_MINES - MIN_MINES)) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs text-zinc-500">
        <label htmlFor="mines-count" className="font-medium uppercase tracking-widest">
          Minen
        </label>
        <span className="font-mono">
          <span className="text-neon-red">{value}</span> Minen · <span className="text-toxic">{gemCount(value)}</span> Diamanten
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          id="mines-count"
          type="range"
          min={MIN_MINES}
          max={MAX_MINES}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ "--fill": `${fill}%` } as CSSProperties}
          className="flex-1 disabled:opacity-50"
        />
        <div className="flex gap-1">
          {[1, 3, 5, 10, 24].map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={cn(
                "h-8 min-w-8 rounded-md border px-1.5 font-mono text-xs transition disabled:opacity-40",
                preset === value
                  ? "border-toxic/60 bg-toxic/15 text-toxic"
                  : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white",
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Wahrscheinlichkeit, dass das nächste Feld ein Diamant ist (in %). */
function nextTileChance(mines: number, gems: number): number {
  const hidden = MINES_TILES - gems;
  return hidden > 0 ? ((hidden - mines) / hidden) * 100 : 0;
}

function MinesStats({
  snapshot,
  mines,
  nextMultiplier,
}: {
  snapshot: MinesSnapshot;
  mines: number;
  nextMultiplier: number;
}) {
  const playing = snapshot.status === "playing";
  const gems = playing ? snapshot.revealed.length : 0;
  const stats = [
    { label: "Multiplikator", value: formatMultiplier(playing ? snapshot.multiplier : 1), accent: playing && gems > 0 },
    { label: "Nächstes Feld", value: formatMultiplier(nextMultiplier), accent: false },
    { label: "Chance", value: formatPercent(nextTileChance(mines, gems), 1), accent: false },
  ];
  return (
    <div className="grid w-full max-w-[min(100%,34rem)] grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="glass rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">{stat.label}</p>
          <motion.p
            key={stat.value}
            initial={{ opacity: 0.4, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("font-mono text-sm font-semibold tabular sm:text-base", stat.accent ? "text-toxic" : "text-zinc-100")}
          >
            {stat.value}
          </motion.p>
        </div>
      ))}
    </div>
  );
}
