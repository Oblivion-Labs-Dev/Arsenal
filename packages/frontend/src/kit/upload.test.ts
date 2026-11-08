import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '../fetch/apiError.js';
import { uploadWithProgress, type XhrLike } from './upload.js';

class FakeXhr implements XhrLike {
  upload: XhrLike['upload'] = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  withCredentials = false;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: FormData | null = null;
  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(k: string, v: string): void {
    this.headers[k] = v;
  }
  send(body: FormData): void {
    this.body = body;
  }
  abort(): void {
    this.onabort?.();
  }
}

const file = () => new Blob(['hello'], { type: 'text/plain' });

describe('uploadWithProgress', () => {
  it('sends the form, reports progress and resolves with parsed JSON', async () => {
    const xhr = new FakeXhr();
    const onProgress = vi.fn();
    const p = uploadWithProgress({
      url: '/up',
      file: file(),
      fileName: 'a.txt',
      fields: { kind: 'doc' },
      onProgress,
      headers: { 'x-csrf': 't' },
      xhrFactory: () => xhr,
    });
    expect(xhr.method).toBe('POST');
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers['x-csrf']).toBe('t');
    expect(xhr.body?.get('kind')).toBe('doc');
    expect((xhr.body?.get('file') as File).name).toBe('a.txt');
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 5, total: 0 });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(0.5);
    xhr.status = 201;
    xhr.responseText = '{"id":7}';
    xhr.onload?.();
    await expect(p).resolves.toEqual({ id: 7 });
  });

  it('rejects non-2xx with ApiError carrying the server message', async () => {
    const xhr = new FakeXhr();
    const p = uploadWithProgress({ url: '/up', file: file(), xhrFactory: () => xhr });
    xhr.status = 413;
    xhr.responseText = '{"error":"Too large"}';
    xhr.onload?.();
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(413);
    expect((err as ApiError).message).toBe('Too large');
  });

  it('rejects network errors with status 0, and aborts via signal', async () => {
    const xhr = new FakeXhr();
    const p = uploadWithProgress({ url: '/up', file: file(), xhrFactory: () => xhr });
    xhr.onerror?.();
    const err = await p.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);

    const controller = new AbortController();
    const xhr2 = new FakeXhr();
    const p2 = uploadWithProgress({
      url: '/up',
      file: file(),
      signal: controller.signal,
      xhrFactory: () => xhr2,
    });
    controller.abort();
    await expect(p2).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      uploadWithProgress({
        url: '/up',
        file: file(),
        signal: controller.signal,
        xhrFactory: () => new FakeXhr(),
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
