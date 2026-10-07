import { ROULETTE_POCKETS } from "@/lib/fairness/provably-fair";

/** Physical pocket order of a European single-zero wheel (clockwise). */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
];

export const POCKET_ANGLE = 360 / ROULETTE_POCKETS;

/** Wheel geometry in SVG units: the whole wheel is 400 units across. */
export const WHEEL_GEOMETRY = {
  size: 400,
  /** Where the ball rolls before it drops */
  trackRadius: 176,
  /** Where the ball rests inside a pocket */
  pocketRadius: 113,
  ballRadius: 6.5,
} as const;

export function mod360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/** Rotor angle (degrees, clockwise from the top) of the centre of a number's pocket. */
export function pocketAngle(n: number): number {
  return WHEEL_ORDER.indexOf(n) * POCKET_ANGLE;
}

/** The number whose pocket is at a rotor angle. */
export function pocketAtAngle(rotorAngle: number): number {
  return WHEEL_ORDER[Math.round(mod360(rotorAngle) / POCKET_ANGLE) % ROULETTE_POCKETS];
}

export interface WheelTuning {
  /** Rotor speed when nobody spins it (deg/s, clockwise) */
  idleSpeed: number;
  /** Extra rotor speed right after a spin (deg/s) */
  kick: number;
  /** How fast that extra speed fades (seconds) */
  kickDecay: number;
  /** Seconds from launch until the ball rests */
  flight: number;
  /** Full laps the ball makes relative to the rotor */
  turns: number;
  /** Bounces after the drop (deg of wobble, units of hop) */
  wobble: number;
  hop: number;
}

export const WHEEL_TUNING: WheelTuning = {
  idleSpeed: 12,
  kick: 150,
  kickDecay: 2.4,
  flight: 4.6,
  turns: 4,
  wobble: 7,
  hop: 9,
};

/** Short, calm spin for "reduce motion": no idle rotation, no bounces. */
export const WHEEL_TUNING_REDUCED: WheelTuning = {
  idleSpeed: 0,
  kick: 0,
  kickDecay: 1,
  flight: 1.1,
  turns: 1,
  wobble: 0,
  hop: 0,
};

/** The rotor's motion since its last push. Times in seconds. */
export interface RotorState {
  at: number;
  base: number;
  kick: number;
}

/** Rotor angle at time t: idle drift plus a push that fades out exponentially. */
export function rotorAngle(rotor: RotorState, t: number, tuning: WheelTuning): number {
  const dt = Math.max(0, t - rotor.at);
  return rotor.base + tuning.idleSpeed * dt + rotor.kick * tuning.kickDecay * (1 - Math.exp(-dt / tuning.kickDecay));
}

/**
 * One throw of the ball. Its angle is tracked relative to the rotor, so it can
 * be eased to land exactly in a given pocket while the rotor keeps turning.
 */
export interface BallFlight {
  at: number;
  duration: number;
  /** Radius the ball is thrown from (back out of the last pocket) */
  launchRadius: number;
  /** Ball angle relative to the rotor at launch */
  relStart: number;
  /** Total travel relative to the rotor (negative = against the rotor) */
  relDelta: number;
  /** Fraction of the flight after which the ball leaves the track */
  drop: number;
  wobble: number;
  hop: number;
}

export function planFlight(options: {
  at: number;
  relStart: number;
  launchRadius: number;
  result: number;
  /** 0…1, where inside the pocket the ball settles */
  jitter: number;
  tuning: WheelTuning;
}): BallFlight {
  const { at, relStart, launchRadius, result, jitter, tuning } = options;
  const target = pocketAngle(result) + (jitter - 0.5) * POCKET_ANGLE * 0.5;
  const rest = mod360(relStart - target);
  return {
    at,
    duration: tuning.flight,
    launchRadius,
    relStart,
    relDelta: -(tuning.turns * 360 + rest),
    drop: 0.58,
    wobble: tuning.wobble,
    hop: tuning.hop,
  };
}

export interface BallPose {
  /** Angle relative to the rotor */
  relative: number;
  radius: number;
  /** Height above the wheel (units) */
  lift: number;
  onTrack: boolean;
  landed: boolean;
}

const easeOutCubic = (u: number) => 1 - (1 - u) ** 3;
const smooth = (u: number) => u * u * (3 - 2 * u);

/**
 * Where the ball is during a flight: it races round the track, slows, drops
 * towards the pockets, bounces over the frets and comes to rest. Every extra
 * term fades to zero at the end, so the final pose is exactly the planned pocket.
 */
export function ballPose(flight: BallFlight, t: number): BallPose {
  const { trackRadius: track, pocketRadius: pocket } = WHEEL_GEOMETRY;
  const landed = t >= flight.at + flight.duration;
  const u = landed ? 1 : Math.max(0, (t - flight.at) / flight.duration);
  let relative = flight.relStart + flight.relDelta * easeOutCubic(u);
  let radius = track;
  let lift = 0;

  if (u < 0.08) {
    radius = flight.launchRadius + (track - flight.launchRadius) * smooth(u / 0.08);
  }
  if (u >= flight.drop) {
    const v = (u - flight.drop) / (1 - flight.drop);
    const decay = (1 - v) ** 2;
    relative += flight.wobble * Math.sin(v * Math.PI * 5) * decay;
    radius =
      pocket +
      (track - pocket) * (1 - smooth(Math.min(1, v / 0.45))) +
      flight.hop * 0.6 * Math.abs(Math.sin(v * Math.PI * 4)) * decay;
    lift = flight.hop * Math.abs(Math.sin(v * Math.PI * 3.5)) * decay;
  }

  return { relative, radius, lift, onTrack: u < flight.drop, landed };
}
