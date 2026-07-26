import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(new URL('./theme-vault.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./theme-vault.module.css', import.meta.url), 'utf8');

describe('locked Vault theme previews', () => {
  it('keeps the complete color card visible', () => {
    expect(componentSource).toContain('<PrecisionTaskCard');
    expect(componentSource).toContain("data-locked={locked ? 'true' : 'false'}");
    expect(styles).toContain(".previewHost[data-locked='true'] > :global(.precision-task-card)");
    expect(styles).toContain('filter: none');
    expect(styles).toContain('opacity: 1');
    expect(styles).not.toContain('grayscale(0.62)');
    expect(styles).not.toContain('brightness(0.46)');
  });

  it('uses a compact corner badge instead of a full-card veil', () => {
    expect(componentSource).toContain('className={styles.lockVeil}');
    expect(styles).toContain('.lockVeil');
    expect(styles).toContain('right: 10px');
    expect(styles).toContain('bottom: 10px');
    expect(styles).not.toMatch(/\.lockVeil\s*\{[^}]*inset:\s*0/s);
  });
});
