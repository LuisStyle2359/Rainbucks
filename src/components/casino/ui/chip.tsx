import { useId } from "react";
import { formatAmount } from "@/lib/casino/money";
import { cn } from "@/lib/cn";

/** Chip colors by value (cents): the bigger the bet, the rarer the color. */
const TONES = [
  { below: 1_00, face: "#e4e4e7", edge: "#7c7c86", ink: "#18181b" },
  { below: 10_00, face: "#22e4ff", edge: "#087585", ink: "#03262c" },
  { below: 100_00, face: "#39ff14", edge: "#178000", ink: "#062b00" },
  { below: 1_000_00, face: "#ff4fd8", edge: "#951a7b", ink: "#2d0425" },
  { below: Infinity, face: "#ffd23f", edge: "#9a7405", ink: "#2b1f00" },
] as const;

export type ChipTone = (typeof TONES)[number];

export function chipTone(amount: number): ChipTone {
  return TONES.find((tone) => amount < tone.below) ?? TONES[TONES.length - 1];
}

/** Short label that fits on a chip: 0.5, 5, 25, 1.2K, 40K, 3M. */
export function chipLabel(amount: number): string {
  const value = amount / 100;
  if (value >= 1_000_000) return `${trim(value / 1_000_000, value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${trim(value / 1_000, value >= 10_000 ? 0 : 1)}K`;
  if (value >= 100) return String(Math.floor(value));
  return trim(value, value >= 10 ? 1 : 2);
}

function trim(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

/** How many chips a stack of this value shows (purely visual, 1…5). */
export function stackHeight(amount: number): number {
  return Math.max(1, Math.min(5, 1 + Math.floor(Math.log10(amount / 100 + 1) * 1.6)));
}

const SIZES = {
  xs: { box: "size-5", step: 2 },
  sm: { box: "size-7", step: 2.5 },
  md: { box: "size-10", step: 3.5 },
  lg: { box: "size-14", step: 4.5 },
} as const;

export type ChipSize = keyof typeof SIZES;

/** Face of a casino chip: colored body, edge inserts, dashed inlay and a value. */
export function ChipFace({ amount, label = true }: { amount: number; label?: boolean }) {
  const id = useId();
  const tone = chipTone(amount);
  const text = chipLabel(amount);
  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden>
      <defs>
        <radialGradient id={`${id}-gloss`} cx="0.35" cy="0.28" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19.5" fill={tone.face} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x="17.4"
          y="0.6"
          width="5.2"
          height="5.4"
          rx="1"
          fill="#fff"
          fillOpacity="0.92"
          transform={`rotate(${i * 60} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="13.4" fill="#000" fillOpacity="0.22" />
      <circle cx="20" cy="20" r="12.2" fill={tone.face} stroke="#fff" strokeOpacity="0.7" strokeWidth="0.9" strokeDasharray="2.2 1.6" />
      <circle cx="20" cy="20" r="19.5" fill={`url(#${id}-gloss)`} />
      {label && (
        <text
          x="20"
          y="20.6"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={tone.ink}
          fontSize={text.length > 3 ? 8 : 10}
          fontWeight="800"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {text}
        </text>
      )}
    </svg>
  );
}

/**
 * A stack of chips with real thickness: each chip has a darker edge below it
 * and sits a few pixels above the previous one. Only the top chip is labelled.
 */
export function ChipStack({
  amount,
  size = "md",
  count,
  glow = false,
  className,
}: {
  amount: number;
  size?: ChipSize;
  count?: number;
  glow?: boolean;
  className?: string;
}) {
  const spec = SIZES[size];
  const tone = chipTone(amount);
  const layers = count ?? stackHeight(amount);
  return (
    <div
      className={cn("relative shrink-0", spec.box, className)}
      style={{ marginTop: (layers - 1) * spec.step }}
      title={`${formatAmount(amount)} RBX`}
    >
      {Array.from({ length: layers }, (_, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{
            transform: `translateY(${-i * spec.step}px)`,
            boxShadow: `0 ${spec.step * 0.8}px 0 0 ${tone.edge}, 0 ${spec.step + 2}px ${spec.step + 3}px -1px rgb(0 0 0 / 0.75)`,
            filter: glow && i === layers - 1 ? `drop-shadow(0 0 8px ${tone.face})` : undefined,
          }}
        >
          <ChipFace amount={amount} label={i === layers - 1} />
        </div>
      ))}
    </div>
  );
}
