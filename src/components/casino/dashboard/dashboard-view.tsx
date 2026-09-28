"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/auth/actions";
import { Coin } from "@/components/casino/ui/coin";
import { GAME_ICONS, LogoutIcon } from "@/components/casino/ui/icons";
import { VipCard } from "@/components/casino/vip/level-badge";
import { GAMES } from "@/lib/casino/games";
import { formatAmount, formatMultiplier, formatNumber, formatPercent, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { PLINKO_RISKS } from "@/lib/games/plinko/payouts";
import { createFairnessData, useFairnessStore } from "@/lib/stores/fairness-store";
import { useWalletStore, type BetRecord } from "@/lib/stores/wallet-store";

export interface AccountInfo {
  name: string;
  email: string;
  memberSince: string;
  lastSignIn: string;
}

function betDetails(bet: BetRecord): string {
  switch (bet.game) {
    case "crash":
      return `Crashed at ${formatMultiplier(bet.crashPoint)} · ${bet.cashedOutAt ? `cashed out ${formatMultiplier(bet.cashedOutAt)}` : "no cashout"}`;
    case "limbo":
      return `Target ${formatMultiplier(bet.target)} · result ${formatMultiplier(bet.result)}`;
    case "mines":
      return `${bet.mines} mine${bet.mines === 1 ? "" : "s"} · ${bet.revealed} gem${bet.revealed === 1 ? "" : "s"}`;
    case "plinko":
      return `${bet.rows} rows · ${PLINKO_RISKS.find((r) => r.id === bet.risk)?.label} risk · slot ${bet.bin}`;
  }
}

function verifyHref(bet: BetRecord): string {
  const params = new URLSearchParams({
    game: bet.game,
    hash: bet.seeds.serverSeedHash,
    client: bet.seeds.clientSeed,
    nonce: String(bet.seeds.nonce),
  });
  if (bet.game === "mines") params.set("mines", String(bet.mines));
  if (bet.game === "plinko") {
    params.set("rows", String(bet.rows));
    params.set("risk", bet.risk);
  }
  return `/casino/fairness?${params.toString()}`;
}

export function DashboardView({ account }: { account: AccountInfo }) {
  const balance = useWalletStore((s) => s.balance);
  const stats = useWalletStore((s) => s.stats);
  const history = useWalletStore((s) => s.history);
  const refills = useWalletStore((s) => s.refills);
  const bonuses = useWalletStore((s) => s.bonuses);
  const revealedHashes = useFairnessStore((s) => s.revealed.map((seed) => seed.serverSeedHash).join(","));

  const winRate = stats.bets ? (stats.wins / stats.bets) * 100 : 0;
  const tiles = [
    { label: "Balance", value: `${formatAmount(balance)} RBX`, tone: "text-white" },
    { label: "Profit", value: `${formatSignedAmount(stats.profit)} RBX`, tone: stats.profit >= 0 ? "text-toxic" : "text-neon-red" },
    { label: "Wagered", value: `${formatAmount(stats.wagered)} RBX`, tone: "text-white" },
    { label: "Bets / win rate", value: `${formatNumber(stats.bets)} · ${formatPercent(winRate, 1)}`, tone: "text-white" },
    { label: "Biggest win", value: `${formatSignedAmount(stats.biggestWin)} RBX`, tone: "text-toxic" },
    { label: "Best multiplier", value: stats.biggestMultiplier ? formatMultiplier(stats.biggestMultiplier) : "–", tone: "text-gold" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="glass glass-edge relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-toxic/15 blur-[80px]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-toxic to-cyan font-display text-2xl font-bold text-black shadow-glow-toxic">
                {account.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-toxic">Dashboard</p>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{account.name}</h1>
                <p className="text-sm text-zinc-500">{account.email}</p>
              </div>
            </div>
            <form action={logout}>
              <button className="glass inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-zinc-200 transition hover:border-neon-red/50 hover:text-neon-red">
                <LogoutIcon className="size-4" /> Log out
              </button>
            </form>
          </div>
          <dl className="relative mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Member since</dt>
              <dd className="font-medium text-zinc-200">{account.memberSince}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Last sign-in</dt>
              <dd className="font-medium text-zinc-200">{account.lastSignIn}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Top-ups · bonuses</dt>
              <dd className="font-medium text-zinc-200">
                {refills} · {formatAmount(bonuses)} RBX
              </dd>
            </div>
          </dl>
        </section>
        <VipCard className="glass glass-edge" />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {tiles.map((tile, index) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="glass rounded-2xl px-4 py-3.5"
          >
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">{tile.label}</p>
            <p className={cn("mt-1 flex items-center gap-1.5 font-mono text-base font-semibold tabular", tile.tone)}>
              {index === 0 && <Coin className="size-4" />}
              {tile.value}
            </p>
          </motion.div>
        ))}
      </section>

      <section className="glass glass-edge rounded-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-zinc-300">Bet history</h2>
          <ResetButton />
        </header>
        {history.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            No bets yet.{" "}
            <Link href="/casino" className="text-toxic hover:underline">
              Go to the lobby
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-zinc-600">
                  <th className="px-5 py-3 font-medium">Game</th>
                  <th className="px-3 py-3 font-medium">Details</th>
                  <th className="px-3 py-3 text-right font-medium">Bet</th>
                  <th className="px-3 py-3 text-right font-medium">Multi</th>
                  <th className="px-3 py-3 text-right font-medium">Profit</th>
                  <th className="px-5 py-3 text-right font-medium">Fairness</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((bet) => {
                  const Icon = GAME_ICONS[bet.game];
                  const profit = bet.payout - bet.amount;
                  const verifiable = revealedHashes.includes(bet.seeds.serverSeedHash);
                  return (
                    <tr key={bet.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2 text-zinc-200">
                          <Icon className="size-4 text-toxic" /> {GAMES[bet.game].name}
                        </span>
                        <span className="text-[11px] text-zinc-600">{new Date(bet.createdAt).toLocaleTimeString("en-US")}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-zinc-400">{betDetails(bet)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-300 tabular">{formatAmount(bet.amount)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-300 tabular">{formatMultiplier(bet.multiplier)}</td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-mono font-semibold tabular",
                          profit > 0 ? "text-toxic" : profit < 0 ? "text-neon-red" : "text-zinc-400",
                        )}
                      >
                        {formatSignedAmount(profit)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Link
                          href={verifyHref(bet)}
                          className={cn(
                            "rounded-md px-2 py-1 text-xs transition",
                            verifiable ? "bg-toxic/10 text-toxic hover:bg-toxic/20" : "text-zinc-500 hover:text-zinc-200",
                          )}
                          title={verifiable ? "Server seed revealed: verify it now" : "Verifiable after rotating the seed pair"}
                        >
                          {verifiable ? "Verify ✓" : `Nonce ${bet.seeds.nonce}`}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Reset with an inline confirmation instead of a blocking browser dialog. */
function ResetButton() {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-neon-red/50 hover:text-neon-red"
      >
        Reset demo account
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-zinc-400">Reset balance to 1,000 RBX and clear all stats?</span>
      <button
        type="button"
        onClick={() => {
          useWalletStore.getState().reset();
          useFairnessStore.setState(createFairnessData());
          setConfirming(false);
        }}
        className="rounded-lg bg-neon-red px-3 py-1.5 font-medium text-white shadow-glow-red"
      >
        Yes, reset
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-zinc-300"
      >
        Cancel
      </button>
    </span>
  );
}
