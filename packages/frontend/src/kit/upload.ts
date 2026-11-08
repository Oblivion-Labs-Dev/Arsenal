/**
 * Multipart upload with progress events (from Kaka `api.ts` `uploadFile`).
 * `fetch` cannot report upload progress, so this uses XMLHttpRequest.
 */
import { ApiError } from '../fetch/apiError.js';

export interface XhrLike {
  upload: {
    onprogress: ((ev: { lengthComputable: boolean; loaded: number; total: number }) => void) | null;
  };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  status: number;
  responseText: string;
  withCredentials: boolean;
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body: FormData): void;
  abort(): void;
}

export interface UploadOptions {
  url: string;
  file: Blob;
  /** File name sent with the part; defaults to `File.name` when the blob is a File. */
  fileName?: string;
  fieldName?: string;
  fields?: Record<string, string>;
  /** Fraction in [0, 1]. Only called when the browser knows the total size. */
  onProgress?: (fraction: number) => void;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  method?: 'POST' | 'PUT';
  xhrFactory?: () => XhrLike;
}

const parseBody = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const messageOf = (body: unknown, status: number): string => {
  if (body && typeof body === 'object') {
    const b = body as { error?: unknown; message?: unknown; detail?: unknown };
    for (const v of [b.error, b.message, b.detail]) if (typeof v === 'string' && v) return v;
  }
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 200);
  return `Upload failed (${status})`;
};

/** Resolves with the parsed JSON (or text) body; rejects with `ApiError` (status 0 = network) or an AbortError. */
export function uploadWithProgress(options: UploadOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Upload aborted', 'AbortError'));
      return;
    }
    const xhr = options.xhrFactory
      ? options.xhrFactory()
      : (new XMLHttpRequest() as unknown as XhrLike);
    const form = new FormData();
    for (const [k, v] of Object.entries(options.fields ?? {})) form.append(k, v);
    const name =
      options.fileName ??
      (typeof File !== 'undefined' && options.file instanceof File ? options.file.name : 'blob');
    form.append(options.fieldName ?? 'file', options.file, name);

    const onAbortSignal = (): void => xhr.abort();
    const cleanup = (): void => options.signal?.removeEventListener('abort', onAbortSignal);
    options.signal?.addEventListener('abort', onAbortSignal, { once: true });

    xhr.open(options.method ?? 'POST', options.url);
    xhr.withCredentials = options.withCredentials ?? true;
    for (const [k, v] of Object.entries(options.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0)
        options.onProgress?.(Math.min(1, ev.loaded / ev.total));
    };
    xhr.onload = () => {
      cleanup();
      const body = parseBody(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new ApiError(messageOf(body, xhr.status), { status: xhr.status, body }));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new ApiError('Network error during upload', { status: 0 }));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };
    xhr.send(form);
  });
}
