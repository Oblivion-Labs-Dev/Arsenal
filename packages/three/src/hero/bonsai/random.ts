/** Deterministic PRNG (mulberry32): the same seed always grows the same tree. Returns [0, 1). */
export function createRandom(seed: number): () => number {
  let state = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform value in [min, max) from a PRNG. */
export function range(random: () => number, min: number, max: number): number {
  return min + (max - min) * random();
}
