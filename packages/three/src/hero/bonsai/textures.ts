import * as THREE from 'three';
import { BONSAI_TEXTURE_BASE, BONSAI_TEXTURE_FILES, type BonsaiTextureKey } from './types';

export type BonsaiTextures = Record<BonsaiTextureKey, THREE.Texture>;

/** Albedo maps are sRGB; normal, roughness and thickness data stay linear. */
const COLOR_MAPS = new Set<BonsaiTextureKey>([
  'barkAlbedo',
  'leafAtlas',
  'mossAlbedo',
  'clayAlbedo',
]);
/** Tiling maps repeat; the leaf atlas and thickness are addressed per cell and must clamp. */
const ATLAS_MAPS = new Set<BonsaiTextureKey>(['leafAtlas', 'leafThickness']);

const cache = new Map<string, { textures: BonsaiTextures; users: number }>();

/**
 * Load (or reuse) the bonsai texture set from `base`. Textures are returned at once and fill in as
 * they arrive; `onLoad` fires after each one so a demand-driven canvas can redraw. A missing file
 * is reported loudly with `console.error`, never swallowed.
 */
export function acquireBonsaiTextures(
  base: string = BONSAI_TEXTURE_BASE,
  onLoad?: () => void,
): BonsaiTextures {
  const root = base.endsWith('/') ? base : `${base}/`;
  const hit = cache.get(root);
  if (hit) {
    hit.users += 1;
    return hit.textures;
  }
  const loader = new THREE.TextureLoader();
  const textures = {} as BonsaiTextures;
  for (const key of Object.keys(BONSAI_TEXTURE_FILES) as BonsaiTextureKey[]) {
    const url = root + BONSAI_TEXTURE_FILES[key];
    const texture = loader.load(
      url,
      () => onLoad?.(),
      undefined,
      () => console.error(`[arsenal/three] bonsai texture failed to load: ${url}`),
    );
    texture.colorSpace = COLOR_MAPS.has(key) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = 8;
    if (ATLAS_MAPS.has(key)) {
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    } else {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }
    textures[key] = texture;
  }
  cache.set(root, { textures, users: 1 });
  return textures;
}

/** Release a set from `acquireBonsaiTextures`; the GPU copies are freed when the last user leaves. */
export function releaseBonsaiTextures(base: string = BONSAI_TEXTURE_BASE): void {
  const root = base.endsWith('/') ? base : `${base}/`;
  const hit = cache.get(root);
  if (!hit) return;
  hit.users -= 1;
  if (hit.users > 0) return;
  for (const texture of Object.values(hit.textures)) texture.dispose();
  cache.delete(root);
}
