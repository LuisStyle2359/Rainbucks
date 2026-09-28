import { createGlowSprite, ParticleSystem } from "./particles";

/**
 * Full-screen effect canvas: coins flying into the balance, confetti and
 * sparkles. The loop only runs while something is on screen.
 */

export interface Point {
  x: number;
  y: number;
}

export interface CoinFlight {
  from: Point;
  to: Point;
  count: number;
  gold?: boolean;
  /** Called when a coin lands (index 0 … count−1) */
  onArrive?: (index: number, count: number) => void;
}

const GOLD = "#ffd23f";
const TOXIC = "#39ff14";
const WHITE = "#ffffff";
const PINK = "#ff4fd8";
const CYAN = "#22e4ff";
const CONFETTI_COLORS = [TOXIC, GOLD, PINK, CYAN, WHITE];

const COIN_DURATION_MS = 760;
const MAX_COINS = 180;
const MAX_CONFETTI = 420;
/** Same "R" glyph as the Coin SVG (24×24 units) */
const R_GLYPH =
  "M9.2 7.4h3.6a2.4 2.4 0 0 1 .5 4.75L15 16.6h-2l-1.55-4.2H11v4.2H9.2V7.4Zm1.8 1.6v1.9h1.7a.95.95 0 0 0 0-1.9H11Z";

interface Coin {
  // Cubic Bezier: start, burst point, approach point, end
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  start: number;
  duration: number;
  size: number;
  spin: number;
  spinSpeed: number;
  gold: boolean;
  index: number;
  count: number;
  onArrive?: (index: number, count: number) => void;
}

interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  width: number;
  height: number;
  color: string;
  life: number;
}

