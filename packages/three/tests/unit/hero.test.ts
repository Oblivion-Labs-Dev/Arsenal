import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CORE_NODES,
  HERO_COLORS,
  RECOVERY_SETTLE,
  RECOVERY_TO_GREEN,
  StatusClock,
  accentCounts,
  bonsaiPadCount,
  patchBonsaiWind,
  dataPathCurve,
  dataPathOpacity,
  fibonacciDirections,
  heroTime,
  DEFAULT_ISLAND_SIZE,
  islandOutline,
  islandRim,
  islandStrata,
  islandTop,
  islandTopHeight,
  scatterInstances,
  makeBand,
  onSphere,
  orbitPoint,
  rippleAt,
  serviceRingScale,
  statusColor,
} from '../../src/hero';

const hex = (c: THREE.Color) => `#${c.getHexString()}`;

describe('orbitPoint', () => {
  it('matches a point rotated by the ring group Euler', () => {
    for (const [r, a, tx, tz] of [
      [2, 0.3, 0.4, -0.2],
      [1.4, 2.7, -0.9, 0.6],
      [3, -1.1, 0, 0],
    ] as const) {
      const expected = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r).applyEuler(
        new THREE.Euler(tx, 0, tz),
      );
      const [x, y, z] = orbitPoint(r, a, [tx, tz]);
      expect(x).toBeCloseTo(expected.x, 6);
      expect(y).toBeCloseTo(expected.y, 6);
      expect(z).toBeCloseTo(expected.z, 6);
    }
  });
});

describe('geometry builders', () => {
  it('makeBand builds a closed band at the given radius', () => {
    const band = makeBand(2, 0.2, 0.05);
    const pos = band.getAttribute('position');
    expect(pos.count).toBe(193 * 13);
    const r = Math.hypot(pos.getX(0), pos.getZ(0));
    expect(r).toBeCloseTo(2.1, 5);
    expect(band.getIndex()!.count).toBe(192 * 12 * 6);
  });

  it('makeBand gives the ring shader a uv per vertex: u along the band, v around it', () => {
    const band = makeBand(2, 0.2, 0.05);
    const uv = band.getAttribute('uv');
    expect(uv.count).toBe(band.getAttribute('position').count);
    expect([uv.getX(0), uv.getY(0)]).toEqual([0, 0]);
    expect(uv.getX(uv.count - 1)).toBe(1);
    expect(uv.getY(uv.count - 1)).toBe(1);
  });

  it('island top and strata have matching position and colour counts', () => {
    for (const light of [false, true]) {
      for (const g of [islandTop(light), islandStrata(light)]) {
        expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
        expect(g.getIndex()!.count).toBeGreaterThan(0);
      }
    }
  });
});

describe('quality levels', () => {
  it('scale counts down with quality', () => {
    expect(bonsaiPadCount('high')).toBe(9);
    expect(bonsaiPadCount('low')).toBeLessThan(bonsaiPadCount('medium'));
    expect(accentCounts('high').foliage).toBeGreaterThan(accentCounts('low').foliage);
  });
});

describe('heroTime', () => {
  it('freezes on the still frame with reduced motion', () => {
    expect(heroTime(12.5, false)).toBe(12.5);
    expect(heroTime(12.5, true)).toBe(0);
    expect(heroTime(12.5, true, 3)).toBe(3);
  });
});

describe('status colours', () => {
  it('failure is red and idle is the accent', () => {
    expect(hex(statusColor('failure', 0, false))).toBe(HERO_COLORS.error);
    expect(hex(statusColor('idle', 0, false))).toBe(HERO_COLORS.accent);
    expect(hex(statusColor('idle', 0, true))).toBe(HERO_COLORS.accentLight);
  });

  it('recovery goes red, then green, then settles on the accent', () => {
    expect(hex(statusColor('recovery', 0, false))).toBe(HERO_COLORS.error);
    expect(hex(statusColor('recovery', RECOVERY_TO_GREEN, false))).toBe(HERO_COLORS.success);
    expect(hex(statusColor('recovery', RECOVERY_TO_GREEN + RECOVERY_SETTLE, false))).toBe(
      HERO_COLORS.accent,
    );
    expect(hex(statusColor('recovery', Infinity, false))).toBe(HERO_COLORS.accent);
    expect(hex(statusColor('recovery', NaN, false))).toBe(HERO_COLORS.error);
  });

  it('StatusClock restarts when the status changes', () => {
    const clock = new StatusClock();
    expect(clock.elapsed('a', 'idle', 10)).toBe(0);
    expect(clock.elapsed('a', 'idle', 12)).toBe(2);
    expect(clock.elapsed('a', 'recovery', 13)).toBe(0);
    expect(clock.elapsed('a', 'recovery', 14.5)).toBe(1.5);
    expect(clock.elapsed('b', 'recovery', 14.5)).toBe(0);
  });

  it('service ring hides at rest and pulses only when animating', () => {
    expect(serviceRingScale('idle', 1, true)).toBe(0);
    expect(serviceRingScale('hover', 1, true)).toBe(1);
    expect(serviceRingScale('failure', 0.2, false)).toBe(1.04);
    expect(serviceRingScale('failure', 0.2, true)).toBeGreaterThan(1.04);
  });
});

