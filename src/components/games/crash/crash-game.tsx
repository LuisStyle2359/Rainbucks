"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BetPanel, type BetAction, type BetMode } from "@/components/casino/bet-panel/bet-panel";
import { useAutoBet } from "@/components/casino/bet-panel/use-auto-bet";
import { DecimalField, formatTwoDecimals } from "@/components/casino/ui/decimal-field";
import { audio, type TensionVoice } from "@/lib/audio/audio-engine";
import { placeBet, refundBet, settleBet } from "@/lib/casino/bets";
import { calculatePayout, floorMultiplier, formatAmount, formatMultiplier, formatPercent } from "@/lib/casino/money";
import { CrashEngine, type CrashEvent, type CrashPhase } from "@/lib/games/crash/crash-engine";
import { clampTarget, limboWinChance } from "@/lib/games/limbo/limbo-math";
import { consumeSeeds } from "@/lib/stores/fairness-store";
import { useLiveStore } from "@/lib/stores/live-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useActiveGame } from "../use-active-game";
import { CrashCanvas } from "./crash-canvas";
import { CrashHistory } from "./crash-history";
import { CrashPlayers } from "./crash-players";

function playCrashSound(event: CrashEvent): void {
  switch (event.type) {
    case "countdown":
      audio.play("countdown", { pitch: event.secondsLeft === 1 ? 1.5 : 1, volume: 0.6 });
      break;
    case "crash":
      audio.play("explosion", { volume: event.hadBet ? 1 : 0.4 });
      break;
    case "cashout":
      audio.play("cashout");
      if (event.multiplier >= 10) audio.play("bigWin");
      break;
  }
}

function createEngine(): CrashEngine {
  return new CrashEngine({
    drawSeeds: consumeSeeds,
    debit: placeBet,
    refund: refundBet,
    settle: ({ amount, multiplier, seeds, crashPoint, cashedOutAt, autoCashout }) => {
      settleBet({ game: "crash", amount, multiplier, seeds, crashPoint, cashedOutAt, autoCashout });
    },
    me: () => useLiveStore.getState().me,
    onEvent: playCrashSound,
  });
}

const PHASE_TEXT: Record<CrashPhase, string> = {
  betting: "Einsätze offen",
  running: "Runde läuft",
  crashed: "Gecrasht",
};

export function CrashGame() {
  useActiveGame("crash");
  const [engine] = useState(createEngine);
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  const amount = useSettingsStore((s) => s.betAmounts.crash);
  const [mode, setMode] = useState<BetMode>("manual");
  const [autoCashout, setAutoCashout] = useState<number | null>(2);

  const cashoutLabelRef = useRef<HTMLSpanElement>(null);
  const tensionRef = useRef<TensionVoice | null>(null);

  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);

  useEffect(() => {
    const tension = tensionRef;
    return () => {
      tension.current?.stop();
      tension.current = null;
    };
  }, []);

  // Läuft in jedem Frame: Cashout-Betrag live aktualisieren, Spannungs-Sound steuern.
  // Direkter DOM-Zugriff statt React-State → keine 120 Re-Renders pro Sekunde.
  const onFrame = useCallback(
    (multiplier: number, phase: CrashPhase) => {
      const myBet = engine.getSnapshot().myBet;
      const active = phase === "running" && myBet?.status === "active";
      if (active && myBet) {
        const label = cashoutLabelRef.current;
        if (label) label.textContent = `${formatAmount(calculatePayout(myBet.amount, floorMultiplier(multiplier)))} RBX`;
        tensionRef.current ??= audio.startTension();
        tensionRef.current?.update(multiplier);
      } else if (tensionRef.current) {
        tensionRef.current.stop();
        tensionRef.current = null;
      }
    },
    [engine],
  );

  const auto = useAutoBet({
    delayMs: 100,
    run: async () => {
      const pending = engine.placeBet(amount, autoCashout ?? 2);
      if (!pending) return null;
      const result = await pending;
      return result.status === "refunded" ? null : result.profit;
    },
  });

  const { phase, myBet, queuedBet } = snapshot;
  let action: BetAction;
  if (phase === "running" && myBet?.status === "active") {
    action = {
      label: "Auszahlen",
      variant: "cashout",
      sublabel: <span ref={cashoutLabelRef}>{formatAmount(myBet.amount)} RBX</span>,
      onClick: () => engine.cashOut(),
    };
  } else if (queuedBet || (phase === "betting" && myBet?.status === "waiting")) {
    action = {
      label: "Abbrechen",
      sublabel: queuedBet ? "Wette für die nächste Runde" : "Wette platziert, Start gleich",
      variant: "ghost",
      onClick: () => engine.cancelBet(),
    };
  } else {
    action = {
      label: phase === "betting" ? "Wetten" : "Nächste Runde wetten",
      variant: "bet",
      onClick: () => {
        if (!engine.placeBet(amount, autoCashout)) audio.play("lose");
      },
    };
  }

  const locked = Boolean(queuedBet) || myBet?.status === "waiting" || myBet?.status === "active";

  return (
    <div className="grid gap-4 pb-60 lg:grid-cols-[340px_minmax(0,1fr)] lg:pb-0">
      <BetPanel
        game="crash"
        mode={mode}
        onModeChange={setMode}
        action={action}
        auto={auto}
        autoStartDisabled={autoCashout === null}
        autoHint="Setzt jede Runde automatisch und steigt beim Auto-Cashout aus."
        locked={locked}
        summary={autoCashout ? `Auto-Cashout ${formatMultiplier(autoCashout)}` : "Manueller Cashout"}
      >
        <DecimalField
          id="crash-auto-cashout"
          label="Auto-Cashout"
          hint={autoCashout ? `Chance ${formatPercent(limboWinChance(autoCashout))}` : "aus"}
          value={autoCashout}
          onChange={setAutoCashout}
          format={formatTwoDecimals}
          normalize={clampTarget}
          suffix="×"
          placeholder="aus"
          allowEmpty={mode === "manual"}
          disabled={locked || auto.running}
        />
      </BetPanel>

      <section className="flex min-w-0 flex-col gap-4">
        <CrashHistory history={snapshot.history} />
        <div className="glass glass-edge relative overflow-hidden rounded-2xl">
          <CrashCanvas engine={engine} onFrame={onFrame} className="aspect-[4/3] sm:aspect-[16/10]" />
          <p className="sr-only" aria-live="polite">
            {PHASE_TEXT[phase]}
            {phase === "crashed" && snapshot.crashPoint ? ` bei ${formatMultiplier(snapshot.crashPoint)}` : ""}
          </p>
        </div>
        <CrashPlayers snapshot={snapshot} />
      </section>
    </div>
  );
}
