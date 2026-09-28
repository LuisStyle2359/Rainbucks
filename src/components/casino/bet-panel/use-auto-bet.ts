"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AutoBetConfig {
  /** Number of rounds, 0 = unlimited */
  rounds: number;
  /** Stop as soon as the profit (cents) reaches this value */
  stopOnProfit: number | null;
  /** Stop as soon as the loss (cents) reaches this value */
  stopOnLoss: number | null;
}

export interface AutoBetState {
  running: boolean;
  played: number;
  /** Net profit of this auto session in cents */
  profit: number;
  rounds: number;
}

export interface AutoBetControls extends AutoBetState {
  start: (config: AutoBetConfig) => void;
  stop: () => void;
}

interface UseAutoBetOptions {
  /**
   * Plays one round and returns the profit in cents (payout − stake),
   * or null if no bet was possible (e.g. balance too low).
   */
  run: () => Promise<number | null>;
  /** Pause zwischen zwei Runden in ms */
  delayMs: number;
  /**
   * sequential: next round only after settling (Limbo, Mines, Crash)
   * interval:   new round every delayMs, settling runs in parallel (Plinko balls)
   */
  mode?: "sequential" | "interval";
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useAutoBet({ run, delayMs, mode = "sequential" }: UseAutoBetOptions): AutoBetControls {
  const [state, setState] = useState<AutoBetState>({ running: false, played: 0, profit: 0, rounds: 0 });
  const runRef = useRef(run);
  const delayRef = useRef(delayMs);
  const sessionRef = useRef(0);

  useEffect(() => {
    runRef.current = run;
    delayRef.current = delayMs;
  });

  // No auto bet session keeps running after leaving the page.
  useEffect(() => {
    const sessions = sessionRef;
    return () => {
      sessions.current++;
    };
  }, []);

  const stop = useCallback(() => {
    sessionRef.current++;
    setState((current) => ({ ...current, running: false }));
  }, []);

  const start = useCallback(
    (config: AutoBetConfig) => {
      const session = ++sessionRef.current;
      const alive = () => sessionRef.current === session;
      let played = 0;
      let profit = 0;

      setState({ running: true, played: 0, profit: 0, rounds: config.rounds });

      const finish = () => {
        if (!alive()) return;
        sessionRef.current++;
        setState((current) => ({ ...current, running: false }));
      };

      /** Books a result. Returns whether to keep playing. */
      const account = (result: number | null): boolean => {
        if (result === null) return false;
        played++;
        profit += result;
        setState((current) => ({ ...current, played, profit }));
        if (config.rounds > 0 && played >= config.rounds) return false;
        if (config.stopOnProfit !== null && profit >= config.stopOnProfit) return false;
        if (config.stopOnLoss !== null && -profit >= config.stopOnLoss) return false;
        return true;
      };

      if (mode === "sequential") {
        void (async () => {
          while (alive()) {
            const result = await runRef.current();
            if (!alive()) return;
            if (!account(result)) return finish();
            await sleep(delayRef.current);
          }
        })();
        return;
      }

      // interval: balls drop on a beat, results arrive later
      let launched = 0;
      let inFlight = 0;
      const launch = () => {
        if (!alive()) return;
        if (config.rounds > 0 && launched >= config.rounds) return;
        launched++;
        inFlight++;
        const pending = runRef.current();
        setTimeout(launch, delayRef.current);
        void pending.then((result) => {
          inFlight--;
          if (!alive()) return;
          if (!account(result)) finish();
          else if (config.rounds > 0 && played >= config.rounds && inFlight === 0) finish();
        });
      };
      launch();
    },
    [mode],
  );

  return { ...state, start, stop };
}
