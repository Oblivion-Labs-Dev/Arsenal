// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderClayFlow } from './render.js';
import { CLAYFLOW_RUNTIME } from './runtime.js';
import { diagramSchema } from './schema.js';
import { compile } from './timeline.js';

let frameCb: ((now: number) => void) | null = null;

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: (now: number) => void) => {
    frameCb = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frameCb = null;
  });
  // jsdom has no SVG geometry: a 100px straight wire along x is enough to read packet progress.
  const proto = (window as unknown as { SVGElement: { prototype: Record<string, unknown> } })
    .SVGElement.prototype;
  proto.getTotalLength = () => 100;
  proto.getPointAtLength = (l: number) => ({ x: l, y: 0 });
  new Function(CLAYFLOW_RUNTIME)();
});

/** Advance the runtime clock by `ms` through its own requestAnimationFrame loop. */
function advance(ms: number) {
  frameCb?.(1000);
  frameCb?.(1000 + ms);
}

const spec = diagramSchema.parse({
  schemaVersion: '1.0',
  id: 'packets',
  title: 'Packets',
  nodes: [
    { id: 'a', kind: 'process', label: 'A' },
    { id: 'b', kind: 'process', label: 'B' },
    { id: 'c', kind: 'process', label: 'C' },
  ],
  edges: [
    { id: 'p1', from: 'a', to: 'b', kind: 'parallel' },
    { id: 'p2', from: 'a', to: 'b', kind: 'parallel' },
    { id: 'bi', from: 'b', to: 'c', bidirectional: true },
  ],
  animation: {
    preset: 'step-reveal',
    steps: [
      { caption: 'Fan out', highlight: ['a', 'b'], packets: [{ edge: 'p1' }, { edge: 'p2' }] },
      { caption: 'Sync', highlight: ['b', 'c'], packets: [{ edge: 'bi' }] },
    ],
  },
});

function mountAt(packetEdge: string) {
  const host = document.createElement('div');
  host.innerHTML = renderClayFlow(spec);
  document.body.appendChild(host);
  const fig = host.querySelector<HTMLElement>('.cf')!;
  window.ClayFlow!.mount(fig);
  const api = window.ClayFlow!.get(fig)!;
  const idx = compile(spec).findIndex((f) => f.packets.some((p) => p.edge === packetEdge));
  expect(idx).toBeGreaterThanOrEqual(0);
  api.seek(idx);
  api.play();
  advance(300);
  api.pause();
  const packets = (edge: string) => [
    ...fig.querySelectorAll<SVGCircleElement>(`.cf-edge[data-edge="${edge}"] .cf-packet`),
  ];
  return { packets };
}

describe('runtime packets', () => {
  it('moves a second packet the opposite way on bidirectional edges', () => {
    const { packets } = mountAt('bi');
    const [fwd, rev] = packets('bi');
    expect(rev!.hasAttribute('data-reverse')).toBe(true);
    expect(fwd!.style.opacity).toBe('1');
    expect(rev!.style.opacity).toBe('1');
    const fx = Number(fwd!.getAttribute('cx'));
    const rx = Number(rev!.getAttribute('cx'));
    expect(fx).toBeGreaterThan(0);
    expect(fx).toBeLessThan(50);
    expect(rx).toBeCloseTo(100 - fx, 1);
  });

  it('staggers packets on parallel wires so they do not travel in lockstep', () => {
    const { packets } = mountAt('p1');
    const x1 = Number(packets('p1')[0]!.getAttribute('cx'));
    const x2 = Number(packets('p2')[0]!.getAttribute('cx'));
    expect(x1).toBeGreaterThan(0);
    expect(x1).toBeGreaterThan(x2);
  });
});
