import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChapterRail } from './chapter-rail';
import {
  chapterFill,
  isAtPageEnd,
  pickActiveSection,
  RAIL_DENSE_AFTER,
  railKeyTarget,
} from './chapter-rail-logic';

const ids = ['intro', 'work', 'about', 'contact'];

describe('pickActiveSection', () => {
  it('picks the last section crossing the middle band', () => {
    expect(pickActiveSection(ids, new Set(['intro', 'work']), false, 'intro')).toBe('work');
    expect(pickActiveSection(ids, new Set(['about']), false, undefined)).toBe('about');
  });

  it('selects the last section at the foot of the page', () => {
    expect(pickActiveSection(ids, new Set(['about']), true, 'about')).toBe('contact');
  });

  it('keeps the previous section between bands, falling back to the first', () => {
    expect(pickActiveSection(ids, new Set(), false, 'work')).toBe('work');
    expect(pickActiveSection(ids, new Set(), false, 'gone')).toBe('intro');
    expect(pickActiveSection([], new Set(), true, 'x')).toBeUndefined();
  });
});

describe('rail helpers', () => {
  it('detects the page end with slack, never at the top', () => {
    expect(isAtPageEnd(1000, 800, 1801)).toBe(true);
    expect(isAtPageEnd(900, 800, 1800)).toBe(false);
    expect(isAtPageEnd(0, 800, 800)).toBe(false);
  });

  it('fills the line by chapter and clamps', () => {
    expect(chapterFill(0, 4)).toBe(0);
    expect(chapterFill(2, 5)).toBe(0.5);
    expect(chapterFill(9, 4)).toBe(1);
    expect(chapterFill(0, 1)).toBe(1);
    expect(chapterFill(-1, 1)).toBe(0);
  });

  it('maps arrows, Home and End to stops and ignores other keys', () => {
    expect(railKeyTarget('ArrowDown', 1, 4)).toBe(2);
    expect(railKeyTarget('ArrowDown', 3, 4)).toBe(3);
    expect(railKeyTarget('ArrowUp', 0, 4)).toBe(0);
    expect(railKeyTarget('Home', 2, 4)).toBe(0);
    expect(railKeyTarget('End', 0, 4)).toBe(3);
    expect(railKeyTarget('Tab', 0, 4)).toBeNull();
    expect(railKeyTarget('ArrowDown', 0, 0)).toBeNull();
  });
});

describe('ChapterRail markup', () => {
  const chapters = ids.map((id) => ({ id, label: id.toUpperCase() }));

  it('renders a labelled nav of anchor links with the active one marked', () => {
    const html = renderToStaticMarkup(
      createElement(ChapterRail, { chapters, activeId: 'about', label: 'On this page' }),
    );
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="On this page"');
    expect(html).toContain('href="#contact"');
    expect(html.match(/aria-current="location"/g)).toHaveLength(1);
    expect(html).toMatch(
      /href="#about"[^>]*aria-current="location"|aria-current="location"[^>]*href="#about"/,
    );
    expect(html).toContain('data-passed="true"');
    expect(html).not.toContain('data-dense');
    expect(html).toContain('3 / 4'); // compact mobile pill
  });

  it('switches to dense mode past the threshold and renders nothing for no chapters', () => {
    const many = Array.from({ length: RAIL_DENSE_AFTER + 1 }, (_, i) => ({
      id: `s${i}`,
      label: `Section ${i}`,
    }));
    expect(renderToStaticMarkup(createElement(ChapterRail, { chapters: many }))).toContain(
      'data-dense="true"',
    );
    expect(renderToStaticMarkup(createElement(ChapterRail, { chapters: [] }))).toBe('');
  });
});
