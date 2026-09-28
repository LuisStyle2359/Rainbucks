"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { NeonButton } from "@/components/casino/ui/neon-button";
import { Segmented } from "@/components/casino/ui/segmented";
import { audio } from "@/lib/audio/audio-engine";
import type { PlinkoRisk } from "@/lib/casino/games";
import { formatMultiplier } from "@/lib/casino/money";
import { cn } from "@/lib/cn";
import { ProvablyFair, type VerifyParams, type VerifyResult } from "@/lib/fairness/provably-fair";
import { PLINKO_RISKS, isPlinkoRows, plinkoMultiplier } from "@/lib/games/plinko/payouts";
import { useFairnessStore } from "@/lib/stores/fairness-store";

type VerifyGame = VerifyParams["game"];

export interface VerifyPrefill {
  game?: VerifyGame;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: string;
  mines?: string;
  rows?: string;
  risk?: string;
}

const GAME_OPTIONS = [
  { value: "crash", label: "Crash" },
  { value: "limbo", label: "Limbo" },
  { value: "mines", label: "Mines" },
  { value: "plinko", label: "Plinko" },
] as const satisfies readonly { value: VerifyGame; label: string }[];

export function FairnessView({ prefill }: { prefill: VerifyPrefill }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <ActiveSeeds />
        <RevealedSeeds />
      </div>
      <div className="space-y-6">
        <Verifier prefill={prefill} />
        <HowItWorks />
      </div>
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass glass-edge rounded-2xl p-5", className)}>
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.22em] text-zinc-300">{title}</h2>
      {children}
    </section>
  );
}

function CopyValue({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          });
        }}
        className="group flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-black/50 px-3 py-2.5 text-left font-mono text-xs text-zinc-200 transition hover:border-toxic/40"
        title="Kopieren"
      >
        <span className={cn("min-w-0 flex-1 break-all", secret && "blur-[3px] select-none")}>{value}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-widest text-zinc-500 group-hover:text-toxic">
          {copied ? "Kopiert ✓" : "Kopieren"}
        </span>
      </button>
    </div>
  );
}

function ActiveSeeds() {
  const serverSeedHash = useFairnessStore((s) => s.serverSeedHash);
  const clientSeed = useFairnessStore((s) => s.clientSeed);
  const nonce = useFairnessStore((s) => s.nonce);
  const rotate = useFairnessStore((s) => s.rotate);
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Panel title="Aktives Seed-Paar">
      <div className="space-y-4">
        <CopyValue label="Server-Seed (SHA-256-Hash, vorab veröffentlicht)" value={serverSeedHash} />
        <div>
          <label htmlFor="client-seed" className="mb-1 block text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            Client-Seed (von dir wählbar)
          </label>
          <div className="flex gap-2">
            <input
              id="client-seed"
              value={draft ?? clientSeed}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={64}
              className="h-11 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/50 px-3 font-mono text-sm text-white outline-none focus:border-toxic/60"
            />
            <button
              type="button"
              onClick={() => setDraft(ProvablyFair.generateClientSeed())}
              className="glass h-11 shrink-0 rounded-lg px-3 text-xs font-medium text-zinc-300 hover:text-white"
            >
              Zufällig
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2.5 text-sm">
          <span className="text-zinc-400">Nonce (Wetten mit diesem Paar)</span>
          <span className="font-mono text-white">{nonce}</span>
        </div>
        <NeonButton
          className="h-12 w-full"
          onClick={() => {
            rotate(draft ?? undefined);
            setDraft(null);
            audio.play("cashout");
          }}
        >
          Seed-Paar rotieren
        </NeonButton>
        <p className="text-xs leading-relaxed text-zinc-500">
          Rotieren legt den bisherigen Server-Seed offen. Danach kannst du jede Wette dieses Paares nachrechnen.
          Ein geänderter Client-Seed gilt ab dem neuen Paar.
        </p>
      </div>
    </Panel>
  );
}

