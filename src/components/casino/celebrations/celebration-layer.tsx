"use client";

import { animate, AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { audio, vibrate, type SoundId } from "@/lib/audio/audio-engine";
import { CelebrationRenderer, type Point } from "@/lib/canvas/celebration-renderer";
import { balanceTarget, holdBalance, popBalance } from "@/lib/casino/balance-sync";
import { onCelebration, TIER_LABEL, type WinTier } from "@/lib/casino/celebrations";
import { rankFor } from "@/lib/casino/levels";
import { formatAmount, formatMultiplier, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";

interface TierEffects {
  coins: number;
  gold: boolean;
  /** 0 none · 1 burst at the win · 2 + side cannons · 3 + confetti rain */
  confetti: 0 | 1 | 2 | 3;
  /** How long the win screen stays (ms), 0 = no win screen */
  banner: number;
  sound: SoundId | null;
  vibration: number | number[] | null;
}

const TIER_EFFECTS: Record<WinTier, TierEffects> = {
  small: { coins: 6, gold: false, confetti: 0, banner: 0, sound: null, vibration: null },
  nice: { coins: 12, gold: false, confetti: 0, banner: 0, sound: null, vibration: 15 },
  big: { coins: 22, gold: true, confetti: 1, banner: 2600, sound: "bigWin", vibration: [30, 40, 30] },
  mega: { coins: 32, gold: true, confetti: 2, banner: 3400, sound: "jackpot", vibration: [40, 30, 40, 30, 90] },
  epic: { coins: 46, gold: true, confetti: 3, banner: 4200, sound: "jackpot", vibration: [60, 40, 60, 40, 140] },
};

/** Priority, so a small win never cuts a bigger win screen short */
const TIER_PRIORITY: Record<WinTier, number> = { small: 0, nice: 1, big: 2, mega: 3, epic: 4 };

type Banner =
  | { kind: "win"; id: number; tier: WinTier; profit: number; multiplier: number; duration: number }
  | { kind: "levelUp"; id: number; level: number; bonus: number; rankUp: boolean; duration: number };

/** Center of the game stage (where coins start when a game gives no exact point). */
function stageCenter(): Point {
  const stage = document.querySelector("[data-game-stage]");
  if (stage) {
    const rect = stage.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      return { x: rect.left + rect.width / 2, y: Math.max(80, Math.min(window.innerHeight - 80, rect.top + rect.height / 2)) };
    }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function launchConfetti(renderer: CelebrationRenderer, level: number, from: Point): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (level >= 1) renderer.confettiBurst(from.x, from.y, 70, { power: 0.8 });
  if (level >= 2) {
    renderer.confettiBurst(0, height, 80, { power: 1.25, direction: -Math.PI / 3, spread: 0.7 });
    renderer.confettiBurst(width, height, 80, { power: 1.25, direction: (-2 * Math.PI) / 3, spread: 0.7 });
  }
  if (level >= 3) renderer.confettiRain(170);
}

/**
 * Win feedback for the whole casino: coins flying into the balance,
 * confetti, BIG/MEGA/EPIC win screens and the level-up screen.
 * Listens to the celebration bus, so games only settle their bets.
 * Everything here is pointer-events-none: playing on is never blocked.
 */
export function CelebrationLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CelebrationRenderer(canvas);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let nextId = 1;
    let shownAt = -Infinity;
    let shownPriority = -1;

    const showBanner = (next: Banner, priority: number) => {
      const now = performance.now();
      if (now - shownAt < 1400 && priority < shownPriority) return;
      shownAt = now;
      shownPriority = priority;
      setBanner(next);
    };

    const sendCoins = (from: Point, count: number, gold: boolean) => {
      const to = balanceTarget();
      if (!to || reducedMotion.matches) {
        popBalance();
        return;
      }
      const { first, last } = renderer.flyCoins({
        from,
        to,
        count,
        gold,
        onArrive: (index, total) => {
          audio.play("coin", { pitch: 1 + (index / Math.max(1, total - 1)) * 0.6 });
          popBalance();
        },
      });
      holdBalance(first, last - first);
    };

    const off = onCelebration((celebration) => {
      switch (celebration.type) {
        case "win": {
          const effects = TIER_EFFECTS[celebration.tier];
          const from = celebration.origin ?? stageCenter();
          sendCoins(from, effects.coins, effects.gold);
          if (!reducedMotion.matches) launchConfetti(renderer, effects.confetti, from);
          if (effects.sound) audio.play(effects.sound);
          if (effects.vibration) vibrate(effects.vibration);
          if (effects.banner > 0) {
            showBanner(
              {
                kind: "win",
                id: nextId++,
                tier: celebration.tier,
                profit: celebration.payout - celebration.amount,
                multiplier: celebration.multiplier,
                duration: effects.banner,
              },
              TIER_PRIORITY[celebration.tier],
            );
          }
          break;
        }
        case "levelUp": {
          const rankUp = rankFor(celebration.fromLevel).name !== rankFor(celebration.level).name;
          const center = { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
          audio.play("levelUp");
          vibrate([30, 50, 30, 50, 70]);
          sendCoins(center, 18, true);
          if (!reducedMotion.matches) launchConfetti(renderer, rankUp ? 3 : 2, center);
          showBanner(
            {
              kind: "levelUp",
              id: nextId++,
              level: celebration.level,
              bonus: celebration.bonus,
              rankUp,
              duration: rankUp ? 3800 : 3000,
            },
            rankUp ? 5 : 2.5,
          );
          break;
        }
        case "bonus": {
          const from = celebration.origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          audio.play("win");
          vibrate([20, 30, 20]);
          sendCoins(from, 26, true);
          if (!reducedMotion.matches) renderer.confettiBurst(from.x, from.y, 90, { power: 0.9 });
          break;
        }
      }
    });

    return () => {
      off();
      renderer.destroy();
    };
  }, []);

  // Win screens close by themselves; they never block the game.
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner((current) => (current?.id === banner.id ? null : current)), banner.duration);
    return () => clearTimeout(timer);
  }, [banner]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[100] size-full" />
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-0 z-[99] flex items-center justify-center overflow-hidden px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.78),rgb(0_0_0/0.35)_50%,transparent_78%)]" />
            {banner.kind === "win" && banner.tier === "epic" && (
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ opacity: 0.45 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
              />
            )}
            {banner.kind === "win" ? <WinScreen banner={banner} /> : <LevelUpScreen banner={banner} />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const TIER_STYLE: Record<WinTier, { text: string; rays: string; glow: string }> = {
  small: { text: "", rays: "", glow: "" },
  nice: { text: "", rays: "", glow: "" },
  big: {
    text: "bg-gradient-to-b from-white via-[#fff1a8] to-gold",
    rays: "[background:repeating-conic-gradient(rgb(255_210_63/0.2)_0deg_9deg,transparent_9deg_18deg)]",
    glow: "drop-shadow-[0_0_28px_rgb(255_210_63/0.75)]",
  },
  mega: {
    text: "bg-gradient-to-b from-white via-pink to-gold",
    rays: "[background:repeating-conic-gradient(rgb(255_79_216/0.22)_0deg_8deg,rgb(255_210_63/0.14)_8deg_16deg,transparent_16deg_24deg)]",
    glow: "drop-shadow-[0_0_34px_rgb(255_79_216/0.75)]",
  },
  epic: {
    text: "animate-shimmer bg-[linear-gradient(90deg,#39ff14,#22e4ff,#ff4fd8,#ffd23f,#39ff14)] bg-[length:200%_100%]",
    rays: "[background:repeating-conic-gradient(rgb(57_255_20/0.22)_0deg_7deg,rgb(34_228_255/0.16)_7deg_14deg,rgb(255_79_216/0.18)_14deg_21deg,transparent_21deg_28deg)]",
    glow: "drop-shadow-[0_0_40px_rgb(57_255_20/0.8)]",
  },
};

function Rays({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute left-1/2 top-1/2 -z-10 size-[min(160vw,48rem)] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full [mask-image:radial-gradient(closest-side,black_15%,transparent)]",
        className,
      )}
    />
  );
}

