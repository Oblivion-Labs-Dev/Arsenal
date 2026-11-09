import { describe, expect, it } from 'vitest';
import { buildBonsaiSkeleton } from '../../src/hero/bonsai/skeleton';
import { mossHeight } from '../../src/hero/bonsai/pot';
import * as THREE from 'three';
import * as trunkModule from '../../src/hero/bonsai/trunk';
import {
  branchStartSleeve,
  buildBonsaiTrunk,
  tubeRadius,
  countTriangles,
  patchBarkShader,
} from '../../src/hero/bonsai/trunk';
import type { BonsaiBranch } from '../../src/hero/bonsai/types';

const living = (branch: BonsaiBranch) => branch.kind === 'trunk' || branch.kind === 'branch';

describe('procedural bonsai skeleton', () => {
  it('is deterministic by seed and independent of quality', () => {
    expect(buildBonsaiSkeleton({ seed: 7, quality: 'high' })).toEqual(
      buildBonsaiSkeleton({ seed: 7, quality: 'low' }),
    );
    expect(buildBonsaiSkeleton({ seed: 7 })).not.toEqual(buildBonsaiSkeleton({ seed: 8 }));
  });

  it('keeps the pipe model within five percent at every living split', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const skeleton = buildBonsaiSkeleton({ seed });
      for (const parent of skeleton.branches.filter(living)) {
        for (let index = 0; index < parent.points.length - 1; index++) {
          const children = skeleton.branches.filter(
            (branch) =>
              living(branch) &&
              branch.attach?.parent === parent.id &&
              branch.attach.index === index,
          );
          if (!children.length) continue;
          const left = parent.radii[index] ** 2;
          const right =
            parent.radii[index + 1] ** 2 +
            children.reduce((sum, child) => sum + child.radii[0] ** 2, 0);
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
        const children = skeleton.branches.filter(
          (branch) =>
            living(branch) && branch.attach?.parent === parent.id && branch.attach.index === last,
        );
        if (!children.length) continue;
        const left = parent.radii[last] ** 2;
        const right = children.reduce((sum, child) => sum + child.radii[0] ** 2, 0);
        expect(Math.abs(left - right) / left).toBeLessThanOrEqual(0.05);
      }
    }
  });

  it('buries every joined start cap inside its parent so no cap disk shows on the far side', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const skeleton = buildBonsaiSkeleton({ seed });
      for (const branch of skeleton.branches) {
        if (!branch.attach) continue;
        const parent = skeleton.branches[branch.attach.parent];
        const axis = new THREE.CatmullRomCurve3(
          parent.points.map((p) => new THREE.Vector3(...p)),
          false,
          'centripetal',
        );
        const samples = Array.from({ length: 401 }, (_, i) => axis.getPointAt(i / 400));
        const { center, tangent, radius } = branchStartSleeve(skeleton, branch);
        const side = new THREE.Vector3()
          .crossVectors(
            tangent,
            Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0),
          )
          .normalize();
        const up = new THREE.Vector3().crossVectors(tangent, side);
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const rim = center
            .clone()
            .addScaledVector(side, Math.cos(a) * radius)
            .addScaledVector(up, Math.sin(a) * radius);
          let best = Infinity;
          let bestT = 0;
          samples.forEach((p, i) => {
            const d = p.distanceTo(rim);
            if (d < best) {
              best = d;
              bestT = i / 400;
            }
          });
          const parentRadius = tubeRadius(parent, bestT);
          // 0.88 leaves room for the bark ridges, which pull the surface in by up to about 9%.
          expect(best, `seed ${seed} branch ${branch.id} (${branch.kind})`).toBeLessThan(
            parentRadius * 0.88,
          );
        }
      }
    }
  });

  it('winds every bark face outward so front-face culling keeps the near wall', () => {
    for (const seed of [1, 7, 13]) {
      const geometry = buildBonsaiTrunk(buildBonsaiSkeleton({ seed }), 'medium');
      const position = geometry.getAttribute('position');
      const index = geometry.getIndex()!;
      const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      let signedVolume = 0;
      for (let i = 0; i < index.count; i += 3) {
        v.forEach((vertex, k) => vertex.fromBufferAttribute(position, index.getX(i + k)));
        signedVolume += v[0].dot(new THREE.Vector3().crossVectors(v[1], v[2])) / 6;
      }
      // A closed, outward-wound mesh encloses positive volume; inward winding shows the bark's inside.
      expect(signedVolume, `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it('sinks every nebari root tip under the moss so no root ends as a spike in the air', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const root of buildBonsaiSkeleton({ seed }).branches.filter((b) => b.kind === 'root')) {
        const [x, y, z] = root.points[root.points.length - 1];
        const tipRadius = root.radii[root.radii.length - 1];
        expect(y + tipRadius, `seed ${seed} root ${root.id}`).toBeLessThan(mossHeight(x, z));
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
      for (let i = 1; i < branch.radii.length; i++)
        expect(branch.radii[i]).toBeLessThanOrEqual(branch.radii[i - 1] + 1e-9);
    }
    const primaries = skeleton.branches.filter(
      (branch) =>
        branch.kind === 'branch' &&
        branch.order === 1 &&
        branch.attach?.parent === 0 &&
        branch.id !== 0,
    );
    expect(primaries.length).toBeGreaterThanOrEqual(3);
    expect(primaries.length).toBeLessThanOrEqual(4);
    const azimuths = primaries
      .map((branch) => {
        const trunk = skeleton.branches[0].points[branch.attach!.index];
        const tip = branch.points.at(-1)!;
        return Math.atan2(tip[2] - trunk[2], tip[0] - trunk[0]);
      })
      .sort((a, b) => a - b);
    const spread = Math.max(...azimuths) - Math.min(...azimuths);
    expect(spread).toBeGreaterThan(Math.PI);
    expect(skeleton.branches.filter((branch) => branch.kind === 'root')).toHaveLength(6);
    expect(skeleton.branches.filter((branch) => branch.kind === 'jin')).toHaveLength(2);
    expect(skeleton.pads.length).toBeGreaterThanOrEqual(6);
    expect(skeleton.pads.length).toBeLessThanOrEqual(10);
    for (let i = 0; i < skeleton.pads.length; i++)
      for (let j = i + 1; j < skeleton.pads.length; j++) {
        const a = skeleton.pads[i];
        const b = skeleton.pads[j];
        const distance = Math.hypot(
          a.center[0] - b.center[0],
          a.center[1] - b.center[1],
          a.center[2] - b.center[2],
        );
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
        return (
          (localX / pad.radii[0]) ** 2 + (dy / pad.radii[1]) ** 2 + (localZ / pad.radii[2]) ** 2 <=
          1
        );
      });
      expect(covered).toBe(true);
    }
  });

  it('shapes pads as rounded foliage clouds, not flat shelves', () => {
    for (const seed of [1, 7, 42]) {
      for (const pad of buildBonsaiSkeleton(seed).pads) {
        // A pad thinner than ~0.38 of its spread reads as a ragged plate from the studio camera.
        expect(pad.radii[1] / Math.max(pad.radii[0], pad.radii[2])).toBeGreaterThanOrEqual(0.38);
      }
    }
  });

  it('keeps merged trunk triangle counts inside each quality budget', () => {
    const limits = { high: 45_000, medium: 22_000, low: 9_000 } as const;
    for (let seed = 1; seed <= 10; seed++)
      for (const quality of ['high', 'medium', 'low'] as const) {
        const geometry = buildBonsaiTrunk(buildBonsaiSkeleton({ seed }), quality);
        expect(countTriangles(geometry)).toBeLessThanOrEqual(limits[quality]);
        geometry.dispose();
      }
  });

  it('creates finite indexed geometry with bark and UV attributes', () => {
    const geometry = buildBonsaiTrunk(buildBonsaiSkeleton(), 'medium');
    for (const attributeName of ['position', 'normal', 'uv', 'aBark'])
      expect(geometry.getAttribute(attributeName)).toBeDefined();
    for (const attributeName of ['position', 'normal']) {
      const values = geometry.getAttribute(attributeName).array;
      for (const value of values) expect(Number.isFinite(value)).toBe(true);
    }
    geometry.dispose();
  });

  it('carves the trunk into broad bark plates split by sharp furrows, not soft sine bumps', () => {
    const skeleton = buildBonsaiSkeleton({ seed: 7 });
    expect(skeleton.branches[0]!.kind).toBe('trunk');
    const position = buildBonsaiTrunk(skeleton, 'medium').getAttribute('position');
    const radial = 28; // RADIAL.medium; the trunk is appended first, ring i starts at i * (radial + 1)
    const ring = 10; // t ~ 0.29, clear of the knot bulge at t = 0.48
    const pts = Array.from({ length: radial }, (_, side) =>
      new THREE.Vector3().fromBufferAttribute(position, ring * (radial + 1) + side),
    );
    const centre = pts.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(radial);
    const r = pts.map((p) => p.distanceTo(centre));
    const min = Math.min(...r);
    const max = Math.max(...r);
    const mean = r.reduce((a, b) => a + b, 0) / radial;
    expect((max - min) / mean).toBeGreaterThanOrEqual(0.12);
    // Broad plates, narrow cracks: most of the ring sits near the outer surface.
    expect(mean - min).toBeGreaterThan((max - min) * 0.55);
    const creases = r.filter(
      (v, i) => v < r[(i + radial - 1) % radial]! && v < r[(i + 1) % radial]!,
    ).length;
    expect(creases).toBeGreaterThanOrEqual(6);
  });

  it('maps bark along each branch in tube UVs with real normal relief instead of a smeared world projection', () => {
    const tex = () => new THREE.Texture();
    const material = trunkModule.createBarkMaterial({
      light: false,
      textures: { barkAlbedo: tex(), barkNormal: tex(), barkRoughness: tex() },
    });
    // Tube UVs: u wraps the circumference once, so the repeat is the number of bark tiles around every branch.
    expect(material.map?.repeat.x).toBeGreaterThanOrEqual(2);
    expect(material.map?.repeat.y).toBe(material.map?.repeat.x);
    expect(material.normalMap).toBeTruthy();
    expect(material.normalScale.x).toBeGreaterThanOrEqual(1);
    expect(material.roughnessMap).toBeTruthy();
    const patched = patchBarkShader(
      '#include <common>\n#include <worldpos_vertex>',
      '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>',
    );
    expect(patched.fragment).toContain(`vMapUv * ${trunkModule.BARK_GRAIN_REPEAT.toFixed(2)}`);
    expect(patched.fragment).not.toContain('vBarkWorldPosition');
    // Large furrows: a low-frequency pass of the same albedo, so the trunk shows ridges, not only sub-pixel strands.
    expect(patched.fragment).toContain(`vMapUv * ${trunkModule.BARK_FURROW_REPEAT.toFixed(2)}`);
    expect(trunkModule.BARK_FURROW_REPEAT).toBeLessThan(1);
    expect(material.normalScale.x).toBeGreaterThanOrEqual(1.8);
    // Living bark is matte: a roughness floor stops the glossy plastic sheen.
    expect(patched.fragment).toMatch(/roughnessFactor = max\(roughnessFactor, 0\.[7-9]/);
    material.dispose();
  });

  it('declares each custom bark shader uniform and attribute it reads', () => {
    const patched = patchBarkShader(
      '#include <common>\n#include <worldpos_vertex>',
      '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>',
    );
    const combined = `${patched.vertex}\n${patched.fragment}`;
    const used = new Set(combined.match(/\b(?:u[A-Z]\w*|a[A-Z]\w*)\b/g) ?? []);
    for (const name of used) {
      const declaration = name.startsWith('u')
        ? new RegExp(`uniform\\s+\\w+\\s+${name}\\b`)
        : new RegExp(`attribute\\s+\\w+\\s+${name}\\b`);
      expect(combined).toMatch(declaration);
    }
  });
});
