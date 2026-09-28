"use client";

import { useReducedMotion } from "motion/react";
import { useId } from "react";
import type { GameId } from "@/lib/casino/games";

const MONO = { fontFamily: "var(--font-geist-mono)" };

/** Discrete SMIL timing: visible from `start` to `end` (0…1 of the cycle). */
function window01(start: number, end: number): { values: string; keyTimes: string } {
  if (start <= 0) return { values: "1;0", keyTimes: `0;${end}` };
  if (end >= 1) return { values: "0;1", keyTimes: `0;${start}` };
  return { values: "0;1;0", keyTimes: `0;${start};${end}` };
}

/**
 * Small animated previews for the lobby cards (pure SVG + SMIL, no JS per frame).
 * With "reduce motion" they stay still.
 */
export function GameArt({ game }: { game: GameId }) {
  const id = useId();
  const animated = !(useReducedMotion() ?? false);

  switch (game) {
    case "crash": {
      const curve = "M10 110 C 90 108, 130 90, 170 28";
      const steps = ["1.00×", "1.32×", "1.94×", "2.87×", "4.20×"];
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#39ff14" stopOpacity="0.35" />
              <stop offset="1" stopColor="#39ff14" stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2="120" stroke="white" strokeOpacity="0.05" />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 30} x2="200" y2={i * 30} stroke="white" strokeOpacity="0.05" />
          ))}
          <path d={`${curve} L170 110 Z`} fill={`url(#${id}-fill)`}>
            {animated && <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.7;0.9;1" dur="3.2s" repeatCount="indefinite" />}
          </path>
          <path d={curve} fill="none" stroke="#39ff14" strokeWidth="7" strokeOpacity="0.2" pathLength={1} strokeDasharray="1">
            {animated && <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.75;1" dur="3.2s" repeatCount="indefinite" />}
          </path>
          <path id={`${id}-curve`} d={curve} fill="none" stroke="#39ff14" strokeWidth="2.5" pathLength={1} strokeDasharray="1">
            {animated && <animate attributeName="stroke-dashoffset" values="1;0;0" keyTimes="0;0.75;1" dur="3.2s" repeatCount="indefinite" />}
          </path>
          <g transform={animated ? undefined : "translate(170 28)"}>
            <circle r="10" fill="#39ff14" fillOpacity="0.3" className="animate-glow-pulse" />
            <circle r="4" fill="white" />
            {animated && (
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="linear">
                <mpath href={`#${id}-curve`} />
              </animateMotion>
            )}
          </g>
          {animated ? (
            steps.map((label, i) => {
              const timing = window01(i * 0.15, i === steps.length - 1 ? 1 : (i + 1) * 0.15);
              return (
                <text key={label} x="18" y="38" fill={i === steps.length - 1 ? "#39ff14" : "white"} fontSize="26" fontWeight="700" style={MONO} opacity="0">
                  {label}
                  <animate attributeName="opacity" calcMode="discrete" values={timing.values} keyTimes={timing.keyTimes} dur="3.2s" repeatCount="indefinite" />
                </text>
              );
            })
          ) : (
            <text x="18" y="38" fill="white" fontSize="26" fontWeight="700" style={MONO}>
              4.20×
            </text>
          )}
        </svg>
      );
    }
    case "mines": {
      const gems = [1, 7, 12];
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          {Array.from({ length: 15 }, (_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const x = 22 + col * 32;
            const y = 12 + row * 34;
            const gemIndex = gems.indexOf(i);
            const isGem = gemIndex !== -1;
            return (
              <g key={i}>
                <rect x={x} y={y} width="28" height="28" rx="6" fill="white" fillOpacity="0.06" stroke="white" strokeOpacity="0.1" />
                {isGem && (
                  <g>
                    <rect x={x} y={y} width="28" height="28" rx="6" fill="#0c2b06" stroke="#39ff14" strokeOpacity="0.7" />
                    <path
                      d={`M${x + 4} ${y + 11} l5 -5 h10 l5 5 l-10 13 Z`}
                      fill="#39ff14"
                      stroke="#eaffe2"
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <path d={`M${x + 4} ${y + 11} h20 M${x + 9} ${y + 6} l5 5 l5 -5`} fill="none" stroke="#eaffe2" strokeWidth="0.8" strokeOpacity="0.8" />
                    <circle cx={x + 22} cy={y + 5} r="1.6" fill="white" className="animate-glow-pulse" style={{ animationDelay: `${gemIndex * 0.6}s` }} />
                    {animated && (
                      <animate
                        attributeName="opacity"
                        values="0;0;1;1;0"
                        keyTimes={`0;${0.12 + gemIndex * 0.18};${0.14 + gemIndex * 0.18};0.92;1`}
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      );
    }
    case "limbo": {
      const rolls = ["1.07×", "3.51×", "1.62×", "8.40×", "2.19×", "1.33×", "5.76×", "12.34×"];
      const row = 52;
      const travel = (rolls.length - 1) * row;
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <defs>
            <clipPath id={`${id}-clip`}>
              <rect x="0" y="22" width="200" height="62" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-clip)`}>
            <g transform={animated ? undefined : `translate(0 ${-travel})`}>
              {rolls.map((value, i) => (
                <text
                  key={value}
                  x="100"
                  y={70 + i * row}
                  textAnchor="middle"
                  fill={i === rolls.length - 1 ? "#39ff14" : "white"}
                  fontSize="42"
                  fontWeight="800"
                  style={MONO}
                >
                  {value}
                </text>
              ))}
              {animated && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`0 0;0 ${-travel};0 ${-travel}`}
                  keyTimes="0;0.55;1"
                  calcMode="spline"
                  keySplines="0.15 0.8 0.25 1;0 0 1 1"
                  dur="3.4s"
                  repeatCount="indefinite"
                />
              )}
            </g>
          </g>
          <text x="100" y="106" textAnchor="middle" fill="#39ff14" fontSize="11" letterSpacing="3" style={MONO}>
            TARGET 10.00× ✓
          </text>
        </svg>
      );
    }
    case "plinko": {
      const colors = ["#39ff14", "#b6ff1f", "#ffd23f", "#ff8a3d", "#ff2d55", "#ff8a3d", "#ffd23f", "#b6ff1f", "#39ff14"];
      const balls = [
        { path: "M100 0 L110 13 L100 28 L110 43 L120 58 L110 73 L120 88 L122 100", color: "#39ff14", begin: "0s", bin: 5 },
        { path: "M100 0 L90 13 L80 28 L70 43 L60 58 L50 73 L40 88 L42 100", color: "#22e4ff", begin: "0.9s", bin: 1 },
        { path: "M100 0 L110 13 L100 28 L90 43 L100 58 L90 73 L80 88 L82 100", color: "#ff4fd8", begin: "1.8s", bin: 3 },
      ];
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          {Array.from({ length: 6 }, (_, row) =>
            Array.from({ length: row + 3 }, (_, j) => (
              <circle key={`${row}-${j}`} cx={100 + (j - (row + 2) / 2) * 20} cy={20 + row * 15} r="2.2" fill="white" fillOpacity="0.8" />
            )),
          )}
          {colors.map((color, i) => (
            <rect key={i} x={12 + i * 20} y="104" width="16" height="12" rx="3" fill={color} fillOpacity="0.9">
              {animated &&
                balls
                  .filter((ball) => ball.bin === i)
                  .map((ball) => (
                    <animate
                      key={ball.begin}
                      attributeName="fill-opacity"
                      values="0.9;0.9;0.35;0.9"
                      keyTimes="0;0.8;0.9;1"
                      dur="2.7s"
                      begin={ball.begin}
                      repeatCount="indefinite"
                    />
                  ))}
            </rect>
          ))}
          {animated ? (
            balls.map((ball) => (
              <g key={ball.begin} opacity="0">
                <circle r="9" fill={ball.color} fillOpacity="0.3" />
                <circle r="4.5" fill={ball.color} />
                <animateMotion path={ball.path} dur="2.7s" begin={ball.begin} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.8;1" calcMode="linear" />
                <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="2.7s" begin={ball.begin} repeatCount="indefinite" />
              </g>
            ))
          ) : (
            <g transform="translate(110 43)">
              <circle r="9" fill="#39ff14" fillOpacity="0.3" />
              <circle r="4.5" fill="#39ff14" />
            </g>
          )}
        </svg>
      );
    }
  }
}
