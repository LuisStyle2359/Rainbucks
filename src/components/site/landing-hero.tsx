"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { FloatingScene } from "@/components/fx/floating-scene";
import { PerspectiveGrid } from "@/components/fx/perspective-grid";

const rise = {
  hidden: { opacity: 0, y: 24, rotateX: -50 },
  show: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring" as const, stiffness: 140, damping: 18 } },
};

/** Landing hero: the headline swings up word by word over a floating 3D casino scene. */
export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <FloatingScene className="-z-10" />
      <PerspectiveGrid className="-z-20 h-[46%]" />

      <motion.div
        className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-24 text-center sm:pb-32 [perspective:900px]"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
      >
        <motion.p
          variants={rise}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-toxic/30 bg-toxic/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-toxic backdrop-blur"
        >
          <span className="size-1.5 animate-glow-pulse rounded-full bg-toxic" /> Demo with virtual play money
        </motion.p>
        <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold uppercase leading-[1.05] tracking-wide text-white sm:text-7xl [transform-style:preserve-3d]">
          {["Crypto", "casino."].map((word) => (
            <motion.span key={word} variants={rise} className="mr-[0.25em] inline-block origin-bottom">
              {word}
            </motion.span>
          ))}
          <br />
          {["Zero", "risk."].map((word) => (
            <motion.span key={word} variants={rise} className="neon-text-toxic mr-[0.25em] inline-block origin-bottom">
              {word}
            </motion.span>
          ))}
        </h1>
        <motion.p variants={rise} className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          Crash, Mines, Limbo, Plinko, Blackjack and Roulette in an OLED neon look. You start with 1,000 Rainbucks. There
          is no real money here, neither in nor out.
        </motion.p>
        <motion.div variants={rise} className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="relative inline-flex h-13 items-center justify-center overflow-hidden rounded-xl bg-toxic px-8 font-display font-bold uppercase tracking-wider text-black shadow-[0_5px_0_0_#178000,0_0_28px_-4px_rgb(57_255_20/0.6)] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_0_#178000,0_0_28px_-4px_rgb(57_255_20/0.6)]"
          >
            Play for free
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sweep bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.75),transparent)] mix-blend-overlay"
            />
          </Link>
          <Link
            href="/login"
            className="glass inline-flex h-13 items-center justify-center rounded-xl px-8 font-medium text-zinc-200 transition hover:border-toxic/40 hover:text-white"
          >
            I already have an account
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
