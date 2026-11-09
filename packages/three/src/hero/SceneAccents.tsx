import { useEffect, useMemo } from 'react';
import { useHeroEnv } from './shared';
import * as THREE from 'three';
import { islandTopHeight, scatterInstances } from './IslandBase';
import type { HeroGroupProps, HeroQuality } from './shared';

/** How many of each accent a quality level scatters. */
export function accentCounts(quality: HeroQuality): { foliage: number; rocks: number } {
  if (quality === 'high') return { foliage: 36, rocks: 14 };
  if (quality === 'medium') return { foliage: 25, rocks: 10 };
  return { foliage: 17, rocks: 8 };
}

/**
 * Scattered moss mounds and low-poly rocks on a golden-angle spiral (deterministic, so it never
 * shuffles between renders). Sized for the default island; scale the group for other footprints.
 */
export function SceneAccents({
  light: lightProp,
  quality = 'high',
  foliage = true,
  rocks = true,
  spread = 2.15,
  depth = 0.85,
  ...group
}: HeroGroupProps & {
  light?: boolean;
  quality?: HeroQuality;
  /** Moss mounds. Default true. */
  foliage?: boolean;
  /** Rocks. Default true. */
  rocks?: boolean;
  /** Half-width of the scatter along x. */
  spread?: number;
  /** Half-depth of the scatter along z. */
  depth?: number;
}) {
  const { light } = useHeroEnv(lightProp);
  const counts = accentCounts(quality);
  const leaves = useMemo(
    () =>
      scatterInstances(
        counts.foliage,
        new THREE.IcosahedronGeometry(0.75, 1).scale(1, 0.3, 1),
        0.3,
        spread,
        light ? '#7d8a3a' : '#4a5a18',
        depth,
        2.4,
        // Sit on the island's real surface (mounds and all), a hair sunk in so nothing floats.
        (x, z) => islandTopHeight(x, z) + 0.01,
      ),
    [counts.foliage, light, spread, depth],
  );
  const stones = useMemo(
    () =>
      scatterInstances(
        counts.rocks,
        new THREE.IcosahedronGeometry(0.18, 1),
        1.7,
        spread + 0.05,
        light ? '#6f675a' : '#24231f',
        depth,
        4,
        (x, z) => islandTopHeight(x, z) + 0.02,
      ),
    [counts.rocks, light, spread, depth],
  );
  useEffect(() => {
    // Faceted, so moss lumps and stones catch the rim light as chips of light.
    for (const mesh of [leaves, stones]) (mesh.material as THREE.MeshStandardMaterial).flatShading = true;
  }, [leaves, stones]);
  useEffect(() => () => disposeMesh(leaves), [leaves]);
  useEffect(() => () => disposeMesh(stones), [stones]);

  return (
    <group {...group}>
      {foliage ? <primitive object={leaves} /> : null}
      {rocks ? <primitive object={stones} /> : null}
    </group>
  );
}

function disposeMesh(mesh: THREE.InstancedMesh) {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
  mesh.dispose();
}
