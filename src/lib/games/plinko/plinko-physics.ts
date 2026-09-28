import Matter from "matter-js";
import type { PlinkoStep } from "@/lib/fairness/provably-fair";

/**
 * Plinko-Physik mit matter.js – plus "Lenkung" für Provably Fair.
 *
 * Problem: Echte Physik ist chaotisch, das Ergebnis muss aber vorher
 * kryptografisch feststehen (Server-Seed, Client-Seed, Nonce).
 *
 * Lösung: Der faire Pfad (links/rechts pro Reihe) ist bekannt. Die Kugel fällt
 * mit echter Schwerkraft, prallt echt an Pins ab – bekommt aber vor jeder Reihe
 * einen kleinen horizontalen Impuls in Richtung eines Zielpunkts: den Pin, den
 * sie treffen soll, leicht versetzt zu der Seite, zu der sie abprallen soll.
 * Die Kollision selbst übernimmt dann die Physik. Nach der letzten Reihe wird
 * die Kugel sanft in ihr Fach geführt.
 */

export const PEG_GAP = 60;
export const ROW_GAP = 52;
export const PEG_RADIUS = 6.5;
export const BALL_RADIUS = 12;
const TOP_PADDING = 84;
const BIN_HEIGHT = 44;
/** Feste Schrittweite: 120 Physik-Schritte pro Sekunde, unabhängig von der Bildrate */
export const STEP_MS = 1000 / 120;
const MAX_STEPS_PER_FRAME = 12;

// Lenkung: Zielversatz neben dem Pin (Anteil von PEG_GAP) und Stärke
const AIM_OFFSET = 0.3 * PEG_GAP;
const FIELD_GAIN = 0.1;
const FINAL_GAIN = 0.22;
const MAX_VX = 5.5;

export interface Peg {
  x: number;
  y: number;
  row: number;
}

export interface BoardGeometry {
  rows: number;
  width: number;
  height: number;
  centerX: number;
  firstRowY: number;
  /** Linie, ab der eine Kugel als gelandet gilt */
  landingY: number;
  binTop: number;
  binHeight: number;
  pegs: Peg[];
  binCenters: number[];
}

export function createGeometry(rows: number): BoardGeometry {
  const width = (rows + 3) * PEG_GAP;
  const centerX = width / 2;
  const firstRowY = TOP_PADDING;
  const pegs: Peg[] = [];
  for (let row = 0; row < rows; row++) {
    const count = row + 3;
    for (let j = 0; j < count; j++) {
      pegs.push({ x: centerX + (j - (count - 1) / 2) * PEG_GAP, y: firstRowY + row * ROW_GAP, row });
    }
  }
  const lastRowY = firstRowY + (rows - 1) * ROW_GAP;
  const binTop = lastRowY + ROW_GAP * 0.62;
  const binCenters = Array.from({ length: rows + 1 }, (_, k) => centerX + (k - rows / 2) * PEG_GAP);
  return {
    rows,
    width,
    height: binTop + BIN_HEIGHT + 14,
    centerX,
    firstRowY,
    landingY: binTop + BIN_HEIGHT * 0.35,
    binTop,
    binHeight: BIN_HEIGHT,
    pegs,
    binCenters,
  };
}

export interface PlinkoBall<T> {
  id: number;
  body: Matter.Body;
  path: PlinkoStep[];
  bin: number;
  /** x-Position des Pins, den die Kugel in Reihe r treffen soll */
  pegTargets: number[];
  payload: T;
  /** Letzte Positionen für die Leuchtspur (x, y, x, y, …) */
  trail: number[];
  bornAt: number;
}

export interface PlinkoWorldEvents<T> {
  onLand?: (ball: PlinkoBall<T>) => void;
  onPegHit?: (pegIndex: number, ball: PlinkoBall<T>) => void;
}

const TRAIL_LENGTH = 10;

export class PlinkoWorld<T> {
  readonly engine: Matter.Engine;
  geometry: BoardGeometry;
  readonly balls: PlinkoBall<T>[] = [];
  /** Zeitpunkt (ms, Weltzeit) des letzten Treffers pro Pin – für das Aufleuchten */
  pegHitAt: Float64Array;
  time = 0;

  private pegBodies: Matter.Body[] = [];
  private accumulator = 0;
  private nextId = 1;
  private readonly bodyToBall = new Map<number, PlinkoBall<T>>();
  private readonly pegIndexByBody = new Map<number, number>();

