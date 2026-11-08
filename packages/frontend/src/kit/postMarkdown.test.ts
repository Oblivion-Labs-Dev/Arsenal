import { describe, it, expect } from 'vitest';
import {
  estimateReadingMinutes,
  parseFrontmatter,
  parsePostMarkdown,
  slugifyHeading,
} from './postMarkdown.js';

describe('parseFrontmatter', () => {
  it('parses strings, booleans, lists and quotes, and strips a BOM', () => {
    const raw =
      '﻿---\ntitle: "Hello: world"\nfeatured: true\ntags: [a, "b c"]\nempty: []\nn: 5\n---\nBody text';
    const { data, body } = parseFrontmatter(raw);
    expect(data).toEqual({
      title: 'Hello: world',
      featured: true,
      tags: ['a', 'b c'],
      empty: [],
      n: '5',
    });
    expect(body).toBe('Body text');
  });

  it('leaves text without leading frontmatter alone', () => {
    const raw = 'Intro\n---\nx: 1\n---\nmore';
    expect(parseFrontmatter(raw)).toEqual({ data: {}, body: raw });
  });
});

describe('slugifyHeading', () => {
  it('dedupes ids and falls back to section', () => {
    const used = new Set<string>();
    expect(slugifyHeading('Getting Started!', used)).toBe('getting-started');
    expect(slugifyHeading('Getting started', used)).toBe('getting-started-2');
    expect(slugifyHeading('???', used)).toBe('section');
  });
});

describe('estimateReadingMinutes', () => {
  it('is at least one minute', () => {
    expect(estimateReadingMinutes('')).toBe(1);
    expect(estimateReadingMinutes(Array(440).fill('w').join(' '))).toBe(2);
  });
});

describe('parsePostMarkdown', () => {
  it('builds a TOC and matching heading ids, including headings with inline code', () => {
    const raw =
      '---\ntitle: Post\ntags: [x]\n---\n# Top\n\n## Intro\n\ntext\n\n### Use `npm` & more\n\n## Intro\n\n#### Deep';
    const post = parsePostMarkdown(raw);
    expect(post.title).toBe('Post');
    expect(post.tags).toEqual(['x']);
    expect(post.description).toBeNull();
    expect(post.date).toBeNull();
    expect(post.toc).toEqual([
      { id: 'intro', text: 'Intro', level: 2 },
      { id: 'use-npm-more', text: 'Use npm & more', level: 3 },
      { id: 'intro-2', text: 'Intro', level: 2 },
    ]);
    expect(post.html).toContain('<h2 id="intro">Intro</h2>');
    expect(post.html).toContain('<h3 id="use-npm-more">Use <code>npm</code> &amp; more</h3>');
    expect(post.html).toContain('<h2 id="intro-2">Intro</h2>');
    expect(post.html).toContain('<h1>Top</h1>');
    expect(post.html).toContain('<h4>Deep</h4>');
  });

  it('does not leak state between calls', () => {
    expect(parsePostMarkdown('## Same').toc[0]?.id).toBe('same');
    expect(parsePostMarkdown('## Same').toc[0]?.id).toBe('same');
  });
});
