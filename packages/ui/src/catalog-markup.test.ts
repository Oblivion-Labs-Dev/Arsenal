import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UI_COMPONENT_CATALOG } from './component-catalog';
import { SortHeader } from './primitives/table-view';

describe('catalog example markup', () => {
  it('SortHeader renders its own <th>, so it must sit directly in a <tr>', () => {
    const html = renderToStaticMarkup(
      createElement(SortHeader, { label: 'Name', ariaSort: 'none', arrow: '', onSort: () => {} }),
    );
    expect(html.startsWith('<th')).toBe(true);
  });

  it('no catalog example wraps SortHeader in another <th> (invalid nested table cells)', () => {
    const offenders = UI_COMPONENT_CATALOG.filter((entry) =>
      /<th\b[^>]*>\s*<SortHeader/.test(entry.code),
    ).map((entry) => entry.id);
    expect(offenders).toEqual([]);
  });
});