  constructor(
    rows: number,
    private readonly events: PlinkoWorldEvents<T> = {},
  ) {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.002 },
      positionIterations: 8,
      velocityIterations: 6,
    });
    this.geometry = createGeometry(rows);
    this.pegHitAt = new Float64Array(0);
    this.buildPegs();

    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        const pegIndex = this.pegIndexByBody.get(pair.bodyA.id) ?? this.pegIndexByBody.get(pair.bodyB.id);
        const ball = this.bodyToBall.get(pair.bodyA.id) ?? this.bodyToBall.get(pair.bodyB.id);
        if (pegIndex === undefined || !ball) continue;
        this.pegHitAt[pegIndex] = this.time;
        this.events.onPegHit?.(pegIndex, ball);
      }
    });
  }

  get rows(): number {
    return this.geometry.rows;
  }

  /** Reihenanzahl ändern (nur ohne fallende Kugeln). */
  setRows(rows: number): boolean {
    if (rows === this.geometry.rows) return true;
    if (this.balls.length > 0) return false;
    Matter.Composite.remove(this.engine.world, this.pegBodies);
    this.geometry = createGeometry(rows);
    this.buildPegs();
    return true;
  }

  drop(path: PlinkoStep[], payload: T): PlinkoBall<T> {
    const { centerX, firstRowY } = this.geometry;
    // Kleine zufällige Abweichung: jede Kugel fällt ein bisschen anders
    const x = centerX + (Math.random() - 0.5) * PEG_GAP * 0.16;
    const body = Matter.Bodies.circle(x, firstRowY - ROW_GAP * 1.1, BALL_RADIUS, {
      restitution: 0.3,
      friction: 0.002,
      frictionStatic: 0,
      frictionAir: 0.005,
      density: 0.002,
      // gleiche negative Gruppe → Kugeln kollidieren nicht miteinander
      collisionFilter: { group: -1 },
      label: "ball",
    });
    Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.6, y: 0.5 });

    const pegTargets: number[] = [];
    let rights = 0;
    for (let row = 0; row < path.length; row++) {
      pegTargets.push(centerX + (rights - row / 2) * PEG_GAP);
      if (path[row] === 1) rights++;
    }

    const ball: PlinkoBall<T> = {
      id: this.nextId++,
      body,
      path,
      bin: rights,
      pegTargets,
      payload,
      trail: [],
      bornAt: this.time,
    };
    this.balls.push(ball);
    this.bodyToBall.set(body.id, ball);
    Matter.Composite.add(this.engine.world, body);
    return ball;
  }

  /** Simulation um dtMs weiterrechnen (in festen Schritten). */
  step(dtMs: number): void {
    this.accumulator = Math.min(this.accumulator + dtMs, STEP_MS * MAX_STEPS_PER_FRAME);
    while (this.accumulator >= STEP_MS) {
      this.accumulator -= STEP_MS;
      for (const ball of this.balls) this.steer(ball);
      Matter.Engine.update(this.engine, STEP_MS);
      this.time += STEP_MS;
      this.collectLanded();
    }
    for (const ball of this.balls) {
      ball.trail.push(ball.body.position.x, ball.body.position.y);
      if (ball.trail.length > TRAIL_LENGTH * 2) ball.trail.splice(0, 2);
    }
  }

  clear(): void {
    for (const ball of this.balls) Matter.Composite.remove(this.engine.world, ball.body);
    this.balls.length = 0;
    this.bodyToBall.clear();
  }

  destroy(): void {
    this.clear();
    Matter.Events.off(this.engine, "collisionStart");
    Matter.Engine.clear(this.engine);
  }

  // ---------------------------------------------------------------------------

  private buildPegs(): void {
    this.pegIndexByBody.clear();
    this.pegBodies = this.geometry.pegs.map((peg, index) => {
      const body = Matter.Bodies.circle(peg.x, peg.y, PEG_RADIUS, {
        isStatic: true,
        restitution: 0.3,
        friction: 0,
        label: "peg",
      });
      this.pegIndexByBody.set(body.id, index);
      return body;
    });
    this.pegHitAt = new Float64Array(this.geometry.pegs.length).fill(-Infinity);
    Matter.Composite.add(this.engine.world, this.pegBodies);
  }

  /** Sanfter horizontaler Impuls Richtung Zielpunkt (siehe Kommentar oben). */
  private steer(ball: PlinkoBall<T>): void {
    const { body, path, pegTargets } = ball;
    const { firstRowY, rows, binCenters, landingY } = this.geometry;
    const { x, y } = body.position;
    const velocity = Matter.Body.getVelocity(body);

    // Nächste Reihe, die noch unterhalb der Kugel liegt
    const next = y < firstRowY ? 0 : Math.min(rows, Math.floor((y - firstRowY) / ROW_GAP) + 1);

    let aimX: number;
    let aimY: number;
    let gain: number;
    if (next < rows) {
      aimX = pegTargets[next] + path[next] * AIM_OFFSET;
      aimY = firstRowY + next * ROW_GAP - PEG_RADIUS - BALL_RADIUS;
      gain = FIELD_GAIN;
    } else {
      aimX = binCenters[ball.bin];
      aimY = landingY;
      gain = FINAL_GAIN;
    }

    // Zeit bis zur Zielhöhe schätzen (in Basis-Schritten) und nötige Geschwindigkeit ableiten
    const dy = Math.max(1, aimY - y);
    const steps = Math.max(3, dy / Math.max(velocity.y, 1.2));
    const desired = Math.max(-MAX_VX, Math.min(MAX_VX, (aimX - x) / steps));
    Matter.Body.setVelocity(body, { x: velocity.x + (desired - velocity.x) * gain, y: velocity.y });
  }

  private collectLanded(): void {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.body.position.y < this.geometry.landingY) continue;
      this.balls.splice(i, 1);
      this.bodyToBall.delete(ball.body.id);
      Matter.Composite.remove(this.engine.world, ball.body);
      this.events.onLand?.(ball);
    }
  }
}
