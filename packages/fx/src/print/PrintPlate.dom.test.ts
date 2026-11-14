// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const art = vi.hoisted(() => ({
  loadImage: vi.fn<(src: string) => Promise<HTMLImageElement>>(),
  drawHalftone: vi.fn(),
  drawLinework: vi.fn(),
}));
vi.mock('./plate-art', () => art);

import { PrintPlate } from './PrintPlate';
import { loadImage as realLoadImage } from './plate-art';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  art.loadImage.mockReset();
  art.drawHalftone.mockReset();
  art.drawLinework.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

const canvas = () => host.querySelector('canvas') as HTMLCanvasElement;

describe('PrintPlate', () => {
  it('server-renders a hidden, not-ready canvas at the requested backing size', () => {
    const html = renderToStaticMarkup(
      createElement(PrintPlate, { src: '/a.webp', treatment: 'linework', width: 320, height: 180 }),
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-ready="false"');
    expect(html).toContain('width="320"');
    expect(html).toContain('arsenal-print-plate--linework');
  });

  it('draws a halftone with explicit colours and marks itself ready', async () => {
    const image = {} as HTMLImageElement;
    art.loadImage.mockResolvedValue(image);
    const onStateChange = vi.fn();
    await act(async () => {
      root.render(
        createElement(PrintPlate, {
          src: '/plate.webp',
          treatment: 'halftone',
          ink: '#111',
          accent: '#c00',
          dark: true,
          onStateChange,
        }),
      );
    });
    expect(art.drawHalftone).toHaveBeenCalledWith(canvas(), image, {
      ink: '#111',
      spot: '#c00',
      dark: true,
    });
    expect(art.drawLinework).not.toHaveBeenCalled();
    expect(canvas().dataset.ready).toBe('true');
    expect(onStateChange).toHaveBeenCalledWith('true');
  });

  it('reads colours from CSS custom properties when none are passed', async () => {
    document.documentElement.style.setProperty('--brand-ink', 'rgb(1, 2, 3)');
    art.loadImage.mockResolvedValue({} as HTMLImageElement);
    await act(async () => {
      root.render(
        createElement(PrintPlate, {
          src: '/p.webp',
          treatment: 'linework',
          accentVar: '--brand-ink',
        }),
      );
    });
    expect(art.drawLinework).toHaveBeenCalledWith(canvas(), expect.anything(), 'rgb(1, 2, 3)');
    document.documentElement.style.removeProperty('--brand-ink');
  });

  it('logs a failed load loudly and marks the canvas failed', async () => {
    const error = new Error('Could not load plate /missing.webp');
    art.loadImage.mockRejectedValue(error);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onStateChange = vi.fn();
    await act(async () => {
      root.render(
        createElement(PrintPlate, { src: '/missing.webp', treatment: 'halftone', onStateChange }),
      );
    });
    expect(logged).toHaveBeenCalledWith('[print-plate]', error);
    expect(canvas().dataset.ready).toBe('failed');
    expect(onStateChange).toHaveBeenCalledWith('failed');
  });

  it('reports a drawing error (e.g. no 2D context) as failed instead of leaving it pending', async () => {
    art.loadImage.mockResolvedValue({} as HTMLImageElement);
    art.drawHalftone.mockImplementation(() => {
      throw new Error('2D canvas is unavailable');
    });
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await act(async () => {
      root.render(
        createElement(PrintPlate, {
          src: '/p.webp',
          treatment: 'halftone',
          ink: '#000',
          accent: '#f00',
        }),
      );
    });
    expect(logged).toHaveBeenCalled();
    expect(canvas().dataset.ready).toBe('failed');
  });

  it('does not draw after unmount (stale load)', async () => {
    let resolve: (image: HTMLImageElement) => void = () => undefined;
    art.loadImage.mockReturnValue(new Promise((r) => (resolve = r)));
    act(() => root.render(createElement(PrintPlate, { src: '/slow.webp', treatment: 'halftone' })));
    act(() => root.unmount());
    await act(async () => resolve({} as HTMLImageElement));
    expect(art.drawHalftone).not.toHaveBeenCalled();
    root = createRoot(host);
  });

  it('mock sanity: the module under test used the mocked loader', () => {
    expect(realLoadImage).toBe(art.loadImage);
  });
});
