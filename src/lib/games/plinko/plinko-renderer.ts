import { ParticleSystem, createGlowSprite, withAlpha } from "@/lib/canvas/particles";
import type { ScreenPoint } from "@/lib/casino/celebrations";
import { BALL_RADIUS, PEG_GAP, PEG_RADIUS, type PlinkoWorld } from "./plinko-physics";

const TOXIC = "#39ff14";
const WHITE = "#ffffff";
const GOLD = "#ffd23f";
const RED = "#ff2d55";
const CYAN = "#7cf5ff";
const PINK = "#ff4fd8";
/** Every ball gets its own neon color, so a stream of balls reads as a light show */
const BALL_COLORS = [TOXIC, CYAN, PINK, GOLD] as const;
// Particle palette indices
const P_TOXIC = 0;
const P_WHITE = 1;
const P_GOLD = 2;
const P_RED = 3;
const P_CYAN = 4;
const P_PINK = 5;

const PEG_GLOW_MS = 420;
const BIN_BOUNCE_MS = 380;
const LABEL_MS = 1100;
const RING_MS = 650;

/** Slot color from red (smallest multiplier) to toxic green (largest). */
export function binColor(multiplier: number, min: number, max: number): string {
  const t = max > min ? Math.log(multiplier / min) / Math.log(max / min) : 1;
  const hue = (350 + t * 115) % 360;
  return `hsl(${hue.toFixed(0)} 100% ${(52 + t * 4).toFixed(0)}%)`;
}

interface FloatingLabel {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  color: string;
  born: number;
  radius: number;
}

/**
 * Draws the Plinko board. Static pins live in an offscreen canvas; each frame
 * only adds glowing pins, balls, slots, sparks, rings and floating labels.
 * Nothing is redrawn while nothing moves (saves battery).
 */
