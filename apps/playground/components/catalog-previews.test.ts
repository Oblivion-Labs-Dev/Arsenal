import { describe, expect, it } from 'vitest';
import { COMPONENT_CATEGORIES, UI_COMPONENT_CATALOG } from '@arsenal/ui';
import { HERO_PREVIEW_DEFAULT_MODE, hasCatalogPreview } from './catalog-previews';

describe('catalog previews', () => {
  it('hero piece pages open on the live 3D model, not the painted plate', () => {
    expect(HERO_PREVIEW_DEFAULT_MODE).toBe('3d');
  });

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

  it('every standalone hero piece and the cinematic plate are in the hero catalog with a live preview', () => {
    const pieces = [
      'bonsai-tree',
      'core-sphere',
      'data-path',
      'island-base',
      'orbital-ring',
      'scene-accents',
      'service-node',
      'water-basin',
      'waterfall',
      'cinematic-plate',
    ];
    const ids = UI_COMPONENT_CATALOG.filter((entry) => entry.category === 'hero').map((e) => e.id);
    expect(pieces.filter((id) => !ids.includes(id))).toEqual([]);
    expect(pieces.filter((id) => !hasCatalogPreview(id))).toEqual([]);
  });
});
