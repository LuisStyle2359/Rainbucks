import {
  ballPose,
  mod360,
  planFlight,
  POCKET_ANGLE,
  rotorAngle,
  WHEEL_GEOMETRY,
  WHEEL_TUNING,
  WHEEL_TUNING_REDUCED,
  type BallFlight,
  type RotorState,
  type WheelTuning,
} from "./wheel-motion";

/** Tilt of the wheel plane and the CSS perspective of its frame. Both must match the markup. */
export const WHEEL_TILT = 38;
export const WHEEL_PERSPECTIVE = 1000;

export interface WheelElements {
  /** Square box with `perspective: WHEEL_PERSPECTIVE px`; the tilted plane fills it */
  frame: HTMLElement;
  /** Rotating part of the wheel (inside the tilted plane) */
  rotor: HTMLElement;
  /** Ball and its shadow, outside the plane, centred in the frame */
  ball: HTMLElement;
  shadow: HTMLElement;
}

type Ball =
  | { kind: "held"; world: number }
  | { kind: "flight"; flight: BallFlight; done: () => void }
  | { kind: "rest"; relative: number };

const RIM_SECTORS = 14;

/**
 * Draws the roulette wheel every frame without React: the rotor turns, the
 * ball is thrown against it and eased into the pocket of a result that is
 * already fixed (provably fair). The ball lives outside the tilted plane and
 * is projected onto it by hand, so it stays a round sphere instead of an ellipse.
 */
export class WheelRenderer {
  private readonly tuning: WheelTuning;
  private readonly resizeObserver: ResizeObserver;
  private rotor: RotorState;
  private ball: Ball = { kind: "held", world: -20 };
  private size = 0;
  private raf = 0;
  private lastFret: number | null = null;
  private lastRim: number | null = null;

  constructor(
    private readonly el: WheelElements,
    private readonly options: { reducedMotion: boolean; onTick?: (kind: "rim" | "fret") => void },
  ) {
    this.tuning = options.reducedMotion ? WHEEL_TUNING_REDUCED : WHEEL_TUNING;
    this.rotor = { at: now(), base: 0, kick: 0 };
    this.resizeObserver = new ResizeObserver(() => {
      this.size = this.el.frame.clientWidth;
      this.render(now());
    });
    this.resizeObserver.observe(this.el.frame);
    this.size = this.el.frame.clientWidth;
    this.loop();
  }

  /** Throw the ball. Resolves once it rests in the pocket of `result`. */
  launch(result: number): Promise<void> {
    const t = now();
    const pose = this.pose(t);
    const angle = rotorAngle(this.rotor, t, this.tuning);
    this.rotor = { at: t, base: angle, kick: this.tuning.kick };
    const flight = planFlight({
      at: t,
      relStart: pose.world - angle,
      launchRadius: pose.radius,
      result,
      jitter: Math.random(),
      tuning: this.tuning,
    });
    this.lastFret = null;
    this.lastRim = null;
    return new Promise((resolve) => {
      this.ball = { kind: "flight", flight, done: resolve };
      this.loop();
    });
  }

  /** Stops drawing. A ball still in the air counts as landed, so no spin is ever left hanging. */
  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resizeObserver.disconnect();
    if (this.ball.kind === "flight") {
      const { done } = this.ball;
      this.ball = { kind: "held", world: 0 };
      done();
    }
  }

  // ---------------------------------------------------------------------------

  private loop(): void {
    if (this.raf) return;
    const tick = () => {
      this.raf = 0;
      const t = now();
      this.render(t);
      // Without idle rotation (reduce motion) a resting wheel needs no frames at all
      if (this.ball.kind === "flight" || this.tuning.idleSpeed > 0 || this.rotorMoving(t)) {
        this.raf = requestAnimationFrame(tick);
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private rotorMoving(t: number): boolean {
    return this.rotor.kick > 0 && t - this.rotor.at < this.tuning.kickDecay * 6;
  }

  private pose(t: number): { world: number; radius: number; lift: number } {
    const angle = rotorAngle(this.rotor, t, this.tuning);
    switch (this.ball.kind) {
      case "held":
        return { world: this.ball.world, radius: WHEEL_GEOMETRY.trackRadius, lift: 0 };
      case "rest":
        return { world: angle + this.ball.relative, radius: WHEEL_GEOMETRY.pocketRadius, lift: 0 };
      case "flight": {
        const pose = ballPose(this.ball.flight, t);
        this.tick(pose.onTrack ? "rim" : "fret", pose.onTrack ? angle + pose.relative : pose.relative);
        if (pose.landed) {
          const { done } = this.ball;
          this.ball = { kind: "rest", relative: mod360(pose.relative) };
          done();
        }
        return { world: angle + pose.relative, radius: pose.radius, lift: pose.lift };
      }
    }
  }

  /** Clicks as the ball passes the rim segments, then the frets between pockets. */
  private tick(kind: "rim" | "fret", angle: number): void {
    if (kind === "rim") {
      const sector = Math.floor(mod360(angle) / (360 / RIM_SECTORS));
      if (this.lastRim !== null && sector !== this.lastRim) this.options.onTick?.("rim");
      this.lastRim = sector;
    } else {
      const fret = Math.floor(mod360(angle + POCKET_ANGLE / 2) / POCKET_ANGLE);
      if (this.lastFret !== null && fret !== this.lastFret) this.options.onTick?.("fret");
      this.lastFret = fret;
    }
  }

  private render(t: number): void {
    const angle = rotorAngle(this.rotor, t, this.tuning);
    this.el.rotor.style.transform = `translateZ(1px) rotate(${angle.toFixed(3)}deg)`;
    if (!this.size) return;

    const { world, radius, lift } = this.pose(t);
    const unit = this.size / WHEEL_GEOMETRY.size;
    const rad = (world * Math.PI) / 180;
    const ball = this.project(radius * unit * Math.sin(rad), -radius * unit * Math.cos(rad), lift * unit);
    const shadow = this.project(radius * unit * Math.sin(rad), -radius * unit * Math.cos(rad), 0);

    this.el.ball.style.transform = `translate(${ball.x.toFixed(2)}px, ${ball.y.toFixed(2)}px) translate(-50%, -50%) scale(${ball.scale.toFixed(4)})`;
    const squash = Math.cos((WHEEL_TILT * Math.PI) / 180);
    this.el.shadow.style.transform = `translate(${(shadow.x + 1.5 * unit).toFixed(2)}px, ${(shadow.y + 2 * unit).toFixed(2)}px) translate(-50%, -50%) scale(${(shadow.scale * (1 + lift * 0.04)).toFixed(4)}, ${(shadow.scale * squash).toFixed(4)})`;
    this.el.shadow.style.opacity = String(Math.max(0.2, 0.75 - lift * 0.05));
  }

  /** Screen offset from the frame centre of a point on (or above) the tilted plane. */
  private project(x: number, y: number, lift: number): { x: number; y: number; scale: number } {
    const tilt = (WHEEL_TILT * Math.PI) / 180;
    const sy = y * Math.cos(tilt) - lift * Math.sin(tilt);
    const sz = y * Math.sin(tilt) + lift * Math.cos(tilt);
    const scale = WHEEL_PERSPECTIVE / (WHEEL_PERSPECTIVE - sz);
    return { x: x * scale, y: sy * scale, scale };
  }
}

function now(): number {
  return performance.now() / 1000;
}
