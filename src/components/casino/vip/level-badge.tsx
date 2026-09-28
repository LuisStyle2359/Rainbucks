"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { audio } from "@/lib/audio/audio-engine";
import { levelFromXp, levelUpBonus, nextRank, rankFor, RANKS, xpFromWagered } from "@/lib/casino/levels";
import { formatAmount, formatNumber } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { useWalletStore } from "@/lib/stores/wallet-store";

function useLevel() {
  const wagered = useWalletStore((s) => s.stats.wagered);
  const progress = levelFromXp(xpFromWagered(wagered));
  return { ...progress, rank: rankFor(progress.level), next: nextRank(progress.level) };
}

/** Circular XP ring. Remounts per level, so a level-up fills it from zero. */
function ProgressRing({ progress, color, size, stroke }: { progress: number; color: string; size: number; stroke: number }) {
  const radius = (size - stroke) / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden className="absolute inset-0 size-full -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: Math.max(0.02, progress) }}
        transition={{ type: "spring", stiffness: 70, damping: 18 }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

/** User avatar wrapped in the XP ring, with the level as a small tag. */
export function LevelAvatar({ name }: { name: string }) {
  const { level, progress, rank } = useLevel();
  return (
    <span className="relative grid size-8 shrink-0 place-items-center" title={`Level ${level} · ${rank.name}`}>
      <ProgressRing key={level} progress={progress} color={rank.color} size={32} stroke={2.5} />
      <span className="grid size-[22px] place-items-center rounded-full bg-gradient-to-br from-toxic to-cyan font-display text-[11px] font-bold text-black">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <motion.span
        key={level}
        initial={{ scale: 1.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 14 }}
        className="absolute -bottom-1 -right-1.5 rounded-md border border-black bg-ink-800 px-1 font-mono text-[9px] font-bold leading-[14px]"
        style={{ color: rank.color }}
      >
        {level}
      </motion.span>
    </span>
  );
}

/** Level ring for the top bar. Opens the VIP card. */
export function LevelBadge() {
  const { level, progress, rank } = useLevel();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Level ${level} · ${rank.name}. Show VIP progress`}
        onClick={() => {
          audio.play("click");
          setOpen((value) => !value);
        }}
        className="glass relative grid size-10 place-items-center rounded-xl transition hover:border-white/20"
      >
        <span className="absolute inset-[3px]">
          <ProgressRing key={level} progress={progress} color={rank.color} size={34} stroke={3} />
        </span>
        <motion.span
          key={level}
          initial={{ scale: 1.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 14 }}
          className="relative font-display text-[13px] font-bold tabular"
          style={{ color: rank.color }}
        >
          {level}
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="VIP progress"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-10 w-80 origin-top-right max-sm:fixed max-sm:inset-x-3 max-sm:top-[4.25rem] max-sm:w-auto"
          >
            <VipCard className="border border-white/10 bg-ink-900 shadow-glow-soft" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Rank, level progress, next bonus and the rank ladder. */
export function VipCard({ className }: { className?: string }) {
  const { level, current, needed, progress, rank, next } = useLevel();
  const bonuses = useWalletStore((s) => s.bonuses);

  return (
    <section className={cn("rounded-2xl p-4", className)}>
      <div className="flex items-center gap-3">
        <div className="relative grid size-14 shrink-0 place-items-center">
          <ProgressRing key={level} progress={progress} color={rank.color} size={56} stroke={4} />
          <span className="font-display text-xl font-bold" style={{ color: rank.color }}>
            {level}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">VIP rank</p>
          <p className="font-display text-lg font-bold uppercase tracking-wide" style={{ color: rank.color, textShadow: `0 0 16px ${rank.color}66` }}>
            {rank.name}
          </p>
        </div>
        <p className="ml-auto text-right text-xs text-zinc-500">
          Level
          <span className="block font-mono text-base font-semibold text-white">{level}</span>
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between font-mono text-[11px] text-zinc-400">
          <span>
            {formatNumber(current)} / {formatNumber(needed)} XP
          </span>
          <span>{formatNumber(needed - current)} XP to go</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            key={level}
            className="relative h-full rounded-full"
            style={{ backgroundColor: rank.color, boxShadow: `0 0 12px ${rank.color}` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, progress * 100)}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 18 }}
          >
            <span className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.55),transparent)] bg-[length:200%_100%]" />
          </motion.div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
          <dt className="text-zinc-500">Next level bonus</dt>
          <dd className="font-mono font-semibold text-toxic">+{formatAmount(levelUpBonus(level + 1))} RBX</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2">
          <dt className="text-zinc-500">Bonuses received</dt>
          <dd className="font-mono font-semibold text-zinc-100">{formatAmount(bonuses)} RBX</dd>
        </div>
      </dl>

      {/* Rank ladder */}
      <ol className="mt-4 flex items-center justify-between gap-1" aria-label="Ranks">
        {RANKS.map((item) => {
          const reached = level >= item.minLevel;
          const isCurrent = item.name === rank.name;
          return (
            <li key={item.name} className="flex flex-1 flex-col items-center gap-1" title={`${item.name} · level ${item.minLevel}`}>
              <span
                className={cn("size-3 rounded-full border transition", isCurrent && "scale-125")}
                style={{
                  backgroundColor: reached ? item.color : "transparent",
                  borderColor: item.color,
                  boxShadow: isCurrent ? `0 0 12px ${item.color}` : undefined,
                  opacity: reached ? 1 : 0.4,
                }}
              />
              <span className={cn("text-[9px] uppercase tracking-wide", isCurrent ? "text-white" : "text-zinc-600")}>
                {item.minLevel}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        {next ? (
          <>
            Next rank: <span style={{ color: next.color }}>{next.name}</span> at level {next.minLevel}.{" "}
          </>
        ) : (
          "Top rank reached. "
        )}
        1 XP per 1 RBX wagered · play money only.
      </p>
    </section>
  );
}
