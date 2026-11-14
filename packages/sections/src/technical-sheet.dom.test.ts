// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TechnicalSheet,
  fit,
  validateTechnicalSheet,
  type TechnicalSheetProps,
} from './technical-sheet';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The redesign's own pipeline (src/designs/blueprint/HeroDrawing.tsx), trimmed to three nodes.
const base: TechnicalSheetProps = {
  ariaLabel: 'Reference architecture drawn as a technical sheet',
  nodes: [
    { id: 'gateway', name: 'Gateway', meta: 'API EDGE', x: 40, y: 70 },
    { id: 'policy', name: 'Policy', meta: 'GUARDRAILS', x: 325, y: 70 },
    { id: 'ingest', name: 'Ingest', x: 610, y: 70 },
  ],
  rows: [{ id: 'ingestion', label: 'INGESTION', x: 40, y: 70 }],
  requests: [
    { id: 'gateway>policy', d: 'M190 98 H325', label: 'AUTHORIZE', labelX: 257, labelY: 92 },
    { id: 'policy>ingest', d: 'M475 98 H610', label: 'ADMIT', labelX: 542, labelY: 92 },
  ],
  responses: [{ id: 'ingest>gateway', d: 'M610 120 H190' }],
  telemetry: ['M70 126 V410'],
  trip: ['gateway>policy', 'policy>ingest', 'ingest>gateway'],
  titleBlock: {
    x: 560,
    y: 404,
    title: 'AI REQUEST PIPELINE',
    sheet: 'SHEET 01 / 01',
    scale: 'SCALE NTS',
  },
  dimension: { label: 'REQUEST PATH · 3 SERVICES', from: 40, to: 760, y: 34 },
};

describe('fit', () => {
  it('squeezes only text that would overflow and rejects bad sizes', () => {
    expect(fit('short', 7.8, 126)).toEqual({});
    expect(fit('a much longer service name', 7.8, 126)).toEqual({
      textLength: 126,
      lengthAdjust: 'spacingAndGlyphs',
    });
    expect(() => fit('x', 0, 10)).toThrow(RangeError);
    expect(() => fit('x', 1, Number.NaN)).toThrow(RangeError);
  });
});

describe('validateTechnicalSheet', () => {
  it('accepts the reference pipeline', () => {
    expect(() => validateTechnicalSheet(base)).not.toThrow();
  });
  it('rejects duplicate ids, unknown trip legs and bad sizes', () => {
    expect(() =>
      validateTechnicalSheet({ ...base, nodes: [...base.nodes, base.nodes[0]] }),
    ).toThrow(/duplicate node id "gateway"/);
    expect(() =>
      validateTechnicalSheet({ ...base, responses: [{ id: 'gateway>policy', d: 'M0 0' }] }),
    ).toThrow(/duplicate edge id/);
    expect(() => validateTechnicalSheet({ ...base, trip: ['nowhere'] })).toThrow(
      /trip leg "nowhere"/,
    );
    expect(() => validateTechnicalSheet({ ...base, width: 0 })).toThrow(RangeError);
    expect(() => validateTechnicalSheet({ ...base, legSeconds: -1 })).toThrow(RangeError);
    expect(() => validateTechnicalSheet({ ...base, advance: { name: 0 } })).toThrow(RangeError);
    expect(() => validateTechnicalSheet({ ...base, ariaLabel: ' ' })).toThrow(TypeError);
    expect(() =>
      validateTechnicalSheet({ ...base, nodes: [{ id: 'a', name: 'A', x: Number.NaN, y: 0 }] }),
    ).toThrow(TypeError);
  });
  it('the component throws on the same input', () => {
    expect(() =>
      renderToStaticMarkup(createElement(TechnicalSheet, { ...base, trip: ['nowhere'] })),
    ).toThrow(TypeError);
  });
});

describe('TechnicalSheet (server render)', () => {
  const html = renderToStaticMarkup(createElement(TechnicalSheet, base));

  it('draws every part with pathLength=1 ink and per-instance marker ids', () => {
    expect(html).toContain('viewBox="0 0 800 530"');
    expect(html).toContain('role="group"');
    expect(html.match(/pathLength="1"/g)?.length).toBe(1 + 1 + 2 + 3 + 1); // frame, dim, requests, boxes, title
    expect(html).toContain('01 · INGESTION');
    expect(html).toContain('AUTHORIZE');
    expect(html).toContain('REQUEST PATH · 3 SERVICES');
    expect(html).toContain('SCALE NTS');
    const marker = /<marker id="([^"]+)"/.exec(html)?.[1];
    expect(marker).toMatch(/^[a-zA-Z0-9_-]+-arrow$/);
    expect(html).toContain(`marker-end="url(#${marker})"`);
  });

  it('makes nodes keyboard-operable buttons', () => {
    expect(html.match(/role="button"/g)).toHaveLength(3);
    expect(html.match(/tabindex="0"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Inspect Gateway"');
  });

  it('never ships packets from the server (motion is decided on the client)', () => {
    expect(html).not.toContain('<circle');
  });
});

describe('TechnicalSheet (client)', () => {
  let host: HTMLDivElement;
  let root: Root;
  let reduce = false;

  beforeEach(() => {
    reduce = false;
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce') ? reduce : false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it('walks one packet per trip leg when motion is allowed', () => {
    act(() => root.render(createElement(TechnicalSheet, base)));
    const circles = host.querySelectorAll('circle.arsenal-tsheet__packet');
    expect(circles).toHaveLength(3);
    expect(circles[2].querySelector('animateMotion')?.getAttribute('path')).toBe('M610 120 H190');
  });

  it('renders no packets under reduced motion', () => {
    reduce = true;
    act(() => root.render(createElement(TechnicalSheet, base)));
    expect(host.querySelector('circle')).toBeNull();
    act(() => root.render(createElement(TechnicalSheet, { ...base, reducedMotion: false })));
    expect(host.querySelectorAll('circle')).toHaveLength(3);
  });

  it('selects with Enter and Space, tracks hover, and shows the failed state', () => {
    const onSelect = vi.fn();
    const onHover = vi.fn();
    act(() =>
      root.render(createElement(TechnicalSheet, { ...base, onSelect, onHover, failed: 'ingest' })),
    );
    const policy = host.querySelector<SVGGElement>('[data-node="policy"]')!;
    act(() => {
      policy.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      policy.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      policy.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith('policy');
    act(() => policy.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
    expect(onHover).toHaveBeenLastCalledWith('policy');
    expect(policy.getAttribute('data-state')).toBe('hover');
    expect(host.querySelector('[data-node="ingest"]')!.getAttribute('data-state')).toBe('failed');
  });
});
