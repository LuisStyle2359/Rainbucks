import type { GameId } from "@/lib/casino/games";

/** Kleine Vorschau-Grafiken für die Spielkarten in der Lobby (reines SVG). */
export function GameArt({ game }: { game: GameId }) {
  switch (game) {
    case "crash":
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="art-crash-fill" x1="0" y1="0" x2="0" y2="1">
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
          <path d="M10 110 C 90 108, 130 90, 170 28 L170 110 Z" fill="url(#art-crash-fill)" />
          <path d="M10 110 C 90 108, 130 90, 170 28" fill="none" stroke="#39ff14" strokeWidth="7" strokeOpacity="0.2" />
          <path d="M10 110 C 90 108, 130 90, 170 28" fill="none" stroke="#39ff14" strokeWidth="2.5" />
          <circle cx="170" cy="28" r="10" fill="#39ff14" fillOpacity="0.25" className="animate-glow-pulse" />
          <circle cx="170" cy="28" r="4" fill="white" />
          <text x="18" y="38" fill="white" fontSize="26" fontWeight="700" style={{ fontFamily: "var(--font-geist-mono)" }}>
            4,20×
          </text>
        </svg>
      );
    case "mines":
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          {Array.from({ length: 15 }, (_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const x = 22 + col * 32;
            const y = 12 + row * 34;
            const kind = [1, 7, 12].includes(i) ? "gem" : i === 9 ? "mine" : "hidden";
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width="28"
                  height="28"
                  rx="6"
                  fill={kind === "gem" ? "#0c2b06" : kind === "mine" ? "#33060f" : "white"}
                  fillOpacity={kind === "hidden" ? 0.06 : 1}
                  stroke={kind === "gem" ? "#39ff14" : kind === "mine" ? "#ff2d55" : "white"}
                  strokeOpacity={kind === "hidden" ? 0.1 : 0.6}
                />
                {kind === "gem" && <path d={`M${x + 8} ${y + 11} l4 -5 h8 l4 5 l-8 11 Z`} fill="#39ff14" />}
                {kind === "mine" && <circle cx={x + 14} cy={y + 15} r="7" fill="#ff2d55" />}
              </g>
            );
          })}
        </svg>
      );
    case "limbo":
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <text x="100" y="78" textAnchor="middle" fill="white" fontSize="44" fontWeight="800" style={{ fontFamily: "var(--font-geist-mono)" }}>
            12,34×
          </text>
          <text x="100" y="104" textAnchor="middle" fill="#39ff14" fontSize="11" letterSpacing="3" style={{ fontFamily: "var(--font-geist-mono)" }}>
            ZIEL 10,00× ✓
          </text>
        </svg>
      );
    case "plinko": {
      const colors = ["#39ff14", "#b6ff1f", "#ffd23f", "#ff8a3d", "#ff2d55", "#ff8a3d", "#ffd23f", "#b6ff1f", "#39ff14"];
      return (
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          {Array.from({ length: 6 }, (_, row) =>
            Array.from({ length: row + 3 }, (_, j) => (
              <circle key={`${row}-${j}`} cx={100 + (j - (row + 2) / 2) * 20} cy={12 + row * 15} r="2.2" fill="white" fillOpacity="0.8" />
            )),
          )}
          <circle cx="110" cy="42" r="5" fill="#39ff14" />
          <circle cx="110" cy="42" r="10" fill="#39ff14" fillOpacity="0.25" className="animate-glow-pulse" />
          {colors.map((color, i) => (
            <rect key={i} x={12 + i * 20} y="100" width="16" height="12" rx="3" fill={color} fillOpacity="0.9" />
          ))}
        </svg>
      );
    }
  }
}
