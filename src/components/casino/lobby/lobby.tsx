"use client";

import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useRef, type ComponentType, type PointerEvent, type ReactNode } from "react";
import { FreeSpinCard } from "@/components/casino/bonus/bonus-wheel";
import { LiveFeed } from "@/components/casino/shell/live-feed";
import { Coin } from "@/components/casino/ui/coin";
import { GAME_ICONS, TrophyIcon } from "@/components/casino/ui/icons";
import { VipCard } from "@/components/casino/vip/level-badge";
import { audio } from "@/lib/audio/audio-engine";
import { GAME_IDS, GAMES, type GameId } from "@/lib/casino/games";
import { formatAmount, formatCompactAmount, formatMultiplier, formatNumber, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { useLiveStore } from "@/lib/stores/live-store";
import { useWalletStore } from "@/lib/stores/wallet-store";
import { GameArt } from "./game-art";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};

/** Link component from outside: next/link in the app, plain anchors in the demo. */
export type LobbyLink = ComponentType<{
  href: string;
  className?: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  children: ReactNode;
}>;

export type LobbyTarget = GameId | "fairness";

export function Lobby({ Link, hrefFor }: { Link: LobbyLink; hrefFor: (target: LobbyTarget) => string }) {
  const name = useLiveStore((s) => s.me?.name ?? "Player");
  const balance = useWalletStore((s) => s.balance);
  const stats = useWalletStore((s) => s.stats);

  const tiles = [
    { label: "Balance", value: `${formatAmount(balance)} RBX`, tone: "text-white", coin: true },
    {
      label: "Total profit",
      value: `${formatSignedAmount(stats.profit)} RBX`,
      tone: stats.profit >= 0 ? "text-toxic" : "text-neon-red",
      coin: false,
    },
    { label: "Bets", value: formatNumber(stats.bets), tone: "text-white", coin: false },
    {
      label: "Best multiplier",
      value: stats.biggestMultiplier ? formatMultiplier(stats.biggestMultiplier) : "–",
      tone: "text-gold",
      coin: false,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Hero */}
        <motion.section
          variants={item}
          className="glass glass-edge relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-12"
        >
          <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_right,transparent,black_60%)]" />
          <div className="pointer-events-none absolute -right-20 -top-20 size-96 animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(57_255_20/0.25),transparent)]" />
          <div className="relative max-w-xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-toxic/30 bg-toxic/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-toxic">
              <span className="size-1.5 animate-glow-pulse rounded-full bg-toxic" /> Live simulation
            </p>
            <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-5xl">
              Welcome back,
              <br />
              <span className="neon-text-toxic">{name}</span>
            </h1>
            <p className="mt-4 max-w-md text-zinc-400">
              Four games, one wallet, everything provably fair. You play with virtual Rainbucks. There is no real money
              here.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={hrefFor("crash")}
                onClick={() => audio.play("bet")}
                className="relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-toxic px-6 font-display text-sm font-bold uppercase tracking-wider text-black shadow-glow-toxic transition animate-glow-breathe hover:-translate-y-0.5"
              >
                Play Crash
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sweep bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.75),transparent)] mix-blend-overlay"
                />
              </Link>
              <Link
                href={hrefFor("fairness")}
                className="glass inline-flex h-12 items-center rounded-xl px-6 text-sm font-medium text-zinc-200 transition hover:border-toxic/40 hover:text-white"
              >
                How is this fair?
              </Link>
            </div>
          </div>
        </motion.section>

        <motion.div variants={item} className="flex flex-col gap-4">
          <VipCard className="glass glass-edge flex-1" />
          <FreeSpinCard />
        </motion.div>
      </div>

      <motion.div variants={item}>
        <TopWins />
      </motion.div>

      {/* Stats */}
      <motion.section variants={item} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="glass rounded-2xl px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">{tile.label}</p>
            <p className={cn("mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold tabular", tile.tone)}>
              {tile.coin && <Coin className="size-4" />}
              {tile.value}
            </p>
          </div>
        ))}
      </motion.section>

      {/* Games */}
      <motion.section variants={item}>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">Games</h2>
        <div className="grid grid-cols-1 gap-4 [perspective:1200px] sm:grid-cols-2 2xl:grid-cols-4">
          {GAME_IDS.map((id) => {
            const game = GAMES[id];
            const Icon = GAME_ICONS[id];
            return (
              <TiltCard key={id}>
                <Link
                  href={hrefFor(id)}
                  onClick={() => audio.play("click")}
                  onPointerEnter={() => audio.play("hover")}
                  className="glass glass-edge block overflow-hidden rounded-2xl transition-shadow group-hover:shadow-glow-toxic"
                >
                  <div className="relative h-36 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3">
                    <GameArt game={id} />
                    <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                      {game.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-toxic/10 text-toxic ring-1 ring-toxic/25 transition group-hover:bg-toxic group-hover:text-black">
                      <Icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold uppercase tracking-wider text-white">{game.name}</p>
                      <p className="truncate text-xs text-zinc-500">{game.description}</p>
                    </div>
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-toxic transition group-hover:translate-x-1">
                      Play →
                    </span>
                  </div>
                </Link>
              </TiltCard>
            );
          })}
        </div>
      </motion.section>

      {/* Live */}
      <motion.section variants={item} className="glass glass-edge rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-zinc-300">Live bets</h2>
          <span className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="size-1.5 animate-glow-pulse rounded-full bg-toxic" /> real time (simulated)
          </span>
        </header>
        <div className="max-h-96 overflow-hidden">
          <LiveFeed limit={12} />
        </div>
      </motion.section>
    </motion.div>
  );
}

