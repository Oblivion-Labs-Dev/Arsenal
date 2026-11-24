import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GalaxyScene } from './GalaxyScene';
import { ImmersiveBackground } from './ImmersiveBackground';
import { InfinityMark } from './InfinityMark';
import { InfinityScene } from './InfinityScene';
import { SpotlightCard } from './SpotlightCard';

describe('InfinityMark', () => {
  it('is decorative by default and labelled when given a title', () => {
    const plain = renderToStaticMarkup(createElement(InfinityMark));
    expect(plain).toMatch(/^<svg /);
    expect(plain).toContain('aria-hidden="true"');
    expect(plain).not.toContain('role="img"');

    const named = renderToStaticMarkup(createElement(InfinityMark, { title: 'Infinity' }));
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Infinity"');
    expect(named).not.toContain('aria-hidden');
  });

  it('gives each instance its own gradient ids so two marks on a page do not clash', () => {
    const html = renderToStaticMarkup(
      createElement('div', null, createElement(InfinityMark), createElement(InfinityMark)),
    );
    const ids = [...html.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('drops the halo when asked', () => {
    const withHalo = renderToStaticMarkup(createElement(InfinityMark));
    const without = renderToStaticMarkup(createElement(InfinityMark, { halo: false }));
    expect(withHalo).toContain('<ellipse');
    expect(without).not.toContain('<ellipse');
  });
});

describe('InfinityScene', () => {
  it('renders a decorative, non-interactive wrapper around one canvas', () => {
    const html = renderToStaticMarkup(createElement(InfinityScene));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('pointer-events:none');
    expect(html.match(/<canvas/g)).toHaveLength(1);
  });

  it('uses additive glow on dark pages and none on light pages', () => {
    const dark = renderToStaticMarkup(createElement(InfinityScene, { palette: 'dark' }));
    const light = renderToStaticMarkup(createElement(InfinityScene, { palette: 'light' }));
    expect(dark).toContain('mix-blend-mode:screen');
    expect(light).not.toContain('mix-blend-mode:screen');
  });

  it('fades into the given background colour and can drop the grain', () => {
    const html = renderToStaticMarkup(
      createElement(InfinityScene, { background: '#102030', grain: false }),
    );
    expect(html).toContain('rgba(16, 32, 48, 0.68)');
    expect(html).not.toContain('feTurbulence');
  });
});

describe('GalaxyScene', () => {
  it('paints a backdrop by default and none when turned off', () => {
    const withBackdrop = renderToStaticMarkup(
      createElement(GalaxyScene, { background: '#0a0b0c' }),
    );
    const bare = renderToStaticMarkup(
      createElement(GalaxyScene, { background: '#0a0b0c', backdrop: false }),
    );
    expect(withBackdrop).toContain('rgba(10, 11, 12, 1) 52%');
    expect(bare).not.toContain('rgba(10, 11, 12, 1) 52%');
    expect(withBackdrop.match(/<canvas/g)).toHaveLength(1);
  });

  it('fades out before its edges on light pages so it is never a tinted box', () => {
    const light = renderToStaticMarkup(createElement(GalaxyScene, { palette: 'light' }));
    const dark = renderToStaticMarkup(createElement(GalaxyScene, { palette: 'dark' }));
    const rootStyle = (html: string) => html.slice(0, html.indexOf('>'));
    expect(rootStyle(light)).toContain('mask-image:radial-gradient(ellipse 50% 50%');
    expect(rootStyle(dark)).not.toContain('mask-image');
  });
});

describe('ImmersiveBackground', () => {
  it('pins to the viewport by default and fills its parent otherwise', () => {
    const pinned = renderToStaticMarkup(createElement(ImmersiveBackground));
    const local = renderToStaticMarkup(createElement(ImmersiveBackground, { fixed: false }));
    expect(pinned).toMatch(/^<div aria-hidden="true" style="position:fixed/);
    expect(local).toMatch(/^<div aria-hidden="true" style="position:absolute/);
  });

  it('leaves out the particle canvas when particles are off', () => {
    const on = renderToStaticMarkup(createElement(ImmersiveBackground));
    const off = renderToStaticMarkup(createElement(ImmersiveBackground, { particles: false }));
    expect(on).toContain('<canvas');
    expect(off).not.toContain('<canvas');
  });
});

describe('SpotlightCard', () => {
  it('renders its children above three decorative light layers and passes props through', () => {
    const html = renderToStaticMarkup(
      createElement(SpotlightCard, { id: 'card', className: 'x' }, 'Hello'),
    );
    expect(html).toMatch(/^<div id="card" class="x"/);
    expect(html).toContain('Hello');
    expect(html.match(/<span aria-hidden="true"/g)).toHaveLength(3);
  });

  it('is a solid light surface on light pages, not translucent white-on-dark glass', () => {
    const light = renderToStaticMarkup(createElement(SpotlightCard, { palette: 'light' }, 'A'));
    const dark = renderToStaticMarkup(createElement(SpotlightCard, { palette: 'dark' }, 'A'));
    expect(light).toContain(', 0.96)');
    expect(dark).toContain(', 0.075)');
    expect(light).not.toContain('mix-blend-mode:screen');
  });
});
