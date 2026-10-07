import { describe, expect, it } from "vitest";
import {
  ballPose,
  mod360,
  planFlight,
  pocketAngle,
  pocketAtAngle,
  POCKET_ANGLE,
  rotorAngle,
  WHEEL_GEOMETRY,
  WHEEL_ORDER,
  WHEEL_TUNING,
  WHEEL_TUNING_REDUCED,
} from "./wheel-motion";

describe("Roulette wheel motion", () => {
  it("has every pocket exactly once", () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
    for (let n = 0; n <= 36; n++) expect(pocketAtAngle(pocketAngle(n))).toBe(n);
  });

  it("always brings the ball to rest in the drawn pocket", () => {
    for (const tuning of [WHEEL_TUNING, WHEEL_TUNING_REDUCED]) {
      for (let result = 0; result <= 36; result++) {
        for (const [relStart, jitter] of [
          [0, 0],
          [123.4, 0.5],
          [-987.6, 1],
          [5000.1, 0.25],
        ]) {
          const flight = planFlight({ at: 10, relStart, launchRadius: WHEEL_GEOMETRY.pocketRadius, result, jitter, tuning });
          const end = ballPose(flight, flight.at + flight.duration);
          expect(end.landed).toBe(true);
          expect(pocketAtAngle(end.relative)).toBe(result);
          expect(end.radius).toBeCloseTo(WHEEL_GEOMETRY.pocketRadius, 6);
          expect(end.lift).toBeCloseTo(0, 6);
          // Settles inside the pocket, not on a fret
          const offset = Math.abs(mod360(end.relative - pocketAngle(result) + 180) - 180);
          expect(offset).toBeLessThan(POCKET_ANGLE / 2);
        }
      }
    }
  });

  it("starts where the ball was and runs against the rotor", () => {
    const flight = planFlight({ at: 0, relStart: 42, launchRadius: 100, result: 17, jitter: 0.5, tuning: WHEEL_TUNING });
    const start = ballPose(flight, 0);
    expect(start.relative).toBeCloseTo(42, 6);
    expect(start.radius).toBeCloseTo(100, 6);
    expect(flight.relDelta).toBeLessThan(-WHEEL_TUNING.turns * 360 + 1);
    expect(ballPose(flight, flight.duration * 0.3).onTrack).toBe(true);
  });

  it("keeps the rotor angle continuous and slows it back to idle", () => {
    const rotor = { at: 2, base: 90, kick: WHEEL_TUNING.kick };
    expect(rotorAngle(rotor, 2, WHEEL_TUNING)).toBeCloseTo(90, 6);
    const speedAt = (t: number) => (rotorAngle(rotor, t + 0.001, WHEEL_TUNING) - rotorAngle(rotor, t, WHEEL_TUNING)) / 0.001;
    expect(speedAt(2)).toBeGreaterThan(speedAt(5));
    expect(speedAt(60)).toBeCloseTo(WHEEL_TUNING.idleSpeed, 1);
  });
});
