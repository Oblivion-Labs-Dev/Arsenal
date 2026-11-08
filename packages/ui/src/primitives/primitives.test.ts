import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  AnimatedTabs,
  Card,
  ErrorState,
  FacetFilterDropdown,
  FilterChip,
  Input,
  KpiCard,
  LoadingPlaceholder,
  TableViewToggle,
  Tabs,
  edgeFadeMask,
  facetSelectionCount,
  facetSubstringCount,
  fieldMessageIds,
  filterFacets,
  nextSort,
  nextTabIndex,
  parseCountableFigure,
  scrollEdges,
  skeletonLineWidths,
  sortRows,
  tabId,
  tabPanelId,
  type FacetItem,
} from './index';

describe('nextTabIndex', () => {
  it('wraps forward and backward', () => {
    expect(nextTabIndex('ArrowRight', 2, 3)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(nextTabIndex('ArrowRight', 0, 3)).toBe(1);
  });

  it('jumps with Home and End', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 0, 4)).toBe(3);
  });

  it('skips disabled tabs, including at the ends', () => {
    const isDisabled = (i: number) => i === 1 || i === 3;
    expect(nextTabIndex('ArrowRight', 0, 4, { isDisabled })).toBe(2);
    expect(nextTabIndex('End', 0, 4, { isDisabled })).toBe(2);
    expect(nextTabIndex('ArrowLeft', 0, 4, { isDisabled })).toBe(2);
  });

  it('uses up/down for vertical lists and ignores left/right there', () => {
    expect(nextTabIndex('ArrowDown', 0, 3, { orientation: 'vertical' })).toBe(1);
    expect(nextTabIndex('ArrowUp', 0, 3, { orientation: 'vertical' })).toBe(2);
    expect(nextTabIndex('ArrowRight', 0, 3, { orientation: 'vertical' })).toBeNull();
  });

  it('returns null for unknown keys, empty lists and all-disabled lists', () => {
    expect(nextTabIndex('a', 0, 3)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 2, { isDisabled: () => true })).toBeNull();
  });

  it('builds paired tab and panel ids', () => {
    expect(tabId('x', 'a')).toBe('x-tab-a');
    expect(tabPanelId('x', 'a')).toBe('x-panel-a');
  });
});

describe('Tabs and AnimatedTabs markup', () => {
  const items = [
    { id: 'one', label: 'One', count: 0 },
    { id: 'two', label: 'Two', disabled: true },
  ];

  it('renders a roving tablist with zero counts shown', () => {
    const html = renderToStaticMarkup(
      createElement(Tabs, {
        items,
        value: 'one',
        onChange: () => undefined,
        ariaLabel: 'Views',
        idBase: 'v',
      }),
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('id="v-tab-one"');
    expect(html).toContain('aria-controls="v-panel-one"');
    expect(html).toMatch(/aria-selected="true"[^>]*tabindex="0"/);
    expect(html).toMatch(/aria-selected="false"[^>]*tabindex="-1"/);
    expect(html).toContain('>0</span>');
  });

  it('renders the animated highlight only on the selected tab', () => {
    const html = renderToStaticMarkup(
      createElement(AnimatedTabs, {
        items,
        value: 'two',
        onChange: () => undefined,
        ariaLabel: 'Views',
      }),
    );
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(1);
  });

  it('fades only the edges that hide content', () => {
    expect(scrollEdges(0, 100, 100)).toEqual({ start: false, end: false });
    expect(scrollEdges(0, 100, 300)).toEqual({ start: false, end: true });
    expect(scrollEdges(200, 100, 300)).toEqual({ start: true, end: false });
    expect(edgeFadeMask({ start: false, end: false })).toBeUndefined();
    expect(edgeFadeMask({ start: false, end: true })).toContain('transparent 100%');
    expect(edgeFadeMask({ start: true, end: false })).toContain('transparent 0');
  });
});

describe('sortRows / nextSort', () => {
  type Row = { name: string; score: number | null };
  const rows: Row[] = [
    { name: 'item 10', score: 3 },
    { name: 'item 2', score: null },
    { name: 'Item 1', score: 10 },
  ];

  it('compares numbers numerically and keeps nulls last in both directions', () => {
    expect(sortRows(rows, (r) => r.score, 'asc').map((r) => r.score)).toEqual([3, 10, null]);
    expect(sortRows(rows, (r) => r.score, 'desc').map((r) => r.score)).toEqual([10, 3, null]);
  });

  it('uses natural, case-insensitive string order', () => {
    expect(sortRows(rows, (r) => r.name, 'asc').map((r) => r.name)).toEqual([
      'Item 1',
      'item 2',
      'item 10',
    ]);
  });

  it('is stable and does not mutate the input', () => {
    const tied = [
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
    ];
    expect(sortRows(tied, (r) => r.v, 'desc').map((r) => r.id)).toEqual(['a', 'b']);
    expect(rows[0]?.name).toBe('item 10');
  });

  it('flips the active column and resets a new one', () => {
    expect(nextSort({ key: 'a', direction: 'desc' }, 'a')).toEqual({ key: 'a', direction: 'asc' });
    expect(nextSort<'a' | 'b'>({ key: 'a', direction: 'asc' }, 'b')).toEqual({
      key: 'b',
      direction: 'desc',
    });
    expect(nextSort<'a' | 'b'>({ key: 'a', direction: 'asc' }, 'b', 'asc')).toEqual({
      key: 'b',
      direction: 'asc',
    });
  });

  it('hides the view toggle when everything fits', () => {
    const props = { expanded: false, onToggle: () => undefined };
    expect(renderToStaticMarkup(createElement(TableViewToggle, { ...props, total: 5 }))).toBe('');
    expect(renderToStaticMarkup(createElement(TableViewToggle, { ...props, total: 6 }))).toContain(
      'Show all 6',
    );
  });
});

describe('facet helpers', () => {
  const items: FacetItem[] = [
    ['Engineer', 4],
    ['Senior Engineer', 3],
    ['Designer', 2],
  ];

  it('filters case-insensitively and returns everything for blank queries', () => {
    expect(filterFacets(items, 'ENGIN').map(([v]) => v)).toEqual(['Engineer', 'Senior Engineer']);
    expect(filterFacets(items, '  ')).toHaveLength(3);
  });

  it('sums substring matches', () => {
    expect(facetSubstringCount(items, 'engineer')).toBe(7);
    expect(facetSubstringCount(items, '')).toBe(0);
  });

  it('prefers an exact facet count over the substring sum', () => {
    expect(facetSelectionCount(items, 'Engineer', 9)).toBe(4);
    expect(facetSelectionCount(items, 'gineer', 9)).toBe(7);
    expect(facetSelectionCount(items, '', 9)).toBe(9);
  });

  it('keeps the clear button outside the trigger button', () => {
    const html = renderToStaticMarkup(
      createElement(FacetFilterDropdown, {
        items,
        value: 'Engineer',
        onChange: () => undefined,
        totalCount: 9,
        ariaLabel: 'Role',
      }),
    );
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*<button/);
    expect(html).toContain('aria-label="Clear filter"');
  });
});

