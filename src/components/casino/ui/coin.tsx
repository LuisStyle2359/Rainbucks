import { cn } from "@/lib/cn";

/** Rainbucks-Münze (virtuelle Währung RBX). */
export function Coin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-4 shrink-0", className)}>
      <circle cx="12" cy="12" r="10.5" fill="#39ff14" />
      <path d="M4.6 9.2A8 8 0 0 1 16.8 5.2" fill="none" stroke="#d9ffcc" strokeOpacity="0.8" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="7.8" fill="none" stroke="#062b00" strokeOpacity="0.4" strokeWidth="1.2" />
      <path
        d="M9.2 7.4h3.6a2.4 2.4 0 0 1 .5 4.75L15 16.6h-2l-1.55-4.2H11v4.2H9.2V7.4Zm1.8 1.6v1.9h1.7a.95.95 0 0 0 0-1.9H11Z"
        fill="#062b00"
      />
    </svg>
  );
}