function RevealedSeeds() {
  const revealed = useFairnessStore((s) => s.revealed);
  return (
    <Panel title="Offengelegte Server-Seeds">
      {revealed.length === 0 ? (
        <p className="text-sm text-zinc-500">Noch nichts offengelegt. Rotiere dein Seed-Paar, um den aktuellen Server-Seed zu sehen.</p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {revealed.map((seed) => (
              <motion.li
                key={seed.serverSeedHash}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 rounded-xl border border-white/[0.06] bg-black/30 p-3"
              >
                <CopyValue label="Server-Seed" value={seed.serverSeed} />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-zinc-500">
                    Client-Seed: <span className="break-all font-mono text-zinc-200">{seed.clientSeed}</span>
                  </p>
                  <p className="text-right text-zinc-500">
                    Wetten: <span className="font-mono text-zinc-200">{seed.nonce}</span>
                  </p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}

function Verifier({ prefill }: { prefill: VerifyPrefill }) {
  const revealed = useFairnessStore((s) => s.revealed);
  const [game, setGame] = useState<VerifyGame>(prefill.game ?? "crash");
  // Ist der Server-Seed zur Wette schon offengelegt, wird er automatisch eingesetzt
  // (auch wenn er erst auf dieser Seite durch Rotieren offengelegt wird).
  const knownSeed = revealed.find((seed) => seed.serverSeedHash === prefill.serverSeedHash)?.serverSeed;
  const [typedServerSeed, setServerSeed] = useState<string | null>(null);
  const serverSeed = typedServerSeed ?? knownSeed ?? "";
  const [expectedHash, setExpectedHash] = useState(prefill.serverSeedHash ?? "");
  const [clientSeed, setClientSeed] = useState(prefill.clientSeed ?? "");
  const [nonce, setNonce] = useState(prefill.nonce ?? "0");
  const [mines, setMines] = useState(prefill.mines ?? "3");
  const [rows, setRows] = useState(prefill.rows ?? "12");
  // Nur gültige Werte aus der URL übernehmen (sie kann von Hand verändert werden)
  const [risk, setRisk] = useState<PlinkoRisk>(
    PLINKO_RISKS.find((r) => r.id === prefill.risk)?.id ?? "medium",
  );

  const waitingForReveal = Boolean(prefill.serverSeedHash && !knownSeed && typedServerSeed === null);

  const result: VerifyResult | { error: string } | null = useMemo(() => {
    if (!serverSeed.trim() || !clientSeed.trim()) return null;
    const nonceValue = Number(nonce);
    if (!Number.isInteger(nonceValue) || nonceValue < 0) return { error: "Die Nonce muss eine ganze Zahl ≥ 0 sein." };
    let params: VerifyParams;
    if (game === "mines") {
      const count = Number(mines);
      if (!Number.isInteger(count) || count < 1 || count > 24) return { error: "Minen: 1 bis 24." };
      params = { game, mines: count };
    } else if (game === "plinko") {
      const rowCount = Number(rows);
      if (!isPlinkoRows(rowCount)) return { error: "Reihen: 8 bis 16." };
      params = { game, rows: rowCount };
    } else {
      params = { game };
    }
    return ProvablyFair.verify(
      { serverSeed: serverSeed.trim(), clientSeed: clientSeed.trim(), nonce: nonceValue, expectedServerSeedHash: expectedHash },
      params,
    );
  }, [serverSeed, clientSeed, nonce, game, mines, rows, expectedHash]);

  const input = "h-10 w-full rounded-lg border border-white/[0.08] bg-black/50 px-3 font-mono text-xs text-white outline-none focus:border-toxic/60";
  const label = "mb-1 block text-[11px] font-medium uppercase tracking-widest text-zinc-500";

  return (
    <Panel title="Ergebnis überprüfen">
      <div className="space-y-4">
        <Segmented options={GAME_OPTIONS} value={game} onChange={setGame} layoutId="verify-game" size="sm" />
        {waitingForReveal && (
          <p className="rounded-lg border border-gold/30 bg-gold/[0.07] px-3 py-2 text-xs text-gold">
            Diese Wette nutzt dein aktives Seed-Paar. Rotiere es links, dann wird der Server-Seed hier automatisch eingetragen.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={label}>Server-Seed (offengelegt)</span>
            <input value={serverSeed} onChange={(e) => setServerSeed(e.target.value)} className={input} placeholder="64 Hex-Zeichen" />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>Erwarteter Hash (optional)</span>
            <input value={expectedHash} onChange={(e) => setExpectedHash(e.target.value)} className={input} placeholder="SHA-256 des Server-Seeds" />
          </label>
          <label>
            <span className={label}>Client-Seed</span>
            <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} className={input} />
          </label>
          <label>
            <span className={label}>Nonce</span>
            <input value={nonce} inputMode="numeric" onChange={(e) => setNonce(e.target.value)} className={input} />
          </label>
          {game === "mines" && (
            <label>
              <span className={label}>Minen</span>
              <input value={mines} inputMode="numeric" onChange={(e) => setMines(e.target.value)} className={input} />
            </label>
          )}
          {game === "plinko" && (
            <>
              <label>
                <span className={label}>Reihen (8–16)</span>
                <input value={rows} inputMode="numeric" onChange={(e) => setRows(e.target.value)} className={input} />
              </label>
              <div className="sm:col-span-2">
                <span className={label}>Risiko</span>
                <Segmented
                  options={PLINKO_RISKS.map((r) => ({ value: r.id, label: r.label }))}
                  value={risk}
                  onChange={setRisk}
                  layoutId="verify-risk"
                  size="sm"
                />
              </div>
            </>
          )}
        </div>

        <div className="min-h-32 rounded-xl border border-white/[0.06] bg-black/40 p-4">
          {!result && <p className="text-sm text-zinc-500">Trage Server-Seed, Client-Seed und Nonce ein.</p>}
          {result && "error" in result && <p className="text-sm text-neon-red">{result.error}</p>}
          {result && !("error" in result) && <VerifyOutput result={result} risk={risk} />}
        </div>
      </div>
    </Panel>
  );
}

function VerifyOutput({ result, risk }: { result: VerifyResult; risk: PlinkoRisk }) {
  const { outcome, hashMatches, serverSeedHash } = result;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">SHA-256(Server-Seed):</span>
        <span className="break-all font-mono text-zinc-300">{serverSeedHash}</span>
        {hashMatches !== null && (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 font-semibold",
              hashMatches ? "bg-toxic/15 text-toxic" : "bg-neon-red/15 text-neon-red",
            )}
          >
            {hashMatches ? "Hash stimmt ✓" : "Hash stimmt nicht ✗"}
          </span>
        )}
      </div>

      {outcome.game === "crash" && <BigValue label="Crash-Punkt" value={formatMultiplier(outcome.crashPoint)} />}
      {outcome.game === "limbo" && <BigValue label="Limbo-Ergebnis" value={formatMultiplier(outcome.result)} />}
      {outcome.game === "mines" && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">Minen-Positionen</p>
          <div className="grid w-48 grid-cols-5 gap-1.5">
            {Array.from({ length: 25 }, (_, tile) => {
              const mine = outcome.minePositions.includes(tile);
              return (
                <span
                  key={tile}
                  className={cn(
                    "grid aspect-square place-items-center rounded-md border text-[10px]",
                    mine ? "border-neon-red/50 bg-neon-red/20 text-neon-red" : "border-toxic/25 bg-toxic/[0.07] text-toxic",
                  )}
                >
                  {mine ? "✹" : "◆"}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {outcome.game === "plinko" && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-zinc-500">Pfad</p>
          <p className="font-mono text-sm tracking-widest text-zinc-200">
            {outcome.path.map((step) => (step === 1 ? "→" : "←")).join(" ")}
          </p>
          <BigValue
            label={`Fach ${outcome.bin} von ${outcome.path.length}`}
            value={
              isPlinkoRows(outcome.path.length)
                ? formatMultiplier(plinkoMultiplier(outcome.path.length, risk, outcome.bin))
                : "–"
            }
          />
        </div>
      )}
    </div>
  );
}

function BigValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="font-mono text-4xl font-bold neon-text-toxic tabular">{value}</p>
    </div>
  );
}

function HowItWorks() {
  return (
    <Panel title="So funktioniert Provably Fair">
      <ol className="space-y-3 text-sm leading-relaxed text-zinc-400">
        <li>
          <span className="font-semibold text-zinc-200">1. Festlegen:</span> Vor deiner ersten Wette wird ein geheimer
          Server-Seed erzeugt. Du siehst nur seinen SHA-256-Hash. Damit ist er festgelegt, kann aber nicht erraten werden.
        </li>
        <li>
          <span className="font-semibold text-zinc-200">2. Mischen:</span> Dein Client-Seed und eine fortlaufende Nonce
          fließen in jedes Ergebnis ein. Das Casino kennt deinen Client-Seed vorher nicht.
        </li>
        <li>
          <span className="font-semibold text-zinc-200">3. Berechnen:</span> HMAC-SHA256 liefert 32 Zufallsbytes, je 4
          Bytes werden zu einer Zahl zwischen 0 und 1.
        </li>
        <li>
          <span className="font-semibold text-zinc-200">4. Prüfen:</span> Nach dem Rotieren wird der Server-Seed
          offengelegt. Jeder kann Hash und Ergebnis mit diesem Rechner nachprüfen.
        </li>
      </ol>
      <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
        {`bytes  = HMAC_SHA256(serverSeed, \`\${clientSeed}:\${nonce}:\${cursor}\`)
float  = b0/256 + b1/256² + b2/256³ + b3/256⁴      // 0 ≤ float < 1

Crash / Limbo: max(1, floor(0,99 / (1 − float) · 100) / 100)
Mines:         Fisher-Yates-Mischung der 25 Felder
Plinko:        pro Reihe float < 0,5 → links, sonst rechts`}
      </pre>
      <p className="mt-3 text-xs text-zinc-500">
        Demo-Hinweis: Hier läuft der „Server“ im Browser. In einer echten Anwendung bleibt der Server-Seed bis zur
        Rotation auf dem Server.
      </p>
    </Panel>
  );
}

