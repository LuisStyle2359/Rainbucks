import type { ReactNode } from "react";
import { ChipFace, chipTone } from "@/components/casino/ui/chip";
import { Coin } from "@/components/casino/ui/coin";
import { cn } from "@/lib/cn";

const LAYERS = 12;

/**
 * A disc with real thickness: a dozen slices stacked along the Z axis form the
 * rim, the faces sit on both ends. Spins around its vertical axis.
 * Needs a parent with perspective to look 3D.
 */
function Disc3D({
  front,
  back,
  rim,
  thickness,
  spin,
  className,
}: {
  front: ReactNode;
  back: ReactNode;
  rim: string;
  thickness: number;
  spin: boolean;
  className?: string;
}) {
  const step = thickness / (LAYERS - 1);
  return (
    <div className={cn("relative [transform-style:preserve-3d]", spin && "animate-coin-spin", className)}>
      {Array.from({ length: LAYERS }, (_, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{ background: rim, transform: `translateZ(${i * step - thickness / 2}px)` }}
        />
      ))}
      <div className="absolute inset-0" style={{ transform: `translateZ(${thickness / 2 + 0.5}px)` }}>
        {front}
      </div>
      <div className="absolute inset-0" style={{ transform: `rotateY(180deg) translateZ(${thickness / 2 + 0.5}px)` }}>
        {back}
      </div>
    </div>
  );
}

/** Spinning Rainbucks coin. */
export function Coin3D({ className, spin = true, thickness = 10 }: { className?: string; spin?: boolean; thickness?: number }) {
  return (
    <Disc3D
      className={className}
      spin={spin}
      thickness={thickness}
      rim="linear-gradient(90deg,#0d4d00,#2fd10c 45%,#0d4d00)"
      front={<Coin className="size-full! drop-shadow-[0_0_18px_rgb(57_255_20/0.55)]" />}
      back={<Coin className="size-full!" />}
    />
  );
}

/** Spinning casino chip of a given value (cents). */
export function Chip3D({
  amount,
  className,
  spin = true,
  thickness = 6,
}: {
  amount: number;
  className?: string;
  spin?: boolean;
  thickness?: number;
}) {
  const tone = chipTone(amount);
  return (
    <Disc3D
      className={className}
      spin={spin}
      thickness={thickness}
      rim={`repeating-conic-gradient(${tone.edge} 0 22deg, #f4f4f5 22deg 30deg)`}
      front={<ChipFace amount={amount} />}
      back={<ChipFace amount={amount} />}
    />
  );
}