export class PlinkoRenderer<T> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly staticLayer: HTMLCanvasElement;
  private readonly particles: ParticleSystem;
  private readonly glowToxic: HTMLCanvasElement;
  private readonly ballGlows: HTMLCanvasElement[];
  private readonly resizeObserver: ResizeObserver;
  private readonly font: string;

  private multipliers: readonly number[] = [];
  private binHitAt: number[] = [];
  private binColors: string[] = [];
  private labels: FloatingLabel[] = [];
  private rings: Ring[] = [];
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
    if (!ctx) throw new Error("Canvas 2D is not supported.");
    this.ctx = ctx;
    this.staticLayer = document.createElement("canvas");
    this.particles = new ParticleSystem(900, [TOXIC, WHITE, GOLD, RED, CYAN, PINK]);
    this.glowToxic = createGlowSprite(TOXIC);
    this.ballGlows = BALL_COLORS.map(createGlowSprite);
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

  /** New rows/risk → relabel the slots. */
  setMultipliers(multipliers: readonly number[]): void {
    this.multipliers = multipliers;
    this.binHitAt = multipliers.map(() => -Infinity);
    const min = Math.min(...multipliers);
    const max = Math.max(...multipliers);
    this.binColors = multipliers.map((m) => binColor(m, min, max));
    this.renderStaticLayer();
    this.dirty = true;
  }

  /** A ball landed: the slot bounces, sparks fly, real wins float up. */
  landed(bin: number, x: number, y: number): void {
    const time = this.world.time;
    const multiplier = this.multipliers[bin] ?? 0;
    const color = this.binColors[bin] ?? TOXIC;
    this.binHitAt[bin] = time;

    if (multiplier >= 10) {
      this.particles.burst(x, y, 70, 420, [P_GOLD, P_WHITE, P_TOXIC, P_PINK]);
      this.rings.push({ x, y, color: GOLD, born: time, radius: PEG_GAP * 2.4 });
      this.rings.push({ x, y, color: WHITE, born: time + 90, radius: PEG_GAP * 1.4 });
    } else if (multiplier >= 2) {
      this.particles.burst(x, y, 34, 300, [P_TOXIC, P_WHITE, P_CYAN, P_GOLD]);
      this.rings.push({ x, y, color: TOXIC, born: time, radius: PEG_GAP * 1.3 });
    } else if (multiplier >= 1) {
      this.particles.burst(x, y, 16, 180, [P_TOXIC, P_WHITE]);
    } else {
      this.particles.burst(x, y, 10, 140, [P_RED, P_WHITE]);
    }

    // Only real wins get a floating label; losses stay quiet.
    if (multiplier >= 2) {
      this.labels.push({
        x,
        y: y - PEG_GAP * 0.4,
        text: formatBin(multiplier),
        color: multiplier >= 10 ? GOLD : color,
        born: time,
        size: multiplier >= 10 ? 30 : 22,
      });
    }
    this.dirty = true;
  }

  /** Board coordinates → viewport coordinates (for coins flying to the balance). */
  toClient(x: number, y: number): ScreenPoint {
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + x * this.scale, y: rect.top + y * this.scale };
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
    for (const peg of geometry.pegs) {
      const gradient = ctx.createRadialGradient(peg.x - 2, peg.y - 2, 0.5, peg.x, peg.y, PEG_RADIUS);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(1, "rgba(200,215,230,0.7)");
      ctx.fillStyle = gradient;
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

    // The world keeps ticking so glow and bounce animations can finish.
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
    this.labels = this.labels.filter((label) => time - label.born < LABEL_MS);
    this.rings = this.rings.filter((ring) => time - ring.born < RING_MS);
    if (this.labels.length > 0 || this.rings.length > 0) return true;
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

    // Pins light up after a hit
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
    this.drawRings();

    // Balls with light trails, each in its own color
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ball of world.balls) {
      const glowSprite = this.ballGlows[ball.id % BALL_COLORS.length];
      const trail = ball.trail;
      const points = trail.length / 2;
      for (let i = 0; i < points - 1; i++) {
        const t = (i + 1) / points;
        const size = BALL_RADIUS * 2.8 * t;
        ctx.globalAlpha = t * 0.4;
        ctx.drawImage(glowSprite, trail[i * 2] - size / 2, trail[i * 2 + 1] - size / 2, size, size);
      }
      const { x, y } = ball.body.position;
      const glow = BALL_RADIUS * 4.8;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(glowSprite, x - glow / 2, y - glow / 2, glow, glow);
    }
    ctx.restore();
    for (const ball of world.balls) {
      const color = BALL_COLORS[ball.id % BALL_COLORS.length];
      const { x, y } = ball.body.position;
      const gradient = ctx.createRadialGradient(x - 4, y - 4, 1, x, y, BALL_RADIUS);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.5, withAlpha(color, 0.9));
      gradient.addColorStop(1, color);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, BALL_RADIUS * 0.82, 0, Math.PI * 2);
      ctx.fill();
    }

    this.particles.draw(ctx);
    this.drawLabels();
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
      ctx.shadowBlur = 10 + bounce * 30;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9 + bounce * 0.1;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 6);
      ctx.fill();
      // White flash on impact
      if (bounce > 0) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = bounce * 0.55;
        ctx.fillStyle = WHITE;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillText(formatBin(multiplier), cx, y + height / 2 + 1);
    });
    ctx.restore();
  }

  private drawRings(): void {
    const { ctx } = this;
    const time = this.world.time;
    if (this.rings.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ring of this.rings) {
      const age = time - ring.born;
      if (age < 0) continue;
      const t = age / RING_MS;
      const eased = 1 - (1 - t) ** 3;
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 5 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius * eased, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawLabels(): void {
    const { ctx } = this;
    const time = this.world.time;
    if (this.labels.length === 0) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const label of this.labels) {
      const t = (time - label.born) / LABEL_MS;
      // Pops in, then drifts up and fades out
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : 1.15 - Math.min(0.15, (t - 0.15) * 0.4);
      const y = label.y - t * PEG_GAP * 1.6;
      ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.font = `800 ${label.size * pop}px ${this.font}`;
      ctx.shadowColor = label.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.strokeText(label.text, label.x, y);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, label.x, y);
    }
    ctx.restore();
  }
}

function formatBin(multiplier: number): string {
  if (multiplier >= 100) return `${multiplier}`;
  return `${multiplier.toLocaleString("en-US", { maximumFractionDigits: 1 })}×`;
}
