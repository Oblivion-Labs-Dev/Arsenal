import { describe, expect, it } from 'vitest';
import { UI_COMPONENT_CATALOG } from '@arsenal/ui';
import {
  BEST_OF_IDS,
  categoriesWithCounts,
  filterEntries,
  getCatalogEntry,
  relatedEntries,
} from './catalog';

describe('catalog categories', () => {
  it('makes every catalog entry reachable through a category chip', () => {
    const categories = categoriesWithCounts();
    const reachable = new Set(
      categories.flatMap((c) => filterEntries(UI_COMPONENT_CATALOG, c.id, '').map((e) => e.id)),
    );
    const unreachable = UI_COMPONENT_CATALOG.filter((e) => !reachable.has(e.id)).map((e) => e.id);
    expect(unreachable).toEqual([]);
  });

  it('never shows an empty category and counts add up to the catalog size', () => {
    const categories = categoriesWithCounts();
    expect(categories.every((c) => c.count > 0)).toBe(true);
    expect(categories.reduce((sum, c) => sum + c.count, 0)).toBe(UI_COMPONENT_CATALOG.length);
  });

  it('searches name, description and category', () => {
    expect(filterEntries(UI_COMPONENT_CATALOG, 'all', 'donut').map((e) => e.id)).toContain(
      'donut-chart',
    );
    expect(filterEntries(UI_COMPONENT_CATALOG, 'all', '').length).toBe(UI_COMPONENT_CATALOG.length);
  });

  it('only features components that exist in the catalog', () => {
    for (const id of BEST_OF_IDS) expect(getCatalogEntry(id), id).toBeDefined();
  });

  it('related components share the category and exclude the entry itself', () => {
    const entry = getCatalogEntry('donut-chart')!;
    const related = relatedEntries(entry);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((e) => e.category === entry.category && e.id !== entry.id)).toBe(true);
  });
});
