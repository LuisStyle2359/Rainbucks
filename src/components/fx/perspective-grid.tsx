import { cn } from "@/lib/cn";

/**
 * Neon floor grid that runs towards the viewer, like a synthwave horizon.
 * The plane is tilted once; only a transform loops, so it stays on the compositor.
 */
export function PerspectiveGrid({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden [perspective:380px] [mask-image:linear-gradient(to_top,black_15%,transparent_90%)]",
        className,
      )}
    >
      <div className="absolute inset-x-[-60%] bottom-[-30%] h-[220%] origin-bottom [transform:rotateX(72deg)]">
        <div className="absolute inset-x-0 -top-[48px] bottom-0 animate-grid-scroll bg-[linear-gradient(rgb(57_255_20/0.28)_1px,transparent_1px),linear-gradient(90deg,rgb(57_255_20/0.22)_1px,transparent_1px)] bg-[length:48px_48px]" />
      </div>
      {glow && (
        <div className="absolute inset-x-0 top-[8%] h-px bg-[linear-gradient(90deg,transparent,rgb(57_255_20/0.6),transparent)] shadow-[0_0_24px_4px_rgb(57_255_20/0.35)]" />
      )}
    </div>
  );
}
