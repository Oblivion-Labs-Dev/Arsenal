/**
 * Real-user page-load timing from the browser's Navigation Timing entry (from Sutra `timing.ts`).
 * A reused keep-alive/HTTP2 connection has no DNS/TCP/TLS phase: those read as 0, which is normal.
 */

export interface PageTiming {
  path: string;
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  ttfbMs: number;
  downloadMs: number;
  domReadyMs: number;
  totalMs: number;
}

export type NavigationTimingLike = Pick<
  PerformanceNavigationTiming,
  | 'name'
  | 'loadEventEnd'
  | 'domainLookupStart'
  | 'domainLookupEnd'
  | 'connectStart'
  | 'connectEnd'
  | 'secureConnectionStart'
  | 'requestStart'
  | 'responseStart'
  | 'responseEnd'
  | 'domContentLoadedEventEnd'
>;

/** Null while the load has not finished yet (`loadEventEnd` still 0). */
export function pageTimingFromEntry(entry: NavigationTimingLike): PageTiming | null {
  if (!(entry.loadEventEnd > 0)) return null;
  const ms = (v: number) => Math.max(0, Math.round(v));
  let path: string;
  try {
    path = new URL(entry.name).pathname;
  } catch {
    path = entry.name;
  }
  return {
    path,
    dnsMs: ms(entry.domainLookupEnd - entry.domainLookupStart),
    tcpMs: ms(entry.connectEnd - entry.connectStart),
    tlsMs: entry.secureConnectionStart > 0 ? ms(entry.connectEnd - entry.secureConnectionStart) : 0,
    ttfbMs: ms(entry.responseStart - entry.requestStart),
    downloadMs: ms(entry.responseEnd - entry.responseStart),
    domReadyMs: ms(entry.domContentLoadedEventEnd - entry.responseEnd),
    totalMs: ms(entry.loadEventEnd),
  };
}

/**
 * Reports this page load once, just after `load` so `loadEventEnd` is populated.
 * `target` is either a URL (sent with `navigator.sendBeacon`, falling back to a keepalive POST)
 * or a callback that receives the timing.
 */
export function reportPageTiming(
  target: string | ((timing: PageTiming) => void),
  options: { onError?: (error: unknown) => void } = {},
): void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;
  const onError =
    options.onError ?? ((e: unknown) => console.warn('[pageTiming] report failed', e));

  const post = (timing: PageTiming): void => {
    if (typeof target === 'function') {
      target(timing);
      return;
    }
    const body = JSON.stringify(timing);
    const sent =
      typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
        ? navigator.sendBeacon(target, new Blob([body], { type: 'application/json' }))
        : false;
    if (!sent) {
      void fetch(target, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      })
        .then((res) => {
          if (!res.ok) onError(new Error(`Timing report failed (${res.status})`));
        })
        .catch(onError);
    }
  };

  const send = (): void => {
    try {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const timing = entry ? pageTimingFromEntry(entry) : null;
      if (timing) post(timing);
    } catch (err) {
      onError(err);
    }
  };
  if (document.readyState === 'complete') setTimeout(send, 0);
  else window.addEventListener('load', () => setTimeout(send, 0), { once: true });
}
