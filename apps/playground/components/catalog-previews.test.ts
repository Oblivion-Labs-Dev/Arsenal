import { describe, expect, it } from 'vitest';
import { COMPONENT_CATEGORIES, UI_COMPONENT_CATALOG } from '@arsenal/ui';
import { hasCatalogPreview } from './catalog-previews';

describe('catalog previews', () => {
  it('every cinematic effect has a live preview', () => {
    const missing = UI_COMPONENT_CATALOG.filter(
      (entry) => entry.category === 'effects' && !hasCatalogPreview(entry.id),
    ).map((entry) => entry.id);
    expect(missing).toEqual([]);
  });

  it('the cinematic effects from @arsenal/fx are in the catalog', () => {
    expect(COMPONENT_CATEGORIES.map((c) => c.id)).toContain('effects');
    const effects = UI_COMPONENT_CATALOG.filter((entry) => entry.category === 'effects');
    expect(effects.map((entry) => entry.id).sort()).toEqual([
      'anomaly-matrix',
      'aurora-background',
      'cosmic-particle-background',
      'galaxy-particle-canvas',
      'gravity-well',
      'infinity-particle-canvas',
      'interactive-particles',
      'morphing-sphere',
      'noise-texture',
      'particle-burst',
      'weather-canvas',
    ]);
  });
});
