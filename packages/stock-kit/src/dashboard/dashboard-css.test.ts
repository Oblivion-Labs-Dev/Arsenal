import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Regression: StockChart uses lightweight-charts autoSize, so without an explicit height on
// .si-chart-canvas the WhenToBuySell chart collapsed to ~2px tall.
describe('dashboard.css', () => {
  const css = readFileSync(new URL('./dashboard.css', import.meta.url), 'utf8');
  it('gives the chart canvas an explicit height', () => {
    const rule = css.match(/\.si-chart-wrap \.si-chart-canvas\s*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(/height:\s*\d+px/);
  });
});
