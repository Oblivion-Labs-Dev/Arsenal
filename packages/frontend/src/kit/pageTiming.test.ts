import { describe, it, expect } from 'vitest';
import { pageTimingFromEntry, type NavigationTimingLike } from './pageTiming.js';

const entry = (over: Partial<NavigationTimingLike> = {}): NavigationTimingLike =>
  ({
    name: 'https://site.test/docs?x=1',
    domainLookupStart: 1,
    domainLookupEnd: 11,
    connectStart: 11,
    connectEnd: 41,
    secureConnectionStart: 21,
    requestStart: 42,
    responseStart: 92,
    responseEnd: 102,
    domContentLoadedEventEnd: 202,
    loadEventEnd: 302,
    startTime: 0,
    ...over,
  }) as NavigationTimingLike;

describe('pageTimingFromEntry', () => {
  it('returns null before load finishes', () => {
    expect(pageTimingFromEntry(entry({ loadEventEnd: 0 }))).toBeNull();
  });

  it('derives non-negative phases and a total', () => {
    const t = pageTimingFromEntry(entry());
    expect(t).not.toBeNull();
    expect(t?.dnsMs).toBe(10);
    expect(t?.ttfbMs).toBeGreaterThan(0);
    expect(t?.totalMs).toBeGreaterThan(0);
    for (const v of Object.values(t ?? {}))
      if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
  });
});
