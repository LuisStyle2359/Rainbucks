// Small building blocks of the casino frame (no Next.js dependencies, also used by the demo).

/**
 * Ambient neon light in the background: soft orbs that drift slowly.
 * Radial gradients instead of blur filters, so the drift stays cheap.
 */
export function AmbientLight() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-48 -top-48 size-[44rem] animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(57_255_20/0.09),transparent)]" />
      <div
        className="absolute -right-48 top-1/4 size-[40rem] animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(34_228_255/0.06),transparent)]"
        style={{ animationDelay: "-8s", animationDuration: "26s" }}
      />
      <div
        className="absolute -bottom-40 left-1/4 size-[36rem] animate-drift rounded-full bg-[radial-gradient(closest-side,rgb(255_79_216/0.05),transparent)]"
        style={{ animationDelay: "-15s", animationDuration: "30s" }}
      />
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]" aria-busy="true" aria-label="Loading">
      <div className="glass hidden h-[30rem] animate-pulse rounded-2xl lg:block" />
      <div className="glass h-[26rem] animate-pulse rounded-2xl" />
    </div>
  );
}
