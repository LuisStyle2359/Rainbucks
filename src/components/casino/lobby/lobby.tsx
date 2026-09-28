"use client";

import { motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { LiveFeed } from "@/components/casino/shell/live-feed";
import { Coin } from "@/components/casino/ui/coin";
import { GAME_ICONS } from "@/components/casino/ui/icons";
import { audio } from "@/lib/audio/audio-engine";
import { GAME_IDS, GAMES, type GameId } from "@/lib/casino/games";
import { formatAmount, formatMultiplier, formatSignedAmount } from "@/lib/casino/money";
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

/** Link-Komponente von außen: next/link in der App, einfache Anker in der Demo. */
export type LobbyLink = ComponentType<{
  href: string;
  className?: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  children: ReactNode;
}>;

export type LobbyTarget = GameId | "fairness";

export function Lobby({ Link, hrefFor }: { Link: LobbyLink; hrefFor: (target: LobbyTarget) => string }) {
  const name = useLiveStore((s) => s.me?.name ?? "Spieler");
  const balance = useWalletStore((s) => s.balance);
  const stats = useWalletStore((s) => s.stats);

  const tiles = [
    { label: "Guthaben", value: `${formatAmount(balance)} RBX`, tone: "text-white" },
    { label: "Profit gesamt", value: `${formatSignedAmount(stats.profit)} RBX`, tone: stats.profit >= 0 ? "text-toxic" : "text-neon-red" },
    { label: "Wetten", value: stats.bets.toLocaleString("de-DE"), tone: "text-white" },
    { label: "Bester Multiplikator", value: stats.biggestMultiplier ? formatMultiplier(stats.biggestMultiplier) : "–", tone: "text-gold" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero */}
      <motion.section
        variants={item}
        className="glass glass-edge relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-12"
      >
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_right,transparent,black_60%)]" />
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-toxic/20 blur-[90px]" />
        <div className="relative max-w-xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-toxic/30 bg-toxic/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-toxic">
            <span className="size-1.5 animate-glow-pulse rounded-full bg-toxic" /> Live-Simulation
          </p>
          <h1 className="font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-5xl">
            Willkommen zurück,
            <br />
            <span className="neon-text-toxic">{name}</span>
          </h1>
          <p className="mt-4 max-w-md text-zinc-400">
            Vier Spiele, eine Wallet, alles Provably Fair. Gespielt wird mit virtuellen Rainbucks, echtes Geld gibt es hier nicht.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={hrefFor("crash")}
              onClick={() => audio.play("bet")}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-toxic px-6 font-display text-sm font-bold uppercase tracking-wider text-black shadow-glow-toxic transition hover:-translate-y-0.5"
            >
              Crash starten
            </Link>
            <Link
              href={hrefFor("fairness")}
              className="glass inline-flex h-12 items-center rounded-xl px-6 text-sm font-medium text-zinc-200 transition hover:border-toxic/40 hover:text-white"
            >
              Wie ist das fair?
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Statistik */}
      <motion.section variants={item} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="glass rounded-2xl px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">{tile.label}</p>
            <p className={cn("mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold tabular", tile.tone)}>
              {tile.label === "Guthaben" && <Coin className="size-4" />}
              {tile.value}
            </p>
          </div>
        ))}
      </motion.section>

      {/* Spiele */}
      <motion.section variants={item}>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">Spiele</h2>
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {GAME_IDS.map((id) => {
            const game = GAMES[id];
            const Icon = GAME_ICONS[id];
            return (
              <motion.div key={id} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 400, damping: 26 }}>
                <Link
                  href={hrefFor(id)}
                  onClick={() => audio.play("click")}
                  onPointerEnter={() => audio.play("hover")}
                  className="glass glass-edge group block overflow-hidden rounded-2xl transition-shadow hover:shadow-glow-toxic"
                >
                  <div className="relative h-36 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3">
                    <GameArt game={id} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <span className="grid size-9 place-items-center rounded-lg bg-toxic/10 text-toxic ring-1 ring-toxic/25">
                      <Icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-bold uppercase tracking-wider text-white">{game.name}</p>
                      <p className="truncate text-xs text-zinc-500">{game.description}</p>
                    </div>
                    <span className="text-toxic transition group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Live */}
      <motion.section variants={item} className="glass glass-edge rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-zinc-300">Live-Wetten</h2>
          <span className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="size-1.5 animate-glow-pulse rounded-full bg-toxic" /> in Echtzeit (simuliert)
          </span>
        </header>
        <div className="max-h-96 overflow-hidden">
          <LiveFeed limit={12} />
        </div>
      </motion.section>
    </motion.div>
  );
}
