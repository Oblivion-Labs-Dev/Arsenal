import * as THREE from 'three';
import type { HeroQuality } from '../shared';
import { createRandom, range } from './random';
import { BONSAI_PALETTE, type BonsaiPad, type BonsaiSeason } from './types';
import type { BonsaiTextures } from './textures';

/** Options that control deterministic leaf-field generation. */
export interface LeafFieldOptions {
  quality: HeroQuality;
  foliageDensity?: number;
  seed?: number;
}

/** Packed instance transforms and per-card data for a foliage field. */
export interface LeafField {
  count: number;
  /** 16 floats per card: the card's instance matrix (tree space). */
  matrices: Float32Array;
  /** 4 floats per card: pad centre xyz, pad sway phase. */
  pad: Float32Array;
  /** 4 floats per card: atlas variant, depth AO, hue/value jitter, flutter phase. */
  leaf: Float32Array;
  /** 3 floats per pad: ellipsoid radii, indexed by padIndex. */
  padRadii: Float32Array;
  /** One yaw angle per pad, expanded to instance attributes by createLeafMesh. */
  padYaw: Float32Array;
  /** Pad index for every card. */
  padIndex: Uint16Array;
}

/** GPU uniforms consumed by the leaf shader patches. */
export interface LeafUniforms {
  uWindTime: THREE.IUniform<number>;
  uWind: THREE.IUniform<number>;
  uSeason: THREE.IUniform<number>;
  uPaletteDeep: THREE.IUniform<THREE.Color>;
  uPaletteMid: THREE.IUniform<THREE.Color>;
  uPaletteTop: THREE.IUniform<THREE.Color>;
  uAutumnDeep: THREE.IUniform<THREE.Color>;
  uAutumnMid: THREE.IUniform<THREE.Color>;
  uAutumnTop: THREE.IUniform<THREE.Color>;
  uThicknessMap: THREE.IUniform<THREE.Texture | null>;
  uHasThicknessMap: THREE.IUniform<number>;
  uAtlasInset: THREE.IUniform<number>;
}

/** Uniform identifiers injected into either leaf shader. */
export const LEAF_UNIFORM_NAMES = [
  'uWindTime', 'uWind', 'uSeason', 'uPaletteDeep', 'uPaletteMid', 'uPaletteTop',
  'uAutumnDeep', 'uAutumnMid', 'uAutumnTop', 'uThicknessMap', 'uHasThicknessMap', 'uAtlasInset',
] as const;

const QUALITY_CARD_COUNTS: Record<HeroQuality, number> = { high: 220, medium: 121, low: 55 };
const MAX_CARDS_PER_PAD = 400;
const ATLAS_INSET = 0.5 / 1024;
const GLSL_UNIFORMS = [
  'uniform float uWindTime;', 'uniform float uWind;', 'uniform float uSeason;',
  'uniform vec3 uPaletteDeep;', 'uniform vec3 uPaletteMid;', 'uniform vec3 uPaletteTop;',
  'uniform vec3 uAutumnDeep;', 'uniform vec3 uAutumnMid;', 'uniform vec3 uAutumnTop;',
  'uniform sampler2D uThicknessMap;', 'uniform float uHasThicknessMap;', 'uniform float uAtlasInset;',
].join('\n');
const GLSL_ATTRIBUTES = [
  'attribute vec4 aPadData;', 'attribute vec4 aLeafData;', 'attribute vec3 aPadRadii;', 'attribute float aPadIndex;', 'attribute float aPadYaw;',
  'vec3 leafRotateY(vec3 p, float angle) { float s = sin(angle); float c = cos(angle); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }',
].join('\n');
const GLSL_VARYINGS = [
  'varying vec2 vLeafUv;', 'varying float vLeafSun;', 'varying float vLeafAo;',
  'varying float vLeafJitter;',
].join('\n');
const GLSL_VERTEX_BEGIN = `
vec3 leafCenter = instanceMatrix[3].xyz;
vec3 leafRelative = leafRotateY(leafCenter - aPadData.xyz, -aPadYaw);
vec3 leafRadii = max(aPadRadii, vec3(0.0001));
vec3 ellipsoidNormal = leafRotateY(leafRelative / (leafRadii * leafRadii), aPadYaw);
ellipsoidNormal = normalize(ellipsoidNormal);
float leafUp = clamp(ellipsoidNormal.y * 0.5 + 0.5, 0.0, 1.0);
float localHeight = clamp((leafCenter.y - aPadData.y) / (leafRadii.y * 2.0) + 0.5, 0.0, 1.0);
vLeafSun = clamp(0.15 + 0.48 * localHeight + 0.52 * leafUp, 0.0, 1.0);
vLeafAo = clamp(aLeafData.y, 0.35, 1.0);
vLeafJitter = aLeafData.z;
float atlasColumn = mod(aLeafData.x, 2.0); float atlasRow = floor(aLeafData.x / 2.0);
vLeafUv = uv * (0.5 - 2.0 * uAtlasInset) + vec2(atlasColumn, atlasRow) * 0.5 + vec2(uAtlasInset);
float swayPeriod = 6.0 + fract(aPadData.w * 0.15915494) * 6.0;
float swayPhase = 6.2831853 * uWindTime / swayPeriod + aPadData.w;
float padAmount = 0.004 + 0.011 * clamp((leafCenter.y + length(leafCenter.xz) * 0.35) / 2.0, 0.0, 1.0);
vec3 padOffset = vec3(sin(swayPhase), 0.15 * sin(swayPhase * 0.73 + 0.8), cos(swayPhase * 0.83 + 1.2)) * padAmount * uWind;
float flutter = sin(uWindTime * 4.2 + aLeafData.w) * 0.004 * uWind;
transformed.xy += vec2(flutter, flutter * 0.34);
vec3 instanceX = instanceMatrix[0].xyz; vec3 instanceY = instanceMatrix[1].xyz; vec3 instanceZ = instanceMatrix[2].xyz;
transformed += vec3(dot(padOffset, instanceX) / max(dot(instanceX, instanceX), 0.0001), dot(padOffset, instanceY) / max(dot(instanceY, instanceY), 0.0001), dot(padOffset, instanceZ) / max(dot(instanceZ, instanceZ), 0.0001));
#ifdef USE_MAP
vMapUv = vMapUv * (0.5 - 2.0 * uAtlasInset) + vec2(atlasColumn, atlasRow) * 0.5 + vec2(uAtlasInset);
#endif
`;

