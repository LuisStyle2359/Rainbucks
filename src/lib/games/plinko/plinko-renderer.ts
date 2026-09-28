import { ParticleSystem, createGlowSprite } from "@/lib/canvas/particles";
import { BALL_RADIUS, PEG_GAP, PEG_RADIUS, type PlinkoWorld } from "./plinko-physics";

const TOXIC = "#39ff14";
const WHITE = "#ffffff";
const PEG_GLOW_MS = 420;
const BIN_BOUNCE_MS = 380;

/** Fachfarbe von Rot (kleinster Multiplikator) bis Toxic-Grün (größter). */
export function binColor(multiplier: number, min: number, max: number): string {
  const t = max > min ? Math.log(multiplier / min) / Math.log(max / min) : 1;
  const hue = (350 + t * 115) % 360;
  return `hsl(${hue.toFixed(0)} 100% ${(52 + t * 4).toFixed(0)}%)`;
}

/**
 * Zeichnet das Plinko-Brett. Statische Pins liegen in einem Offscreen-Canvas,
 * pro Frame kommen nur leuchtende Pins, Kugeln, Fächer und Funken dazu.
 * Ohne Bewegung wird nichts neu gezeichnet (spart Akku).
 */
export class PlinkoRenderer<T> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly staticLayer: HTMLCanvasElement;
  private readonly particles: ParticleSystem;
  private readonly glowToxic: HTMLCanvasElement;
  private readonly glowWhite: HTMLCanvasElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly font: string;

  private multipliers: readonly number[] = [];
  private binHitAt: number[] = [];
  private binColors: string[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private scale = 1;
  private raf = 0;
  private lastTime = 0;
  private dirty = true;
  private destroyed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly world: PlinkoWorld<T>,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D wird nicht unterstützt.");
    this.ctx = ctx;
    this.staticLayer = document.createElement("canvas");
    this.particles = new ParticleSystem(600, [TOXIC, WHITE, "#ffd23f", "#ff2d55"]);
    this.glowToxic = createGlowSprite(TOXIC);
    this.glowWhite = createGlowSprite("#d9ffd0");
    this.font =
      getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() ||
      "ui-monospace, monospace";

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  start(): void {
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
  }

  /** Neue Reihen/Risiko → Fächer neu beschriften. */
  setMultipliers(multipliers: readonly number[]): void {
    this.multipliers = multipliers;
    this.binHitAt = multipliers.map(() => -Infinity);
    const min = Math.min(...multipliers);
    const max = Math.max(...multipliers);
    this.binColors = multipliers.map((m) => binColor(m, min, max));
    this.renderStaticLayer();
    this.dirty = true;
  }

  /** Kugel ist gelandet: Fach hüpft, Funken sprühen. */
  landed(bin: number, x: number, y: number): void {
    this.binHitAt[bin] = this.world.time;
    const big = (this.multipliers[bin] ?? 0) >= 1;
    this.particles.burst(x, y, big ? 26 : 10, big ? 260 : 140, big ? [0, 1, 2] : [3, 1]);
    this.dirty = true;
  }

  // ---------------------------------------------------------------------------

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.renderStaticLayer();
    this.dirty = true;
  }

  private renderStaticLayer(): void {
    const { geometry } = this.world;
    this.scale = this.width / geometry.width;
    const layer = this.staticLayer;
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    for (const peg of geometry.pegs) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private frame = (): void => {
    if (this.destroyed) return;
    const now = performance.now();
    const dt = this.lastTime ? Math.min(50, now - this.lastTime) : 16.7;
    this.lastTime = now;

    // Die Welt tickt immer weiter, damit Glow- und Hüpf-Animationen auslaufen.
    this.world.step(dt);
    const busy = this.world.balls.length > 0 || this.particles.active > 0 || this.animating();
    if (busy || this.dirty) {
      this.particles.update(dt / 1000, 520, 0.6);
      this.draw();
      this.dirty = busy;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private animating(): boolean {
    const time = this.world.time;
    if (this.binHitAt.some((hit) => time - hit < BIN_BOUNCE_MS)) return true;
    for (const hit of this.world.pegHitAt) if (time - hit < PEG_GLOW_MS) return true;
    return false;
  }

  private draw(): void {
    const { ctx, world } = this;
    const { geometry, time } = world;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.staticLayer, 0, 0);
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);

    // Leuchtende Pins nach einem Treffer
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    geometry.pegs.forEach((peg, index) => {
      const age = time - world.pegHitAt[index];
      if (age < 0 || age > PEG_GLOW_MS) return;
      const t = 1 - age / PEG_GLOW_MS;
      const size = PEG_RADIUS * (5 + 5 * t);
      ctx.globalAlpha = t;
      ctx.drawImage(this.glowToxic, peg.x - size / 2, peg.y - size / 2, size, size);
    });
    ctx.restore();

    this.drawBins();

    // Kugeln mit Leuchtspur
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ball of world.balls) {
      const trail = ball.trail;
      const points = trail.length / 2;
      for (let i = 0; i < points - 1; i++) {
        const t = (i + 1) / points;
        const size = BALL_RADIUS * 2.6 * t;
        ctx.globalAlpha = t * 0.35;
        ctx.drawImage(this.glowToxic, trail[i * 2] - size / 2, trail[i * 2 + 1] - size / 2, size, size);
      }
      const { x, y } = ball.body.position;
      const glow = BALL_RADIUS * 4.4;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(this.glowToxic, x - glow / 2, y - glow / 2, glow, glow);
    }
    ctx.restore();
    for (const ball of world.balls) {
      const { x, y } = ball.body.position;
      const gradient = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, BALL_RADIUS);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.55, "#c9ffbd");
      gradient.addColorStop(1, TOXIC);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, BALL_RADIUS * 0.82, 0, Math.PI * 2);
      ctx.fill();
    }

    this.particles.draw(ctx);
  }

  private drawBins(): void {
    const { ctx, world } = this;
    const { geometry, time } = world;
    const width = PEG_GAP - 6;
    const height = geometry.binHeight * 0.74;
    const fontSize = Math.min(15, PEG_GAP * 0.26);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${this.font}`;
    geometry.binCenters.forEach((cx, bin) => {
      const multiplier = this.multipliers[bin];
      if (multiplier === undefined) return;
      const age = time - (this.binHitAt[bin] ?? -Infinity);
      const bounce = age >= 0 && age < BIN_BOUNCE_MS ? Math.sin((age / BIN_BOUNCE_MS) * Math.PI) : 0;
      const x = cx - width / 2;
      const y = geometry.binTop + bounce * 9;
      const color = this.binColors[bin];

      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + bounce * 26;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9 + bounce * 0.1;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillText(formatBin(multiplier), cx, y + height / 2 + 1);
    });
    ctx.restore();
  }
}

function formatBin(multiplier: number): string {
  if (multiplier >= 100) return `${multiplier}`;
  return `${multiplier.toLocaleString("de-DE", { maximumFractionDigits: 1 })}×`;
}
