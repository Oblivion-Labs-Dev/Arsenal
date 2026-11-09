import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { seededNoise, type HeroGroupProps, useHeroEnv } from "./shared";

/** Island footprint in scene units: full width (x), depth (z) and rock height below the top. */
export interface IslandSize {
  width: number;
  depth: number;
  height: number;
}

export const DEFAULT_ISLAND_SIZE: IslandSize = { width: 5.8, depth: 2.35, height: 1.4 };

function hash2(x: number, z: number): number {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Smooth value noise in -1..1 (cheap, deterministic), unlike the banded sine noise. */
function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
}

function fbm(x: number, z: number, octaves = 4): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    sum += valueNoise(x * frequency, z * frequency) * amplitude;
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return sum;
}

/** The island's irregular outline: radius multiplier at an angle, shared by top and rock. */
export function islandOutline(angle: number): number {
  return 1 + fbm(Math.cos(angle) * 1.6 + 4, Math.sin(angle) * 1.6 + 4, 3) * 0.32;
}

/** Broad blocky lumps on the rock wall at an angle and depth t (0 rim .. 1 root). */
function cragLumps(angle: number, t: number): number {
  return fbm(Math.cos(angle) * 2.2 + t * 1.5, Math.sin(angle) * 2.2 - t * 1.5);
}

/** Outward push of the rock wall: lumps plus a few deep vertical clefts, rougher toward the root. */
function cragRough(angle: number, t: number): number {
  const clefts = Math.pow(Math.abs(valueNoise(angle * 3.4, 7.5)), 0.5) - 0.7;
  return cragLumps(angle, t) * (0.12 + t * 0.12) + clefts * (0.05 + t * 0.04);
}

/** Where the rock wall's top ring sits at an angle: radius multiplier and height. */
export function islandRim(angle: number): { radius: number; y: number } {
  return { radius: islandOutline(angle) * (1 + cragRough(angle, 0)), y: 0.03 + cragLumps(angle, 0) * 0.05 };
}

const STRATA_PROFILE = [1.0, 1.02, 1.03, 1.02, 1.0, 0.96, 0.88, 0.74, 0.54, 0.3];

/** Default pond on the top, as a fraction of the island footprint: centre x, half-width, half-depth. */
const POND = { x: 0.72 / 5.8, rx: 1.22 / 5.8, rz: 0.42 / 2.35 };

/** Height of the island's top surface at a local (x, z), before the top mesh's small lift. */
export function islandTopHeight(x: number, z: number, size: IslandSize = DEFAULT_ISLAND_SIZE): number {
  const nx = x / (size.width * 0.5);
  const nz = z / (size.depth * 0.5);
  const radius = Math.min(1, Math.hypot(nx, nz) / islandOutline(Math.atan2(nz, nx)));
  // Rolling mossy mounds, higher toward the middle, dropping to a soft rim.
  const mound = fbm(x * 0.9 + 11, z * 0.9 - 3);
  const rim = 1 - Math.pow(radius, 4);
  const y = 0.05 + rim * (0.07 + Math.max(0, mound) * 0.2) + fbm(x * 3.1, z * 3.1, 2) * 0.02;
  // A shallow level basin where the pond sits.
  const px = (x / size.width - POND.x) / POND.rx;
  const pz = z / size.depth / POND.rz;
  const inPond = Math.min(1, Math.max(0, (Math.hypot(px, pz) - 1.05) / 0.35));
  return 0.05 + (y - 0.05) * inPond;
}

