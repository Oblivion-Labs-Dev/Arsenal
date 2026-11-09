import { describe, expect, it } from 'vitest';
import { buildBonsaiSkeleton } from '../../src/hero/bonsai/skeleton';
import { buildBonsaiTrunk, countTriangles } from '../../src/hero/bonsai/trunk';
import { buildLeafField } from '../../src/hero/bonsai/foliage';
import { potTriangleCount } from '../../src/hero/bonsai/pot';
import { BONSAI_TRIANGLE_BUDGET } from '../../src/hero/bonsai/types';
import type { HeroQuality } from '../../src/hero/shared';

const QUALITIES: HeroQuality[] = ['high', 'medium', 'low'];

describe('bonsai total triangle budget', () => {
  for (const quality of QUALITIES) {
    for (const seed of [1, 7, 42]) {
      it(`trunk + leaves + pot fit the ${quality} budget at max density (seed ${seed})`, () => {
        const skeleton = buildBonsaiSkeleton({ seed, quality, foliageDensity: 2 });
        const trunk = buildBonsaiTrunk(skeleton, quality);
        const field = buildLeafField(skeleton.pads, { quality, foliageDensity: 2, seed });
        const total = countTriangles(trunk) + field.count * 2 + potTriangleCount(quality);
        expect(total).toBeLessThanOrEqual(BONSAI_TRIANGLE_BUDGET[quality]);
        trunk.dispose();
      });
    }
  }
});