describe('data paths', () => {
  it('arcs between endpoints, lifted at the middle', () => {
    const curve = dataPathCurve([-1, 0, 0], [1, 0, 0], 1);
    expect(curve.getPoint(0).x).toBe(-1);
    expect(curve.getPoint(1).x).toBe(1);
    expect(curve.getPoint(0.5).y).toBeCloseTo(0.5, 6);
  });

  it('dimmed < resting < active', () => {
    for (const kind of ['request', 'telemetry'] as const) {
      expect(dataPathOpacity(kind, false, true)).toBeLessThan(dataPathOpacity(kind, false, false));
      expect(dataPathOpacity(kind, false, false)).toBeLessThan(dataPathOpacity(kind, true, false));
    }
  });
});

describe('ripples and sphere nodes', () => {
  it('ripples grow and fade, clamped to one cycle', () => {
    expect(rippleAt(0)).toEqual({ scale: 0.45, fade: 1 });
    expect(rippleAt(1)).toEqual({ scale: 2.95, fade: 0 });
    expect(rippleAt(2)).toEqual(rippleAt(1));
  });

  it('fibonacci directions are unit vectors and onSphere scales them', () => {
    const dirs = fibonacciDirections(9);
    expect(dirs).toHaveLength(9);
    for (const d of dirs) expect(Math.hypot(...d)).toBeCloseTo(1, 6);
    expect(Math.hypot(...onSphere([3, 0, 4], 2))).toBeCloseTo(2, 6);
    expect(onSphere([0, 0, 0], 2)).toEqual([0, 2, 0]);
    expect(DEFAULT_CORE_NODES.filter((n) => n.hub)).toHaveLength(1);
  });
});

describe('patchBonsaiWind', () => {
  it('declares every custom uniform it reads, so the foliage shader compiles', () => {
    const patched = patchBonsaiWind(THREE.ShaderLib.standard.vertexShader);
    expect(patched).not.toBe(THREE.ShaderLib.standard.vertexShader);
    const used = new Set(patched.match(/\buWind\w*/g));
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(patched).toMatch(new RegExp(`uniform float ${name};`));
  });

  it('reads the clump height from the instance matrix only when instancing is on', () => {
    const patched = patchBonsaiWind(THREE.ShaderLib.standard.vertexShader);
    const instanced = patched.indexOf('#ifdef USE_INSTANCING\nfloat windHeight');
    expect(instanced).toBeGreaterThan(-1);
    expect(patched.slice(patched.indexOf('#else', instanced))).toMatch(/windHeight = position\.y/);
  });
});

describe('island surface', () => {
  it('the mossy top meets the rock rim with no open seam', () => {
    const top = islandTop(false).getAttribute('position');
    const strata = islandStrata(false).getAttribute('position');
    const around = 73;
    const outer = top.count - around;
    for (let segment = 0; segment < around; segment += 9) {
      // Top mesh is lifted 0.025 in IslandBase.
      expect(top.getX(outer + segment)).toBeCloseTo(strata.getX(segment), 5);
      expect(top.getZ(outer + segment)).toBeCloseTo(strata.getZ(segment), 5);
      expect(top.getY(outer + segment) + 0.025).toBeCloseTo(strata.getY(segment), 5);
    }
    expect(islandRim(0).radius).toBeGreaterThan(0.5);
  });

  it('the outline is irregular, not a smooth ellipse', () => {
    const radii = Array.from({ length: 36 }, (_, i) => islandOutline((i / 36) * Math.PI * 2));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.08);
  });

  it('the top rolls in mounds but stays level where the pond sits', () => {
    const pondX = (0.72 / 5.8) * DEFAULT_ISLAND_SIZE.width;
    expect(islandTopHeight(pondX, 0)).toBeCloseTo(0.05, 6);
    const heights = [-2, -1.2, -0.4, 0.4, 1.2, 2].map((x) => islandTopHeight(x, 0.4));
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.03);
  });

  it('scattered instances sit on the given surface height', () => {
    const mesh = scatterInstances(6, new THREE.BoxGeometry(), 0.3, 2, '#000', 0.85, 1, (x, z) => 1 + x + z);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    for (let i = 0; i < 6; i++) {
      mesh.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      expect(p.y).toBeCloseTo(1 + p.x + p.z, 5);
    }
  });
});
