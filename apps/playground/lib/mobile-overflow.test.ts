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

  it('reports diagram cards shrink the ClayFlow stage instead of clipping it', () => {
    // At 390px the entity map's vertical stage kept a 400px min-width inside a 341px
    // canvas with overflow-x hidden, so the right-hand node was cut off.
    const css = read('app/reports/reports.css');
    expect(css).toMatch(/\.report-diagram-card \.cf-canvas\s*\{[^}]*overflow-x:\s*hidden/);
    expect(css).toMatch(/\.report-diagram-card \.cf-stage\s*\{[^}]*min-width:\s*0/);
  });
});
