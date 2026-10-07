"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { BetPanel, type BetAction } from "@/components/casino/bet-panel/bet-panel";
import { ChipStack } from "@/components/casino/ui/chip";
import { audio, vibrate } from "@/lib/audio/audio-engine";
import { placeBet, settleBet } from "@/lib/casino/bets";
import type { ScreenPoint } from "@/lib/casino/celebrations";
import type { BlackjackResult } from "@/lib/casino/games";
import { formatAmount, formatSignedAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { BlackjackGame, handValue, type BlackjackSnapshot } from "@/lib/games/blackjack/blackjack-game";
import { consumeSeeds } from "@/lib/stores/fairness-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useActiveGame } from "../use-active-game";
import { CardShoe, PlayingCard, type CardMood } from "./blackjack-card";

/**
 * The game logic resolves a round instantly (the dealer's whole draw happens
 * on "Stand"). The table then plays it back card by card, and the bet is only
 * settled once the result is on screen, so coins and win screens never spoil
 * the dealer's draw. Leaving the page settles a pending bet immediately.
 */
class DeferredSettlement {
  private pending: ((origin?: ScreenPoint) => void) | null = null;

  defer(settle: (origin?: ScreenPoint) => void): void {
    this.flush();
    this.pending = settle;
  }

  flush(origin?: ScreenPoint): void {
    const settle = this.pending;
    this.pending = null;
    settle?.(origin);
  }
}

function createTable() {
  const settlement = new DeferredSettlement();
  const game = new BlackjackGame({
    drawSeeds: consumeSeeds,
    debit: placeBet,
    settle: (bet) => settlement.defer((origin) => settleBet({ game: "blackjack", ...bet }, { origin })),
  });
  return { game, settlement };
}

const RESULT_TEXT: Record<BlackjackResult, string> = {
  blackjack: "Blackjack!",
  win: "You win",
  push: "Push",
  lose: "Dealer wins",
};

type Step = "player" | "dealer" | "reveal" | "result";

/** The order in which a round appears on the table. Grows as the round goes on. */
function roundSteps(snapshot: BlackjackSnapshot): Step[] {
  if (snapshot.status === "idle") return [];
  const steps: Step[] = ["player", "dealer", "player", "dealer"];
  for (let i = 2; i < snapshot.player.length; i++) steps.push("player");
  if (snapshot.revealed) steps.push("reveal");
  for (let i = 2; i < snapshot.dealer.length; i++) steps.push("dealer");
  if (snapshot.status === "done") steps.push("result");
  return steps;
}

/** Pause before a step appears (ms). The dealer draws slowly: that is the suspense. */
function stepDelay(steps: Step[], index: number): number {
  if (index === 0) return 120;
  if (index < 4) return 300;
  switch (steps[index]) {
    case "player":
      return 90;
    case "reveal":
      return 480;
    case "dealer":
      return 720;
    case "result":
      return 520;
  }
}

/** Plays the steps of the current round one after another. */
function useRoundPlayback(snapshot: BlackjackSnapshot, onStep: (step: Step) => void) {
  const reducedMotion = useReducedMotion() ?? false;
  const steps = useMemo(() => roundSteps(snapshot), [snapshot]);
  const [progress, setProgress] = useState({ round: 0, shown: 0 });
  const shown = progress.round === snapshot.roundId ? progress.shown : 0;

  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  });

  const round = snapshot.roundId;
  useEffect(() => {
    if (shown >= steps.length) return;
    const timer = setTimeout(
      () => {
        onStepRef.current(steps[shown]);
        setProgress({ round, shown: shown + 1 });
      },
      stepDelay(steps, shown) * (reducedMotion ? 0.35 : 1),
    );
    return () => clearTimeout(timer);
  }, [round, shown, steps, reducedMotion]);

  const visible = steps.slice(0, shown);
  return {
    playerCount: visible.filter((step) => step === "player").length,
    dealerCount: visible.filter((step) => step === "dealer").length,
    holeOpen: visible.includes("reveal"),
    resultShown: visible.includes("result"),
    caughtUp: shown >= steps.length,
  };
}

function centerOf(ref: RefObject<HTMLElement | null>): ScreenPoint | undefined {
  const rect = ref.current?.getBoundingClientRect();
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
}

