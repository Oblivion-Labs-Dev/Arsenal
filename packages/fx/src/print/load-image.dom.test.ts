// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadImage } from './plate-art';

/** jsdom does not fetch images, so drive onload/onerror by hand through a stub Image. */
class StubImage {
  static created: StubImage[] = [];
  decoding = '';
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    StubImage.created.push(this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  StubImage.created = [];
});

describe('loadImage', () => {
  it('rejects an empty src without creating an image', async () => {
    vi.stubGlobal('Image', StubImage);
    await expect(loadImage('')).rejects.toThrow(TypeError);
    expect(StubImage.created).toHaveLength(0);
  });

  it('caches a successful load', async () => {
    vi.stubGlobal('Image', StubImage);
    const first = loadImage('/ok.webp');
    StubImage.created[0].onload?.();
    await expect(first).resolves.toBe(StubImage.created[0]);
    expect(loadImage('/ok.webp')).toBe(first);
    expect(StubImage.created).toHaveLength(1);
  });

  it('evicts a failed load so a later call retries', async () => {
    vi.stubGlobal('Image', StubImage);
    const first = loadImage('/bad.webp');
    StubImage.created[0].onerror?.();
    await expect(first).rejects.toThrow('Could not load plate /bad.webp');
    const second = loadImage('/bad.webp');
    expect(second).not.toBe(first);
    expect(StubImage.created).toHaveLength(2);
    StubImage.created[1].onload?.();
    await expect(second).resolves.toBe(StubImage.created[1]);
  });
});