export class CelebrationRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly particles: ParticleSystem;
  private readonly greenCoin: HTMLCanvasElement;
  private readonly goldCoin: HTMLCanvasElement;
  private readonly glowGold: HTMLCanvasElement;
  private readonly glowGreen: HTMLCanvasElement;
  private coins: Coin[] = [];
  private confetti: Confetto[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private running = false;
  private lastTime = 0;
  private destroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not supported.");
    this.ctx = ctx;
    this.particles = new ParticleSystem(500, [GOLD, WHITE, TOXIC, PINK]);
    this.greenCoin = createCoinSprite(false);
    this.goldCoin = createCoinSprite(true);
    this.glowGold = createGlowSprite(GOLD);
    this.glowGreen = createGlowSprite(TOXIC);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }

  /**
   * Coins burst out of `from`, hang for a moment and get sucked into `to`.
   * Returns when the first and the last coin land (ms from now).
   */
  flyCoins({ from, to, count, gold = false, onArrive }: CoinFlight): { first: number; last: number } {
    const now = performance.now();
    const amount = Math.max(1, Math.min(count, MAX_COINS - this.coins.length));
    const stagger = Math.min(42, 900 / amount);
    let last = 0;
    for (let i = 0; i < amount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const burst = 70 + Math.random() * 110;
      const duration = COIN_DURATION_MS + Math.random() * 220;
      const delay = i * stagger;
      last = Math.max(last, delay + duration);
      this.coins.push({
        x0: from.x,
        y0: from.y,
        x1: from.x + Math.cos(angle) * burst,
        y1: from.y + Math.sin(angle) * burst,
        x2: to.x + (Math.random() - 0.5) * 120,
        y2: to.y + 110 + Math.random() * 80,
        x3: to.x,
        y3: to.y,
        start: now + delay,
        duration,
        size: (gold ? 26 : 22) + Math.random() * 6,
        spin: Math.random() * Math.PI,
        spinSpeed: 8 + Math.random() * 8,
        gold,
        index: i,
        count: amount,
        onArrive,
      });
    }
    // Launch sparkle at the origin
    this.particles.burst(from.x, from.y, gold ? 26 : 12, gold ? 380 : 240, gold ? [0, 1, 3] : [2, 1]);
    this.wake();
    return { first: COIN_DURATION_MS, last };
  }

  /** Confetti cannon from a point. `direction` in radians (default: straight up). */
  confettiBurst(
    x: number,
    y: number,
    amount: number,
    { power = 1, direction = -Math.PI / 2, spread = Math.PI * 1.1 }: { power?: number; direction?: number; spread?: number } = {},
  ): void {
    for (let i = 0; i < amount && this.confetti.length < MAX_CONFETTI; i++) {
      const angle = direction + (Math.random() - 0.5) * spread;
      const speed = (380 + Math.random() * 620) * power;
      this.confetti.push(this.createConfetto(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed));
    }
    this.wake();
  }

  /** Confetti falling from the top edge. */
  confettiRain(amount: number): void {
    for (let i = 0; i < amount && this.confetti.length < MAX_CONFETTI; i++) {
      const x = Math.random() * this.width;
      const y = -20 - Math.random() * this.height * 0.6;
      this.confetti.push(this.createConfetto(x, y, (Math.random() - 0.5) * 120, 80 + Math.random() * 220));
    }
    this.wake();
  }

  /** Little sparkle burst, e.g. where the coins land. */
  sparkle(x: number, y: number, gold: boolean): void {
    this.particles.burst(x, y, 6, 160, gold ? [0, 1] : [2, 1]);
    this.wake();
  }

  // ---------------------------------------------------------------------------

  private createConfetto(x: number, y: number, vx: number, vy: number): Confetto {
    return {
      x,
      y,
      vx,
      vy,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 14,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 6 + Math.random() * 10,
      width: 7 + Math.random() * 6,
      height: 4 + Math.random() * 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      life: 5 + Math.random() * 2,
    };
  }

  private resize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  };

  private wake(): void {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.lastTime = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    if (this.destroyed) return;
    const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = now;

    this.updateConfetti(dt);
    this.particles.update(dt, 380, 0.9);

    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawConfetti();
    this.drawCoins(performance.now(), dt);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.particles.draw(ctx);

    if (this.coins.length === 0 && this.confetti.length === 0 && this.particles.active === 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.running = false;
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private updateConfetti(dt: number): void {
    const drag = Math.pow(0.12, dt);
    this.confetti = this.confetti.filter((c) => {
      c.life -= dt;
      c.vx *= drag;
      c.vy = c.vy * drag + 520 * dt * drag;
      // Paper flutters: sideways sway while it tumbles
      c.x += (c.vx + Math.sin(c.flip) * 40) * dt;
      c.y += c.vy * dt;
      c.rotation += c.spin * dt;
      c.flip += c.flipSpeed * dt;
      return c.life > 0 && c.y < this.height + 40;
    });
  }

  private drawConfetti(): void {
    const { ctx, dpr } = this;
    for (const c of this.confetti) {
      const cos = Math.cos(c.rotation);
      const sin = Math.sin(c.rotation);
      const squash = Math.cos(c.flip);
      ctx.setTransform(cos * dpr, sin * dpr, -sin * squash * dpr, cos * squash * dpr, c.x * dpr, c.y * dpr);
      ctx.globalAlpha = Math.min(1, c.life);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
    }
    ctx.globalAlpha = 1;
  }

  private drawCoins(now: number, dt: number): void {
    const { ctx, dpr } = this;
    const arrived: Coin[] = [];
    for (const coin of this.coins) {
      const t = (now - coin.start) / coin.duration;
      if (t < 0) continue;
      if (t >= 1) {
        arrived.push(coin);
        continue;
      }
      const u = 1 - t;
      const x = u * u * u * coin.x0 + 3 * u * u * t * coin.x1 + 3 * u * t * t * coin.x2 + t * t * t * coin.x3;
      const y = u * u * u * coin.y0 + 3 * u * u * t * coin.y1 + 3 * u * t * t * coin.y2 + t * t * t * coin.y3;
      coin.spin += coin.spinSpeed * dt;
      // Pops in, shrinks while entering the balance
      const grow = Math.min(1, t * 8);
      const size = coin.size * grow * (1 - 0.45 * t * t * t);
      const flip = Math.max(0.18, Math.abs(Math.cos(coin.spin)));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55;
      const glow = size * 2.4;
      ctx.drawImage(coin.gold ? this.glowGold : this.glowGreen, x - glow / 2, y - glow / 2, glow, glow);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.setTransform(flip * dpr, 0, 0, dpr, x * dpr, y * dpr);
      ctx.drawImage(coin.gold ? this.goldCoin : this.greenCoin, -size / 2, -size / 2, size, size);

      // Glittering trail
      if (Math.random() < 0.35) {
        this.particles.spawn(x, y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0.35, 1.4, coin.gold ? 0 : 2);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (arrived.length > 0) {
      this.coins = this.coins.filter((coin) => !arrived.includes(coin));
      for (const coin of arrived) {
        this.sparkle(coin.x3, coin.y3, coin.gold);
        coin.onArrive?.(coin.index, coin.count);
      }
    }
  }
}

/** Pre-rendered RBX coin: shiny rim, inner ring and the "R". */
function createCoinSprite(gold: boolean): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const [light, mid, dark, ink] = gold
    ? ["#fff6c2", "#ffd23f", "#b07a00", "#5a3a00"]
    : ["#e2ffd8", "#39ff14", "#1a8f00", "#062b00"];
  const body = ctx.createRadialGradient(size * 0.36, size * 0.32, 2, size / 2, size / 2, size / 2);
  body.addColorStop(0, light);
  body.addColorStop(0.45, mid);
  body.addColorStop(1, dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.setTransform(size / 24, 0, 0, size / 24, 0, 0);
  ctx.fillStyle = ink;
  ctx.fill(new Path2D(R_GLYPH));
  return canvas;
}
