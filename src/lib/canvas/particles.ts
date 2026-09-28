/**
 * Particle system for canvas effects (explosion, rocket exhaust, sparks).
 *
 * Performance tricks:
 * - Struct of arrays: every value lives in a preallocated Float32Array.
 *   No object per particle → no garbage collection during animations.
 * - Glow sprites: each color is pre-rendered once as a soft glowing dot and
 *   then stamped with drawImage (much faster than shadowBlur).
 */
export class ParticleSystem {
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly size: Float32Array;
  private readonly color: Uint8Array;
  private readonly sprites: HTMLCanvasElement[];
  private count = 0;

  constructor(
    private readonly capacity: number,
    palette: readonly string[],
  ) {
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.color = new Uint8Array(capacity);
    this.sprites = palette.map(createGlowSprite);
  }

  get active(): number {
    return this.count;
  }

  spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: number): void {
    if (this.count >= this.capacity) return;
    const i = this.count++;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.color[i] = color;
  }

  /** Explosion: particles fly apart radially. */
  burst(x: number, y: number, amount: number, speed: number, colors: readonly number[]): void {
    for (let n = 0; n < amount; n++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.15 + Math.sqrt(Math.random()) * 0.85);
      this.spawn(
        x,
        y,
        Math.cos(angle) * velocity,
        Math.sin(angle) * velocity,
        0.45 + Math.random() * 1.1,
        2 + Math.random() * 5,
        colors[n % colors.length],
      );
    }
  }

  /** gravity in px/s², drag = share of velocity lost per second (0…1). */
  update(dt: number, gravity: number, drag: number): void {
    const damping = Math.pow(1 - drag, dt);
    for (let i = 0; i < this.count; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.removeAt(i);
        i--;
        continue;
      }
      this.vx[i] *= damping;
      this.vy[i] = this.vy[i] * damping + gravity * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.count === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.count; i++) {
      const t = this.life[i] / this.maxLife[i];
      const s = this.size[i] * (0.4 + 0.6 * t) * 4;
      ctx.globalAlpha = Math.min(1, t * 1.4);
      ctx.drawImage(this.sprites[this.color[i]], this.x[i] - s / 2, this.y[i] - s / 2, s, s);
    }
    ctx.restore();
  }

  clear(): void {
    this.count = 0;
  }

  private removeAt(i: number): void {
    const last = --this.count;
    if (i === last) return;
    this.x[i] = this.x[last];
    this.y[i] = this.y[last];
    this.vx[i] = this.vx[last];
    this.vy[i] = this.vy[last];
    this.life[i] = this.life[last];
    this.maxLife[i] = this.maxLife[last];
    this.size[i] = this.size[last];
    this.color[i] = this.color[last];
  }
}

/** Soft glowing dot: white core → color → transparent. */
export function createGlowSprite(color: string): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, color);
  gradient.addColorStop(0.45, withAlpha(color, 0.35));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** "#rrggbb" + Alpha → "rgba(r,g,b,a)" */
export function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}
