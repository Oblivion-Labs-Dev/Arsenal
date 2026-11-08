// A catch-all reverse proxy for framework route handlers (Next.js app router `[...path]` style),
// ported from the CareerOS API proxy route. Forwards method, query, headers and body to a backend
// base URL and streams the response back. Failures become a generic 503 (no internal detail is
// leaked to the client) and are always reported through `onError`.
import { gzipSync } from 'node:zlib';

export interface ProxyRouteContext {
  params: Promise<{ path: string[] }> | { path: string[] };
}

export type ProxyHandler = (request: Request, context: ProxyRouteContext) => Promise<Response>;

export interface ProxyRouteOptions {
  /** Backend origin (and optional prefix), e.g. "http://127.0.0.1:8000/api". */
  baseUrl: string;
  /** Injected for tests; defaults to global fetch. */
  fetch?: typeof fetch;
  /** Called with every upstream or stream failure. Without it, failures go to console.error. */
  onError?: (error: unknown, info: { method: string; target: string }) => void;
  /** Body of the 503 JSON response. */
  unavailableMessage?: string;
}

const STRIPPED_REQUEST_HEADERS = ['host', 'origin', 'referer', 'connection', 'content-length'];
// fetch already decoded the body, so the upstream encoding and length no longer describe it.
const STRIPPED_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding'];

function guardedStream(
  body: ReadableStream<Uint8Array>,
  report: (error: unknown) => void,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        report(error);
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/** Builds `{ GET, POST, PUT, PATCH, DELETE }` handlers that proxy to `baseUrl`. */
export function createProxyRoute(
  options: ProxyRouteOptions,
): Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', ProxyHandler> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const report =
    options.onError ??
    ((error: unknown, info: { method: string; target: string }) =>
      console.error(`[proxy] ${info.method} ${info.target} failed`, error));
  const unavailable = options.unavailableMessage ?? 'Service temporarily unavailable';

  const handler: ProxyHandler = async (request, context) => {
    const { path } = await context.params;
    const incoming = new URL(request.url);
    const target = `${base}/${path.map(encodeURIComponent).join('/')}${incoming.search}`;
    const info = { method: request.method, target };
    try {
      const headers = new Headers(request.headers);
      for (const name of STRIPPED_REQUEST_HEADERS) headers.delete(name);
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const upstream = await (options.fetch ?? fetch)(target, {
        method: request.method,
        headers,
        body: hasBody ? await request.arrayBuffer() : null,
        redirect: 'manual',
      });
      const responseHeaders = new Headers(upstream.headers);
      for (const name of STRIPPED_RESPONSE_HEADERS) responseHeaders.delete(name);

      const contentType = upstream.headers.get('content-type') ?? '';
      const acceptsGzip = /\bgzip\b/i.test(request.headers.get('accept-encoding') ?? '');
      if (contentType.includes('application/json') && acceptsGzip && upstream.body) {
        const raw = new Uint8Array(await upstream.arrayBuffer());
        const zipped = gzipSync(raw);
        responseHeaders.set('content-encoding', 'gzip');
        responseHeaders.set('content-length', String(zipped.byteLength));
        responseHeaders.append('vary', 'accept-encoding');
        return new Response(zipped, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: responseHeaders,
        });
      }
      const body = upstream.body
        ? guardedStream(upstream.body, (error) => report(error, info))
        : null;
      return new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      report(error, info);
      return Response.json({ error: unavailable }, { status: 503 });
    }
  };

  return { GET: handler, POST: handler, PUT: handler, PATCH: handler, DELETE: handler };
}
