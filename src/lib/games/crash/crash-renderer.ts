import { formatAmount, formatMultiplier, formatSignedAmount, floorMultiplier } from "@/lib/casino/money";
import { ParticleSystem, withAlpha } from "@/lib/canvas/particles";
import {
  BETTING_MS,
  multiplierAt,
  timeForMultiplier,
  type CrashEngine,
  type CrashPhase,
  type CrashSnapshot,
} from "./crash-engine";

/**
 * Canvas-Renderer für Crash. Läuft komplett außerhalb von React:
 * requestAnimationFrame zeichnet mit der Bildwiederholrate des Displays
 * (60, 120 oder 144 Hz). Alle Bewegungen sind zeitbasiert (dt), daher
 * gleich schnell auf jedem Gerät.
 */

const TOXIC = "#39ff14";
const RED = "#ff2d55";
const ORANGE = "#ff8a3d";
const GOLD = "#ffd23f";
const WHITE = "#ffffff";
const PINK = "#ff4fd8";

const PALETTE = [TOXIC, RED, ORANGE, GOLD, WHITE, PINK] as const;
const C = { toxic: 0, red: 1, orange: 2, gold: 3, white: 4, pink: 5 } as const;

const Y_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1e3, 2e3, 2.5e3, 5e3, 1e4, 2e4, 2.5e4, 5e4, 1e5, 2e5, 2.5e5, 5e5];
const X_STEPS_S = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 1200];
const STAR_COUNT = 80;

export interface CrashRendererOptions {
  reducedMotion: boolean;
  /** Wird jeden Frame mit dem aktuellen Multiplikator aufgerufen (z. B. für den Cashout-Button). */
  onFrame?: (multiplier: number, phase: CrashPhase) => void;
}

interface Layout {
  left: number;
  top: number;
  width: number;
  height: number;
  compact: boolean;
}

