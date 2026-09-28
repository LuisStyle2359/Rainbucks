"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Coin } from "@/components/casino/ui/coin";
import { NeonButton, type NeonVariant } from "@/components/casino/ui/neon-button";
import { Segmented } from "@/components/casino/ui/segmented";
import { audio } from "@/lib/audio/audio-engine";
import type { GameId } from "@/lib/casino/games";
import {
  clampBet,
  formatAmount,
  formatSignedAmount,
  parseDecimalInput,
  toCents,
} from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useWalletStore } from "@/lib/stores/wallet-store";
import type { AutoBetConfig, AutoBetControls } from "./use-auto-bet";

export type BetMode = "manual" | "auto";

export interface BetAction {
  label: string;
  /** Second line in the button, e.g. the current cashout amount */
  sublabel?: ReactNode;
  variant: NeonVariant;
  onClick: () => void;
  disabled?: boolean;
}

interface BetPanelProps {
  game: GameId;
  mode: BetMode;
  onModeChange: (mode: BetMode) => void;
  /** Main button in manual mode */
  action: BetAction;
  /** Auto bet controls. Without them there is no Auto tab. */
  auto?: AutoBetControls;
  autoStartDisabled?: boolean;
  autoHint?: ReactNode;
  /** Lock the bet amount and settings (round in progress) */
  locked?: boolean;
  /** Game-specific settings (mines, target, rows …) */
  children?: ReactNode;
  /** Short info in the collapsed mobile bar */
  summary?: ReactNode;
}

const MODE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto" },
] as const satisfies readonly { value: BetMode; label: string }[];

