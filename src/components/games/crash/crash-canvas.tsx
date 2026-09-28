"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { CrashEngine, CrashPhase } from "@/lib/games/crash/crash-engine";
import { CrashRenderer } from "@/lib/games/crash/crash-renderer";

interface CrashCanvasProps {
  engine: CrashEngine;
  onFrame?: (multiplier: number, phase: CrashPhase) => void;
  className?: string;
}

/** Dünne React-Hülle: Das Zeichnen übernimmt der CrashRenderer per requestAnimationFrame. */
export function CrashCanvas({ engine, onFrame, className }: CrashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFrameRef = useRef(onFrame);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CrashRenderer(canvas, engine, {
      reducedMotion,
      onFrame: (multiplier, phase) => onFrameRef.current?.(multiplier, phase),
    });
    renderer.start();
    return () => renderer.destroy();
  }, [engine, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Crash-Kurve mit steigendem Multiplikator"
      className={cn("block w-full", className)}
    />
  );
}
