"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BetPanel, type BetAction } from "@/components/casino/bet-panel/bet-panel";
import { audio, vibrate } from "@/lib/audio/audio-engine";
import { placeBet, settleBet } from "@/lib/casino/bets";
import type { BlackjackResult } from "@/lib/casino/games";
import { formatAmount, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { BlackjackGame, handValue } from "@/lib/games/blackjack/blackjack-game";
import { consumeSeeds } from "@/lib/stores/fairness-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useActiveGame } from "../use-active-game";
import { PlayingCard } from "./blackjack-card";

function createGame(): BlackjackGame {
  return new BlackjackGame({
    drawSeeds: consumeSeeds,
    debit: placeBet,
    settle: ({ amount, multiplier, seeds, playerTotal, dealerTotal, result, doubled }) =>
      settleBet({ game: "blackjack", amount, multiplier, seeds, playerTotal, dealerTotal, result, doubled }),
  });
}

const RESULT_TEXT: Record<BlackjackResult, string> = {
  blackjack: "Blackjack!",
  win: "You win",
  push: "Push",
  lose: "Dealer wins",
};

function playDeal(count: number): void {
  for (let i = 0; i < count; i++) {
    setTimeout(() => audio.play("tick", { pitch: 1.1 + i * 0.05 }), i * 90);
  }
}

export function BlackjackGameView() {
  useActiveGame("blackjack");
  const [game] = useState(createGame);
  const snapshot = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  const amount = useSettingsStore((s) => s.betAmounts.blackjack);

  const playing = snapshot.status === "player" || snapshot.status === "dealer";

  // Sound on result
  useEffect(() => {
    if (snapshot.status !== "done" || !snapshot.result) return;
    if (snapshot.result === "lose") {
      audio.play("lose");
      vibrate(60);
    } else if (snapshot.result === "push") {
      audio.play("tick", { pitch: 0.8 });
    } else {
      audio.play("cashout");
    }
  }, [snapshot.status, snapshot.roundId, snapshot.result]);

  const deal = () => {
    if (!game.start(amount)) {
      audio.play("lose");
      return;
    }
    playDeal(4);
  };

  let action: BetAction;
  if (snapshot.status === "player") {
    action = { label: "Hit", variant: "bet", onClick: () => { game.hit(); audio.play("tick", { pitch: 1.2 }); } };
  } else {
    action = { label: snapshot.status === "idle" ? "Deal" : "Deal again", variant: "bet", onClick: deal };
  }

  return (
    <div className="grid gap-4 pb-60 lg:grid-cols-[340px_minmax(0,1fr)] lg:pb-0">
      <BetPanel
        game="blackjack"
        mode="manual"
        onModeChange={() => {}}
        action={action}
        locked={playing}
        summary={playing ? "Hand in play" : "Place your bet"}
      >
        <p className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 text-xs leading-relaxed text-zinc-400">
          Blackjack pays <span className="font-mono text-toxic">3:2</span>. Dealer stands on all 17s. Hit, stand or
          double down on your first two cards.
        </p>
      </BetPanel>

      <section className="flex min-w-0 flex-col gap-4">
        <div
          data-game-stage
          className="glass glass-edge relative flex min-h-[26rem] flex-col justify-between gap-6 overflow-hidden rounded-3xl p-5 sm:p-8"
        >
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgb(57_255_20/0.1),transparent_70%)]" />

          <Hand
            label="Dealer"
            cards={snapshot.dealer}
            total={snapshot.dealerTotal}
            hideHole={!snapshot.revealed}
            empty={snapshot.status === "idle"}
          />

          <div className="relative flex items-center justify-center">
            <span className="h-px flex-1 bg-white/[0.06]" />
            <span className="px-3 font-display text-[10px] uppercase tracking-[0.35em] text-zinc-600">Rainbucks</span>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <Hand
            label="You"
            cards={snapshot.player}
            total={snapshot.playerTotal}
            soft={snapshot.status !== "idle" && handValue(snapshot.player).soft}
            empty={snapshot.status === "idle"}
          />

          <AnimatePresence>
            {snapshot.status === "done" && snapshot.result && (
              <motion.div
                key={`res-${snapshot.roundId}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 360, damping: 22, delay: snapshot.revealed ? 0.3 : 0 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div
                  className={cn(
                    "glass-strong rounded-2xl px-8 py-5 text-center",
                    snapshot.result === "lose"
                      ? "border-neon-red/40 shadow-glow-red"
                      : snapshot.result === "push"
                        ? "border-white/15"
                        : "border-toxic/40 shadow-glow-toxic",
                  )}
                >
                  <p
                    className={cn(
                      "font-display text-3xl font-bold uppercase tracking-wide",
                      snapshot.result === "lose"
                        ? "neon-text-red"
                        : snapshot.result === "push"
                          ? "text-zinc-200"
                          : "neon-text-toxic",
                    )}
                  >
                    {RESULT_TEXT[snapshot.result]}
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-300">
                    {snapshot.result === "lose"
                      ? `−${formatAmount(snapshot.amount)} RBX`
                      : `${formatSignedAmount(snapshot.payout - snapshot.amount)} RBX`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* In-hand actions */}
        <AnimatePresence>
          {snapshot.status === "player" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex gap-3"
            >
              <ActionButton onClick={() => { game.stand(); audio.play("click"); }}>Stand</ActionButton>
              {game.canDouble && (
                <ActionButton
                  variant="gold"
                  onClick={() => {
                    if (game.double()) playDeal(1);
                    else audio.play("lose");
                  }}
                >
                  Double · {formatAmount(snapshot.amount)}
                </ActionButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function Hand({
  label,
  cards,
  total,
  hideHole = false,
  soft = false,
  empty = false,
}: {
  label: string;
  cards: number[];
  total: number;
  hideHole?: boolean;
  soft?: boolean;
  empty?: boolean;
}) {
  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">{label}</span>
        {!empty && total > 0 && (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 font-mono text-xs font-bold tabular",
              total > 21 ? "bg-neon-red/15 text-neon-red" : "bg-white/[0.06] text-zinc-200",
            )}
          >
            {soft ? `${total - 10}/${total}` : total}
          </span>
        )}
      </div>
      <div className="flex min-h-[5rem] gap-2 sm:min-h-[6.3rem]">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => (
            <PlayingCard key={`${card}-${i}`} card={card} index={i} hidden={hideHole && i === 1} />
          ))}
        </AnimatePresence>
        {empty && <span className="self-center text-sm text-zinc-600">Press Deal to start a hand.</span>}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "ghost",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "ghost" | "gold";
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "h-12 flex-1 rounded-xl font-display text-sm font-bold uppercase tracking-wider transition",
        variant === "gold"
          ? "bg-gold/90 text-black shadow-[0_0_24px_-6px_rgb(255_210_63/0.8)] hover:bg-gold"
          : "glass text-zinc-100 hover:border-toxic/40 hover:text-white",
      )}
    >
      {children}
    </motion.button>
  );
}
