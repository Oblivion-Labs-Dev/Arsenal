import { createRng, type Rng } from './random';

/** Weather presets and the pure particle sim behind `WeatherCanvas`. */

export const WEATHER_STATES = [
  'clear',
  'partly-cloudy',
  'overcast',
  'rain',
  'heavy-rain',
  'thunderstorm',
  'snow',
  'heavy-snow',
  'fog',
  'mist',
  'windy',
] as const;
export type WeatherState = (typeof WEATHER_STATES)[number];
export type Precipitation = 'none' | 'rain' | 'snow' | 'petals' | 'leaves';

/**
 * Scene parameters, all 0–1. Only `precip`, `intensity`, `wind` and `lightning` drive the canvas;
 * the rest (`cover`, `fog`, `wet`, `dim`, `cool`, `snow`) are there for the host scene to grade
 * its own sky, haze and ground.
 */
export type WeatherParameters = {
  cover: number;
  fog: number;
  wet: number;
  dim: number;
  cool: number;
  wind: number;
  snow: number;
  precip: Precipitation;
  intensity: number;
  lightning: boolean;
};

const calm = { snow: 0, precip: 'none', intensity: 0, lightning: false } as const;

export const WEATHER: Record<WeatherState, WeatherParameters> = {
  clear: { ...calm, cover: 0.05, fog: 0, wet: 0, dim: 0, cool: 0, wind: 0.12 },
  'partly-cloudy': { ...calm, cover: 0.38, fog: 0.04, wet: 0, dim: 0.08, cool: 0.04, wind: 0.22 },
  overcast: { ...calm, cover: 0.88, fog: 0.12, wet: 0.08, dim: 0.3, cool: 0.16, wind: 0.25 },
  rain: {
    cover: 0.72,
    fog: 0.2,
    wet: 0.65,
    dim: 0.26,
    cool: 0.22,
    wind: 0.38,
    snow: 0,
    precip: 'rain',
    intensity: 0.46,
    lightning: false,
  },
  'heavy-rain': {
    cover: 0.94,
    fog: 0.32,
    wet: 0.92,
    dim: 0.48,
    cool: 0.34,
    wind: 0.62,
    snow: 0,
    precip: 'rain',
    intensity: 0.86,
    lightning: false,
  },
  thunderstorm: {
    cover: 1,
    fog: 0.38,
    wet: 0.95,
    dim: 0.54,
    cool: 0.38,
    wind: 0.72,
    snow: 0,
    precip: 'rain',
    intensity: 0.8,
    lightning: true,
  },
  snow: {
    cover: 0.58,
    fog: 0.12,
    wet: 0.1,
    dim: 0.2,
    cool: 0.24,
    wind: 0.24,
    snow: 0.38,
    precip: 'snow',
    intensity: 0.38,
    lightning: false,
  },
  'heavy-snow': {
    cover: 0.88,
    fog: 0.28,
    wet: 0.18,
    dim: 0.36,
    cool: 0.42,
    wind: 0.5,
    snow: 0.78,
    precip: 'snow',
    intensity: 0.8,
    lightning: false,
  },
  fog: { ...calm, cover: 0.22, fog: 0.94, wet: 0.15, dim: 0.24, cool: 0.1, wind: 0.04 },
  mist: { ...calm, cover: 0.16, fog: 0.46, wet: 0.1, dim: 0.12, cool: 0.06, wind: 0.08 },
  windy: { ...calm, cover: 0.42, fog: 0.04, wet: 0, dim: 0.08, cool: 0.08, wind: 0.94 },
};

export function isWeatherState(value: string | null | undefined): value is WeatherState {
  return WEATHER_STATES.some((state) => state === value);
}

/** One drop or flake, in normalised 0–1 viewport coordinates. */
export type WeatherParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  rotation: number;
};

export const WEATHER_MAX_PARTICLES = 120;

export function weatherParticleCount(intensity: number): number {
  return Math.max(
    0,
    Math.min(WEATHER_MAX_PARTICLES, Math.round(intensity * WEATHER_MAX_PARTICLES)),
  );
}

/** Re-seeds a particle: from just above the top edge, or anywhere when `fromTop` is false. */
export function resetWeatherParticle(
  p: WeatherParticle,
  rng: Rng,
  wind: number,
  intensity: number,
  fromTop = true,
): void {
  p.x = rng();
  p.y = fromTop ? -rng() * 0.2 : rng();
  p.vx = (rng() - 0.5) * (0.012 + wind * 0.055);
  p.vy = 0.08 + rng() * 0.22 + intensity * 0.2;
}

export function createWeatherParticles(
  intensity: number,
  wind: number,
  seed: number | Rng = 1,
): WeatherParticle[] {
  const rng = typeof seed === 'function' ? seed : createRng(seed);
  const out: WeatherParticle[] = [];
  const count = weatherParticleCount(intensity);
  for (let i = 0; i < count; i++) {
    const p: WeatherParticle = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 1 + rng() * 2,
      phase: rng() * Math.PI * 2,
      rotation: rng() * Math.PI * 2,
    };
    resetWeatherParticle(p, rng, wind, intensity, false);
    out.push(p);
  }
  return out;
}

/** Advances by `deltaSec` (clamped to 50 ms) and recycles anything that left the frame. */
export function stepWeatherParticles(
  particles: WeatherParticle[],
  deltaSec: number,
  wind: number,
  intensity: number,
  rng: Rng,
): void {
  const dt = Math.min(0.05, Math.max(0, deltaSec));
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.phase += dt * (1 + wind * 2);
    if (p.y > 1.08 || p.x > 1.08 || p.x < -0.08) resetWeatherParticle(p, rng, wind, intensity);
  }
}

/** Delay before the next lightning flash: 6–14 s. */
export function nextLightningDelayMs(rng: Rng): number {
  return 6000 + rng() * 8000;
}

/** A flash starts at 0.18 and decays to 4% per second. */
export function decayFlash(flash: number, deltaSec: number): number {
  return flash * Math.pow(0.04, Math.max(0, deltaSec));
}

/** Rain streak vector for one drop: wind slants it, intensity lengthens it. */
export function rainStreak(wind: number, intensity: number): { dx: number; dy: number } {
  return { dx: -(4 + wind * 18), dy: 12 + intensity * 18 };
}