function WinScreen({ banner }: { banner: Extract<Banner, { kind: "win" }> }) {
  const profitRef = useRef<HTMLSpanElement>(null);
  const style = TIER_STYLE[banner.tier];

  // Count the profit up from zero; the bigger the win, the longer it rolls.
  useEffect(() => {
    const write = (cents: number) => {
      if (profitRef.current) profitRef.current.textContent = formatSignedAmount(Math.round(cents));
    };
    write(0);
    const controls = animate(0, banner.profit, {
      duration: banner.duration / 1000 - 1,
      ease: [0.2, 0.7, 0.3, 1],
      onUpdate: write,
    });
    return () => controls.stop();
  }, [banner.profit, banner.duration]);

  return (
    <motion.div
      className="relative flex flex-col items-center text-center"
      initial={{ scale: 0.35, y: 40, rotate: -6 }}
      animate={{ scale: 1, y: 0, rotate: 0 }}
      exit={{ scale: 1.2, y: -30 }}
      transition={{ type: "spring", stiffness: 240, damping: 14 }}
    >
      <Rays className={style.rays} />
      <p
        className={cn(
          "bg-clip-text font-display text-[clamp(3.2rem,15vw,8rem)] font-bold uppercase italic leading-none tracking-wide text-transparent",
          style.text,
          style.glow,
        )}
      >
        {TIER_LABEL[banner.tier]}
      </p>
      <p className="mt-3 font-mono text-[clamp(2rem,9vw,4rem)] font-bold leading-none neon-text-toxic tabular">
        <span ref={profitRef}>+0.00</span>
        <span className="ml-2 text-[0.45em] text-toxic-300">RBX</span>
      </p>
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-4 rounded-full border border-gold/50 bg-black/60 px-4 py-1 font-mono text-lg font-bold text-gold shadow-[0_0_24px_-4px_rgb(255_210_63/0.8)]"
      >
        {formatMultiplier(banner.multiplier)}
      </motion.span>
    </motion.div>
  );
}

