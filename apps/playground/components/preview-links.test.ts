import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

/** Live previews render real components, some with their own <a>; an <a> inside <a> breaks hydration. */
function previewsInsideLinks(source: string): number {
  let depth = 0;
  let hits = 0;
  for (const match of source.matchAll(/<Link\b|<\/Link>|<PreviewStage\b/g)) {
    if (match[0] === '<Link') depth += 1;
    else if (match[0] === '</Link>') depth -= 1;
    else if (depth > 0) hits += 1;
  }
  return hits;
}

describe('live preview cards', () => {
  it.each(['components/library/component-card.tsx', 'components/home/best-of-strip.tsx'])(
    '%s keeps PreviewStage outside any Link',
    (file) => {
      expect(previewsInsideLinks(readFileSync(join(ROOT, file), 'utf8'))).toBe(0);
    },
  );

  it('passes inert as a boolean, which React 19 needs to apply it', () => {
    const source = readFileSync(join(ROOT, 'components/library/component-card.tsx'), 'utf8');
    expect(source).not.toMatch(/inert=\{[^}]*''/);
    expect(source).toMatch(/inert: interactive \? undefined : true/);
  });
});
