import { describe, expect, it } from 'vitest';
import {
  immersiveLayerOffsets,
  infinityMarkStops,
  infinitySceneScrollOffsets,
  pointerAngleDeg,
  pointerInBox,
  pointerParallaxOffset,
} from './scene-math';

const rect = { left: 100, top: 50, width: 400, height: 200 };

describe('pointerParallaxOffset', () => {
  it('is zero at the scene centre and scales with distance', () => {
    expect(pointerParallaxOffset(300, 150, rect)).toEqual({ x: 0, y: 0 });
    expect(pointerParallaxOffset(400, 50, rect, 0.1)).toEqual({ x: 10, y: -10 });
  });

  it('clamps far pointers and ignores non-finite input', () => {
    expect(pointerParallaxOffset(99999, -99999, rect, 0.034, 28)).toEqual({ x: 28, y: -28 });
    expect(pointerParallaxOffset(Number.NaN, Number.POSITIVE_INFINITY, rect)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('scroll offsets', () => {
  it('moves ambient down and symbol up, capped at 600px of scroll', () => {
    expect(infinitySceneScrollOffsets(0)).toEqual({ ambient: 0, symbol: 0 });
    const mid = infinitySceneScrollOffsets(100);
    expect(mid.ambient).toBeCloseTo(3.2);
    expect(mid.symbol).toBeCloseTo(-1.7);
    expect(infinitySceneScrollOffsets(5000)).toEqual(infinitySceneScrollOffsets(600));
  });

  it('holds still under reduced motion, negative scroll and bad input', () => {
    expect(infinitySceneScrollOffsets(300, true)).toEqual({ ambient: 0, symbol: 0 });
    expect(infinitySceneScrollOffsets(-50)).toEqual({ ambient: 0, symbol: 0 });
    expect(infinitySceneScrollOffsets(Number.NaN)).toEqual({ ambient: 0, symbol: 0 });
    expect(immersiveLayerOffsets(900, true)).toEqual({ back: 0, mid: 0, front: 0 });
  });

  it('orders immersive layers back < mid < front and caps at 1200px', () => {
    const o = immersiveLayerOffsets(1000);
    expect(o.back).toBeLessThan(o.mid);
    expect(o.mid).toBeLessThan(o.front);
    expect(immersiveLayerOffsets(9000)).toEqual(immersiveLayerOffsets(1200));
  });
});

describe('pointerInBox', () => {
  it('maps the centre and corners', () => {
    expect(pointerInBox(300, 150, rect)).toEqual({ px: 50, py: 50, nx: 0, ny: 0 });
    expect(pointerInBox(500, 50, rect)).toEqual({ px: 100, py: 0, nx: 1, ny: -1 });
  });

  it('clamps outside pointers and survives an empty box', () => {
    expect(pointerInBox(-999, 9999, rect)).toEqual({ px: 0, py: 100, nx: -1, ny: 1 });
    const empty = pointerInBox(10, 10, { left: 0, top: 0, width: 0, height: 0 });
    expect(Number.isFinite(empty.px) && Number.isFinite(empty.ny)).toBe(true);
  });
});

describe('pointerAngleDeg', () => {
  it('points right at 0, down at 90, left at 180', () => {
    expect(pointerAngleDeg(1, 0)).toBe(0);
    expect(pointerAngleDeg(0, 1)).toBe(90);
    expect(pointerAngleDeg(-1, 0)).toBe(180);
  });

  it('returns 0 at the centre and for bad input', () => {
    expect(pointerAngleDeg(0, 0)).toBe(0);
    expect(pointerAngleDeg(Number.NaN, 1)).toBe(0);
  });
});

describe('infinityMarkStops', () => {
  it('runs left colour to bright centre to right colour with ascending offsets', () => {
    const stops = infinityMarkStops([255, 0, 0], [0, 0, 255], [255, 255, 255]);
    expect(stops.map((s) => s.offset)).toEqual([0, 0.38, 0.5, 0.62, 1]);
    expect(stops[0]?.color).toBe('rgba(255, 0, 0, 0.88)');
    expect(stops[2]?.color).toContain('255');
    expect(stops[4]?.color).toMatch(/^rgba\(0,\s?0,\s?255,\s?0\.82\)$/);
  });
});
