"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/** Outline of the brilliant cut: flat table on top, wide girdle, pointed culet. */
const GEM_OUTLINE = "2,22 16,8 48,8 62,22 32,58";

/**
 * Wide brilliant-cut gem. Five crown facets, three pavilion facets,
 * white facet lines, a light sweep and twinkling sparkles.
 * `alive` turns the shine and sparkles on (only for gems the player found).
 */
export function GemIcon({ className, alive = true }: { className?: string; alive?: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("overflow-visible", className)}>
      <defs>
        <linearGradient id={`${id}-pl`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#5dff3a" />
          <stop offset="1" stopColor="#0b6b00" />
        </linearGradient>
        <linearGradient id={`${id}-pc`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8ff9f" />
          <stop offset="1" stopColor="#1fa305" />
        </linearGradient>
        <linearGradient id={`${id}-pr`} x1="1" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#2bd60b" />
          <stop offset="1" stopColor="#043f00" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <polygon points={GEM_OUTLINE} />
        </clipPath>
      </defs>

      {/* Crown */}
      <polygon points="2,22 16,8 22,22" fill="#8dff6e" />
      <polygon points="16,8 32,8 22,22" fill="#eaffe2" />
      <polygon points="22,22 32,8 42,22" fill="#b6ff9d" />
      <polygon points="32,8 48,8 42,22" fill="#d4ffc4" />
      <polygon points="48,8 62,22 42,22" fill="#52e82f" />

      {/* Pavilion */}
      <polygon points="2,22 22,22 32,58" fill={`url(#${id}-pl)`} />
      <polygon points="22,22 42,22 32,58" fill={`url(#${id}-pc)`} />
      <polygon points="42,22 62,22 32,58" fill={`url(#${id}-pr)`} />

      {/* Inner reflections */}
      <polygon points="22,22 28,22 32,58" fill="#ffffff" fillOpacity="0.22" />
      <polygon points="6,22 12,22 32,58" fill="#ffffff" fillOpacity="0.1" />

      {/* Facet lines */}
      <g stroke="#ffffff" strokeOpacity="0.65" strokeWidth="0.9" fill="none" strokeLinejoin="round">
        <polygon points={GEM_OUTLINE} />
        <polyline points="2,22 62,22" />
        <polyline points="16,8 22,22 32,8 42,22 48,8" />
        <polyline points="22,22 32,58 42,22" />
      </g>

      {alive && (
        <>
          <g clipPath={`url(#${id}-clip)`}>
            <rect x="-10" y="-6" width="12" height="76" fill={`url(#${id}-shine)`} className="animate-gem-shine" />
          </g>
          <Sparkle x={52} y={5} size={5} delay={0} />
          <Sparkle x={8} y={14} size={3.5} delay={0.8} />
          <Sparkle x={42} y={38} size={3} delay={1.5} />
        </>
      )}
    </svg>
  );
}

/** Four-pointed star that twinkles in place. */
function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const s = size;
  const d = `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;
  return (
    <path
      d={d}
      fill="#ffffff"
      className="animate-twinkle opacity-0 [transform-box:fill-box] [transform-origin:center]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/** Bomb with a glowing fuse. The fuse only sparks on the bomb that went off. */
export function BombIcon({ className, lit = false }: { className?: string; lit?: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("overflow-visible", className)}>
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
      <g className={lit ? "animate-glow-pulse" : undefined}>
        <circle cx="54.5" cy="12.5" r="4.5" fill="#ff8a3d" fillOpacity="0.55" />
        <path d="M54.5 6v13M48 12.5h13M50 8l9 9M59 8l-9 9" stroke="#ffd23f" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