/** Return cards per pad for a quality and clamped density multiplier. */
export function leafCardsPerPad(quality: HeroQuality, foliageDensity = 1): number {
  const density = Number.isFinite(foliageDensity) ? THREE.MathUtils.clamp(foliageDensity, 0.25, 2) : 1;
  return Math.min(MAX_CARDS_PER_PAD, Math.max(1, Math.round(QUALITY_CARD_COUNTS[quality] * density)));
}

/** Build a deterministic, top-heavy ellipsoid leaf field from bonsai pads. */
export function buildLeafField(pads: BonsaiPad[], options: LeafFieldOptions): LeafField {
  const perPad = leafCardsPerPad(options.quality, options.foliageDensity);
  const count = pads.length * perPad;
  const matrices = new Float32Array(count * 16);
  const padData = new Float32Array(count * 4);
  const leaf = new Float32Array(count * 4);
  const padRadii = new Float32Array(pads.length * 3);
  const padYaw = new Float32Array(pads.length);
  const padIndex = new Uint16Array(count);
  const random = createRandom(options.seed ?? 7);
  const object = new THREE.Object3D();
  const normal = new THREE.Vector3();
  const jitterAxis = new THREE.Vector3();
  const jitterSample = new THREE.Vector3();
  const jitteredNormal = new THREE.Vector3();
  const baseRotation = new THREE.Quaternion();
  const rollRotation = new THREE.Quaternion();

  pads.forEach((pad, padNumber) => {
    const [rx, ry, rz] = pad.radii;
    padRadii.set(pad.radii, padNumber * 3);
    padYaw[padNumber] = pad.yaw;
    const swayPhase = range(random, 0, Math.PI * 2);
    const yaw = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, pad.yaw);
    const padCenter = new THREE.Vector3(...pad.center);
    for (let card = 0; card < perPad; card += 1) {
      const index = padNumber * perPad + card;
      const top = random() < 0.72;
      const y = top ? range(random, 0.015, 0.94) : -range(random, 0.015, 0.66);
      const azimuth = range(random, 0, Math.PI * 2);
      const radial = Math.sqrt(Math.max(0, 1 - y * y)) * Math.pow(random(), 0.42) * 0.985;
      const unit = new THREE.Vector3(Math.cos(azimuth) * radial, y * Math.pow(random(), 0.18), Math.sin(azimuth) * radial);
      if (unit.lengthSq() > 0.99) unit.normalize().multiplyScalar(0.994);
      const local = new THREE.Vector3(unit.x * rx, unit.y * ry, unit.z * rz);
      const center = local.applyQuaternion(yaw).add(padCenter);
      normal.set(unit.x / rx, unit.y / ry, unit.z / rz).normalize().applyQuaternion(yaw);
      jitterSample.set(range(random, -1, 1), range(random, -1, 1), range(random, -1, 1));
      jitterAxis.crossVectors(normal, jitterSample);
      if (jitterAxis.lengthSq() < 0.0001) jitterAxis.crossVectors(normal, jitterSample.set(1, 0, 0));
      jitterAxis.normalize();
      jitteredNormal.copy(normal).applyAxisAngle(jitterAxis, range(random, -Math.PI / 7.2, Math.PI / 7.2));
      baseRotation.setFromUnitVectors(new THREE.Vector3(0, 0, 1), jitteredNormal);
      rollRotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), range(random, 0, Math.PI * 2));
      object.position.copy(center);
      object.quaternion.copy(baseRotation).multiply(rollRotation);
      const size = range(random, 0.07, 0.11);
      object.scale.set(size, size * range(random, 0.65, 0.88), 1);
      object.updateMatrix();
      object.matrix.toArray(matrices, index * 16);
      padData.set([pad.center[0], pad.center[1], pad.center[2], swayPhase], index * 4);
      const depthAo = THREE.MathUtils.clamp(0.35 + 0.65 * Math.sqrt(unit.length()) - (unit.y < 0 ? 0.16 : 0), 0.35, 1);
      leaf.set([Math.floor(random() * 4), depthAo, range(random, -1, 1), range(random, 0, Math.PI * 2)], index * 4);
      padIndex[index] = padNumber;
    }
  });
  return { count, matrices, pad: padData, leaf, padRadii, padYaw, padIndex };
}

