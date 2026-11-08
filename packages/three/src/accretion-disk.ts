import { createRng } from '@arsenal/fx';

export type AccretionDiskOptions = {
  /** Number of particles. Default 2000. */
  count?: number;
  /** Multiplies every orbit speed. Default 1. */
  speed?: number;
  /** Inner edge, just outside the event horizon. Default 1.2. */
  innerRadius?: number;
  /** Outer edge. Default 5.7. */
  outerRadius?: number;
  seed?: number;
};

export type AccretionDisk = {
  /** Starting xyz per particle; the vertex shader orbits them around Y. */
  positions: Float32Array;
  /** Angular speed per particle in radians per second (Keplerian: slower further out). */
  speeds: Float32Array;
};

/**
 * Builds a two-armed spiral disk. Orbits are computed in the vertex shader from these start
 * positions, so the CPU does no per-frame work. Deterministic for a given seed.
 */
export function createAccretionDisk(options: AccretionDiskOptions = {}): AccretionDisk {
  const { count = 2000, speed = 1, innerRadius = 1.2, outerRadius = 5.7, seed = 1 } = options;
  const rng = createRng(seed);
  const span = outerRadius - innerRadius;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 8;
    const r = innerRadius + Math.pow(rng(), 1.5) * span;
    const angle = theta + (i % 2 === 0 ? 0 : Math.PI);
    positions[i * 3] = r * Math.cos(angle);
    // Thicker near the horizon, a razor edge at the rim.
    positions[i * 3 + 1] = (rng() - 0.5) * 0.15 * (outerRadius - r + 0.2);
    positions[i * 3 + 2] = r * Math.sin(angle);
    speeds[i] = (2 / Math.sqrt(r)) * speed * 0.45;
  }
  return { positions, speeds };
}

/** Where a particle sits after `time` seconds: the same rotation the vertex shader applies. */
export function orbitAt(x: number, z: number, angularSpeed: number, time: number): [number, number] {
  const a = angularSpeed * time;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - z * s, x * s + z * c];
}
