import { describe, expect, it } from 'vitest';
import { buildBonsaiSkeleton } from '../../src/hero/bonsai/skeleton';
import { buildBonsaiTrunk, countTriangles, patchBarkShader } from '../../src/hero/bonsai/trunk';
import type { BonsaiBranch } from '../../src/hero/bonsai/types';

const living = (branch: BonsaiBranch) => branch.kind === 'trunk' || branch.kind === 'branch';

describe('procedural bonsai skeleton', () => {
  it('is deterministic by seed and independent of quality', () => {
    expect(buildBonsaiSkeleton({ seed: 7, quality: 'high' })).toEqual(buildBonsaiSkeleton({ seed: 7, quality: 'low' }));
    expect(buildBonsaiSkeleton({ seed: 7 })).not.toEqual(buildBonsaiSkeleton({ seed: 8 }));
  });

  it('keeps the pipe model within five percent at every living split', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const skeleton = buildBonsaiSkeleton({ seed });
      for (const parent of skeleton.branches.filter(living)) {
        for (let index = 0; index < parent.points.length - 1; index++) {
          const children = skeleton.branches.filter((branch) => living(branch) && branch.attach?.parent === parent.id && branch.attach.index === index);
          if (!children.length) continue;
          const left = parent.radii[index] ** 2;
          const right = parent.radii[index + 1] ** 2 + children.reduce((sum, child) => sum + child.radii[0] ** 2, 0);
          expect(Math.abs(left - right) / left).toBeLessThanOrEqual(0.05);
        }
      }
    }
  });

  it('carries the full cross-section into a child attached at the parent tip (no pinch at the apex)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const skeleton = buildBonsaiSkeleton({ seed });
      for (const parent of skeleton.branches.filter(living)) {
        const last = parent.points.length - 1;
        const children = skeleton.branches.filter((branch) => living(branch) && branch.attach?.parent === parent.id && branch.attach.index === last);
        if (!children.length) continue;
        const left = parent.radii[last] ** 2;
        const right = children.reduce((sum, child) => sum + child.radii[0] ** 2, 0);
        expect(Math.abs(left - right) / left).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it('varies the trunk line with the seed', () => {
    const a = buildBonsaiSkeleton({ seed: 1 }).branches[0].points[16];
    const b = buildBonsaiSkeleton({ seed: 2 }).branches[0].points[16];
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(0.002);
  });

  it('has tapered, sampled branches and a full three dimensional branch spread', () => {
    const skeleton = buildBonsaiSkeleton({ seed: 7 });
    for (const branch of skeleton.branches) {
      expect(branch.points.length).toBeGreaterThanOrEqual(3);
      expect(branch.radii).toHaveLength(branch.points.length);
      for (let i = 1; i < branch.radii.length; i++) expect(branch.radii[i]).toBeLessThanOrEqual(branch.radii[i - 1] + 1e-9);
    }
    const primaries = skeleton.branches.filter((branch) => branch.kind === 'branch' && branch.order === 1 && branch.attach?.parent === 0 && branch.id !== 0);
    expect(primaries.length).toBeGreaterThanOrEqual(3);
    expect(primaries.length).toBeLessThanOrEqual(4);
    const azimuths = primaries.map((branch) => {
      const trunk = skeleton.branches[0].points[branch.attach!.index];
      const tip = branch.points.at(-1)!;
      return Math.atan2(tip[2] - trunk[2], tip[0] - trunk[0]);
    }).sort((a, b) => a - b);
    const spread = Math.max(...azimuths) - Math.min(...azimuths);
    expect(spread).toBeGreaterThan(Math.PI);
    expect(skeleton.branches.filter((branch) => branch.kind === 'root')).toHaveLength(6);
    expect(skeleton.branches.filter((branch) => branch.kind === 'jin')).toHaveLength(2);
    expect(skeleton.pads.length).toBeGreaterThanOrEqual(6);
    expect(skeleton.pads.length).toBeLessThanOrEqual(10);
    for (let i = 0; i < skeleton.pads.length; i++) for (let j = i + 1; j < skeleton.pads.length; j++) {
      const a = skeleton.pads[i];
      const b = skeleton.pads[j];
      const distance = Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1], a.center[2] - b.center[2]);
      expect(distance).toBeGreaterThanOrEqual(0.75 * (a.radii[0] + b.radii[0]));
    }
    for (const twig of skeleton.branches.filter((branch) => branch.order === 3)) {
      const point = twig.points.at(-1)!;
      const covered = skeleton.pads.some((pad) => {
        const dx = point[0] - pad.center[0];
        const dy = point[1] - pad.center[1];
        const dz = point[2] - pad.center[2];
        const localX = dx * Math.cos(pad.yaw) - dz * Math.sin(pad.yaw);
        const localZ = dx * Math.sin(pad.yaw) + dz * Math.cos(pad.yaw);
        return (localX / pad.radii[0]) ** 2 + (dy / pad.radii[1]) ** 2 + (localZ / pad.radii[2]) ** 2 <= 1;
      });
      expect(covered).toBe(true);
    }
  });

  it('keeps merged trunk triangle counts inside each quality budget', () => {
    const limits = { high: 45_000, medium: 22_000, low: 9_000 } as const;
    for (let seed = 1; seed <= 10; seed++) for (const quality of ['high', 'medium', 'low'] as const) {
      const geometry = buildBonsaiTrunk(buildBonsaiSkeleton({ seed }), quality);
      expect(countTriangles(geometry)).toBeLessThanOrEqual(limits[quality]);
      geometry.dispose();
    }
  });

  it('creates finite indexed geometry with bark and UV attributes', () => {
    const geometry = buildBonsaiTrunk(buildBonsaiSkeleton(), 'medium');
    for (const attributeName of ['position', 'normal', 'uv', 'aBark']) expect(geometry.getAttribute(attributeName)).toBeDefined();
    for (const attributeName of ['position', 'normal']) {
      const values = geometry.getAttribute(attributeName).array;
      for (const value of values) expect(Number.isFinite(value)).toBe(true);
    }
    geometry.dispose();
  });

  it('declares each custom bark shader uniform and attribute it reads', () => {
    const patched = patchBarkShader('#include <common>\n#include <worldpos_vertex>', '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>');
    const combined = `${patched.vertex}\n${patched.fragment}`;
    const used = new Set(combined.match(/\b(?:u[A-Z]\w*|a[A-Z]\w*)\b/g) ?? []);
    for (const name of used) {
      const declaration = name.startsWith('u') ? new RegExp(`uniform\\s+\\w+\\s+${name}\\b`) : new RegExp(`attribute\\s+\\w+\\s+${name}\\b`);
      expect(combined).toMatch(declaration);
    }
  });
});
