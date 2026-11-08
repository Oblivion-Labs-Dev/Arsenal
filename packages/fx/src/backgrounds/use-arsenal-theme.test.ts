import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { useArsenalTheme } from './use-arsenal-theme';

function Probe() {
  const theme = useArsenalTheme('auto');
  return createElement('span', null, `${theme.scheme}:${theme.violet.join(',')}`);
}

const g = globalThis as Record<string, unknown>;
const saved = { window: g.window, document: g.document, getComputedStyle: g.getComputedStyle };

afterEach(() => Object.assign(g, saved));

describe('useArsenalTheme', () => {
  it('renders the same first frame in the browser as on the server, so hydration matches', () => {
    const server = renderToString(createElement(Probe));

    // A light Arsenal page with its own accent: the browser could read these, the server cannot.
    const vars: Record<string, string> = {
      '--arsenal-background': '#fbfaf7',
      '--arsenal-accent-violet': '#ff0000',
    };
    g.document = { documentElement: {} };
    g.window = { matchMedia: () => ({ matches: true }) };
    g.getComputedStyle = () => ({ getPropertyValue: (name: string) => vars[name] ?? '' });

    expect(renderToString(createElement(Probe))).toBe(server);
  });
});
