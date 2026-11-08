import { describe, expect, it } from 'vitest';
import { noiseDataUrl } from './NoiseTexture';

describe('noiseDataUrl', () => {
  it('encodes an SVG turbulence filter with the given settings', () => {
    const prefix = 'url("data:image/svg+xml,';
    const url = noiseDataUrl(0.5, 2);
    expect(url.startsWith(prefix)).toBe(true);
    expect(url.endsWith('")')).toBe(true);
    const svg = decodeURIComponent(url.slice(prefix.length, -2));
    expect(svg).toContain("baseFrequency='0.5'");
    expect(svg).toContain("numOctaves='2'");
    expect(url.slice(prefix.length)).not.toMatch(/[<>#]/);
  });
});
