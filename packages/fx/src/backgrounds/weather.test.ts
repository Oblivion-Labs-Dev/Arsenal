import { describe, expect, it } from 'vitest';
import { createRng } from './random';
import {
  createWeatherParticles,
  decayFlash,
  isWeatherState,
  nextLightningDelayMs,
  rainStreak,
  stepWeatherParticles,
  WEATHER,
  WEATHER_MAX_PARTICLES,
  WEATHER_STATES,
  weatherParticleCount,
} from './weather';

describe('weather', () => {
  it('has a preset for every state with 0–1 parameters', () => {
    for (const state of WEATHER_STATES) {
      const w = WEATHER[state];
      for (const v of [w.cover, w.fog, w.wet, w.dim, w.cool, w.wind, w.snow, w.intensity]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(isWeatherState(state)).toBe(true);
    }
    expect(WEATHER.thunderstorm.lightning).toBe(true);
    expect(isWeatherState('hail')).toBe(false);
    expect(isWeatherState(null)).toBe(false);
  });

  it('scales and clamps particle counts', () => {
    expect(weatherParticleCount(0)).toBe(0);
    expect(weatherParticleCount(0.5)).toBe(60);
    expect(weatherParticleCount(5)).toBe(WEATHER_MAX_PARTICLES);
    expect(weatherParticleCount(-1)).toBe(0);
  });

  it('is deterministic and recycles particles that leave the frame', () => {
    const a = createWeatherParticles(0.8, 0.5, 3);
    expect(createWeatherParticles(0.8, 0.5, 3)).toEqual(a);
    const rng = createRng(4);
    for (let f = 0; f < 2000; f++) stepWeatherParticles(a, 0.016, 0.5, 0.8, rng);
    for (const p of a) {
      expect(p.y).toBeLessThanOrEqual(1.08);
      expect(p.x).toBeGreaterThanOrEqual(-0.08);
      expect(p.x).toBeLessThanOrEqual(1.08);
    }
  });

  it('clamps large steps to 50 ms', () => {
    const one = createWeatherParticles(0.5, 0, 1);
    const two = createWeatherParticles(0.5, 0, 1);
    stepWeatherParticles(one, 0.05, 0, 0.5, createRng(1));
    stepWeatherParticles(two, 10, 0, 0.5, createRng(1));
    expect(two).toEqual(one);
  });

  it('times and decays lightning, and slants rain', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const d = nextLightningDelayMs(rng);
      expect(d).toBeGreaterThanOrEqual(6000);
      expect(d).toBeLessThan(14000);
    }
    expect(decayFlash(0.18, 1)).toBeCloseTo(0.18 * 0.04, 10);
    expect(decayFlash(0.18, 0)).toBe(0.18);
    expect(rainStreak(0, 0)).toEqual({ dx: -4, dy: 12 });
    expect(rainStreak(1, 1)).toEqual({ dx: -22, dy: 30 });
  });
});
