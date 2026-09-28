"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/** Facettierter Diamant mit Neon-Verlauf. */
export function GemIcon({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("drop-shadow-[0_0_14px_rgb(57_255_20/0.85)]", className)}>
      <defs>
        <linearGradient id={`${id}-crown`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9ffe1" />
          <stop offset="1" stopColor="#6dff4f" />
        </linearGradient>
        <linearGradient id={`${id}-pavilion`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#39ff14" />
          <stop offset="1" stopColor="#0a5c00" />
        </linearGradient>
      </defs>
      <polygon points="14,23 22,12 42,12 50,23" fill={`url(#${id}-crown)`} />
      <polygon points="14,23 50,23 32,55" fill={`url(#${id}-pavilion)`} />
      <polygon points="22,12 27,23 32,12" fill="#ffffff" fillOpacity="0.55" />
      <polygon points="32,12 37,23 42,12" fill="#ffffff" fillOpacity="0.25" />
      <polygon points="27,23 37,23 32,55" fill="#ffffff" fillOpacity="0.18" />
      <polygon points="14,23 27,23 32,55" fill="#000000" fillOpacity="0.12" />
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.8" fill="none" strokeLinejoin="round">
        <polygon points="14,23 22,12 42,12 50,23 32,55" />
        <polyline points="14,23 50,23" />
        <polyline points="22,12 27,23 32,12 37,23 42,12" />
        <polyline points="27,23 32,55 37,23" />
      </g>
    </svg>
  );
}

/** Bombe mit glimmender Zündschnur. */
export function BombIcon({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("drop-shadow-[0_0_14px_rgb(255_45_85/0.8)]", className)}>
      <defs>
        <radialGradient id={`${id}-body`} cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#4a4f58" />
          <stop offset="0.55" stopColor="#15171b" />
          <stop offset="1" stopColor="#000000" />
        </radialGradient>
      </defs>
      <circle cx="29" cy="38" r="17" fill={`url(#${id}-body)`} stroke="#ff2d55" strokeOpacity="0.6" strokeWidth="1.2" />
      <ellipse cx="23" cy="31" rx="5" ry="3" fill="#ffffff" fillOpacity="0.28" transform="rotate(-35 23 31)" />
      <rect x="36" y="17" width="9" height="7" rx="1.5" fill="#2a2d33" transform="rotate(40 40.5 20.5)" />
      <path d="M43 16c3-5 8-6 11-3" fill="none" stroke="#c9a36a" strokeWidth="2" strokeLinecap="round" />
      <g className="animate-glow-pulse">
        <circle cx="54.5" cy="12.5" r="4.5" fill="#ff8a3d" fillOpacity="0.55" />
        <path d="M54.5 6v13M48 12.5h13M50 8l9 9M59 8l-9 9" stroke="#ffd23f" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
