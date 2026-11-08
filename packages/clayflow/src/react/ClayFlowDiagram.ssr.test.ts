// @vitest-environment jsdom
import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nodesArchitectureSpec } from './gallery-specs.js';

// Next.js server-renders the diagram, then the client hydrates it. The runtime must not touch the
// server HTML before hydration, or React reports a mismatch (it did: the runtime's auto-mount
// rewrote data-cf-active-layout on import).
describe('ClayFlowDiagram server rendering', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    delete (window as { ClayFlow?: unknown }).ClayFlow;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('hydrates server HTML without a mismatch and mounts afterwards', async () => {
    const spec = nodesArchitectureSpec;
    const { ClayFlowDiagram: ServerDiagram } = await import('./ClayFlowDiagram.js');
    const serverHtml = renderToString(createElement(ServerDiagram, { spec }));
    delete (window as { ClayFlow?: unknown }).ClayFlow;
    document.head.innerHTML = '';

    const root = document.createElement('div');
    root.innerHTML = serverHtml;
    document.body.appendChild(root);
    const before = root.innerHTML;

    vi.resetModules();
    const { ClayFlowDiagram } = await import('./ClayFlowDiagram.js');
    expect(root.innerHTML).toBe(before);

    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      hydrateRoot(root, createElement(ClayFlowDiagram, { spec }));
    });
    expect(
      errors.mock.calls.map((c) => String(c[0])).filter((m) => /hydrat|match/i.test(m)),
    ).toEqual([]);
    expect((root.querySelector('.cf') as HTMLElement & { _cf?: unknown })._cf).toBeDefined();
  });
});