export class CrashRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly particles = new ParticleSystem(1_400, PALETTE);
  private readonly stars = new Float32Array(STAR_COUNT * 3);
  private readonly points = new Float32Array(2 * 162);
  private readonly resizeObserver: ResizeObserver;
  private readonly fonts: { mono: string; display: string };

  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private lastTime = 0;
  private destroyed = false;

  private gridScroll = 0;
  private gridSpeed = 14;
  private shake = 0;
  private flash = 0;
  private exhaustCarry = 0;
  private shockwave = { at: -Infinity, x: 0, y: 0 };
  private explodedRound = -1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly engine: CrashEngine,
    private readonly options: CrashRendererOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D wird nicht unterstützt.");
    this.ctx = ctx;

    const styles = getComputedStyle(document.documentElement);
    this.fonts = {
      mono: styles.getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace",
      display: styles.getPropertyValue("--font-chakra").trim() || "system-ui, sans-serif",
    };

    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars[i * 3] = Math.random();
      this.stars[i * 3 + 1] = Math.random();
      this.stars[i * 3 + 2] = 0.25 + Math.random() * 0.75;
    }

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

  // ---------------------------------------------------------------------------

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    const w = Math.max(1, Math.round(rect.width * this.dpr));
    const h = Math.max(1, Math.round(rect.height * this.dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  private frame = (): void => {
    if (this.destroyed) return;
    const now = performance.now();
    const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = now;
    this.render(now, dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  private render(now: number, dt: number): void {
    const { ctx, width: W, height: H } = this;
    const snap = this.engine.getSnapshot();
    const multiplier = this.engine.getMultiplier(now);
    this.options.onFrame?.(multiplier, snap.phase);
    if (W < 2 || H < 2) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const compact = W < 520;
    const layout: Layout = {
      left: compact ? 44 : 60,
      top: compact ? 18 : 26,
      width: W - (compact ? 44 : 60) - (compact ? 14 : 26),
      height: H - (compact ? 18 : 26) - (compact ? 28 : 36),
      compact,
    };

    // --- Zeitachse und Skalierung --------------------------------------------
    let tEnd = 0;
    let mEnd = 1;
    if (snap.phase === "running") {
      tEnd = Math.max(0, now - snap.runningStartedAt);
      mEnd = multiplier;
    } else if (snap.phase === "crashed" && snap.crashPoint !== null) {
      mEnd = snap.crashPoint;
      tEnd = timeForMultiplier(mEnd);
    }
    // Kopf der Kurve bleibt bei ~80 % Breite und ~72 % Höhe, die Achsen skalieren mit.
    const tMax = Math.max(10_000, tEnd / 0.8);
    const mMax = Math.max(2, 1 + (mEnd - 1) / 0.72);
    const X = (t: number) => layout.left + (t / tMax) * layout.width;
    const Y = (m: number) => layout.top + layout.height - ((m - 1) / (mMax - 1)) * layout.height;

    // --- Zustand fortschreiben -----------------------------------------------
    const targetSpeed =
      snap.phase === "running" ? 45 + 130 * Math.log(Math.max(1, mEnd)) : snap.phase === "betting" ? 14 : 0;
    const response = snap.phase === "crashed" ? 2.2 : 4;
    this.gridSpeed += (targetSpeed - this.gridSpeed) * (1 - Math.exp(-dt * response));
    this.gridScroll += this.gridSpeed * dt;

    if (snap.phase === "crashed" && this.explodedRound !== snap.roundId) {
      this.explodedRound = snap.roundId;
      this.explode(X(tEnd), Y(mEnd), now);
    }
    this.shake *= Math.exp(-dt * 7);
    this.flash *= Math.exp(-dt * 5);

    // --- Zeichnen -------------------------------------------------------------
    const accent = snap.phase === "crashed" ? RED : TOXIC;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(
      layout.left,
      layout.top + layout.height,
      0,
      layout.left,
      layout.top + layout.height,
      Math.max(W, H) * 0.95,
    );
    glow.addColorStop(0, withAlpha(accent, snap.phase === "running" ? 0.13 : 0.07));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (this.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * 2 * this.shake, (Math.random() - 0.5) * 2 * this.shake);
    }

    this.drawStars(dt);
    this.drawGrid(layout);
    this.drawAxes(layout, tMax, mMax, X, Y);

    const running = snap.phase === "running";
    this.particles.update(dt, running ? 120 : 220, running ? 0.9 : 0.8);

    if (snap.phase === "betting") {
      this.particles.draw(ctx);
      this.drawBetting(now, snap, layout, X(0), Y(1));
    } else {
      const head = this.drawCurve(tEnd, X, Y, accent, layout);
      this.drawCashoutMarkers(snap, X, Y);
      const scale = compact ? 0.82 : 1;
      if (running) this.emitExhaust(head.x, head.y, head.angle, multiplier, dt, scale);
      this.particles.draw(ctx);
      if (running) this.drawRocket(head.x, head.y, head.angle, now, scale, 1);
      this.drawShockwave(now);
      this.drawMultiplier(snap, multiplier, layout);
    }
    ctx.restore();

    if (this.flash > 0.01) {
      ctx.fillStyle = withAlpha(RED, this.flash * 0.3);
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------------------------------------------------------------------
  // Hintergrund
  // ---------------------------------------------------------------------------

  /** Sterne mit Tiefe: nahe Sterne sind heller, schneller und ziehen Streifen. */
  private drawStars(dt: number): void {
    const { ctx, width: W, height: H, stars } = this;
    const speed = this.gridSpeed;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < STAR_COUNT; i++) {
      const depth = stars[i * 3 + 2];
      let x = stars[i * 3] - ((speed * depth * 0.9 * dt) / W);
      let y = stars[i * 3 + 1] + ((speed * depth * 0.45 * dt) / H);
      if (x < 0) x += 1;
      if (y > 1) y -= 1;
      stars[i * 3] = x;
      stars[i * 3 + 1] = y;

      const px = x * W;
      const py = y * H;
      const streak = Math.min(46, speed * depth * 0.09);
      ctx.strokeStyle = `rgba(210,255,220,${0.15 + depth * 0.5})`;
      ctx.lineWidth = depth * 1.6;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + streak, py - streak * 0.5 + 0.01);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Raster, das mit der Fluggeschwindigkeit nach links unten wandert. */
  private drawGrid({ left, top, width, height, compact }: Layout): void {
    const { ctx } = this;
    const spacing = compact ? 40 : 52;
    const offsetX = this.gridScroll % spacing;
    const offsetY = (this.gridScroll * 0.5) % spacing;

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    for (let x = left - offsetX; x <= left + width; x += spacing) {
      ctx.moveTo(Math.round(x) + 0.5, top);
      ctx.lineTo(Math.round(x) + 0.5, top + height);
    }
    for (let y = top + offsetY - spacing; y <= top + height; y += spacing) {
      ctx.moveTo(left, Math.round(y) + 0.5);
      ctx.lineTo(left + width, Math.round(y) + 0.5);
    }
    ctx.stroke();

    // Vignette oben, damit das Raster in die Tiefe verläuft
    const fade = ctx.createLinearGradient(0, top, 0, top + height);
    fade.addColorStop(0, "rgba(0,0,0,0.75)");
    fade.addColorStop(0.5, "rgba(0,0,0,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(left, top, width, height);
    ctx.restore();
  }

  private drawAxes(
    { left, top, width, height, compact }: Layout,
    tMax: number,
    mMax: number,
    X: (t: number) => number,
    Y: (m: number) => number,
  ): void {
    const { ctx } = this;
    ctx.save();
    ctx.font = `500 ${compact ? 10 : 11}px ${this.fonts.mono}`;
    ctx.fillStyle = "rgba(255,255,255,0.38)";

    // Y-Achse: Multiplikator
    const yStep = niceStep(mMax - 1, compact ? 4 : 5, Y_STEPS);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; ; i++) {
      const value = 1 + i * yStep;
      if (value > mMax + 1e-9) break;
      const decimals = yStep < 1 ? 1 : 0;
      const label = `${value.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}×`;
      ctx.fillText(label, left - 8, Y(value));
    }

    // X-Achse: Sekunden
    const xStep = niceStep(tMax / 1000, compact ? 4 : 6, X_STEPS_S);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let s = xStep; s * 1000 <= tMax; s += xStep) {
      ctx.fillText(`${s}s`, X(s * 1000), top + height + 10);
    }

    // Grundlinie 1,00×
    ctx.strokeStyle = "rgba(57,255,20,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, Math.round(Y(1)) + 0.5);
    ctx.lineTo(left + width, Math.round(Y(1)) + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Kurve und Rakete
  // ---------------------------------------------------------------------------

  /** Exponentialkurve, geglättet mit quadratischen Bezier-Segmenten. */
  private drawCurve(
    tEnd: number,
    X: (t: number) => number,
    Y: (m: number) => number,
    color: string,
    layout: Layout,
  ): { x: number; y: number; angle: number } {
    const { ctx, points } = this;
    const n = Math.max(24, Math.min(160, Math.ceil(layout.width / 5)));
    for (let i = 0; i <= n; i++) {
      const t = (tEnd * i) / n;
      points[i * 2] = X(t);
      points[i * 2 + 1] = Y(multiplierAt(t));
    }

    const curve = new Path2D();
    curve.moveTo(points[0], points[1]);
    for (let i = 1; i < n; i++) {
      const cx = points[i * 2];
      const cy = points[i * 2 + 1];
      curve.quadraticCurveTo(cx, cy, (cx + points[i * 2 + 2]) / 2, (cy + points[i * 2 + 3]) / 2);
    }
    const endX = points[n * 2];
    const endY = points[n * 2 + 1];
    curve.lineTo(endX, endY);

    // Fläche unter der Kurve
    const baseY = Y(1);
    const area = new Path2D(curve);
    area.lineTo(endX, baseY);
    area.lineTo(points[0], baseY);
    area.closePath();
    const fill = ctx.createLinearGradient(0, endY, 0, baseY);
    fill.addColorStop(0, withAlpha(color, 0.32));
    fill.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = fill;
    ctx.fill(area);

    // Leuchtende Spur: mehrere Striche übereinander, additiv gemischt
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    for (const [lineWidth, alpha] of [
      [20, 0.05],
      [11, 0.11],
      [6, 0.28],
    ] as const) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = withAlpha(color, alpha);
      ctx.stroke(curve);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = color;
    ctx.stroke(curve);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.stroke(curve);
    ctx.restore();

    const prevX = points[(n - 1) * 2];
    const prevY = points[(n - 1) * 2 + 1];
    const angle = endX - prevX > 0.001 ? Math.atan2(endY - prevY, endX - prevX) : -0.2;
    return { x: endX, y: endY, angle };
  }

  /** Punkte auf der Kurve, an denen Spieler ausgestiegen sind. */
  private drawCashoutMarkers(snap: CrashSnapshot, X: (t: number) => number, Y: (m: number) => number): void {
    const { ctx } = this;
    ctx.save();
    for (const player of snap.players) {
      if (player.cashedOutAt === null) continue;
      const x = X(timeForMultiplier(player.cashedOutAt));
      const y = Y(player.cashedOutAt);
      ctx.fillStyle = player.isYou ? GOLD : withAlpha(player.user.color, 0.9);
      ctx.beginPath();
      ctx.arc(x, y, player.isYou ? 5 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (player.isYou) {
        ctx.strokeStyle = withAlpha(GOLD, 0.5);
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private emitExhaust(x: number, y: number, angle: number, multiplier: number, dt: number, scale: number): void {
    const rate = (this.options.reducedMotion ? 25 : 80) + 40 * Math.log(Math.max(1, multiplier));
    this.exhaustCarry += rate * dt;
    const tailX = x - Math.cos(angle) * 15 * scale;
    const tailY = y - Math.sin(angle) * 15 * scale;
    while (this.exhaustCarry >= 1) {
      this.exhaustCarry -= 1;
      const direction = angle + Math.PI + (Math.random() - 0.5) * 0.7;
      const speed = 60 + Math.random() * 130;
      this.particles.spawn(
        tailX,
        tailY,
        Math.cos(direction) * speed,
        Math.sin(direction) * speed,
        0.25 + Math.random() * 0.4,
        1.4 + Math.random() * 2.4,
        Math.random() < 0.5 ? C.orange : Math.random() < 0.6 ? C.gold : C.red,
      );
    }
  }

  private drawRocket(x: number, y: number, angle: number, now: number, scale: number, thrust: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // pulsierender Glow
    const pulse = 0.55 + 0.25 * Math.sin(now / 150);
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 38);
    halo.addColorStop(0, withAlpha(TOXIC, 0.5 * pulse));
    halo.addColorStop(1, withAlpha(TOXIC, 0));
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = halo;
    ctx.fillRect(-38, -38, 76, 76);
    ctx.globalCompositeOperation = "source-over";

    // Flamme
    const flame = (10 + Math.sin(now / 35) * 3 + Math.random() * 5) * thrust;
    const flameGradient = ctx.createLinearGradient(-12, 0, -14 - flame, 0);
    flameGradient.addColorStop(0, "#fff7c2");
    flameGradient.addColorStop(0.35, ORANGE);
    flameGradient.addColorStop(1, "rgba(255,45,85,0)");
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.moveTo(-11, -4.5);
    ctx.quadraticCurveTo(-16 - flame * 0.4, -2, -14 - flame, 0);
    ctx.quadraticCurveTo(-16 - flame * 0.4, 2, -11, 4.5);
    ctx.closePath();
    ctx.fill();

    // Flossen
    ctx.fillStyle = TOXIC;
    ctx.beginPath();
    ctx.moveTo(-4, -4.5);
    ctx.lineTo(-14, -10.5);
    ctx.lineTo(-11, -4.5);
    ctx.closePath();
    ctx.moveTo(-4, 4.5);
    ctx.lineTo(-14, 10.5);
    ctx.lineTo(-11, 4.5);
    ctx.closePath();
    ctx.fill();

    // Rumpf
    const body = ctx.createLinearGradient(0, -6, 0, 6);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(1, "#8e98a4");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.quadraticCurveTo(9, -7, -12, -5);
    ctx.lineTo(-12, 5);
    ctx.quadraticCurveTo(9, 7, 17, 0);
    ctx.fill();

    // Spitze
    ctx.fillStyle = TOXIC;
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.quadraticCurveTo(13, -4.3, 9.5, -5);
    ctx.lineTo(9.5, 5);
    ctx.quadraticCurveTo(13, 4.3, 17, 0);
    ctx.fill();

    // Fenster
    ctx.fillStyle = "#062b00";
    ctx.strokeStyle = TOXIC;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(2, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Crash-Effekte
  // ---------------------------------------------------------------------------

  private explode(x: number, y: number, now: number): void {
    const full = !this.options.reducedMotion;
    this.particles.burst(x, y, full ? 170 : 50, full ? 560 : 300, [C.red, C.orange, C.white, C.pink, C.gold]);
    if (full) this.particles.burst(x, y, 60, 950, [C.white, C.gold]);
    this.shockwave = { at: now, x, y };
    this.flash = 1;
    this.shake = full ? 16 : 0;
  }

  private drawShockwave(now: number): void {
    const t = (now - this.shockwave.at) / 700;
    if (t < 0 || t > 1) return;
    const { ctx } = this;
    const eased = 1 - (1 - t) ** 3;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = withAlpha(RED, 1 - t);
    ctx.lineWidth = 1 + 5 * (1 - t);
    ctx.beginPath();
    ctx.arc(this.shockwave.x, this.shockwave.y, eased * 230, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(ORANGE, (1 - t) * 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.shockwave.x, this.shockwave.y, eased * 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Texte
  // ---------------------------------------------------------------------------

  private drawMultiplier(snap: CrashSnapshot, multiplier: number, layout: Layout): void {
    const { ctx } = this;
    const crashed = snap.phase === "crashed";
    const cx = layout.left + layout.width / 2;
    const cy = layout.top + layout.height * 0.4;
    const size = Math.max(42, Math.min(116, layout.width * 0.14));
    const color = crashed ? RED : TOXIC;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (crashed) {
      ctx.font = `700 ${Math.round(size * 0.24)}px ${this.fonts.display}`;
      ctx.fillStyle = RED;
      setLetterSpacing(ctx, "6px");
      ctx.fillText("CRASH", cx, cy - size * 0.72);
      setLetterSpacing(ctx, "0px");
    }

    ctx.font = `700 ${Math.round(size)}px ${this.fonts.mono}`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = crashed ? RED : "#ffffff";
    ctx.fillText(formatMultiplier(floorMultiplier(multiplier)), cx, cy);
    ctx.shadowBlur = 0;

    const myBet = snap.myBet;
    if (myBet && myBet.roundId === snap.roundId && (myBet.status === "cashed" || myBet.status === "lost")) {
      const cashed = myBet.status === "cashed";
      const text = cashed
        ? `Ausgezahlt bei ${formatMultiplier(myBet.cashedOutAt ?? 0)} · Gewinn ${formatSignedAmount(myBet.payout - myBet.amount)} RBX`
        : `Verloren · −${formatAmount(myBet.amount)} RBX`;
      ctx.font = `600 ${layout.compact ? 12 : 14}px ${this.fonts.mono}`;
      const pillWidth = ctx.measureText(text).width + 28;
      const pillHeight = layout.compact ? 28 : 32;
      const py = cy + size * 0.72;
      ctx.fillStyle = withAlpha(cashed ? GOLD : RED, 0.14);
      ctx.strokeStyle = withAlpha(cashed ? GOLD : RED, 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - pillWidth / 2, py - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = cashed ? GOLD : RED;
      ctx.fillText(text, cx, py + 1);
    }
    ctx.restore();
  }

  private drawBetting(now: number, snap: CrashSnapshot, layout: Layout, originX: number, originY: number): void {
    const { ctx } = this;
    const remaining = Math.max(0, snap.bettingEndsAt - now);
    const progress = remaining / BETTING_MS;
    const cx = layout.left + layout.width / 2;
    const cy = layout.top + layout.height * 0.42;
    const size = Math.max(36, Math.min(84, layout.width * 0.1));

    // Rakete wartet auf der Startrampe
    const bob = Math.sin(now / 320) * 2;
    this.drawRocket(originX + 18, originY - 16 + bob, -0.35, now, layout.compact ? 0.82 : 1, 0.45);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${layout.compact ? 11 : 13}px ${this.fonts.display}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    setLetterSpacing(ctx, "4px");
    ctx.fillText("NÄCHSTE RUNDE IN", cx, cy - size * 0.85);
    setLetterSpacing(ctx, "0px");

    ctx.font = `700 ${Math.round(size)}px ${this.fonts.mono}`;
    ctx.shadowColor = TOXIC;
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      `${(remaining / 1000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`,
      cx,
      cy,
    );
    ctx.shadowBlur = 0;

    // Fortschrittsbalken
    const barWidth = Math.min(320, layout.width * 0.6);
    const barY = cy + size * 0.8;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(cx - barWidth / 2, barY, barWidth, 6, 3);
    ctx.fill();
    ctx.fillStyle = TOXIC;
    ctx.shadowColor = TOXIC;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(cx - barWidth / 2, barY, Math.max(6, barWidth * progress), 6, 3);
    ctx.fill();
    ctx.restore();
  }
}

function niceStep(range: number, maxTicks: number, steps: readonly number[]): number {
  for (const step of steps) if (range / step <= maxTicks) return step;
  return steps[steps.length - 1];
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string): void {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = value;
}
