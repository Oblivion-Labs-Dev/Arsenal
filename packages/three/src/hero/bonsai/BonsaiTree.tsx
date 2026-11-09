import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useHeroEnv, type HeroGroupProps, type HeroPieceProps, type HeroQuality } from '../shared';
import { BonsaiPot } from './BonsaiPot';
import { buildBonsaiSkeleton } from './skeleton';
import { buildBonsaiTrunk, createBarkMaterial } from './trunk';
import { buildLeafField, createLeafMaterials, createLeafMesh, updateLeafUniforms } from './foliage';
import { acquireBonsaiTextures, releaseBonsaiTextures, type BonsaiTextures } from './textures';
import { BONSAI_DEFAULT_SEED, BONSAI_TEXTURE_BASE, type BonsaiSeason } from './types';

export interface BonsaiTreeProps extends HeroGroupProps, HeroPieceProps {
  /** Same seed, same tree. Defaults to the curated `BONSAI_DEFAULT_SEED`. */
  seed?: number;
  /** Leaf cards per pad multiplier, 0.25–2. */
  foliageDensity?: number;
  /** Show the clay pot, stand, moss and stones under the tree. */
  pot?: boolean;
  season?: BonsaiSeason;
  quality?: HeroQuality;
  /** Wind strength multiplier; 0 holds the canopy still. */
  wind?: number;
  /** Where the bonsai WebP textures are served from. */
  textureBase?: string;
}

/**
 * A procedural moyogi bonsai: one bark draw call, one instanced leaf draw call, and an optional pot
 * (three draw calls). Root at the origin, soil at y = 0, about 2 units tall. Wind runs in the leaf
 * shader only and freezes with `wind={0}` or reduced motion.
 */
export function BonsaiTree({
  seed = BONSAI_DEFAULT_SEED,
  foliageDensity = 1,
  pot = true,
  season = 'summer',
  quality = 'high',
  wind = 1,
  textureBase = BONSAI_TEXTURE_BASE,
  light: lightProp,
  reducedMotion: reducedProp,
  ...group
}: BonsaiTreeProps) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const invalidate = useThree((state) => state.invalidate);
  const [textures, setTextures] = useState<BonsaiTextures | null>(null);

  useEffect(() => {
    setTextures(acquireBonsaiTextures(textureBase, () => invalidate()));
    return () => {
      setTextures(null);
      releaseBonsaiTextures(textureBase);
    };
  }, [textureBase, invalidate]);

  const skeleton = useMemo(
    () => buildBonsaiSkeleton({ seed, quality, foliageDensity }),
    [seed, quality, foliageDensity],
  );
  const trunkGeometry = useMemo(() => buildBonsaiTrunk(skeleton, quality), [skeleton, quality]);
  const barkMaterial = useMemo(
    () => createBarkMaterial({ light, textures: textures ?? undefined }),
    [light, textures],
  );
  const field = useMemo(
    () => buildLeafField(skeleton.pads, { quality, foliageDensity, seed }),
    [skeleton, quality, foliageDensity, seed],
  );
  const leafMaterials = useMemo(
    () => createLeafMaterials({ light, season, textures: textures ?? undefined }),
    [light, season, textures],
  );
  const leaves = useMemo(() => {
    const mesh = createLeafMesh(field, skeleton.pads, leafMaterials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [field, skeleton, leafMaterials]);

  useEffect(() => () => trunkGeometry.dispose(), [trunkGeometry]);
  useEffect(() => () => barkMaterial.dispose(), [barkMaterial]);
  useEffect(() => () => leaves.geometry.dispose(), [leaves]);
  useEffect(
    () => () => {
      leafMaterials.material.dispose();
      leafMaterials.depthMaterial.dispose();
    },
    [leafMaterials],
  );

  const still = reducedMotion || wind <= 0;
  const stillRef = useRef(still);
  stillRef.current = still;
  useEffect(() => {
    // Frozen wind: park the canopy at rest and draw that once.
    if (still) {
      updateLeafUniforms(leafMaterials.uniforms, 0, 0);
      invalidate();
    }
  }, [still, leafMaterials, invalidate]);

  useFrame(({ clock }) => {
    if (stillRef.current) return;
    updateLeafUniforms(leafMaterials.uniforms, clock.elapsedTime, wind);
  });

  return (
    <group {...group}>
      <mesh geometry={trunkGeometry} material={barkMaterial} castShadow receiveShadow />
      <primitive object={leaves} />
      {pot ? <BonsaiPot quality={quality} light={light} textures={textures ?? undefined} /> : null}
    </group>
  );
}
