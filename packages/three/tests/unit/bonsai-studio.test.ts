import { describe, expect, it } from 'vitest';
import { buildCycloramaGeometry } from '../../src/hero/bonsai/Cyclorama';
import * as THREE from 'three';
import {
  aimContactShadowCamera,
  CONTACT_SHADOW_PLANE_ROTATION,
  CONTACT_SHADOW_PLANE_SCALE,
  OCCUPANCY_VERTEX,
} from '../../src/hero/bonsai/ContactShadow';
import { buildPotGeometries, MOSS_MOUND, POT_FLOOR_Y, potTriangleCount } from '../../src/hero/bonsai/pot';
import { AUTO_ROTATE_PERIOD_SECONDS, autoRotateSpeed, AUTO_ROTATE_RESUME_MS, autoRotateEnd, autoRotateStart, gaussianWeights, INITIAL_AUTO_ROTATE_STATE, ORBIT_POLAR_MAX, ORBIT_POLAR_MIN, shouldAutoRotate } from '../../src/hero/bonsai/studio-math';

describe('bonsai studio helpers', () => {
  it('stops rotation while dragging and resumes exactly four seconds after release', () => {
    const dragging = autoRotateStart(INITIAL_AUTO_ROTATE_STATE, 100);
    expect(shouldAutoRotate(dragging, 50_000, true)).toBe(false);
    const released = autoRotateEnd(dragging, 1_000);
    expect(shouldAutoRotate(released, 1_000 + AUTO_ROTATE_RESUME_MS - 1, true)).toBe(false);
    expect(shouldAutoRotate(released, 1_000 + AUTO_ROTATE_RESUME_MS, true)).toBe(true);
    expect(shouldAutoRotate(released, 10_000, false)).toBe(false);
  });

  it('allows near top-down and a little below the horizon', () => {
    expect(ORBIT_POLAR_MIN).toBeGreaterThan(0);
    expect(ORBIT_POLAR_MIN).toBeLessThan(0.2);
    expect(ORBIT_POLAR_MAX).toBeGreaterThan(Math.PI / 2);
    expect(ORBIT_POLAR_MAX).toBeLessThan(Math.PI / 2 + 0.2);
  });

  it('normalizes the symmetric gaussian kernel', () => {
    const weights = gaussianWeights(2.4);
    expect(weights[0] + 2 * weights.slice(1).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
  });

  it('builds a finite, connected cove profile', () => {
    const geometry = buildCycloramaGeometry();
    const positions = geometry.getAttribute('position');
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    const profile = geometry.parameters.points;
    expect(profile[0].x).toBe(0);
    expect(profile[1].x).toBe(4.5);
    expect(profile[2].x).toBeGreaterThan(profile[1].x);
    expect(profile[2].y).toBeGreaterThan(profile[1].y);
    const lastCurve = profile[profile.length - 2];
    const wall = profile[profile.length - 1];
    expect(lastCurve.x).toBe(wall.x);
    expect(lastCurve.y).toBeLessThan(wall.y);
    geometry.dispose();
  });

  it.each(['high', 'medium', 'low'] as const)('keeps %s pot within triangle budget and soil height', (quality) => {
    const budget = { high: 12_000, medium: 7_000, low: 3_500 }[quality];
    expect(potTriangleCount(quality)).toBeLessThanOrEqual(budget);
    const { moss, clay, stones } = buildPotGeometries(quality);
    const range = (g: THREE.BufferGeometry) => {
      g.computeBoundingBox();
      return g.boundingBox!;
    };
    // Moss sits at its final height: mounded above the soil line, never above 0.05.
    expect(range(moss).max.y).toBeGreaterThan(0);
    expect(range(moss).max.y).toBeLessThanOrEqual(0.05);
    expect(range(moss).max.y).toBeLessThanOrEqual(MOSS_MOUND + 0.005);
    // Clay rim tops out near 0.025-0.03, the stand's legs reach the studio floor.
    expect(range(clay).max.y).toBeGreaterThan(0.02);
    expect(range(clay).max.y).toBeLessThanOrEqual(0.05);
    expect(range(clay).min.y).toBeCloseTo(POT_FLOOR_Y, 2);
    for (const g of [moss, clay]) {
      expect(Array.from(g.getAttribute('position').array).every(Number.isFinite)).toBe(true);
      expect(Array.from(g.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
    }
    expect(stones.getAttribute('position').count).toBeGreaterThan(0);
    moss.dispose(); clay.dispose(); stones.dispose();
  });

  it('turns once per auto-rotate period with frame-rate independent OrbitControls updates', () => {
    // OrbitControls.update(delta) rotates (2π/60 · speed · delta) per call.
    const radiansPerSecond = ((Math.PI * 2) / 60) * autoRotateSpeed(AUTO_ROTATE_PERIOD_SECONDS);
    expect(radiansPerSecond * AUTO_ROTATE_PERIOD_SECONDS).toBeCloseTo(Math.PI * 2, 10);
  });
});

describe('bonsai pot', () => {
  it('winds the pot wall outward so front-face culling never shows the trunk through the clay', () => {
    const { clay } = buildPotGeometries('medium');
    const position = clay.getAttribute('position');
    const index = clay.getIndex()!;
    const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    let checked = 0;
    for (let i = 0; i < index.count; i += 3) {
      v.forEach((vertex, k) => vertex.fromBufferAttribute(position, index.getX(i + k)));
      const centroid = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
      // Only the outer wall lives in this band: the inner wall stops above it and the stand sits below it.
      if (centroid.y > -0.06 || centroid.y < -0.14) continue;
      const normal = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).normalize();
      if (Math.abs(normal.y) > 0.7) continue;
      checked += 1;
      expect(normal.dot(new THREE.Vector3(centroid.x, 0, centroid.z)), `face ${i / 3}`).toBeGreaterThan(0);
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('contact shadow', () => {
  it('transforms instanced meshes in the occupancy pass', () => {
    expect(OCCUPANCY_VERTEX).toMatch(/#ifdef USE_INSTANCING[\s\S]*instanceMatrix[\s\S]*#endif/);
  });

  it('maps a world point to the same spot on the shadow plane (frustum = plane, no mirroring)', () => {
    const size = 2.6;
    const ground = -0.5;
    const camera = new THREE.OrthographicCamera();
    aimContactShadowCamera(camera, size, ground);
    const plane = new THREE.Object3D();
    plane.rotation.set(...CONTACT_SHADOW_PLANE_ROTATION);
    plane.scale.set(...CONTACT_SHADOW_PLANE_SCALE);
    plane.position.set(0, ground, 0);
    plane.updateMatrixWorld();
    const inverse = plane.matrixWorld.clone().invert();
    for (const [x, z] of [
      [0.9, 0.3],
      [-0.6, -1.1],
      [1.25, -0.2],
    ] as const) {
      const ndc = new THREE.Vector3(x, ground + 0.2, z).project(camera);
      const local = new THREE.Vector3(x, ground, z).applyMatrix4(inverse);
      // PlaneGeometry uv = local / size + 0.5; the render target uv = ndc * 0.5 + 0.5.
      expect(ndc.x * 0.5 + 0.5).toBeCloseTo(local.x / size + 0.5, 6);
      expect(ndc.y * 0.5 + 0.5).toBeCloseTo(local.y / size + 0.5, 6);
    }
  });
});