describe('parseCountableFigure', () => {
  it('parses plain integers, decimals and percentages', () => {
    expect(parseCountableFigure('42')).toEqual({ target: 42, decimals: 0, suffix: '' });
    expect(parseCountableFigure('3.50')).toEqual({ target: 3.5, decimals: 2, suffix: '' });
    expect(parseCountableFigure('87%')).toEqual({ target: 87, decimals: 0, suffix: '%' });
  });

  it('refuses anything it would have to reinterpret', () => {
    for (const value of ['1,204', '$3k', 'n/a', '—', '-4', '']) {
      expect(parseCountableFigure(value)).toBeNull();
    }
  });

  it('shows unknown values as a dash, never zero', () => {
    const html = renderToStaticMarkup(createElement(KpiCard, { label: 'Revenue', value: null }));
    expect(html).toContain('—');
    expect(html).not.toContain('>0<');
  });
});

describe('forms and feedback', () => {
  it('points aria-describedby at the error before the hint', () => {
    expect(fieldMessageIds('f', true, true)).toEqual({
      messageId: 'f-error',
      describedBy: 'f-error',
    });
    expect(fieldMessageIds('f', false, true).describedBy).toBe('f-hint');
    expect(fieldMessageIds('f', false, false).describedBy).toBeUndefined();
  });

  it('marks an input with an error as invalid and describes it', () => {
    const html = renderToStaticMarkup(
      createElement(Input, { id: 'email', label: 'Email', error: 'Required' }),
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="email-error"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain('for="email"');
  });

  it('shortens only the last skeleton line', () => {
    expect(skeletonLineWidths(3)).toEqual(['100%', '100%', '60%']);
    expect(skeletonLineWidths(1)).toEqual(['100%']);
    expect(skeletonLineWidths(Number.NaN)).toEqual([]);
  });

  it('announces loading placeholders', () => {
    const html = renderToStaticMarkup(
      createElement(LoadingPlaceholder, { label: 'Loading invoices' }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
  });

  it('renders the error digest as a reference', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    const onReport = vi.fn();
    const html = renderToStaticMarkup(
      createElement(ErrorState, { title: 'Invoices', error, onReport }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('abc123');
  });

  it('exposes filter state through aria-pressed and renders interactive cards as buttons', () => {
    expect(
      renderToStaticMarkup(createElement(FilterChip, { label: 'Open', active: true })),
    ).toContain('aria-pressed="true"');
    expect(renderToStaticMarkup(createElement(Card, { onActivate: () => undefined }, 'x'))).toMatch(
      /^<button/,
    );
  });
});
