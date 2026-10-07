import { GameArt } from "@/components/casino/lobby/game-art";
import { Reveal } from "@/components/fx/reveal";
import { TiltCard } from "@/components/fx/tilt-card";
import { LandingHero } from "@/components/site/landing-hero";
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
      <LandingHero />

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_IDS.map((id, i) => (
          <Reveal key={id} delay={(i % 3) * 0.08}>
            <TiltCard>
              <div className="glass glass-edge overflow-hidden rounded-2xl transition-shadow group-hover:shadow-glow-toxic">
                <div className="h-32 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3">
                  <GameArt game={id} />
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-bold uppercase tracking-wider text-white">{GAMES[id].name}</p>
                  <p className="mt-1 text-sm text-zinc-500">{GAMES[id].description}</p>
                </div>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={(i % 3) * 0.08}>
            <TiltCard max={8} lift={4} className="h-full">
              <div className="glass h-full rounded-2xl p-6">
                <h2 className="font-display text-lg font-bold uppercase tracking-wider text-toxic">{feature.title}</h2>
                <p className="mt-2 text-zinc-400">{feature.text}</p>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <Reveal depth={0.5}>
          <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-5 text-sm leading-relaxed text-zinc-300">
            <span className="font-semibold text-gold">Important:</span> Rainbucks is a portfolio project and a pure
            simulator. All amounts are virtual (RBX). There are no deposits, no withdrawals and no real-money value.
          </div>
        </Reveal>
      </section>
    </>
  );
}
