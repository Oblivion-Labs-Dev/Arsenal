import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useHeroEnv, type HeroQuality } from '../shared';
import type { BonsaiTextures } from './textures';
import { buildPotGeometries, mossHeight, POT_STONES } from './pot';

export interface BonsaiPotProps extends Omit<ThreeElements['group'], 'children'> {
  quality?: HeroQuality;
  /** Defaults to the surrounding hero environment (theme). */
  light?: boolean;
  textures?: Pick<BonsaiTextures, 'mossAlbedo' | 'mossNormal' | 'clayAlbedo' | 'clayRoughness'>;
}

/** Shallow unglazed clay pot on a low stone stand, with a moss mound and a few stones. Three draw calls. */
export function BonsaiPot({
  quality = 'high',
  light: lightProp,
  textures,
  ...groupProps
}: BonsaiPotProps) {
  const { light } = useHeroEnv(lightProp);
  const geometries = useMemo(() => buildPotGeometries(quality), [quality]);
  const stonesRef = useRef<THREE.InstancedMesh>(null);

  useEffect(
    () => () => {
      geometries.clay.dispose();
      geometries.moss.dispose();
      geometries.stones.dispose();
    },
    [geometries],
  );

  useLayoutEffect(() => {
    const mesh = stonesRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    POT_STONES.forEach(([x, z, size, yaw], index) => {
      // Half-sunk into the moss so stones sit in it rather than on it.
      position.set(x, mossHeight(x, z) + size * 0.25, z);
      rotation.setFromEuler(
        euler.set(0.15 * Math.sin(index * 2.1), yaw, 0.12 * Math.cos(index * 1.3)),
      );
      scale.set(size * 1.15, size * 0.62, size * 0.9);
      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geometries]);

  return (
    <group {...groupProps}>
      <mesh geometry={geometries.clay} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          color={light ? '#6d5a4b' : '#3b2f28'}
          map={textures?.clayAlbedo ?? null}
          roughnessMap={textures?.clayRoughness ?? null}
          roughness={0.92}
        />
      </mesh>
      <mesh geometry={geometries.moss} castShadow receiveShadow>
        <meshStandardMaterial
          color={light ? '#6f8a3c' : '#4a6a1f'}
          map={textures?.mossAlbedo ?? null}
          normalMap={textures?.mossNormal ?? null}
          roughness={0.96}
        />
      </mesh>
      <instancedMesh
        key={geometries.stones.uuid}
        ref={stonesRef}
        args={[geometries.stones, undefined, POT_STONES.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={light ? '#817665' : '#575045'} roughness={0.92} flatShading />
      </instancedMesh>
    </group>
  );
}
