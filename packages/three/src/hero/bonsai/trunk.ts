import * as THREE from 'three';
import type { HeroQuality } from '../shared';
import { BONSAI_PALETTE, type BonsaiBranch, type BonsaiSkeleton, type V3 } from './types';
import type { BonsaiTextures } from './textures';

// Trunk rings/sides per quality; branches scale down from these by length and order.
const SEGMENTS: Record<HeroQuality, number> = { high: 34, medium: 22, low: 12 };
const RADIAL: Record<HeroQuality, number> = { high: 40, medium: 28, low: 16 };
const vec = (point: V3) => new THREE.Vector3(...point);
const clamp = THREE.MathUtils.clamp;

function frameVectors(tangents: THREE.Vector3[]) {
  const normals: THREE.Vector3[] = [];
  const binormals: THREE.Vector3[] = [];
  let normal = new THREE.Vector3().crossVectors(tangents[0], Math.abs(tangents[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
  for (let i = 0; i < tangents.length; i++) {
    if (i > 0) {
      const axis = new THREE.Vector3().crossVectors(tangents[i - 1], tangents[i]);
      if (axis.lengthSq() > 1e-10) normal.applyAxisAngle(axis.normalize(), Math.acos(clamp(tangents[i - 1].dot(tangents[i]), -1, 1)));
      normal.addScaledVector(tangents[i], -normal.dot(tangents[i])).normalize();
    }
    normals.push(normal.clone());
    binormals.push(new THREE.Vector3().crossVectors(tangents[i], normal).normalize());
  }
  return { normals, binormals };
}

function interpolateRadius(branch: BonsaiBranch, t: number): number {
  const sample = t * (branch.radii.length - 1);
  const i = Math.min(branch.radii.length - 2, Math.floor(sample));
  return THREE.MathUtils.lerp(branch.radii[i], branch.radii[i + 1], sample - i);
}

function branchCurve(branch: BonsaiBranch): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(branch.points.map(vec), false, 'centripetal');
}

export function buildBonsaiTrunk(skeleton: BonsaiSkeleton, quality: HeroQuality): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const bark: number[] = [];
  const indices: number[] = [];
  const seams: Array<[number, number]> = [];
  const shari = skeleton.shari;
  const append = (branch: BonsaiBranch) => {
    const curve = branchCurve(branch);
    const parent = branch.attach ? skeleton.branches[branch.attach.parent] : null;
    const startTangent = curve.getTangentAt(0).normalize();
    const start = curve.getPointAt(0);
    if (parent) start.addScaledVector(startTangent, -parent.radii[branch.attach!.index] * 0.78);
    const length = curve.getLength();
    const segments = Math.max(4, Math.round(SEGMENTS[quality] * (branch.kind === 'trunk' ? 1.6 : Math.max(0.3, Math.min(1, length / 0.6)))));
    const radius0 = branch.radii[0];
    const radial = branch.kind === 'trunk' ? RADIAL[quality] : branch.kind === 'root' ? Math.max(8, Math.round(RADIAL[quality] * 0.5)) : branch.order <= 1 ? Math.max(8, Math.round(RADIAL[quality] * 0.45)) : branch.order === 2 ? Math.max(6, Math.round(RADIAL[quality] * 0.3)) : Math.max(5, Math.round(RADIAL[quality] * 0.2));
    const lastIndex = branch.points.length - 1;
    const continuesAtTip = skeleton.branches.some((other) => other.attach?.parent === branch.id && other.attach.index === lastIndex && other.kind === 'branch');
    const points: THREE.Vector3[] = [];
    const tangents: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push(i === 0 && parent ? start.clone() : curve.getPointAt(t));
      tangents.push(curve.getTangentAt(t).normalize());
    }
    const frames = frameVectors(tangents);
    const baseIndex = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let radius = interpolateRadius(branch, t);
      if (branch.kind === 'trunk') radius *= 1 + 0.34 * Math.exp(-t * 16);
      if (branch.kind === 'root') radius *= 1 + 0.18 * Math.sin(t * Math.PI);
      if (parent && i === 0) radius = Math.max(radius, parent.radii[branch.attach!.index] * 0.55);
      // A tiny terminal reduction produces a sealed, rounded tip while keeping a finite normal.
      if (i === segments && !continuesAtTip) radius *= 0.08;
      const distance = t * length;
      const shariT = branch.kind === 'trunk' ? t : -1;
      for (let side = 0; side <= radial; side++) {
        const u = side / radial;
        const angle = u * Math.PI * 2;
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const normal = frames.normals[i].clone().multiplyScalar(ca).addScaledVector(frames.binormals[i], sa).normalize();
        const ridge = branch.kind === 'trunk' ? 0.045 * Math.sin(angle * 5 + t * 8) + 0.022 * Math.sin(angle * 2 - t * 4) : 0.018 * Math.sin(angle * 4 + t * 5);
        const knot = branch.kind === 'trunk' ? 0.035 * Math.exp(-Math.pow((t - 0.48) / 0.065, 2)) * (0.5 + 0.5 * Math.cos(angle * 2)) : 0;
        const oval = 1 + 0.025 * Math.cos(angle * 2 + t * 1.8);
        const displacedRadius = radius * oval * (1 + ridge + knot);
        const point = points[i].clone().addScaledVector(normal, displacedRadius);
        const height = point.y;
        let ao = 0.68 + 0.32 * clamp(height / 1.25, 0, 1);
        ao *= 0.76 + 0.24 * Math.max(0, normal.y * 0.5 + 0.5);
        if (i < 2 && branch.attach) ao *= 0.72 + i * 0.12;
        if (branch.kind === 'root') ao *= 0.65 + t * 0.35;
        for (const pad of skeleton.pads) {
          if (point.y < pad.center[1]) {
            const dx = (point.x - pad.center[0]) / pad.radii[0];
            const dz = (point.z - pad.center[2]) / pad.radii[2];
            if (dx * dx + dz * dz < 1.25) ao *= 0.78;
          }
        }
        let dead = branch.kind === 'jin' ? 1 : 0;
        if (branch.id === shari.branch && shariT >= shari.from && shariT <= shari.to) {
          const centerAngle = Math.atan2(sa, ca);
          let delta = Math.atan2(Math.sin(centerAngle - shari.angle - t * 3), Math.cos(centerAngle - shari.angle - t * 3));
          const edge = Math.abs(delta) - shari.halfWidth;
          dead = Math.max(dead, 1 - clamp((edge + 0.035) / 0.07, 0, 1));
        }
        positions.push(point.x, point.y, point.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u, distance / Math.max(0.01, 2 * Math.PI * radius0));
        bark.push(ao, dead);
      }
    }
    for (let i = 0; i <= segments; i++) seams.push([baseIndex + i * (radial + 1), baseIndex + i * (radial + 1) + radial]);
    for (let i = 0; i < segments; i++) for (let side = 0; side < radial; side++) {
      const a = baseIndex + i * (radial + 1) + side;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    // Flat center caps close the start and tip. The start cap is buried in its parent where joined.
    for (const atEnd of [false, true]) {
      const sourceRing = baseIndex + (atEnd ? segments : 0) * (radial + 1);
      const ring = positions.length / 3;
      for (let side = 0; side <= radial; side++) {
        const v = sourceRing + side;
        positions.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
        uvs.push(uvs[v * 2], uvs[v * 2 + 1]);
        bark.push(bark[v * 2], bark[v * 2 + 1]);
        normals.push(0, 0, 0);
      }
      const center = positions.length / 3;
      const p = points[atEnd ? segments : 0];
      positions.push(p.x, p.y, p.z);
      const n = tangents[atEnd ? segments : 0].clone().multiplyScalar(atEnd ? 1 : -1);
      normals.push(n.x, n.y, n.z);
      uvs.push(0.5, atEnd ? length / Math.max(0.01, 2 * Math.PI * radius0) : 0);
      bark.push(0.7, branch.kind === 'jin' ? 1 : 0);
      for (let side = 0; side < radial; side++) {
        const a = ring + side;
        const b = ring + side + 1;
        indices.push(center, atEnd ? a : b, atEnd ? b : a);
      }
    }
  };
  for (const branch of skeleton.branches) append(branch);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aBark', new THREE.Float32BufferAttribute(bark, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Each ring duplicates its first vertex at u=1 for the UV wrap; average the pair so the
  // seam shades as one smooth surface.
  const normalAttribute = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (const [a, b] of seams) {
    const x = normalAttribute.getX(a) + normalAttribute.getX(b);
    const y = normalAttribute.getY(a) + normalAttribute.getY(b);
    const z = normalAttribute.getZ(a) + normalAttribute.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    normalAttribute.setXYZ(a, x / l, y / l, z / l);
    normalAttribute.setXYZ(b, x / l, y / l, z / l);
  }
  geometry.computeBoundingSphere();
  return geometry;
}

