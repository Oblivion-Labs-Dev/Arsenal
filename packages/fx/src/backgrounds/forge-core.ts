/**
 * Pure, seeded sim for the Forge Core: three nested hexagons (the Arsenal mark) with sparks
 * orbiting their edges and embers spiralling inward to a hot core. No DOM, no time source.
 */
import { createRng, type Rng } from './random';

/** Ring radii as a fraction of the core's outer radius, inner to outer. */
export const FORGE_RINGS: readonly number[] = [0.3, 0.6, 0.92];

export type ForgeSpark = {
  kind: 'orbit' | 'ember';
  /** Ring index for orbiting sparks; the ring an ember was born on. */
  ring: number;
  /** Position along the hexagon perimeter, [0, 1). */
  t: number;
  /** Perimeter travel per 60fps frame (signed). */
  speed: number;
  /** Radial jitter as a fraction of the radius. */
  offset: number;
  /** Ember progress from outer edge (0) to core (1). Orbit sparks keep 0. */
  life: number;
  /** Ember progress per 60fps frame. */
  lifeRate: number;
  size: number;
  alpha: number;
  phase: number;
};

export type ForgeCoreState = { sparks: ForgeSpark[]; rng: Rng };

export type Point = { x: number; y: number };

/** Point on a pointy-top hexagon of circumradius `radius`, centred at 0,0. `t` wraps. */
export function hexPerimeterPoint(t: number, radius: number, rotation = 0): Point {
  const u = ((t % 1) + 1) % 1;
  const scaled = u * 6;
  const side = Math.min(5, Math.floor(scaled));
  const f = scaled - side;
  const a0 = -Math.PI / 2 + rotation + (side * Math.PI) / 3;
  const a1 = a0 + Math.PI / 3;
  const x0 = Math.cos(a0) * radius;
  const y0 = Math.sin(a0) * radius;
  return {
    x: x0 + (Math.cos(a1) * radius - x0) * f,
    y: y0 + (Math.sin(a1) * radius - y0) * f,
  };
}

/** Slow counter-rotation of each ring, in radians, for a timestamp in ms. */
export function ringRotation(ring: number, timeMs: number): number {
  const direction = ring % 2 === 0 ? 1 : -1;
  return direction * timeMs * 0.000045 * (1 + ring * 0.35);
}

/** Ember radius fraction for a life value: eases in so embers linger outside, then fall. */
export function emberRadius(life: number): number {
  const l = Math.min(1, Math.max(0, life));
  return 1.08 - 0.98 * l * l;
}

function makeOrbit(rng: Rng, ring: number): ForgeSpark {
  const direction = ring % 2 === 0 ? 1 : -1;
  return {
    kind: 'orbit',
    ring,
    t: rng(),
    speed: direction * (0.00035 + rng() * 0.0006),
    offset: (rng() - 0.5) * 0.045,
    life: 0,
    lifeRate: 0,
    size: 0.6 + rng() * 1.1,
    alpha: 0.35 + rng() * 0.55,
    phase: rng() * Math.PI * 2,
  };
}

function makeEmber(rng: Rng, life: number): ForgeSpark {
  return {
    kind: 'ember',
    ring: FORGE_RINGS.length - 1,
    t: rng(),
    speed: (rng() < 0.5 ? 1 : -1) * (0.0008 + rng() * 0.0012),
    offset: (rng() - 0.5) * 0.08,
    life,
    lifeRate: 0.0011 + rng() * 0.0016,
    size: 0.7 + rng() * 1.3,
    alpha: 0.5 + rng() * 0.5,
    phase: rng() * Math.PI * 2,
  };
}

/** Build a field: `orbitPerRing` sparks on each ring plus `embers` spread across their lives. */
export function createForgeCore(
  orbitPerRing: number,
  embers: number,
  seed: number,
): ForgeCoreState {
  const rng = createRng(seed);
  const sparks: ForgeSpark[] = [];
  FORGE_RINGS.forEach((_, ring) => {
    // Outer rings are longer, so they get proportionally more sparks.
    const count = Math.round(orbitPerRing * (0.6 + ring * 0.4));
    for (let i = 0; i < count; i += 1) sparks.push(makeOrbit(rng, ring));
  });
  for (let i = 0; i < embers; i += 1) sparks.push(makeEmber(rng, rng()));
  return { sparks, rng };
}

/** Advance by `dt` 60fps frames. Embers that reach the core are reborn at the outer edge. */
export function stepForgeCore(state: ForgeCoreState, dt: number): void {
  for (let i = 0; i < state.sparks.length; i += 1) {
    const s = state.sparks[i]!;
    s.t = (((s.t + s.speed * dt) % 1) + 1) % 1;
    if (s.kind === 'ember') {
      s.life += s.lifeRate * dt;
      if (s.life >= 1) state.sparks[i] = makeEmber(state.rng, 0);
    }
  }
}

/** Where a spark sits for a core of radius `radius` at time `timeMs`, centred at 0,0. */
export function sparkPosition(s: ForgeSpark, radius: number, timeMs: number): Point {
  if (s.kind === 'orbit') {
    const r = radius * (FORGE_RINGS[s.ring]! + s.offset);
    return hexPerimeterPoint(s.t, r, ringRotation(s.ring, timeMs));
  }
  // Embers twist as they fall: the inner rotation takes over as they near the core.
  const r = radius * (emberRadius(s.life) + s.offset * (1 - s.life));
  return hexPerimeterPoint(s.t, r, ringRotation(0, timeMs) * s.life);
}

/** Ember brightness: fades in at the rim, heats up as it falls, vanishes into the core. */
export function emberHeat(life: number): number {
  const l = Math.min(1, Math.max(0, life));
  const fadeIn = Math.min(1, l / 0.12);
  const fadeOut = Math.min(1, (1 - l) / 0.1);
  return fadeIn * fadeOut * (0.45 + 0.55 * l);
}
