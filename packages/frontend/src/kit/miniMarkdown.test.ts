import { describe, it, expect } from 'vitest';
import { parseInline, parseMiniMarkdown } from './miniMarkdown.js';

describe('parseMiniMarkdown', () => {
  it('parses headings, paragraphs, lists and tables', () => {
    const src =
      '# Title\n\nFirst line\nsecond line\n\n- a\n- b\n\n1. one\n2. two\n\n| H1 | H2 |\n|---|---|\n| x | y |\n';
    expect(parseMiniMarkdown(src)).toEqual([
      { kind: 'h1', text: 'Title' },
      { kind: 'p', text: 'First line second line' },
      { kind: 'ul', items: ['a', 'b'] },
      { kind: 'ol', items: ['one', 'two'] },
      { kind: 'table', head: ['H1', 'H2'], rows: [['x', 'y']] },
    ]);
  });

  it('stops at a rule and skips quotes when asked', () => {
    const src = '> note\n\nBody\n\n---\n\nAuthor notes';
    expect(parseMiniMarkdown(src, { stopAtRule: true, skipBlockquotes: true })).toEqual([
      { kind: 'p', text: 'Body' },
    ]);
    const all = parseMiniMarkdown(src);
    expect(all[0]).toEqual({ kind: 'p', text: 'note' });
    expect(all.at(-1)).toEqual({ kind: 'p', text: 'Author notes' });
  });
});

describe('parseInline', () => {
  it('parses strong, code, links and gaps', () => {
    expect(parseInline('A **b** `c` [d](https://x.test) [Name]')).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'strong', text: 'b' },
      { kind: 'text', text: ' ' },
      { kind: 'code', text: 'c' },
      { kind: 'text', text: ' ' },
      { kind: 'link', text: 'd', href: 'https://x.test' },
      { kind: 'text', text: ' ' },
      { kind: 'gap', text: '[Name]' },
    ]);
  });

  it('turns unsafe links into plain text', () => {
    for (const href of [
      'javascript:void(0)',
      '//evil.test',
      'data:text/html,x',
      'http://plain.test',
    ]) {
      expect(parseInline(`[go](${href})`)).toEqual([{ kind: 'text', text: 'go' }]);
    }
    expect(parseInline('[ok](/terms)')).toEqual([{ kind: 'link', text: 'ok', href: '/terms' }]);
    expect(parseInline('[m](mailto:a@b.c)')[0]?.kind).toBe('link');
  });

  it('accepts a custom href policy', () => {
    expect(parseInline('[x](/a)', () => false)).toEqual([{ kind: 'text', text: 'x' }]);
  });
});

describe('parseInline link URLs with parentheses', () => {
  it('keeps balanced parentheses inside the href', () => {
    expect(parseInline('[wiki](/w/Foo_(bar)) after')).toEqual([
      { kind: 'link', text: 'wiki', href: '/w/Foo_(bar)' },
      { kind: 'text', text: ' after' },
    ]);
  });
});