export function countTriangles(geometry: THREE.BufferGeometry): number {
  return geometry.index ? geometry.index.count / 3 : (geometry.getAttribute('position')?.count ?? 0) / 3;
}

type BarkTextureSet = Pick<BonsaiTextures, 'barkAlbedo' | 'barkNormal' | 'barkRoughness'>;

export function patchBarkShader(vertex: string, fragment: string, textured = true): { vertex: string; fragment: string } {
  const declarations = textured
    ? 'uniform sampler2D uBarkAlbedo;\nuniform sampler2D uBarkNormal;\nuniform sampler2D uBarkRoughness;\n'
    : '';
  const sampling = textured ? `
    vec3 barkWeights = pow(abs(normalize(vBarkWorldNormal)), vec3(4.0));
    barkWeights /= max(dot(barkWeights, vec3(1.0)), 0.0001);
    vec3 barkColorTri = texture2D(uBarkAlbedo, vBarkWorldPosition.yz * 3.0).rgb * barkWeights.x + texture2D(uBarkAlbedo, vBarkWorldPosition.xz * 3.0).rgb * barkWeights.y + texture2D(uBarkAlbedo, vBarkWorldPosition.xy * 3.0).rgb * barkWeights.z;
    vec3 barkNormalX = texture2D(uBarkNormal, vBarkWorldPosition.yz * 3.0).xyz * 2.0 - 1.0;
    vec3 barkNormalY = texture2D(uBarkNormal, vBarkWorldPosition.xz * 3.0).xyz * 2.0 - 1.0;
    vec3 barkNormalZ = texture2D(uBarkNormal, vBarkWorldPosition.xy * 3.0).xyz * 2.0 - 1.0;
    float barkRoughTri = texture2D(uBarkRoughness, vBarkWorldPosition.yz * 3.0).r * barkWeights.x + texture2D(uBarkRoughness, vBarkWorldPosition.xz * 3.0).r * barkWeights.y + texture2D(uBarkRoughness, vBarkWorldPosition.xy * 3.0).r * barkWeights.z;
  ` : 'vec3 barkColorTri = vec3(1.0);\n';
  const fragmentDeclarations = `varying vec3 vBarkWorldPosition;\nvarying vec3 vBarkWorldNormal;\nvarying vec2 vBark;\nuniform vec3 uBarkTint;\nuniform vec3 uShariTint;\n${declarations}`;
  const nextVertex = vertex
    .replace('#include <common>', '#include <common>\nattribute vec2 aBark;\nvarying vec3 vBarkWorldPosition;\nvarying vec3 vBarkWorldNormal;\nvarying vec2 vBark;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvBarkWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvBarkWorldNormal = normalize(mat3(modelMatrix) * objectNormal);\nvBark = aBark;');
  let nextFragment = fragment.replace('#include <common>', `#include <common>\n${fragmentDeclarations}`);
  nextFragment = nextFragment.replace('#include <color_fragment>', `#include <color_fragment>\n${sampling}\ndiffuseColor.rgb *= uBarkTint * barkColorTri * mix(0.58, 1.0, clamp(vBark.x, 0.0, 1.0));\ndiffuseColor.rgb = mix(diffuseColor.rgb, uShariTint, clamp(vBark.y, 0.0, 1.0));`);
  nextFragment = nextFragment.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${textured ? 'roughnessFactor = mix(barkRoughTri, roughnessFactor, 0.25);' : ''}\nroughnessFactor = mix(roughnessFactor, 0.6, clamp(vBark.y, 0.0, 1.0));`);
  nextFragment = nextFragment.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${textured ? 'vec3 triWorld = normalize(vec3(barkNormalX.z * sign(vBarkWorldNormal.x), barkNormalX.y, barkNormalX.x) * barkWeights.x + vec3(barkNormalY.x, barkNormalY.z * sign(vBarkWorldNormal.y), barkNormalY.y) * barkWeights.y + vec3(barkNormalZ.x, barkNormalZ.y, barkNormalZ.z * sign(vBarkWorldNormal.z)) * barkWeights.z);\nvec3 triView = normalize(mat3(viewMatrix) * triWorld);\nnormal = normalize(mix(normal, triView, 0.22 * mix(1.0, 0.25, clamp(vBark.y, 0.0, 1.0))));' : ''}`);
  return { vertex: nextVertex, fragment: nextFragment };
}

export function createBarkMaterial(options: { light: boolean; textures?: BarkTextureSet }): THREE.MeshStandardMaterial {
  const palette = options.light ? BONSAI_PALETTE.light : BONSAI_PALETTE.dark;
  const barkTint = new THREE.Color(palette.bark);
  const shariTint = new THREE.Color(palette.shari);
  const textured = Boolean(options.textures);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.015 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBarkTint = { value: barkTint };
    shader.uniforms.uShariTint = { value: shariTint };
    if (options.textures) {
      shader.uniforms.uBarkAlbedo = { value: options.textures.barkAlbedo };
      shader.uniforms.uBarkNormal = { value: options.textures.barkNormal };
      shader.uniforms.uBarkRoughness = { value: options.textures.barkRoughness };
    }
    const patched = patchBarkShader(shader.vertexShader, shader.fragmentShader, textured);
    shader.vertexShader = patched.vertex;
    shader.fragmentShader = patched.fragment;
  };
  material.customProgramCacheKey = () => `arsenal-bonsai-bark-v1-${options.light ? 'light' : 'dark'}-${textured ? 'textures' : 'plain'}`;
  return material;
}
