"use client";

import { animate, AnimatePresence, motion, type AnimationPlaybackControls } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { Coin } from "@/components/casino/ui/coin";
import { formatAmount, formatSignedAmount, STARTING_BALANCE } from "@/lib/casino/money";
import { useWalletStore } from "@/lib/stores/wallet-store";

/**
 * Kontostand, der bei Änderungen hoch- bzw. runterzählt.
 * Die Zahl wird direkt im DOM aktualisiert (kein React-Render pro Frame),
 * Gewinne blenden kurz ein grünes "+Betrag" ein.
 */
export function Balance() {
  const valueRef = useRef<HTMLSpanElement>(null);
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);
  const lowBalance = useWalletStore((s) => s.balance < 1_00);
  const refill = useWalletStore((s) => s.refill);

  useLayoutEffect(() => {
    let shown = useWalletStore.getState().balance;
    let controls: AnimationPlaybackControls | null = null;
    const write = (cents: number) => {
      if (valueRef.current) valueRef.current.textContent = formatAmount(Math.round(cents));
    };
    write(shown);

    const unsubscribe = useWalletStore.subscribe((state, previous) => {
      if (state.balance === previous.balance) return;
      const from = shown;
      const to = state.balance;
      controls?.stop();
      controls = animate(from, to, {
        duration: Math.abs(to - from) > 50_000 ? 0.9 : 0.45,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (value) => {
          shown = value;
          write(value);
        },
      });
      const delta = to - previous.balance;
      if (delta > 0) setGain({ id: performance.now(), amount: delta });
    });

    return () => {
      controls?.stop();
      unsubscribe();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="glass flex h-10 items-center gap-2 rounded-xl pl-2.5 pr-3.5 shadow-[inset_0_0_0_1px_rgb(57_255_20/0.12)]">
          <Coin className="size-5" />
          <span ref={valueRef} data-testid="balance" className="font-mono text-sm font-semibold text-white tabular sm:text-[15px]" />
          <span className="hidden text-[11px] font-medium text-zinc-500 sm:inline">RBX</span>
        </div>
        <AnimatePresence>
          {gain && (
            <motion.span
              key={gain.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: [0, 1, 1, 0], y: -12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, times: [0, 0.15, 0.7, 1] }}
              onAnimationComplete={() => setGain((current) => (current?.id === gain.id ? null : current))}
              className="pointer-events-none absolute -top-2 right-3 whitespace-nowrap font-mono text-xs font-bold neon-text-toxic"
            >
              {formatSignedAmount(gain.amount)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {lowBalance && (
        <motion.button
          type="button"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={refill}
          className="h-10 rounded-xl bg-toxic px-3 font-display text-xs font-bold uppercase tracking-wider text-black shadow-glow-toxic"
          title="Demo-Spielgeld auffüllen"
        >
          +{formatAmount(STARTING_BALANCE).replace(",00", "")}
        </motion.button>
      )}
    </div>
  );
}
