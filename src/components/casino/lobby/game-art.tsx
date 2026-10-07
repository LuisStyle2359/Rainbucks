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
    case "blackjack": {
      // Two cards slide out of the shoe; the second one turns over: blackjack.
      const cycle = "4.2s";
      const cards = [
        { rank: "A", suit: "♠", color: "#18181b", x: 58, y: 34, rotate: -8, start: 0.05 },
        { rank: "K", suit: "♥", color: "#e0193f", x: 90, y: 30, rotate: 7, start: 0.22 },
      ];
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <defs>
            <pattern id={`${id}-back`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#04120a" />
              <rect width="3" height="6" fill="#39ff14" fillOpacity="0.18" />
            </pattern>
          </defs>
          <path d="M-10 118 Q100 40 210 118" fill="none" stroke="#39ff14" strokeOpacity="0.25" strokeWidth="1.5" />
          <text x="100" y="112" textAnchor="middle" fill="#39ff14" fillOpacity="0.45" fontSize="7" letterSpacing="2.5" style={MONO}>
            PAYS 3 TO 2
          </text>
          {/* shoe */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={160 - i} y={8 - i * 1.4} width="26" height="36" rx="3" fill={`url(#${id}-back)`} stroke="#39ff14" strokeOpacity="0.45" transform="rotate(14 173 26)" />
          ))}
          {cards.map((card, i) => {
            const end = card.start + 0.14;
            const flipStart = i === 1 ? 0.42 : end;
            const position = `translate(${card.x} ${card.y}) rotate(${card.rotate} 15 21)`;
            return (
              <g key={card.rank} transform={animated ? undefined : position}>
                {animated && (
                  <>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values={`160 8;160 8;${card.x} ${card.y};${card.x} ${card.y}`}
                      keyTimes={`0;${card.start};${end};1`}
                      calcMode="spline"
                      keySplines="0 0 1 1;0.2 0.8 0.3 1;0 0 1 1"
                      dur={cycle}
                      repeatCount="indefinite"
                    />
                    <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${card.start};${card.start + 0.01};0.93;1`} dur={cycle} repeatCount="indefinite" />
                  </>
                )}
                <g transform={`rotate(${card.rotate} 15 21)`}>
                  {/* face */}
                  <g>
                    <rect width="30" height="42" rx="3.5" fill="#f4f5f7" stroke="#000" strokeOpacity="0.15" />
                    <text x="4" y="11" fill={card.color} fontSize="9" fontWeight="800" style={MONO}>
                      {card.rank}
                    </text>
                    <text x="15" y="29" textAnchor="middle" fill={card.color} fontSize="16">
                      {card.suit}
                    </text>
                    {animated && i === 1 && (
                      <animate attributeName="opacity" calcMode="discrete" values="0;1;1" keyTimes={`0;${flipStart + 0.04};1`} dur={cycle} repeatCount="indefinite" />
                    )}
                  </g>
                  {/* back, turned over by squeezing it to an edge */}
                  {animated && i === 1 && (
                    <g>
                      <rect width="30" height="42" rx="3.5" fill={`url(#${id}-back)`} stroke="#39ff14" strokeOpacity="0.5" />
                      <animate attributeName="opacity" calcMode="discrete" values="1;0;0" keyTimes={`0;${flipStart + 0.04};1`} dur={cycle} repeatCount="indefinite" />
                    </g>
                  )}
                  {animated && i === 1 && (
                    <animateTransform
                      attributeName="transform"
                      type="scale"
                      additive="sum"
                      values="1 1;1 1;0.02 1;1 1;1 1"
                      keyTimes={`0;${flipStart};${flipStart + 0.04};${flipStart + 0.08};1`}
                      dur={cycle}
                      repeatCount="indefinite"
                    />
                  )}
                </g>
              </g>
            );
          })}
          <g opacity={animated ? 0 : 1}>
            <rect x="128" y="62" width="58" height="18" rx="5" fill="#ffd23f" fillOpacity="0.15" stroke="#ffd23f" strokeOpacity="0.7" />
            <text x="157" y="74.5" textAnchor="middle" fill="#ffd23f" fontSize="9" fontWeight="800" letterSpacing="1" style={MONO}>
              BLACKJACK
            </text>
            {animated && <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.6;0.92;1" dur={cycle} repeatCount="indefinite" />}
          </g>
        </svg>
      );
    }
    case "roulette": {
      // A tilted wheel turning one way, the ball circling the other way.
      const colors = ["#0b8a3a", ...Array.from({ length: 36 }, (_, i) => (i % 2 ? "#15171b" : "#d61a3c"))];
      const seg = 360 / colors.length;
      const wedge = (i: number) => {
        const a0 = ((i * seg - seg / 2) * Math.PI) / 180;
        const a1 = ((i * seg + seg / 2) * Math.PI) / 180;
        const p = (a: number, r: number) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
        return `M${p(a0, 50)}A50 50 0 0 1 ${p(a1, 50)}L${p(a1, 34)}A34 34 0 0 0 ${p(a0, 34)}Z`;
      };
      const orbit = "M100 36 A60 27 0 1 0 100.01 36";
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <defs>
            <radialGradient id={`${id}-cone`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0.3" stopColor="#7a4e1d" />
              <stop offset="1" stopColor="#2a1808" />
            </radialGradient>
          </defs>
          <ellipse cx="100" cy="70" rx="72" ry="34" fill="#140b04" stroke="#ffd23f" strokeOpacity="0.4" />
          <g transform="translate(100 63) scale(1 0.45)">
            <circle r="68" fill="#1d1f24" stroke="#ffd23f" strokeOpacity="0.7" strokeWidth="2" />
            <g>
              {colors.map((color, i) => (
                <path key={i} d={wedge(i)} fill={color} />
              ))}
              <circle r="34" fill={`url(#${id}-cone)`} />
              <path d="M0 -26V26M-26 0H26" stroke="#ffd23f" strokeWidth="3" strokeLinecap="round" />
              {animated && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="7s" repeatCount="indefinite" />}
            </g>
            <circle r="9" fill="#39ff14" />
          </g>
          <g transform={animated ? undefined : "translate(52 74)"}>
            <circle r="4" fill="#ffffff" />
            <circle r="7" fill="#ffffff" fillOpacity="0.15" />
            {animated && <animateMotion path={orbit} dur="1.6s" repeatCount="indefinite" />}
          </g>
          {[
            { x: 22, y: 26, color: "#39ff14" },
            { x: 178, y: 30, color: "#ff4fd8" },
          ].map((chip, i) => (
            <g key={i} transform={`translate(${chip.x} ${chip.y})`}>
              {[0, 1, 2].map((layer) => (
                <ellipse key={layer} cx="0" cy={-layer * 3.2} rx="11" ry="5" fill={chip.color} stroke="#000" strokeOpacity="0.35" />
              ))}
              <ellipse cx="0" cy="-6.4" rx="6" ry="2.6" fill="none" stroke="#fff" strokeOpacity="0.8" strokeDasharray="2 1.5" />
            </g>
          ))}
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