/** Card that tilts towards the mouse, with a glare that follows the pointer. */
function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, { stiffness: 260, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 22 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.14), transparent 55%)`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateY.set((x - 0.5) * 14);
    rotateX.set((0.5 - y) * 12);
    glareX.set(x * 100);
    glareY.set(y * 100);
  };
  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      style={{ rotateX, rotateY }}
      className="group relative min-w-0 [transform-style:preserve-3d]"
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glare }}
      />
    </motion.div>
  );
}

/** Strip of the latest big wins from the (simulated) live feed. */
function TopWins() {
  const feed = useLiveStore((s) => s.feed);
  const wins = feed.filter((bet) => bet.multiplier >= 2 && bet.payout > bet.amount).slice(0, 10);

  return (
    <section className="glass relative flex items-center gap-3 overflow-hidden rounded-2xl py-2.5 pl-4">
      <span className="flex shrink-0 items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">
        <TrophyIcon className="size-4" />
        <span className="hidden sm:inline">Big wins</span>
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,black_85%,transparent)]">
        <ul className="flex gap-2">
          {wins.length === 0 && <li className="py-1 text-xs text-zinc-600">Waiting for the first big win …</li>}
          <AnimatePresence initial={false} mode="popLayout">
            {wins.map((bet) => {
              const Icon = GAME_ICONS[bet.game];
              const hot = bet.multiplier >= 10;
              return (
                <motion.li
                  key={bet.id}
                  layout
                  initial={{ opacity: 0, x: -24, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1 text-xs",
                    bet.user.isYou
                      ? "border-toxic/40 bg-toxic/10"
                      : hot
                        ? "border-gold/35 bg-gold/[0.08]"
                        : "border-white/[0.06] bg-white/[0.03]",
                  )}
                >
                  <Icon className="size-3.5 text-zinc-500" />
                  <span className="max-w-24 truncate" style={{ color: bet.user.isYou ? undefined : bet.user.color }}>
                    {bet.user.isYou ? <span className="font-semibold text-white">You</span> : bet.user.name}
                  </span>
                  <span className={cn("font-mono font-semibold tabular", hot ? "text-gold" : "text-zinc-200")}>
                    {formatMultiplier(bet.multiplier)}
                  </span>
                  <span className="font-mono font-semibold text-toxic tabular">
                    +{formatCompactAmount(bet.payout - bet.amount)}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
      <span className="mr-3 shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-zinc-500">
        simulated
      </span>
    </section>
  );
}
