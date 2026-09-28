"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import { BetPanel, type BetMode } from "@/components/casino/bet-panel/bet-panel";
import { useAutoBet } from "@/components/casino/bet-panel/use-auto-bet";
import { DecimalField, formatTwoDecimals } from "@/components/casino/ui/decimal-field";
import { audio } from "@/lib/audio/audio-engine";
import { placeBet, settleBet } from "@/lib/casino/bets";
import { calculatePayout, formatAmount, formatMultiplier, formatPercent } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { ProvablyFair } from "@/lib/fairness/provably-fair";
import {
  clampTarget,
  limboTargetForChance,
  limboWinChance,
  sliderFromTarget,
  targetFromSlider,
} from "@/lib/games/limbo/limbo-math";
import { consumeSeeds, toPublicSeeds } from "@/lib/stores/fairness-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useActiveGame } from "../use-active-game";
import { Odometer } from "./odometer";

const PRESETS = [1.5, 2, 5, 10, 100];
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Roll {
  id: number;
  result: number;
  target: number;
  win: boolean;
  durationMs: number;
  done: boolean;
}

export function LimboGame() {
  useActiveGame("limbo");
  const amount = useSettingsStore((s) => s.betAmounts.limbo);
  const turbo = useSettingsStore((s) => s.turbo);
  const setTurbo = useSettingsStore((s) => s.setTurbo);
  const [mode, setMode] = useState<BetMode>("manual");
  const [target, setTarget] = useState(2);
  const [roll, setRoll] = useState<Roll>({ id: 0, result: 1, target: 2, win: false, durationMs: 0, done: true });
  const [recent, setRecent] = useState<{ id: number; result: number; win: boolean }[]>([]);
  const rolling = useRef(false);
  const rollCounter = useRef(0);
  const [numberScope, animateNumber] = useAnimate<HTMLDivElement>();

  const play = useCallback(
    async (fast: boolean): Promise<number | null> => {
      if (rolling.current) return null;
      const betAmount = amount;
      const betTarget = target;
      if (!placeBet(betAmount)) {
        audio.play("lose");
        return null;
      }
      rolling.current = true;

      // The result is fixed right away (provably fair); the animation only adds suspense.
      const seeds = consumeSeeds();
      const result = ProvablyFair.limboResult(seeds);
      const win = result >= betTarget;
      const durationMs = fast ? 280 : 950;
      const id = ++rollCounter.current;
      setRoll({ id, result, target: betTarget, win, durationMs, done: false });

      // Ticks like a slot machine, slowing down towards the end
      const started = performance.now();
      const tick = () => {
        const progress = (performance.now() - started) / durationMs;
        if (progress >= 1) return;
        audio.play("tick", { pitch: 0.9 + Math.random() * 0.3 });
        setTimeout(tick, 30 + progress * progress * 140);
      };
      tick();

      await sleep(durationMs);
      settleBet({
        game: "limbo",
        amount: betAmount,
        multiplier: win ? betTarget : 0,
        seeds: toPublicSeeds(seeds),
        target: betTarget,
        result,
      });
      setRoll((current) => (current.id === id ? { ...current, done: true } : current));
      setRecent((current) => [{ id, result, win }, ...current].slice(0, 14));
      // Big-win fanfares come from the celebration layer; here the number itself reacts
      audio.play(win ? "win" : "lose");
      if (numberScope.current) {
        void (win
          ? animateNumber(numberScope.current, { scale: [1, 1.22, 0.96, 1] }, { duration: 0.5, ease: "easeOut" })
          : animateNumber(numberScope.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.4 }));
      }
      rolling.current = false;
      return calculatePayout(betAmount, win ? betTarget : 0) - betAmount;
    },
    [amount, target, animateNumber, numberScope],
  );

  const auto = useAutoBet({ delayMs: turbo ? 120 : 350, run: () => play(true) });

  const chance = limboWinChance(target);
  const profitOnWin = calculatePayout(amount, target) - amount;
  const showResult = roll.id > 0;
  const tone = !roll.done || !showResult ? "text-white" : roll.win ? "neon-text-toxic" : "neon-text-red";

  return (
    <div className="grid gap-4 pb-60 lg:grid-cols-[340px_minmax(0,1fr)] lg:pb-0">
      <BetPanel
        game="limbo"
        mode={mode}
        onModeChange={setMode}
        action={{
          label: "Bet",
          variant: "bet",
          disabled: !roll.done,
          onClick: () => void play(turbo),
        }}
        auto={auto}
        locked={!roll.done && mode === "manual"}
        summary={`Target ${formatMultiplier(target)} · ${formatPercent(chance)}`}
      >
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 text-sm">
          <span className="text-zinc-400">Profit on win</span>
          <span className="font-mono font-semibold text-toxic">+{formatAmount(profitOnWin)} RBX</span>
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 text-sm">
          <span className="text-zinc-400">Turbo (fast rolls)</span>
          <input
            type="checkbox"
            checked={turbo}
            onChange={(event) => setTurbo(event.target.checked)}
            className="size-4 accent-[#39ff14]"
          />
        </label>
      </BetPanel>

      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex min-h-8 items-center gap-2 overflow-x-auto scrollbar-none" aria-label="Recent results">
          {recent.length === 0 && (
            <span className="text-xs uppercase tracking-widest text-zinc-600">No rolls yet</span>
          )}
          <AnimatePresence initial={false} mode="popLayout">
            {recent.map((item) => (
              <motion.span
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.6, x: -16 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold tabular",
                  item.win ? "border-toxic/35 bg-toxic/10 text-toxic" : "border-neon-red/35 bg-neon-red/10 text-neon-red",
                )}
              >
                {formatMultiplier(item.result)}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <div
          data-game-stage
          className="glass glass-edge relative flex min-h-[18rem] flex-col items-center justify-center overflow-hidden rounded-3xl px-4 py-10 sm:min-h-[22rem]"
        >
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <motion.div
            key={roll.done && showResult ? `glow-${roll.id}` : "idle"}
            initial={{ opacity: 0 }}
            animate={{ opacity: roll.done && showResult ? 1 : 0 }}
            className={cn(
              "pointer-events-none absolute inset-0",
              roll.win
                ? "bg-[radial-gradient(circle_at_50%_50%,rgb(57_255_20/0.16),transparent_60%)]"
                : "bg-[radial-gradient(circle_at_50%_50%,rgb(255_45_85/0.14),transparent_60%)]",
            )}
          />
          {/* Shockwave on a hit */}
          <AnimatePresence>
            {roll.done && roll.win && (
              <motion.span
                key={`ring-${roll.id}`}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute left-1/2 top-1/2 -ml-20 -mt-20 size-40 rounded-full border-4",
                  roll.target >= 10 ? "border-gold" : "border-toxic",
                )}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 3.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          <div
            ref={numberScope}
            className={cn(
              "relative flex items-start text-[clamp(3.4rem,15vw,9.5rem)] font-bold transition-colors duration-200",
              tone,
            )}
          >
            <Odometer text={formatTwoDecimals(roll.result)} rollId={roll.id} durationMs={roll.durationMs} />
            <span className="ml-1 leading-[1.12]">×</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={roll.done ? `r${roll.id}` : "rolling"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="relative mt-4 font-mono text-sm text-zinc-400"
            >
              {!showResult
                ? "Pick your target and bet"
                : !roll.done
                  ? `Target ${formatMultiplier(roll.target)} …`
                  : roll.win
                    ? `Target ${formatMultiplier(roll.target)} hit!`
                    : `Missed · target was ${formatMultiplier(roll.target)}`}
            </motion.p>
          </AnimatePresence>
        </div>

        <TargetControls target={target} onChange={setTarget} disabled={auto.running} />
      </section>
    </div>
  );
}

function TargetControls({
  target,
  onChange,
  disabled,
}: {
  target: number;
  onChange: (target: number) => void;
  disabled: boolean;
}) {
  const position = sliderFromTarget(target);
  return (
    <div className="glass glass-edge space-y-4 rounded-2xl p-4">
      <div className="grid grid-cols-2 gap-3">
        <DecimalField
          id="limbo-target"
          label="Target multiplier"
          value={target}
          onChange={(value) => value !== null && onChange(value)}
          format={formatTwoDecimals}
          normalize={clampTarget}
          suffix="×"
          disabled={disabled}
        />
        <DecimalField
          id="limbo-chance"
          label="Win chance"
          value={limboWinChance(target)}
          onChange={(value) => value !== null && onChange(limboTargetForChance(value))}
          format={(value) => value.toLocaleString("en-US", { maximumFractionDigits: 6 })}
          normalize={(value) => Math.min(98.02, Math.max(0.0001, value))}
          suffix="%"
          disabled={disabled}
        />
      </div>
      <input
        type="range"
        aria-label="Target multiplier"
        min={0}
        max={1000}
        value={Math.round(position * 1000)}
        disabled={disabled}
        onChange={(event) => onChange(targetFromSlider(Number(event.target.value) / 1000))}
        style={{ "--fill": `${position * 100}%` } as CSSProperties}
        className="w-full disabled:opacity-50"
      />
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset)}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-mono text-xs transition disabled:opacity-40",
              preset === target
                ? "border-toxic/60 bg-toxic/15 text-toxic"
                : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white",
            )}
          >
            {formatMultiplier(preset)}
          </button>
        ))}
      </div>
    </div>
  );
}
