"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { CrashEngine, CrashPhase } from "@/lib/games/crash/crash-engine";
import { CrashRenderer } from "@/lib/games/crash/crash-renderer";

interface CrashCanvasProps {
  engine: CrashEngine;
  onFrame?: (multiplier: number, phase: CrashPhase) => void;
  /** The multiplier just passed 2×, 3×, 5×, 10×, … */
  onMilestone?: (milestone: number) => void;
  className?: string;
}

/** Thin React wrapper: the CrashRenderer draws via requestAnimationFrame. */
export function CrashCanvas({ engine, onFrame, onMilestone, className }: CrashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFrameRef = useRef(onFrame);
  const onMilestoneRef = useRef(onMilestone);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    onFrameRef.current = onFrame;
    onMilestoneRef.current = onMilestone;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CrashRenderer(canvas, engine, {
      reducedMotion,
      onFrame: (multiplier, phase) => onFrameRef.current?.(multiplier, phase),
      onMilestone: (milestone) => onMilestoneRef.current?.(milestone),
    });
    renderer.start();
    return () => renderer.destroy();
  }, [engine, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Crash curve with a rising multiplier"
      className={cn("block w-full", className)}
    />
  );
}
