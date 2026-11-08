// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { transitionSurface } from './surface-transition';
import { revealTheme } from './theme-reveal';

/** A transition the browser skipped: every promise rejects, as Chrome does when a new one starts. */
function stubSkippedTransition() {
  const abort = () => Promise.reject(new DOMException('Transition was skipped', 'AbortError'));
  (document as unknown as { startViewTransition: unknown }).startViewTransition = (
    cb: () => void,
  ) => {
    cb();
    return { finished: abort(), ready: abort(), updateCallbackDone: abort() };
  };
}

async function unhandledDuring(run: () => Promise<void>) {
  const seen: unknown[] = [];
  const onUnhandled = (reason: unknown) => seen.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    await run();
    await new Promise((r) => setTimeout(r, 20));
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
  return seen;
}

afterEach(() => {
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
});

describe('skipped view transitions', () => {
  it('revealTheme applies the change and leaves no unhandled rejection', async () => {
    stubSkippedTransition();
    let applied = false;
    const seen = await unhandledDuring(() => revealTheme(() => (applied = true)));
    expect(applied).toBe(true);
    expect(seen).toEqual([]);
    expect(document.documentElement.classList.contains('theme-reveal')).toBe(false);
  });

  it('transitionSurface applies the change and leaves no unhandled rejection', async () => {
    stubSkippedTransition();
    let applied = false;
    const seen = await unhandledDuring(() =>
      transitionSurface(() => (applied = true), { flush: false }),
    );
    expect(applied).toBe(true);
    expect(seen).toEqual([]);
  });
});
