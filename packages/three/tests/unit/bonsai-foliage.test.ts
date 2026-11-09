import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  buildLeafField,
  createLeafMaterials,
  leafCardsPerPad,
  LEAF_UNIFORM_NAMES,
  patchLeafFragmentShader,
  patchLeafVertexShader,
  updateLeafUniforms,
} from '../../src/hero/bonsai/foliage';
import type { BonsaiPad } from '../../src/hero/bonsai/types';

const pads: BonsaiPad[] = [
  { center: [-0.74, 0.88, -0.28], radii: [0.22, 0.08, 0.2], yaw: 0.15, branch: 1 },
  { center: [-0.5, 1.14, 0.22], radii: [0.28, 0.1, 0.24], yaw: -0.4, branch: 2 },
  { center: [-0.22, 1.43, -0.12], radii: [0.24, 0.09, 0.22], yaw: 0.7, branch: 3 },
  { center: [0.05, 1.58, 0.1], radii: [0.2, 0.08, 0.18], yaw: -0.2, branch: 4 },
  { center: [0.32, 1.35, -0.3], radii: [0.3, 0.11, 0.25], yaw: 0.9, branch: 5 },
  { center: [0.61, 1.08, 0.25], radii: [0.27, 0.1, 0.23], yaw: -0.6, branch: 6 },
  { center: [0.18, 0.92, 0.3], radii: [0.23, 0.07, 0.2], yaw: 0.35, branch: 7 },
  { center: [-0.08, 1.02, -0.35], radii: [0.19, 0.08, 0.18], yaw: -0.8, branch: 8 },
];

function getCardCenter(field: ReturnType<typeof buildLeafField>, index: number): THREE.Vector3 {
  const offset = index * 16;
  return new THREE.Vector3(
    field.matrices[offset + 12],
    field.matrices[offset + 13],
    field.matrices[offset + 14],
  );
}

function getCardNormal(field: ReturnType<typeof buildLeafField>, index: number): THREE.Vector3 {
  const offset = index * 16;
  return new THREE.Vector3(
    field.matrices[offset + 8],
    field.matrices[offset + 9],
    field.matrices[offset + 10],
  ).normalize();
}

function getPadNormal(pad: BonsaiPad, point: THREE.Vector3): THREE.Vector3 {
  const yaw = new THREE.Matrix4().makeRotationY(-pad.yaw);
  const local = point.sub(new THREE.Vector3(...pad.center)).applyMatrix4(yaw);
  return new THREE.Vector3(
    local.x / pad.radii[0] ** 2,
    local.y / pad.radii[1] ** 2,
    local.z / pad.radii[2] ** 2,
  )
    .applyMatrix4(new THREE.Matrix4().makeRotationY(pad.yaw))
    .normalize();
}