/** Create the unit leaf quad; per-instance matrices provide its small physical size. */
export function createLeafGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

/** Create the atlas leaf material, cut-out shadow material and their shared uniforms. */
export function createLeafMaterials(options: {
  light: boolean;
  season?: BonsaiSeason;
  textures?: Pick<BonsaiTextures, 'leafAtlas' | 'leafThickness'>;
}): { material: THREE.MeshStandardMaterial; depthMaterial: THREE.MeshDepthMaterial; uniforms: LeafUniforms } {
  const palette = options.light ? BONSAI_PALETTE.light : BONSAI_PALETTE.dark;
  const autumn = BONSAI_PALETTE.autumn;
  const uniforms: LeafUniforms = {
    uWindTime: { value: 0 }, uWind: { value: 0 }, uSeason: { value: options.season === 'autumn' ? 1 : 0 },
    uPaletteDeep: { value: new THREE.Color(palette.leafDeep) }, uPaletteMid: { value: new THREE.Color(palette.leafMid) },
    uPaletteTop: { value: new THREE.Color(palette.leafTop) }, uAutumnDeep: { value: new THREE.Color(autumn.leafDeep) },
    uAutumnMid: { value: new THREE.Color(autumn.leafMid) }, uAutumnTop: { value: new THREE.Color(autumn.leafTop) },
    uThicknessMap: { value: options.textures?.leafThickness ?? null },
    uHasThicknessMap: { value: options.textures?.leafThickness ? 1 : 0 }, uAtlasInset: { value: ATLAS_INSET },
  };
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff', map: options.textures?.leafAtlas, roughness: 0.75, alphaTest: 0.5,
    alphaToCoverage: true, side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = patchLeafVertexShader(shader.vertexShader);
    shader.fragmentShader = patchLeafFragmentShader(shader.fragmentShader);
  };
  material.customProgramCacheKey = () => 'arsenal-bonsai-leaf-v1';
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: options.textures?.leafAtlas, alphaTest: 0.5, side: THREE.DoubleSide });
  depthMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uniforms.uWindTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.uniforms.uAtlasInset = uniforms.uAtlasInset;
    shader.vertexShader = patchLeafVertexShader(shader.vertexShader);
  };
  depthMaterial.customProgramCacheKey = () => 'arsenal-bonsai-leaf-depth-v1';
  return { material, depthMaterial, uniforms };
}

