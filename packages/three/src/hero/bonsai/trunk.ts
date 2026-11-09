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
  let normal = new THREE.Vector3()
    .crossVectors(
      tangents[0],
      Math.abs(tangents[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0),
    )
    .normalize();
  for (let i = 0; i < tangents.length; i++) {
    if (i > 0) {
      const axis = new THREE.Vector3().crossVectors(tangents[i - 1], tangents[i]);
      if (axis.lengthSq() > 1e-10)
        normal.applyAxisAngle(
          axis.normalize(),
          Math.acos(clamp(tangents[i - 1].dot(tangents[i]), -1, 1)),
        );
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

/** Tube radius before bark relief: the skeleton radius plus the trunk's root flare and a root's mid swell. */
export function tubeRadius(branch: BonsaiBranch, t: number): number {
  let radius = interpolateRadius(branch, t);
  if (branch.kind === 'trunk') radius *= 1 + 0.6 * Math.exp(-t * 14);
  if (branch.kind === 'root') radius *= 1 + 0.18 * Math.sin(t * Math.PI);
  return radius;
}

const TRUNK_SINK = 0.08;

/**
 * Where a joined branch's tube starts: pulled back along its tangent so the start cap sits inside the
 * parent, never on the far side of it. Living branches start as a sleeve of 0.55 parent radii; jin and
 * roots keep their own radius so they read as needles and surface ridges, not horns and bulbs.
 */
export function branchStartSleeve(
  skeleton: BonsaiSkeleton,
  branch: BonsaiBranch,
): { center: THREE.Vector3; tangent: THREE.Vector3; radius: number } {
  const curve = branchCurve(branch);
  const tangent = curve.getTangentAt(0).normalize();
  const center = curve.getPointAt(0);
  if (!branch.attach) return { center, tangent, radius: branch.radii[0] };
  const parentRadius = skeleton.branches[branch.attach.parent].radii[branch.attach.index];
  center.addScaledVector(tangent, -parentRadius * 0.3);
  // Never wider than 0.7 parent radii, so even a near-even fork keeps its cap rim under the bark.
  return {
    center,
    tangent,
    radius: Math.min(
      parentRadius * 0.7,
      branch.kind === 'branch' ? Math.max(branch.radii[0], parentRadius * 0.55) : branch.radii[0],
    ),
  };
}

export function buildBonsaiTrunk(
  skeleton: BonsaiSkeleton,
  quality: HeroQuality,
): THREE.BufferGeometry {
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
    const start = branchStartSleeve(skeleton, branch).center;
    const length = curve.getLength();
    const segments = Math.max(
      4,
      Math.round(
        SEGMENTS[quality] *
          (branch.kind === 'trunk' ? 1.6 : Math.max(0.3, Math.min(1, length / 0.6))),
      ),
    );
    const radius0 = branch.radii[0];
    const radial =
      branch.kind === 'trunk'
        ? RADIAL[quality]
        : branch.kind === 'root'
          ? Math.max(8, Math.round(RADIAL[quality] * 0.5))
          : branch.order <= 1
            ? Math.max(8, Math.round(RADIAL[quality] * 0.45))
            : branch.order === 2
              ? Math.max(6, Math.round(RADIAL[quality] * 0.3))
              : Math.max(5, Math.round(RADIAL[quality] * 0.2));
    const lastIndex = branch.points.length - 1;
    const continuesAtTip = skeleton.branches.some(
      (other) =>
        other.attach?.parent === branch.id &&
        other.attach.index === lastIndex &&
        other.kind === 'branch',
    );
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
      let radius = tubeRadius(branch, t);
      if (parent && i === 0) radius = branchStartSleeve(skeleton, branch).radius;
      // Free tips taper over their last quarter to a sealed point (0.08 keeps a finite normal), never a blunt stub.
      if (!continuesAtTip && t > 0.75) radius *= 1 - 0.92 * Math.pow((t - 0.75) / 0.25, 1.5);
      const distance = t * length;
      const shariT = branch.kind === 'trunk' ? t : -1;
      for (let side = 0; side <= radial; side++) {
        const u = side / radial;
        const angle = u * Math.PI * 2;
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const normal = frames.normals[i]
          .clone()
          .multiplyScalar(ca)
          .addScaledVector(frames.binormals[i], sa)
          .normalize();
        // Bark plates: |sin|^0.45 gives broad rounded plates split by sharp V cracks, twisting
        // slowly up the trunk with an irregular wobble so the cracks never line up like fluting.
        const plate = (frequency: number, twist: number) =>
          Math.pow(
            Math.abs(Math.sin(angle * frequency + t * twist + 0.7 * Math.sin(t * 11 + angle * 2))),
            0.45,
          ) - 0.75;
        const ridge =
          branch.kind === 'trunk'
            ? 0.16 * plate(3.5, 6) + 0.02 * Math.sin(angle * 2 - t * 4)
            : branch.kind === 'branch' && branch.order <= 1
              ? 0.06 * plate(2, 4)
              : 0.018 * Math.sin(angle * 4 + t * 5);
        const knot =
          branch.kind === 'trunk'
            ? 0.035 * Math.exp(-Math.pow((t - 0.48) / 0.065, 2)) * (0.5 + 0.5 * Math.cos(angle * 2))
            : 0;
        const oval = 1 + 0.025 * Math.cos(angle * 2 + t * 1.8);
        const displacedRadius = radius * oval * (1 + ridge + knot);
        const point = points[i].clone().addScaledVector(normal, displacedRadius);
        // The trunk's first ring sinks below the soil so its base never shows a flat floating rim.
        if (branch.kind === 'trunk' && i === 0) point.y -= TRUNK_SINK;
        const height = point.y;
        let ao = 0.68 + 0.32 * clamp(height / 1.25, 0, 1);
        ao *= 0.76 + 0.24 * Math.max(0, normal.y * 0.5 + 0.5);
        if (i < 2 && branch.attach) ao *= 0.72 + i * 0.12;
        if (branch.kind === 'root') ao *= 0.82 + t * 0.18;
        // Canopy shade darkens bark once, however many pads overlap above it, so the trunk never goes black.
        const shaded = skeleton.pads.some((pad) => {
          if (point.y >= pad.center[1]) return false;
          const dx = (point.x - pad.center[0]) / pad.radii[0];
          const dz = (point.z - pad.center[2]) / pad.radii[2];
          return dx * dx + dz * dz < 1.25;
        });
        if (shaded) ao *= 0.8;
        let dead = branch.kind === 'jin' ? 1 : 0;
        if (branch.id === shari.branch && shariT >= shari.from && shariT <= shari.to) {
          const centerAngle = Math.atan2(sa, ca);
          let delta = Math.atan2(
            Math.sin(centerAngle - shari.angle - t * 1.4),
            Math.cos(centerAngle - shari.angle - t * 1.4),
          );
          const edge = Math.abs(delta) - shari.halfWidth;
          dead = Math.max(dead, 1 - clamp((edge + 0.035) / 0.07, 0, 1));
        }
        positions.push(point.x, point.y, point.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u, distance / Math.max(0.01, 2 * Math.PI * radius0));
        bark.push(ao, dead);
      }
    }
    for (let i = 0; i <= segments; i++)
      seams.push([baseIndex + i * (radial + 1), baseIndex + i * (radial + 1) + radial]);
    for (let i = 0; i < segments; i++)
      for (let side = 0; side < radial; side++) {
        const a = baseIndex + i * (radial + 1) + side;
        const b = a + radial + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
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
      positions.push(p.x, p.y - (branch.kind === 'trunk' && !atEnd ? TRUNK_SINK : 0), p.z);
      const n = tangents[atEnd ? segments : 0].clone().multiplyScalar(atEnd ? 1 : -1);
      normals.push(n.x, n.y, n.z);
      uvs.push(0.5, atEnd ? length / Math.max(0.01, 2 * Math.PI * radius0) : 0);
      bark.push(0.7, branch.kind === 'jin' ? 1 : 0);
      for (let side = 0; side < radial; side++) {
        const a = ring + side;
        const b = ring + side + 1;
        indices.push(center, atEnd ? b : a, atEnd ? a : b);
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
  return geometry.index
    ? geometry.index.count / 3
    : (geometry.getAttribute('position')?.count ?? 0) / 3;
}

type BarkTextureSet = Pick<BonsaiTextures, 'barkAlbedo' | 'barkNormal' | 'barkRoughness'>;

/**
 * Bark tiles in the tube's own UVs: u wraps the circumference, v runs along the branch in
 * circumference units. Two repeats around every branch keep the plates the same shape on the trunk
 * and the twigs and keep the grain following the branch, instead of a world-space projection that
 * blends three smeared copies on a thin curved tube.
 */
export const BARK_REPEAT_AROUND = 2;
/** A finer pass of the same albedo adds grain inside the plates. */
export const BARK_GRAIN_REPEAT = 2.7;
/** A low-frequency pass of the albedo carves large furrows and ridges across the trunk. */
export const BARK_FURROW_REPEAT = 0.37;
export const BARK_NORMAL_SCALE = 2;

export function patchBarkShader(
  vertex: string,
  fragment: string,
  textured = true,
): { vertex: string; fragment: string } {
  const grain = BARK_GRAIN_REPEAT.toFixed(2);
  const furrow = BARK_FURROW_REPEAT.toFixed(2);
  const sampling = textured
    ? `
    vec3 barkColorTri = diffuseColor.rgb;
    float barkLuma = dot(barkColorTri, vec3(0.299, 0.587, 0.114));
    float barkGrain = dot(texture2D(map, vMapUv * ${grain} + vec2(0.37, 0.11)).rgb, vec3(0.299, 0.587, 0.114));
    // Deepen the furrows (dark albedo = crevice) and add fine grain inside the plates.
    float barkFurrow = dot(texture2D(map, vMapUv * ${furrow} + vec2(0.61, 0.23)).rgb, vec3(0.299, 0.587, 0.114));
    barkColorTri *= mix(0.3, 1.15, smoothstep(0.12, 0.5, barkLuma)) * mix(0.72, 1.22, barkGrain) * mix(0.42, 1.3, smoothstep(0.06, 0.3, barkFurrow));
    diffuseColor.rgb = vec3(1.0);
  `
    : 'vec3 barkColorTri = vec3(1.0);\n';
  const fragmentDeclarations =
    'varying vec2 vBark;\nuniform vec3 uBarkTint;\nuniform vec3 uShariTint;\n';
  const nextVertex = vertex
    .replace('#include <common>', '#include <common>\nattribute vec2 aBark;\nvarying vec2 vBark;')
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvBark = aBark;');
  let nextFragment = fragment.replace(
    '#include <common>',
    `#include <common>\n${fragmentDeclarations}`,
  );
  nextFragment = nextFragment.replace(
    '#include <color_fragment>',
    `#include <color_fragment>\n${sampling}\ndiffuseColor.rgb *= uBarkTint * barkColorTri * mix(0.58, 1.0, clamp(vBark.x, 0.0, 1.0));\nvec3 shariGrain = uShariTint * (0.42 + 0.5 * dot(barkColorTri, vec3(0.299, 0.587, 0.114))) * mix(0.7, 1.0, clamp(vBark.x, 0.0, 1.0));
diffuseColor.rgb = mix(diffuseColor.rgb, shariGrain, clamp(vBark.y, 0.0, 1.0));`,
  );
  // Shari is bleached, smoother deadwood: drier and with flatter relief than the living bark.
  nextFragment = nextFragment.replace(
    '#include <roughnessmap_fragment>',
    '#include <roughnessmap_fragment>\nroughnessFactor = max(roughnessFactor, 0.7);\nroughnessFactor = mix(roughnessFactor, 0.8, clamp(vBark.y, 0.0, 1.0));',
  );
  return { vertex: nextVertex, fragment: nextFragment };
}

export function createBarkMaterial(options: {
  light: boolean;
  textures?: BarkTextureSet;
}): THREE.MeshStandardMaterial {
  const palette = options.light ? BONSAI_PALETTE.light : BONSAI_PALETTE.dark;
  const barkTint = new THREE.Color(palette.bark);
  const shariTint = new THREE.Color(palette.shari);
  const textured = Boolean(options.textures);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
  });
  if (options.textures) {
    material.map = barkTiling(options.textures.barkAlbedo);
    material.normalMap = barkTiling(options.textures.barkNormal);
    material.normalScale.set(BARK_NORMAL_SCALE, BARK_NORMAL_SCALE);
    material.roughnessMap = barkTiling(options.textures.barkRoughness);
  }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBarkTint = { value: barkTint };
    shader.uniforms.uShariTint = { value: shariTint };
    const patched = patchBarkShader(shader.vertexShader, shader.fragmentShader, textured);
    shader.vertexShader = patched.vertex;
    shader.fragmentShader = patched.fragment;
  };
  material.customProgramCacheKey = () =>
    `arsenal-bonsai-bark-v3-${options.light ? 'light' : 'dark'}-${textured ? 'textures' : 'plain'}`;
  return material;
}

/**
 * Bark maps are only used by the bark, so the repeat is set on the shared texture itself (a clone
 * taken before the image arrives would never be uploaded).
 */
function barkTiling(texture: THREE.Texture): THREE.Texture {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(BARK_REPEAT_AROUND, BARK_REPEAT_AROUND);
  return texture;
}