export function islandTop(lightMode: boolean, size: IslandSize = DEFAULT_ISLAND_SIZE) {
  const radial = 14;
  const around = 72;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= radial; ring++) {
    const radius = ring / radial;
    for (let segment = 0; segment <= around; segment++) {
      const angle = (segment / around) * Math.PI * 2;
      const outline = islandOutline(angle);
      const x = Math.cos(angle) * (size.width * 0.5) * radius * outline;
      const z = Math.sin(angle) * (size.depth * 0.5) * radius * outline;
      const mound = fbm(x * 0.9 + 11, z * 0.9 - 3);
      if (ring === radial) {
        // The outer ring lands exactly on the rock wall's top ring, so there is no open seam.
        // (The top mesh is lifted 0.025 in IslandBase, hence the offset.)
        const rim = islandRim(angle);
        positions.push(
          Math.cos(angle) * (size.width * 0.5) * rim.radius,
          rim.y - 0.025,
          Math.sin(angle) * (size.depth * 0.5) * rim.radius
        );
      } else {
        positions.push(x, islandTopHeight(x, z, size), z);
      }
      // Thick moss over most of the top, broken by bare rock patches, brightest on the mounds.
      const patch = Math.min(1, Math.max(0, fbm(x * 1.3 - 7, z * 1.3 + 2) * 2.2 + 0.75));
      const sunlit = Math.min(1, Math.max(0, mound * 1.2 + 0.35 + fbm(x * 5, z * 5, 2) * 0.5));
      const moss = new THREE.Color(lightMode ? "#5b6831" : "#1f2a0e").lerp(
        new THREE.Color(lightMode ? "#84904c" : "#4a5c1d"),
        sunlit
      );
      const stone = new THREE.Color(lightMode ? "#7d7464" : "#2c2822");
      stone.lerp(moss, patch);
      colors.push(stone.r, stone.g, stone.b);
    }
  }
  for (let ring = 0; ring < radial; ring++) {
    for (let segment = 0; segment < around; segment++) {
      const a = ring * (around + 1) + segment;
      const b = a + around + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function islandStrata(lightMode: boolean, size: IslandSize = DEFAULT_ISLAND_SIZE) {
  const around = 72;
  const levels = 12;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let level = 0; level <= levels; level++) {
    const t = level / levels;
    const profilePosition = t * (STRATA_PROFILE.length - 1);
    const profileIndex = Math.min(Math.floor(profilePosition), STRATA_PROFILE.length - 2);
    const profileMix = profilePosition - profileIndex;
    const profile =
      STRATA_PROFILE[profileIndex] * (1 - profileMix) +
      STRATA_PROFILE[profileIndex + 1] * profileMix;
    const shelf = level > 0 && level % 4 === 0 ? 0.035 : 0;
    const y = 0.03 - t * size.height * 1.18 + Math.sin(t * Math.PI * 12) * 0.012;
    const scale = profile + shelf + Math.sin(t * Math.PI * 6) * 0.012;
    for (let segment = 0; segment <= around; segment++) {
      const angle = (segment / around) * Math.PI * 2;
      // Crags: broad blocky lumps and a few deep vertical clefts, rougher toward the hanging root.
      const lumps = cragLumps(angle, t);
      const rough = cragRough(angle, t);
      const outline = islandOutline(angle);
      positions.push(
        Math.cos(angle) * (size.width * 0.5) * scale * outline * (1 + rough),
        y + lumps * 0.05,
        Math.sin(angle) * (size.depth * 0.5) * scale * outline * (1 + rough)
      );
      const stone = new THREE.Color(
        lightMode
          ? t > 0.78
            ? "#3b3832"
            : t > 0.48
              ? "#5a544a"
              : "#7d7464"
          : t > 0.78
            ? "#16130f"
            : t > 0.48
              ? "#2a251e"
              : "#3d362b"
      );
      // Moss drapes over the rim and runs down the cracks in uneven tongues.
      const drape = Math.max(0, seededNoise(angle * 4.1, 0.5) * 0.5 + 0.5) * 0.22 + 0.06;
      if (t < drape) {
        stone.lerp(new THREE.Color(lightMode ? "#66733a" : "#2f3a12"), 1 - t / drape);
      }
      const layerTone = level % 4 === 1 ? 1.08 : level % 4 === 2 ? 0.88 : 1;
      const variation = layerTone * (0.88 + Math.max(0, seededNoise(segment, level) * 0.12));
      colors.push(stone.r * variation, stone.g * variation, stone.b * variation);
    }
  }
  for (let level = 0; level < levels; level++) {
    for (let segment = 0; segment < around; segment++) {
      const a = level * (around + 1) + segment;
      const b = a + around + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, -size.height * 1.24, 0);
  colors.push(lightMode ? 0.19 : 0.045, lightMode ? 0.18 : 0.043, lightMode ? 0.16 : 0.04);
  const bottomRing = levels * (around + 1);
  for (let segment = 0; segment < around; segment++) {
    indices.push(bottomRing + segment, bottomRing + segment + 1, bottom);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function scatterInstances(
  count: number,
  geometry: THREE.BufferGeometry,
  seed: number,
  width: number,
  color: string,
  depth = 0.85,
  scale = 1,
  /** Ground height at a local (x, z); the default is the old flat 0.08. */
  surface: (x: number, z: number) => number = () => 0.08
) {
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
    count
  );
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index++) {
    const angle = index * 2.3999632297 + seed;
    const radius = 0.2 + ((index * 37) % 97) / 130;
    const x = Math.cos(angle) * width * radius;
    const z = Math.sin(angle) * depth * radius;
    dummy.position.set(x, surface(x, z), z);
    const size = (0.035 + ((index * 13) % 19) / 190) * scale;
    dummy.scale.set(size, size * (1.8 + (index % 3) * 0.28), size);
    dummy.rotation.set(0, angle, Math.sin(index) * 0.11);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/**
 * The floating island on its own: a layered rock strata body under a mossy, noise-edged top and a
 * small glassy pond. Pure geometry, no animation. Put trees, falls and accents on it as siblings.
 */
export function IslandBase({
  light: lightProp,
  size = DEFAULT_ISLAND_SIZE,
  pond = true,
  ...group
}: HeroGroupProps & {
  light?: boolean;
  size?: Partial<IslandSize>;
  /** The small reflective pool on the top. Default true. */
  pond?: boolean;
}) {
  const { light } = useHeroEnv(lightProp);
  const lightMode = light;
  const dims: IslandSize = { ...DEFAULT_ISLAND_SIZE, ...size };
  const key = `${dims.width}|${dims.depth}|${dims.height}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const top = useMemo(() => islandTop(lightMode, dims), [lightMode, key]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const strata = useMemo(() => islandStrata(lightMode, dims), [lightMode, key]);
  useEffect(() => () => top.dispose(), [top]);
  useEffect(() => () => strata.dispose(), [strata]);
  const pondScale = dims.width / DEFAULT_ISLAND_SIZE.width;

  return (
    <group {...group}>
      <mesh geometry={strata} castShadow receiveShadow>
        <meshStandardMaterial vertexColors color="#ffffff" roughness={0.9} metalness={0.05} flatShading />
      </mesh>
      <mesh geometry={top} position={[0, 0.025, 0]} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
      </mesh>
      {pond ? (
        <mesh
          position={[0.72 * pondScale, 0.092, -0.02]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1.22 * pondScale, 0.42 * (dims.depth / DEFAULT_ISLAND_SIZE.depth), 1]}
        >
          <circleGeometry args={[1, 64]} />
          <meshStandardMaterial
            color={lightMode ? "#a59a85" : "#05080a"}
            metalness={0.6}
            roughness={0.08}
          />
        </mesh>
      ) : null}
    </group>
  );
}
