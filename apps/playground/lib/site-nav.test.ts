import { UI_COMPONENT_CATALOG } from '@arsenal/ui';
import { describe, expect, it } from 'vitest';
import { FEATURE_AREAS } from './feature-catalog';
import { activeNavHref, buildPaletteItems, searchPalette } from './site-nav';

describe('site navigation', () => {
  it('marks the right header item active', () => {
    expect(activeNavHref('/')).toBe('/');
    expect(activeNavHref('/components')).toBe('/components');
    expect(activeNavHref('/components/score-ring')).toBe('/components');
    expect(activeNavHref('/modules/testing')).toBe('/modules');
    expect(activeNavHref('/task-card-prototype/vault')).toBe('/labs');
    expect(activeNavHref('/metrics-prototype')).toBe('/labs');
    expect(activeNavHref('/nowhere')).toBeNull();
  });

  it('palette reaches every component and module', () => {
    const items = buildPaletteItems();
    for (const entry of UI_COMPONENT_CATALOG)
      expect(items.some((i) => i.href === `/components/${entry.id}`)).toBe(true);
    for (const feature of FEATURE_AREAS)
      expect(items.some((i) => i.href === `/modules/${feature.slug}`)).toBe(true);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('ranks title prefix matches first', () => {
    const results = searchPalette(buildPaletteItems(), 'score');
    expect(results[0]?.title.toLowerCase().startsWith('score')).toBe(true);
    expect(searchPalette(buildPaletteItems(), 'zzzz-no-match')).toEqual([]);
  });
});
