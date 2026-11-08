import { describe, expect, it, vi } from 'vitest';
import { flipOriginTransform } from './flip';
import { viewTransitionName } from './surface-transition';
import { revealOrigin, revealRadius, revealTheme } from './theme-reveal';
import { surfaceDepthTransform } from './surface-depth';
import { parallaxShift, tiltAngles } from './pointer-hooks';
import { getHeroItem, getHeroStagger, heroItem } from './hero-variants';
import { DEFAULT_STROKE_LOOP_TIMING, strokeLoopTimes } from './animated-stroke-loop';
import { DEFAULT_DRIFT_PATH, nextDriftStep } from './pixel-drift';

describe('flipOriginTransform', () => {
  it('moves the target centre onto the origin centre and scales to its size', () => {
    const t = flipOriginTransform(
      { left: 100, top: 100, width: 400, height: 200 },
      { left: 0, top: 0, width: 100, height: 50 },
    );
    expect(t.sx).toBe(0.25);
    expect(t.sy).toBe(0.25);
    expect(t.from).toContain('translate(-250px, -175px)');
    expect(t.from).toContain('rotateY(180deg)');
    expect(t.to).toContain('scale(1, 1)');
  });

  it('guards against zero-size targets', () => {
    const t = flipOriginTransform(
      { left: 0, top: 0, width: 0, height: 0 },
      { left: 0, top: 0, width: 10, height: 10 },
    );
    expect(t.sx).toBe(1);
    expect(t.sy).toBe(1);
  });
});

describe('viewTransitionName', () => {
  it('is unique per id and only uses valid ident characters', () => {
    const a = viewTransitionName('job 1');
    const b = viewTransitionName('job:1');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-zA-Z_][a-zA-Z0-9_-]*$/);
    expect(viewTransitionName('é✓')).toMatch(/^surface-e9-2713$/);
  });

  it('sanitizes the prefix and fixes a leading digit', () => {
    expect(viewTransitionName('a', 'co mpany!')).toBe('company-61');
    expect(viewTransitionName('a', '9lives')).toBe('vt-9lives-61');
    expect(viewTransitionName('a', '***')).toBe('surface-61');
  });

  it('returns just the prefix for an empty id', () => {
    expect(viewTransitionName('', 'card')).toBe('card');
  });
});

describe('theme reveal geometry', () => {
  it('radius reaches the farthest corner', () => {
    expect(revealRadius(0, 0, 3, 4)).toBe(5);
    expect(revealRadius(3, 4, 3, 4)).toBe(5);
    expect(revealRadius(50, 50, 100, 100)).toBeCloseTo(Math.hypot(50, 50));
  });

  it('origin accepts a point or a rect centre', () => {
    expect(revealOrigin({ x: 4, y: 7 })).toEqual({ x: 4, y: 7 });
    expect(revealOrigin({ left: 10, top: 20, width: 40, height: 10 })).toEqual({ x: 30, y: 25 });
  });

  it('applies immediately when there is no document', async () => {
    const apply = vi.fn();
    await revealTheme(apply, { x: 1, y: 1 });
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe('surfaceDepthTransform', () => {
  it('tilts against the pointer and lifts', () => {
    expect(surfaceDepthTransform(1, 0.5)).toBe(
      'perspective(900px) rotateX(-1deg) rotateY(2deg) translateY(-2px)',
    );
    expect(surfaceDepthTransform(-1, -1, { maxTilt: 4, lift: 0, perspective: 500 })).toBe(
      'perspective(500px) rotateX(4deg) rotateY(-4deg) translateY(0px)',
    );
  });
});

describe('pointer math', () => {
  it('tiltAngles clamps, rounds and never returns -0', () => {
    expect(tiltAngles(2, -3, 8)).toEqual({ rotateX: 8, rotateY: 8 });
    expect(tiltAngles(0.333, 0, 10)).toEqual({ rotateX: 0, rotateY: 3.33 });
    expect(Object.is(tiltAngles(0, 0, 8).rotateX, -0)).toBe(false);
  });

  it('parallaxShift scales and clamps', () => {
    expect(parallaxShift(100, 0.3)).toBeCloseTo(30);
    expect(parallaxShift(1000, 0.5, 120)).toBe(120);
    expect(parallaxShift(-1000, 0.5, 120)).toBe(-120);
  });
});

describe('hero variants', () => {
  it('stagger collapses to zero under reduced motion', () => {
    expect(getHeroStagger(true).visible).toEqual({
      transition: { staggerChildren: 0, delayChildren: 0 },
    });
    expect(getHeroStagger(false, { stagger: 0.1, delay: 0.2 }).visible).toEqual({
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    });
  });

  it('item rises unless reduced', () => {
    expect(getHeroItem(true).hidden).toEqual({ opacity: 0, y: 0 });
    expect(getHeroItem(false, 40).hidden).toEqual({ opacity: 0, y: 40 });
    expect(heroItem).toEqual(getHeroItem(false));
  });
});

describe('strokeLoopTimes', () => {
  it('splits the loop into draw, hold, erase and rest', () => {
    const { duration, times } = strokeLoopTimes(DEFAULT_STROKE_LOOP_TIMING);
    expect(duration).toBeCloseTo(9.5);
    expect(times[0]).toBe(0);
    expect(times[1]).toBeCloseTo(3.9 / 9.5);
    expect(times[2]).toBeCloseTo(4.95 / 9.5);
    expect(times[3]).toBeCloseTo(8.55 / 9.5);
    expect(times[4]).toBe(1);
  });

  it('handles a zero-length loop', () => {
    expect(strokeLoopTimes({ draw: 0, hold: 0, erase: 0, empty: 0 })).toEqual({
      duration: 0,
      times: [0, 0, 0, 0, 1],
    });
  });
});

describe('nextDriftStep', () => {
  it('walks the path and wraps around', () => {
    expect(nextDriftStep(0, DEFAULT_DRIFT_PATH)).toEqual({ index: 1, translate: '3px -2px' });
    expect(nextDriftStep(DEFAULT_DRIFT_PATH.length - 1, DEFAULT_DRIFT_PATH)).toEqual({
      index: 0,
      translate: '0px 0px',
    });
  });

  it('handles an empty path', () => {
    expect(nextDriftStep(3, [])).toEqual({ index: 0, translate: '0px 0px' });
  });
});
