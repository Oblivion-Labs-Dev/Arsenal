import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

/** At 390px the page widened to 1298px (chip row) and 613px (quick start code block). */
describe('mobile horizontal overflow', () => {
  it('site-scroll-x actually scrolls, so chip rows stay inside the viewport', () => {
    const rule = read('app/globals.css').match(/\.site-scroll-x\s*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/overflow-x:\s*auto/);
  });

  it.each(['app/page.tsx', 'components/library/component-detail.tsx'])(
    '%s: custom lg grid templates keep a shrinkable mobile track',
    (file) => {
      const grids = [
        ...read(file).matchAll(/className="([^"]*\bgrid [^"]*lg:grid-cols-\[[^"]*)"/g),
      ];
      expect(grids.length).toBeGreaterThan(0);
      for (const [, classes] of grids) {
        expect(classes).toMatch(/\bgrid-cols-1\b/);
        expect(classes).not.toMatch(/lg:grid-cols-\[1fr/);
      }
    },
  );
});
