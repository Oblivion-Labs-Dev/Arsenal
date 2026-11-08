import { createRng, type Rng } from './random';

/** Pure simulation for `ParticleBurst`: sparks with gravity, wall bounces and fading. */

export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  /** Index into the renderer's colour list. */
  colorIndex: number;
  /** 1 at birth, removed at 0. */
  alpha: number;
  decay: number;
};

export type BurstOptions = {
  count?: number;
  /** Speed range in px per 60fps frame. */
  minSpeed?: number;
  maxSpeed?: number;
  /** Extra upward kick so bursts fountain rather than splat. */
  lift?: number;
  colorCount?: number;
};

export const SPARK_GRAVITY = 0.22;
export const SPARK_BOUNCE = 0.55;
export const SPARK_FLOOR_FRICTION = 0.75;

export function createBurst(
  x: number,
  y: number,
  options: BurstOptions = {},
  seed: number | Rng = 1,
): Spark[] {
  const rng = typeof seed === 'function' ? seed : createRng(seed);
  const { count = 45, minSpeed = 3, maxSpeed = 10, lift = 3, colorCount = 6 } = options;
  const out: Spark[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const speed = minSpeed + rng() * (maxSpeed - minSpeed);
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - lift,
      size: rng() * 3 + 2,
      colorIndex: Math.floor(rng() * Math.max(1, colorCount)),
      alpha: 1,
      decay: rng() * 0.02 + 0.015,
    });
  }
  return out;
}

/**
 * Advances every spark by `dt` (60fps units), bounces it inside `width × height` and removes the
 * faded ones in place. Returns the number still alive.
 */
export function stepSparks(sparks: Spark[], width: number, height: number, dt: number): number {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    if (!s) continue;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += SPARK_GRAVITY * dt;
    s.alpha -= s.decay * dt;

    if (s.x - s.size < 0) {
      s.x = s.size;
      s.vx = -s.vx * SPARK_BOUNCE;
    } else if (s.x + s.size > width) {
      s.x = width - s.size;
      s.vx = -s.vx * SPARK_BOUNCE;
    }
    if (s.y - s.size < 0) {
      s.y = s.size;
      s.vy = -s.vy * SPARK_BOUNCE;
    } else if (s.y + s.size > height) {
      s.y = height - s.size;
      s.vy = -s.vy * SPARK_BOUNCE;
      s.vx *= SPARK_FLOOR_FRICTION;
    }
    if (s.alpha <= 0) sparks.splice(i, 1);
  }
  return sparks.length;
}
