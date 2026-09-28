// Kleine Bausteine des Casino-Rahmens (ohne Next.js-Abhängigkeiten, auch in der Demo nutzbar).

/** Ambientes Neon-Licht im Hintergrund */
export function AmbientLight() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 size-[36rem] rounded-full bg-toxic/[0.06] blur-[120px]" />
      <div className="absolute -right-40 top-1/3 size-[32rem] rounded-full bg-cyan/[0.04] blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 size-[28rem] rounded-full bg-neon-red/[0.03] blur-[120px]" />
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]" aria-busy="true" aria-label="Lädt">
      <div className="glass hidden h-[30rem] animate-pulse rounded-2xl lg:block" />
      <div className="glass h-[26rem] animate-pulse rounded-2xl" />
    </div>
  );
}
