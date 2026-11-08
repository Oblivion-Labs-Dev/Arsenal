/** A seeded source of uniform numbers in [0, 1). */
export type Rng = () => number;

/** mulberry32: tiny, fast and good enough for visuals. Same seed, same sequence. */
export function createRng(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let n = value;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample (Box-Muller) drawn from `rng`. */
export function gaussian(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A fresh seed for callers that did not pass one. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

/** Pick one item from a non-empty list. */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)] ?? items[0];
  if (item === undefined) throw new Error('pick() needs a non-empty list');
  return item;
}
