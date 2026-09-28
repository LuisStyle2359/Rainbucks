"use client";

import { animate, AnimatePresence, motion, useAnimate, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Coin } from "@/components/casino/ui/coin";
import { BALANCE_POP_EVENT, takeBalanceHold } from "@/lib/casino/balance-sync";
import { formatAmount, formatNumber, formatSignedAmount, STARTING_BALANCE } from "@/lib/casino/money";
import { useWalletStore } from "@/lib/stores/wallet-store";

/**
 * Balance that counts up and down on changes.
 * The number is written straight into the DOM (no React render per frame).
 * Wins wait for the flying coins: the counter rolls while they land,
 * every coin makes the pill pop, and a green "+amount" floats up.
 */
export function Balance() {
  const valueRef = useRef<HTMLSpanElement>(null);
  const [pillScope, animatePill] = useAnimate<HTMLDivElement>();
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);
  const lowBalance = useWalletStore((s) => s.balance < 1_00);
  const refill = useWalletStore((s) => s.refill);

  useLayoutEffect(() => {
    let shown = useWalletStore.getState().balance;
    let target = shown;
    let controls: AnimationPlaybackControls | null = null;
    let gainTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const write = (cents: number) => {
      if (valueRef.current) valueRef.current.textContent = formatAmount(Math.round(cents));
    };
    write(shown);

    const unsubscribe = useWalletStore.subscribe((state, previous) => {
      if (state.balance === previous.balance) return;
      // One microtask later: by then a win celebration has announced its coins.
      queueMicrotask(() => {
        if (disposed) return;
        const to = useWalletStore.getState().balance;
        if (to === target) return;
        const delta = to - target;
        target = to;
        const hold = delta > 0 ? takeBalanceHold() : null;
        controls?.stop();
        controls = animate(shown, to, {
          delay: hold ? hold.delay / 1000 : 0,
          duration: hold ? Math.max(0.35, hold.duration / 1000) : Math.abs(delta) > 50_000 ? 0.9 : 0.45,
          ease: hold ? [0.3, 0.1, 0.4, 1] : [0.16, 1, 0.3, 1],
          onUpdate: (value) => {
            shown = value;
            write(value);
          },
        });
        if (delta > 0) {
          clearTimeout(gainTimer);
          gainTimer = setTimeout(() => setGain({ id: performance.now(), amount: delta }), hold?.delay ?? 0);
        }
      });
    });

    return () => {
      disposed = true;
      clearTimeout(gainTimer);
      controls?.stop();
      unsubscribe();
    };
  }, []);

  // Every landing coin gives the pill a little kick
  useEffect(() => {
    const pop = () => {
      if (!pillScope.current) return;
      void animatePill(
        pillScope.current,
        { scale: [1.12, 1], boxShadow: ["inset 0 0 0 1px rgb(57 255 20 / 0.7), 0 0 26px -2px rgb(57 255 20 / 0.8)", "inset 0 0 0 1px rgb(57 255 20 / 0.12), 0 0 0px 0px rgb(57 255 20 / 0)"] },
        { duration: 0.32, ease: "easeOut" },
      );
    };
    window.addEventListener(BALANCE_POP_EVENT, pop);
    return () => window.removeEventListener(BALANCE_POP_EVENT, pop);
  }, [animatePill, pillScope]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          ref={pillScope}
          className="glass flex h-9 items-center gap-2 rounded-xl pl-2 pr-3 shadow-[inset_0_0_0_1px_rgb(57_255_20/0.12)] sm:h-10 sm:pl-2.5 sm:pr-3.5"
        >
          <span data-coin-target className="grid place-items-center">
            <Coin className="size-5" />
          </span>
          <span ref={valueRef} data-testid="balance" className="font-mono text-sm font-semibold text-white tabular sm:text-[15px]" />
          <span className="hidden text-[11px] font-medium text-zinc-500 sm:inline">RBX</span>
        </div>
        <AnimatePresence>
          {gain && (
            <motion.span
              key={gain.id}
              initial={{ opacity: 0, y: 4, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1, 0], y: -16, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, times: [0, 0.15, 0.7, 1] }}
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
          className="h-9 rounded-xl bg-toxic px-3 font-display text-xs font-bold uppercase tracking-wider text-black shadow-glow-toxic sm:h-10"
          title="Top up the demo play money"
        >
          +{formatNumber(STARTING_BALANCE / 100)}
        </motion.button>
      )}
    </div>
  );
}
