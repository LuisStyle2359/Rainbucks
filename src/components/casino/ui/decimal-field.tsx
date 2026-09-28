"use client";

import { useState, type ReactNode } from "react";
import { parseDecimalInput } from "@/lib/casino/money";
import { cn } from "@/lib/cn";

interface DecimalFieldProps {
  id: string;
  label: ReactNode;
  /** Right of the label, e.g. the win chance */
  hint?: ReactNode;
  value: number | null;
  onChange: (value: number | null) => void;
  format: (value: number) => string;
  /** Input → valid value (clamp, round). null = invalid/empty. */
  normalize: (value: number) => number | null;
  suffix?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Number field ("2.50"; "2,50" is accepted too).
 * While typing the text stays freely editable; on blur it is
 * validated and formatted.
 */
export function DecimalField({
  id,
  label,
  hint,
  value,
  onChange,
  format,
  normalize,
  suffix,
  placeholder,
  allowEmpty = false,
  disabled,
  className,
}: DecimalFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    setDraft(null);
    if (raw.trim() === "" && allowEmpty) return onChange(null);
    const parsed = parseDecimalInput(raw);
    const next = parsed === null ? null : normalize(parsed);
    if (next !== null) onChange(next);
  };

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs text-zinc-500">
        <label htmlFor={id} className="font-medium uppercase tracking-widest">
          {label}
        </label>
        {hint && <span className="font-mono">{hint}</span>}
      </div>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={draft ?? (value === null ? "" : format(value))}
          onFocus={(event) => {
            setDraft(value === null ? "" : format(value));
            event.currentTarget.select();
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={cn(
            "h-11 w-full rounded-lg border border-white/[0.08] bg-black/50 px-3 font-mono text-[15px] text-white outline-none transition placeholder:text-zinc-600",
            "focus:border-toxic/60 focus:shadow-[0_0_0_3px_rgb(57_255_20/0.15)] disabled:opacity-50",
            suffix && "pr-8",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

const twoDecimals = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatTwoDecimals = (value: number) => twoDecimals.format(value);