export function BetPanel({
  game,
  mode,
  onModeChange,
  action,
  auto,
  autoStartDisabled,
  autoHint,
  locked = false,
  children,
  summary,
}: BetPanelProps) {
  const amount = useSettingsStore((s) => s.betAmounts[game]);
  const balance = useWalletStore((s) => s.balance);
  const [expanded, setExpanded] = useState(false);
  const [autoDraft, setAutoDraft] = useState({ rounds: "10", profit: "", loss: "" });

  const autoRunning = auto?.running ?? false;
  const inputsLocked = locked || autoRunning;
  const insufficient = amount > balance;

  const primary: BetAction =
    mode === "auto" && auto
      ? autoRunning
        ? {
            label: "Stop auto",
            sublabel: `${auto.played}${auto.rounds ? ` / ${auto.rounds}` : ""} · ${formatSignedAmount(auto.profit)}`,
            variant: "stop",
            onClick: auto.stop,
          }
        : {
            label: insufficient ? "Balance too low" : "Start auto bet",
            variant: "bet",
            disabled: insufficient || autoStartDisabled,
            onClick: () => auto.start(parseAutoConfig(autoDraft)),
          }
      : action.variant === "bet" && insufficient && !action.disabled
        ? { ...action, label: "Balance too low", disabled: true }
        : action;

  // Space = main action (bet / cash out), except while typing in fields.
  const primaryRef = useRef(primary);
  useEffect(() => {
    primaryRef.current = primary;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable]")) return;
      event.preventDefault();
      const current = primaryRef.current;
      if (!current.disabled) {
        audio.play("click");
        current.onClick();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const collapsible = "overflow-hidden lg:!h-auto lg:!overflow-visible lg:!opacity-100";
  const collapse = {
    initial: false as const,
    animate: { height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 },
    transition: { type: "spring" as const, stiffness: 420, damping: 40 },
  };

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 lg:sticky lg:top-24 lg:z-auto lg:self-start">
      <div className="glass-strong glass-edge rounded-t-3xl border-b-0 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-24px_60px_-24px_rgb(0_0_0/0.95)] max-lg:bg-[rgb(6_7_9/0.97)] lg:rounded-2xl lg:border-b lg:p-5 lg:shadow-glow-soft">
        {/* Handle that expands the settings (mobile only) */}
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="flex w-full flex-col items-center gap-1.5 pb-2 lg:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-white/20" />
          <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            {summary ?? (mode === "auto" ? "Auto bet" : "Manual")}
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="inline-block">
              ▴
            </motion.span>
          </span>
        </button>

        {/* Spacing via padding instead of gap: collapsed sections (height 0) leave no gap */}
        <div className="flex flex-col">
          {auto && (
            <motion.div className={cn("order-1", collapsible)} {...collapse}>
              <div className="pb-4">
                <Segmented
                  options={MODE_OPTIONS}
                  value={mode}
                  onChange={onModeChange}
                  layoutId={`bet-mode-${game}`}
                  disabled={inputsLocked}
                />
              </div>
            </motion.div>
          )}

          <div className="order-3 pb-4 lg:order-2">
            <AmountField game={game} amount={amount} balance={balance} disabled={inputsLocked} />
          </div>

          <motion.div className={cn("order-2 lg:order-3", collapsible)} {...collapse}>
            <div className="flex flex-col gap-4 pb-4">
              {children}
              {mode === "auto" && auto && (
                <AutoSettings value={autoDraft} onChange={setAutoDraft} disabled={autoRunning} hint={autoHint} />
              )}
            </div>
          </motion.div>

          <div className="order-4">
            <NeonButton
              variant={primary.variant}
              onClick={primary.onClick}
              disabled={primary.disabled}
              sound={false}
              onPointerDown={() => {
                if (!primary.disabled) audio.play(primary.variant === "bet" ? "bet" : "click");
              }}
              className="h-14 w-full flex-col gap-0 text-base"
            >
              <span>{primary.label}</span>
              {primary.sublabel && (
                <span className="font-mono text-xs font-medium normal-case tracking-normal opacity-80">
                  {primary.sublabel}
                </span>
              )}
            </NeonButton>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AmountField({
  game,
  amount,
  balance,
  disabled,
}: {
  game: GameId;
  amount: number;
  balance: number;
  disabled: boolean;
}) {
  const setBetAmount = useSettingsStore((s) => s.setBetAmount);
  const [draft, setDraft] = useState<string | null>(null);

  const setAmount = (cents: number) => setBetAmount(game, clampBet(cents, balance));
  const commit = (raw: string) => {
    const value = parseDecimalInput(raw);
    if (value !== null) setAmount(toCents(value));
    setDraft(null);
  };

  const quick = "h-11 min-w-11 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 font-mono text-sm text-zinc-200 transition hover:border-toxic/40 hover:text-toxic disabled:pointer-events-none disabled:opacity-40";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs text-zinc-500">
        <label htmlFor={`amount-${game}`} className="font-medium uppercase tracking-widest">
          Bet amount
        </label>
        <span className="font-mono">
          {amount > balance ? <span className="text-neon-red">above balance</span> : `max ${formatAmount(balance)}`}
        </span>
      </div>
      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Coin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <input
            id={`amount-${game}`}
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            value={draft ?? formatAmount(amount)}
            onFocus={(event) => {
              setDraft(formatAmount(amount));
              event.currentTarget.select();
            }}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="h-11 w-full rounded-lg border border-white/[0.08] bg-black/50 pl-9 pr-3 font-mono text-[15px] text-white outline-none transition focus:border-toxic/60 focus:shadow-[0_0_0_3px_rgb(57_255_20/0.15)] disabled:opacity-50"
          />
        </div>
        <button type="button" disabled={disabled} className={quick} onClick={() => setAmount(Math.floor(amount / 2))}>
          ½
        </button>
        <button type="button" disabled={disabled} className={quick} onClick={() => setAmount(amount * 2)}>
          2×
        </button>
        <button type="button" disabled={disabled} className={quick} onClick={() => setAmount(balance)}>
          Max
        </button>
      </div>
    </div>
  );
}

interface AutoDraft {
  rounds: string;
  profit: string;
  loss: string;
}

function parseAutoConfig(draft: AutoDraft): AutoBetConfig {
  const rounds = parseDecimalInput(draft.rounds);
  const profit = parseDecimalInput(draft.profit);
  const loss = parseDecimalInput(draft.loss);
  return {
    rounds: rounds ? Math.floor(rounds) : 0,
    stopOnProfit: profit ? toCents(profit) : null,
    stopOnLoss: loss ? toCents(loss) : null,
  };
}

function AutoSettings({
  value,
  onChange,
  disabled,
  hint,
}: {
  value: AutoDraft;
  onChange: (value: AutoDraft) => void;
  disabled: boolean;
  hint?: ReactNode;
}) {
  const field = (key: keyof AutoDraft, label: string, placeholder: string) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-widest text-zinc-500">{label}</span>
      <input
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        value={value[key]}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
        className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/50 px-3 font-mono text-sm text-white outline-none placeholder:text-zinc-600 focus:border-toxic/60 disabled:opacity-50"
      />
    </label>
  );

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/30 p-3">
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
      {field("rounds", "Number of bets", "∞")}
      <div className="grid grid-cols-2 gap-2">
        {field("profit", "Stop on profit", "–")}
        {field("loss", "Stop on loss", "–")}
      </div>
    </div>
  );
}