describe('bonsai foliage', () => {
  it('builds deterministic quality-scaled card counts and stays within triangle budgets', () => {
    expect(leafCardsPerPad('high')).toBeGreaterThanOrEqual(150);
    expect(leafCardsPerPad('high')).toBeLessThanOrEqual(400);
    expect(leafCardsPerPad('medium')).toBe(380);
    expect(leafCardsPerPad('low')).toBe(140);
    expect(leafCardsPerPad('high', 2)).toBe(400);
    expect(leafCardsPerPad('high', 0.01)).toBe(Math.round(400 * 0.25));

    const high = buildLeafField(pads, { quality: 'high', seed: 19 });
    const highAgain = buildLeafField(pads, { quality: 'high', seed: 19 });
    expect(high.count).toBe(pads.length * 400);
    expect(high.matrices).toEqual(highAgain.matrices);
    expect(high.leaf).toEqual(highAgain.leaf);
    for (const [quality, limit] of [
      ['high', 40_000],
      ['medium', 20_000],
      ['low', 8_000],
    ] as const) {
      const field = buildLeafField(pads, { quality, seed: 19 });
      expect(field.count * 2).toBeLessThanOrEqual(limit);
    }
  });

  it('keeps card centres in each yaw-rotated pad and favors the upper canopy', () => {
    const field = buildLeafField(pads, { quality: 'high', seed: 23 });
    const upper = new Array<number>(pads.length).fill(0);
    const lower = new Array<number>(pads.length).fill(0);
    for (let index = 0; index < field.count; index += 1) {
      const padIndex = field.padIndex[index];
      const pad = pads[padIndex];
      const center = getCardCenter(field, index);
      const local = center
        .sub(new THREE.Vector3(...pad.center))
        .applyMatrix4(new THREE.Matrix4().makeRotationY(-pad.yaw));
      const distance =
        (local.x / pad.radii[0]) ** 2 +
        (local.y / pad.radii[1]) ** 2 +
        (local.z / pad.radii[2]) ** 2;
      expect(distance).toBeLessThanOrEqual(1);
      if (local.y >= 0) upper[padIndex] += 1;
      else lower[padIndex] += 1;
    }
    upper.forEach((count, index) => expect(count).toBeGreaterThan(lower[index]));
  });

  it('points at least 95 percent of cards within 35 degrees of their ellipsoid normal', () => {
    const field = buildLeafField(pads, { quality: 'high', seed: 31 });
    let aligned = 0;
    for (let index = 0; index < field.count; index += 1) {
      const pad = pads[field.padIndex[index]];
      const normal = getPadNormal(pad, getCardCenter(field, index));
      if (getCardNormal(field, index).dot(normal) > Math.cos((35 * Math.PI) / 180)) aligned += 1;
    }
    expect(aligned / field.count).toBeGreaterThanOrEqual(0.95);
  });

  it('keeps the atlas frond luminance as micro-shading instead of flattening leaves to the palette colour', () => {
    const fragment = patchLeafFragmentShader(THREE.ShaderLib.standard.fragmentShader);
    const luma = fragment.indexOf('float leafLuma');
    expect(luma).toBeGreaterThan(fragment.indexOf('#include <color_fragment>'));
    expect(luma).toBeLessThan(fragment.indexOf('diffuseColor.rgb *= leafPalette'));
  });

  it('occludes environment reflections on inner leaves so pad undersides never read as grey patches', () => {
    const fragment = patchLeafFragmentShader(THREE.ShaderLib.standard.fragmentShader);
    const lightsEnd = fragment.indexOf('#include <lights_fragment_end>');
    const occlusion = fragment.indexOf('reflectedLight.indirectSpecular *= vLeafAo');
    expect(lightsEnd).toBeGreaterThanOrEqual(0);
    expect(occlusion).toBeGreaterThan(lightsEnd);
    expect(occlusion).toBeLessThan(fragment.indexOf('vec3 outgoingLight = totalDiffuse'));
  });

  it('patches Three standard shaders with declared uniforms and instance attributes', () => {
    const vertex = patchLeafVertexShader(THREE.ShaderLib.standard.vertexShader);
    const fragment = patchLeafFragmentShader(THREE.ShaderLib.standard.fragmentShader);
    expect(vertex).not.toBe(THREE.ShaderLib.standard.vertexShader);
    expect(fragment).not.toBe(THREE.ShaderLib.standard.fragmentShader);
    expect(vertex).toContain('BONSAI_LEAF_VERTEX_PATCH');
    expect(fragment).toContain('BONSAI_LEAF_FRAGMENT_PATCH');

    for (const source of [vertex, fragment]) {
      const uniforms = new Set(source.match(/\bu[A-Z]\w*/g) ?? []);
      for (const name of uniforms) {
        expect(source).toMatch(new RegExp(`\\buniform\\s+\\w+\\s+${name}\\b`));
        expect(LEAF_UNIFORM_NAMES).toContain(name);
      }
    }
    const attributes = new Set(vertex.match(/\ba[A-Z]\w*/g) ?? []);
    for (const name of attributes)
      expect(vertex).toMatch(new RegExp(`\\battribute\\s+\\w+\\s+${name}\\b`));
  });

  it('declares every patched vertex local before its first use in the resolved shader', () => {
    // Resolve includes in three's real chunk order: defaultnormal_vertex runs before begin_vertex,
    // so a local declared in the begin_vertex patch cannot be read from the normal patch.
    const resolve = (source: string): string =>
      source.replace(/#include <(\w+)>/g, (_, name: string) =>
        resolve((THREE.ShaderChunk as Record<string, string>)[name] ?? ''),
      );
    const original = resolve(THREE.ShaderLib.standard.vertexShader);
    const patched = resolve(patchLeafVertexShader(THREE.ShaderLib.standard.vertexShader));
    const declared = new Set(
      [...patched.matchAll(/\b(?:float|vec[234])\s+(\w+)\s*=/g)]
        .map((match) => match[1])
        .filter((name) => !original.includes(name)),
    );
    expect(declared.size).toBeGreaterThan(0);
    for (const name of declared) {
      const declaration = patched.search(new RegExp(`\\b(?:float|vec[234])\\s+${name}\\s*=`));
      const firstUse = patched.search(new RegExp(`\\b${name}\\b`));
      expect(declaration, name).toBeGreaterThanOrEqual(0);
      expect(firstUse, `${name} is read before it is declared`).toBeGreaterThan(declaration);
    }
  });

  it('keeps the pad normal on back faces instead of letting the double-sided flip invert it', () => {
    const fragment = patchLeafFragmentShader(THREE.ShaderLib.standard.fragmentShader);
    const begin = fragment.indexOf('#include <normal_fragment_begin>');
    expect(begin).toBeGreaterThanOrEqual(0);
    const after = fragment.slice(begin, fragment.indexOf('#include <normal_fragment_maps>'));
    // three multiplies the normal by faceDirection for DOUBLE_SIDED; multiplying again restores
    // the outward ellipsoid normal so the canopy shades as one volume from both card sides.
    expect(after).toMatch(/#ifdef DOUBLE_SIDED\s+normal \*= faceDirection;\s+#endif/);
  });

  it('keeps wind displacement at zero when wind is disabled', () => {
    const field = buildLeafField(pads, { quality: 'low' });
    const uniforms = {
      uWindTime: { value: 0 },
      uWind: { value: 1 },
    } as Parameters<typeof updateLeafUniforms>[0];
    updateLeafUniforms(uniforms, 9.25, 0);
    expect(uniforms.uWindTime.value).toBe(9.25);
    expect(uniforms.uWind.value).toBe(0);
    expect(field.count).toBe(pads.length * 140);
  });
  it('enables alpha-to-coverage only once the leaf atlas supplies varying alpha', () => {
    // Without a map alpha is constant, fwidth folds to zero and three's ALPHA_TO_COVERAGE
    // smoothstep(alphaTest, alphaTest + fwidth(a), a) becomes a D3D X4008 divide-by-zero warning.
    const bare = createLeafMaterials({ light: false });
    expect(bare.material.alphaToCoverage).toBe(false);
    expect(bare.material.alphaTest).toBe(0);
    expect(bare.depthMaterial.alphaTest).toBe(0);
    const leafAtlas = new THREE.Texture();
    const textured = createLeafMaterials({ light: false, textures: { leafAtlas, leafThickness: new THREE.Texture() } });
    expect(textured.material.map).toBe(leafAtlas);
    expect(textured.material.alphaToCoverage).toBe(true);
    expect(textured.material.alphaTest).toBe(0.5);
    expect(textured.depthMaterial.alphaTest).toBe(0.5);
  });
});