function LevelUpScreen({ banner }: { banner: Extract<Banner, { kind: "levelUp" }> }) {
  const rank = rankFor(banner.level);
  return (
    <motion.div
      className="relative flex flex-col items-center text-center"
      initial={{ scale: 0.4, y: 40 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 1.15, y: -30 }}
      transition={{ type: "spring", stiffness: 240, damping: 15 }}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 size-[min(150vw,44rem)] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full [mask-image:radial-gradient(closest-side,black_15%,transparent)]"
        style={{
          background: `repeating-conic-gradient(${rank.color}33 0deg 9deg, transparent 9deg 18deg)`,
        }}
      />
      <p className="font-display text-sm font-semibold uppercase tracking-[0.5em] text-zinc-200 sm:text-base">Level up</p>
      <motion.div
        initial={{ rotate: -120, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 13, delay: 0.1 }}
        className="relative my-4 grid size-36 place-items-center rounded-full border-4 bg-black/70 sm:size-44"
        style={{ borderColor: rank.color, boxShadow: `0 0 60px -6px ${rank.color}, inset 0 0 30px -10px ${rank.color}` }}
      >
        <span className="font-display text-7xl font-bold leading-none sm:text-8xl" style={{ color: rank.color }}>
          {banner.level}
        </span>
      </motion.div>
      {banner.rankUp ? (
        <p className="font-display text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
          New rank: <span style={{ color: rank.color, textShadow: `0 0 18px ${rank.color}` }}>{rank.name}</span>
        </p>
      ) : (
        <p className="font-display text-xl font-semibold uppercase tracking-wider" style={{ color: rank.color }}>
          {rank.name}
        </p>
      )}
      <p className="mt-3 rounded-full border border-toxic/40 bg-black/60 px-4 py-1.5 font-mono text-lg font-bold neon-text-toxic">
        +{formatAmount(banner.bonus)} RBX bonus
      </p>
    </motion.div>
  );
}