/** Build the InstancedMesh and attach the per-card attributes required by both shaders. */
export function createLeafMesh(field: LeafField, pads: BonsaiPad[], materials: ReturnType<typeof createLeafMaterials>): THREE.InstancedMesh {
  if (field.padIndex.some((index) => index >= pads.length)) throw new RangeError('Leaf field references a pad that does not exist.');
  const geometry = createLeafGeometry();
  const instanceRadii = new Float32Array(field.count * 3);
  const instanceYaw = new Float32Array(field.count);
  for (let index = 0; index < field.count; index += 1) {
    const padNumber = field.padIndex[index];
    instanceRadii.set(field.padRadii.subarray(padNumber * 3, padNumber * 3 + 3), index * 3);
    instanceYaw[index] = field.padYaw[padNumber];
  }
  geometry.setAttribute('aPadData', new THREE.InstancedBufferAttribute(field.pad, 4));
  geometry.setAttribute('aLeafData', new THREE.InstancedBufferAttribute(field.leaf, 4));
  geometry.setAttribute('aPadRadii', new THREE.InstancedBufferAttribute(instanceRadii, 3));
  geometry.setAttribute('aPadIndex', new THREE.InstancedBufferAttribute(field.padIndex, 1));
  geometry.setAttribute('aPadYaw', new THREE.InstancedBufferAttribute(instanceYaw, 1));
  const mesh = new THREE.InstancedMesh(geometry, materials.material, field.count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < field.count; index += 1) {
    matrix.fromArray(field.matrices, index * 16);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.customDepthMaterial = materials.depthMaterial;
  mesh.frustumCulled = false;
  return mesh;
}

/** Update only numeric wind uniforms; this allocates no frame data. */
export function updateLeafUniforms(uniforms: LeafUniforms, time: number, wind: number): void {
  uniforms.uWindTime.value = time;
  uniforms.uWind.value = wind;
}

/** Inject per-card attributes, atlas addressing, ellipsoid normals and wind into a vertex shader. */
export function patchLeafVertexShader(source: string): string {
  let shader = source.replace('#include <common>', `#include <common>\n${GLSL_UNIFORMS}\n${GLSL_ATTRIBUTES}\n${GLSL_VARYINGS}`);
  shader = shader.replace('#include <begin_vertex>', `#include <begin_vertex>\n// BONSAI_LEAF_VERTEX_PATCH\n${GLSL_VERTEX_BEGIN}`);
  shader = shader.replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>\nvec3 padNormalView = normalize(normalMatrix * ellipsoidNormal);\ntransformedNormal = normalize(mix(transformedNormal, padNormalView, 0.85));`);
  return shader;
}

/** Inject palette shading, per-card AO and thickness-based warm backlight into a fragment shader. */
export function patchLeafFragmentShader(source: string): string {
  let shader = source.replace('#include <common>', `#include <common>\n// BONSAI_LEAF_FRAGMENT_PATCH\n${GLSL_UNIFORMS}\n${GLSL_VARYINGS}`);
  // Leaf normals come from the pad ellipsoid (foliage-normal trick), so both card faces must keep
  // the outward normal: undo three's DOUBLE_SIDED faceDirection flip (faceDirection is +-1).
  shader = shader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
#ifdef DOUBLE_SIDED
normal *= faceDirection;
#endif`);
  shader = shader.replace('#include <color_fragment>', `#include <color_fragment>
float leafSunniness = smoothstep(0.08, 0.94, vLeafSun);
vec3 summerLeaf = mix(uPaletteDeep, uPaletteMid, smoothstep(0.04, 0.58, leafSunniness));
summerLeaf = mix(summerLeaf, uPaletteTop, smoothstep(0.48, 0.98, leafSunniness));
vec3 autumnLeaf = mix(uAutumnDeep, uAutumnMid, smoothstep(0.04, 0.58, leafSunniness));
autumnLeaf = mix(autumnLeaf, uAutumnTop, smoothstep(0.48, 0.98, leafSunniness));
vec3 leafPalette = mix(summerLeaf, autumnLeaf, clamp(uSeason, 0.0, 1.0));
leafPalette *= 1.0 + vLeafJitter * 0.06;
leafPalette.r += vLeafJitter * 0.01;
leafPalette.g -= vLeafJitter * 0.012;
diffuseColor.rgb *= leafPalette;`);
  shader = shader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.indirectDiffuse *= vLeafAo;
reflectedLight.directDiffuse *= mix(1.0, vLeafAo, 0.35);
float leafBacklight = 0.0;
#if NUM_DIR_LIGHTS > 0
vec3 leafViewDir = normalize(vViewPosition);
vec3 leafLightDir = normalize(directionalLights[0].direction);
float leafWrap = pow(max((dot(normal, leafLightDir) + 0.35) / 1.35, 0.0), 2.0);
reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color * leafWrap * 0.12;
leafBacklight = pow(max(dot(leafLightDir, -leafViewDir), 0.0), 1.5);
#endif
float leafThickness = uHasThicknessMap > 0.5 ? texture2D(uThicknessMap, vLeafUv).r : 0.0;
`);
  shader = shader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;', `vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
outgoingLight += vec3(0.78, 0.62, 0.22) * leafBacklight * leafThickness * 0.42;`);
  return shader;
}