export function BlackjackGameView() {
  useActiveGame("blackjack");
  const [{ game, settlement }] = useState(createTable);
  const snapshot = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  const amount = useSettingsStore((s) => s.betAmounts.blackjack);
  const shoeRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Leaving mid-round never loses a bet: settle whatever is still pending.
  useEffect(() => () => settlement.flush(), [settlement]);

  const playback = useRoundPlayback(snapshot, (step) => {
    if (step === "player" || step === "dealer") {
      audio.play("card", { pitch: 0.92 + Math.random() * 0.16 });
    } else if (step === "reveal") {
      audio.play("flip");
    } else {
      settlement.flush(centerOf(playerRef));
      if (snapshot.result === "lose") {
        audio.play("lose");
        vibrate(60);
      } else if (snapshot.result === "push") {
        audio.play("tick", { pitch: 0.8 });
      } else {
        audio.play("cashout");
      }
    }
  });

  const { playerCount, dealerCount, holeOpen, resultShown, caughtUp } = playback;
  const roundLive = snapshot.status === "player" || snapshot.status === "dealer";
  const canAct = snapshot.status === "player" && caughtUp;
  const result = resultShown ? snapshot.result : null;

  const playerCards = snapshot.player.slice(0, playerCount);
  const dealerCards = snapshot.dealer.slice(0, dealerCount);
  const player = handValue(playerCards);
  const dealer = handValue(holeOpen ? dealerCards : dealerCards.slice(0, 1));

  const playerMood: CardMood = result === "win" || result === "blackjack" ? "win" : result === "lose" ? "lose" : null;
  const dealerMood: CardMood = result === "lose" ? "win" : result === "win" || result === "blackjack" ? "lose" : null;

  const deal = () => {
    settlement.flush();
    if (!game.start(amount)) {
      audio.play("lose");
      return;
    }
    audio.play("chip");
  };
  const hit = () => {
    if (canAct) game.hit();
  };
  const stand = () => {
    if (!canAct) return;
    game.stand();
    audio.play("click");
  };
  const double = () => {
    if (!canAct) return;
    if (game.double()) audio.play("chip");
    else audio.play("lose");
  };

  let action: BetAction;
  if (snapshot.status === "player") {
    action = { label: "Hit", variant: "bet", disabled: !canAct, onClick: hit };
  } else if (!caughtUp) {
    action = { label: "Dealing…", variant: "bet", disabled: true, onClick: () => {} };
  } else {
    action = { label: snapshot.status === "idle" ? "Deal" : "Deal again", variant: "bet", onClick: deal };
  }

  const stake = snapshot.doubled ? snapshot.amount / 2 : snapshot.amount;

  return (
    <div className="grid gap-4 pb-60 lg:grid-cols-[340px_minmax(0,1fr)] lg:pb-0">
      <BetPanel
        game="blackjack"
        mode="manual"
        onModeChange={() => {}}
        action={action}
        locked={roundLive || !caughtUp}
        summary={roundLive ? "Hand in play" : "Place your bet"}
      >
        <p className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5 text-xs leading-relaxed text-zinc-400">
          Blackjack pays <span className="font-mono text-toxic">3:2</span>. Dealer stands on all 17s. Hit, stand or
          double down on your first two cards.
        </p>
      </BetPanel>

      <section className="flex min-w-0 flex-col gap-4">
        <div
          data-game-stage
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(130%_95%_at_50%_0%,#0e3d27_0%,#06220f_48%,#020a05_100%)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_30px_80px_-30px_rgb(0_0_0/0.9)] [perspective:1300px]"
        >
          <Felt />

          <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-5">
            <CardShoe shoeRef={shoeRef} />
          </div>

          {/* The table surface, tilted away from the player */}
          <div className="relative flex min-h-[27rem] origin-bottom flex-col justify-between gap-3 px-3 pb-6 pt-5 [transform:rotateX(14deg)] sm:min-h-[31rem] sm:px-8 sm:pb-8">
            <Hand
              label="Dealer"
              round={snapshot.roundId}
              cards={dealerCards}
              faceDownIndex={holeOpen ? -1 : 1}
              total={dealer.total}
              soft={dealer.soft && !resultShown}
              blackjack={resultShown && dealerCards.length === 2 && dealer.total === 21}
              mood={dealerMood}
              origin={shoeRef}
              idle={snapshot.status === "idle"}
            />

            <TableArc />

            <div ref={playerRef} className="relative">
              <Hand
                label="You"
                round={snapshot.roundId}
                cards={playerCards}
                faceDownIndex={-1}
                total={player.total}
                soft={player.soft && !resultShown}
                blackjack={resultShown && playerCards.length === 2 && player.total === 21}
                mood={playerMood}
                origin={shoeRef}
                idle={snapshot.status === "idle"}
                labelFirst={false}
              />
              <div className="absolute bottom-0 left-1 sm:left-2">
                <BetSpot
                  round={snapshot.roundId}
                  stake={snapshot.status === "idle" ? 0 : stake}
                  doubled={snapshot.doubled}
                  idleAmount={amount}
                  result={result}
                  winnings={snapshot.payout - snapshot.amount}
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                key={`res-${snapshot.roundId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="pointer-events-none absolute inset-x-0 top-[38%] z-20 flex justify-center [perspective:900px]"
              >
                <motion.div
                  initial={{ rotateX: -100, scale: 0.7, y: 24 }}
                  animate={{ rotateX: 0, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 17 }}
                  className={cn(
                    "glass-strong rounded-2xl px-7 py-4 text-center",
                    result === "lose"
                      ? "border-neon-red/40 shadow-glow-red"
                      : result === "push"
                        ? "border-white/15"
                        : result === "blackjack"
                          ? "border-gold/50 shadow-[0_0_0_1px_rgb(255_210_63/0.5),0_0_40px_-4px_rgb(255_210_63/0.6)]"
                          : "border-toxic/40 shadow-glow-toxic",
                  )}
                >
                  <p
                    className={cn(
                      "font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl",
                      result === "lose"
                        ? "neon-text-red"
                        : result === "push"
                          ? "text-zinc-200"
                          : result === "blackjack"
                            ? "neon-text-gold"
                            : "neon-text-toxic",
                    )}
                  >
                    {RESULT_TEXT[result]}
                  </p>
                  <p className="mt-1 font-mono text-sm text-zinc-300">
                    {result === "lose"
                      ? `−${formatAmount(snapshot.amount)} RBX`
                      : `${formatSignedAmount(snapshot.payout - snapshot.amount)} RBX`}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* In-hand actions */}
        <AnimatePresence>
          {canAct && (
            <motion.div
              initial={{ opacity: 0, y: 10, rotateX: -40 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: 10, rotateX: -40, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              style={{ transformPerspective: 800 }}
              className="flex gap-3"
            >
              <ActionButton variant="toxic" onClick={hit}>
                Hit
              </ActionButton>
              <ActionButton onClick={stand}>Stand</ActionButton>
              {game.canDouble && (
                <ActionButton variant="gold" onClick={double}>
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

/** Felt texture, the table rail and a soft lamp above the table. */
function Felt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[length:5px_5px] opacity-60" />
      <div className="absolute inset-x-[-12%] bottom-[5%] top-[-70%] rounded-[50%] border-2 border-toxic/15 shadow-[inset_0_0_60px_-12px_rgb(57_255_20/0.35),0_0_50px_-14px_rgb(57_255_20/0.4)]" />
      <div className="absolute inset-x-[-12%] bottom-[3%] top-[-72%] rounded-[50%] border border-gold/10" />
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.1),transparent_70%)]" />
    </div>
  );
}

/** Rules printed on the felt, along two arcs. */
function TableArc() {
  const id = useId();
  return (
    <svg viewBox="0 0 600 80" className="pointer-events-none mx-auto w-full max-w-xl select-none" aria-hidden>
      <defs>
        <path id={`${id}-a`} d="M40 14 Q300 84 560 14" />
        <path id={`${id}-b`} d="M80 38 Q300 98 520 38" />
      </defs>
      <use href={`#${id}-a`} fill="none" stroke="#39ff14" strokeOpacity="0.18" strokeWidth="1" transform="translate(0 -9)" />
      <text fill="#39ff14" fillOpacity="0.55" fontSize="15" fontWeight="700" letterSpacing="5" style={{ fontFamily: "var(--font-chakra)" }}>
        <textPath href={`#${id}-a`} startOffset="50%" textAnchor="middle">
          BLACKJACK PAYS 3 TO 2
        </textPath>
      </text>
      <text fill="#ffd23f" fillOpacity="0.4" fontSize="11" fontWeight="600" letterSpacing="4" style={{ fontFamily: "var(--font-chakra)" }}>
        <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">
          DEALER STANDS ON ALL 17s
        </textPath>
      </text>
    </svg>
  );
}

function Hand({
  label,
  round,
  cards,
  faceDownIndex,
  total,
  soft,
  blackjack,
  mood,
  origin,
  idle,
  labelFirst = true,
}: {
  label: string;
  round: number;
  cards: number[];
  faceDownIndex: number;
  total: number;
  soft: boolean;
  blackjack: boolean;
  mood: CardMood;
  origin: RefObject<HTMLElement | null>;
  idle: boolean;
  labelFirst?: boolean;
}) {
  const header = (
    <div className="flex h-6 items-center justify-center gap-2">
      <span className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">{label}</span>
      {cards.length > 0 && <TotalBadge total={total} soft={soft} blackjack={blackjack} />}
    </div>
  );

  return (
    <div className={cn("flex flex-col items-center gap-2", !labelFirst && "flex-col-reverse")}>
      {header}
      <div className="flex min-h-[5.5rem] items-center justify-center sm:min-h-[7.2rem]">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => (
            <PlayingCard
              key={`${round}:${i}`}
              card={card}
              index={i}
              faceDown={i === faceDownIndex}
              origin={origin}
              mood={mood}
            />
          ))}
        </AnimatePresence>
        {idle && cards.length === 0 && (
          <div className="flex gap-2 opacity-60">
            {[0, 1].map((i) => (
              <span
                key={i}
                className="aspect-[5/7] w-[3.9rem] rounded-lg border border-dashed border-toxic/25 bg-toxic/[0.02] sm:w-[5.1rem]"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TotalBadge({ total, soft, blackjack }: { total: number; soft: boolean; blackjack: boolean }) {
  const bust = total > 21;
  const label = blackjack ? "Blackjack" : bust ? `Bust · ${total}` : soft && total < 21 ? `${total - 10}/${total}` : String(total);
  return (
    <span className="[perspective:400px]">
      <motion.span
        key={label}
        initial={{ rotateX: -90, scale: 1.4, opacity: 0 }}
        animate={{ rotateX: 0, scale: 1, opacity: 1 }}
        // The new total flips in as the card lands, not when it leaves the shoe
        transition={{ type: "spring", stiffness: 420, damping: 20, delay: 0.32 }}
        className={cn(
          "inline-block rounded-md px-2 py-0.5 font-mono text-xs font-bold tabular",
          bust
            ? "bg-neon-red/20 text-neon-red ring-1 ring-neon-red/40"
            : blackjack || total === 21
              ? "bg-gold/20 text-gold ring-1 ring-gold/50"
              : "bg-black/40 text-zinc-100 ring-1 ring-white/15",
        )}
      >
        {label}
      </motion.span>
    </span>
  );
}

/**
 * The betting circle in front of the player. Chips slide in on the deal,
 * a second stack joins on a double, and at the end the dealer either takes
 * the chips or pays a stack of winnings next to them.
 */
function BetSpot({
  round,
  stake,
  doubled,
  idleAmount,
  result,
  winnings,
}: {
  round: number;
  stake: number;
  doubled: boolean;
  idleAmount: number;
  result: BlackjackResult | null;
  winnings: number;
}) {
  const lost = result === "lose";
  const won = result === "win" || result === "blackjack";
  const taken = { y: -150, opacity: 0, scale: 0.7 };
  const chipSpring = { type: "spring" as const, stiffness: 300, damping: 22 };

  return (
    <div className="relative grid size-16 place-items-center rounded-full border-2 border-dashed border-toxic/25 bg-black/20 sm:size-20">
      {stake === 0 && idleAmount > 0 && (
        <div className="flex flex-col items-center opacity-45">
          <ChipStack amount={idleAmount} size="sm" />
          <span className="mt-1 font-display text-[9px] font-semibold uppercase tracking-[0.25em] text-toxic/80">Bet</span>
        </div>
      )}
      <AnimatePresence>
        {stake > 0 && (
          <motion.div
            key={`stake-${round}`}
            className="absolute"
            initial={{ y: 70, opacity: 0, scale: 1.3 }}
            animate={lost ? taken : { y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={lost ? { duration: 0.5, ease: "easeIn", delay: 0.35 } : chipSpring}
          >
            <ChipStack amount={stake} size="md" />
          </motion.div>
        )}
        {stake > 0 && doubled && (
          <motion.div
            key={`double-${round}`}
            className="absolute"
            initial={{ x: 18, y: 70, opacity: 0 }}
            animate={lost ? { ...taken, x: 18 } : { x: 18, y: -4, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={lost ? { duration: 0.5, ease: "easeIn", delay: 0.4 } : chipSpring}
          >
            <ChipStack amount={stake} size="md" />
          </motion.div>
        )}
        {won && winnings > 0 && (
          <motion.div
            key={`win-${round}`}
            className="absolute"
            initial={{ x: -18, y: -160, opacity: 0, scale: 0.8 }}
            animate={{ x: -20, y: 2, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ ...chipSpring, delay: 0.3 }}
          >
            <ChipStack amount={winnings} size="md" glow />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "ghost",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "ghost" | "gold" | "toxic";
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, rotateX: 10 }}
      whileTap={{ y: 3, rotateX: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 600, damping: 28 }}
      style={{ transformPerspective: 600 }}
      onClick={onClick}
      className={cn(
        "h-12 flex-1 rounded-xl font-display text-sm font-bold uppercase tracking-wider transition-colors",
        variant === "gold" &&
          "bg-gold/90 text-black shadow-[0_4px_0_0_#9a7405,0_0_24px_-6px_rgb(255_210_63/0.8)] hover:bg-gold",
        variant === "toxic" && "bg-toxic text-black shadow-[0_4px_0_0_#178000,0_0_24px_-6px_rgb(57_255_20/0.8)] hover:bg-[#5bff3d]",
        variant === "ghost" &&
          "glass text-zinc-100 shadow-[0_4px_0_0_rgb(255_255_255/0.08)] hover:border-toxic/40 hover:text-white",
      )}
    >
      {children}
    </motion.button>
  );
}
