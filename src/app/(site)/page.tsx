import Link from "next/link";
import { GameArt } from "@/components/casino/lobby/game-art";
import { GAME_IDS, GAMES } from "@/lib/casino/games";

const FEATURES = [
  {
    title: "Provably Fair",
    text: "Every result comes from HMAC-SHA256 over server seed, client seed and nonce. You can recompute all of it.",
  },
  {
    title: "60–120 FPS",
    text: "Crash, Plinko and the win effects run on HTML5 canvas with a particle system, separate from the DOM.",
  },
  {
    title: "Sound design",
    text: "Clicks, rising tension, explosions and coin chimes, synthesized live with the Web Audio API.",
  },
  {
    title: "VIP levels & free spins",
    text: "Level up as you play, climb seven ranks and spin the free bonus wheel every hour. All play money.",
  },
  {
    title: "Live feeling",
    text: "Chat and a real-time feed of other players' bets, simulated through a Socket.io-style interface.",
  },
  {
    title: "Big win moments",
    text: "Coins fly into your balance, confetti rains down, and big, mega and epic wins get their own screen.",
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 text-center sm:pt-24">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-toxic/30 bg-toxic/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-toxic">
          <span className="size-1.5 animate-glow-pulse rounded-full bg-toxic" /> Demo with virtual play money
        </p>
        <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold uppercase leading-[1.05] tracking-wide text-white sm:text-7xl">
          Crypto casino.
          <br />
          <span className="neon-text-toxic">Zero risk.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          Crash, Mines, Limbo and Plinko in an OLED neon look. You start with 1,000 Rainbucks. There is no real money
          here, neither in nor out.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-13 items-center justify-center rounded-xl bg-toxic px-8 font-display font-bold uppercase tracking-wider text-black shadow-glow-toxic transition hover:-translate-y-0.5"
          >
            Play for free
          </Link>
          <Link
            href="/login"
            className="glass inline-flex h-13 items-center justify-center rounded-xl px-8 font-medium text-zinc-200 transition hover:border-toxic/40 hover:text-white"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {GAME_IDS.map((id) => (
          <div key={id} className="glass glass-edge overflow-hidden rounded-2xl">
            <div className="h-32 border-b border-white/[0.06] p-3">
              <GameArt game={id} />
            </div>
            <div className="p-4">
              <p className="font-display text-lg font-bold uppercase tracking-wider text-white">{GAMES[id].name}</p>
              <p className="mt-1 text-sm text-zinc-500">{GAMES[id].description}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="glass rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-toxic">{feature.title}</h2>
            <p className="mt-2 text-zinc-400">{feature.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-5 text-sm leading-relaxed text-zinc-300">
          <span className="font-semibold text-gold">Important:</span> Rainbucks is a portfolio project and a pure
          simulator. All amounts are virtual (RBX). There are no deposits, no withdrawals and no real-money value.
        </div>
      </section>
    </>
  );
}
