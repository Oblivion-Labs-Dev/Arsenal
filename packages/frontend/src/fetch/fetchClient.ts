export interface FetchClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  /** Default request timeout in ms. */
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface FetchRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

export interface FetchResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Minimal typed fetch wrapper for browser and SSR-safe HTTP calls.
 * Does not attach secrets — callers pass auth headers explicitly.
 */
export class FetchClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeoutMs?: number;
  private readonly fetchFn: typeof fetch;

  constructor(options: FetchClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");
    this.defaultHeaders = options.headers ?? {};
    this.timeoutMs = options.timeoutMs;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /** Perform a typed HTTP request. */
  async request<T>(path: string, options: FetchRequestOptions = {}): Promise<FetchResponse<T>> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string> | undefined),
    };

    let body: BodyInit | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    try {
      const res = await this.fetchFn(url, {
        ...options,
        headers,
        body,
        signal: options.signal ?? controller.signal,
      });

      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? ((await res.json()) as T)
        : ((await res.text()) as unknown as T);

      return { ok: res.ok, status: res.status, data };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  get<T>(path: string, options?: FetchRequestOptions): Promise<FetchResponse<T>> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options?: FetchRequestOptions): Promise<FetchResponse<T>> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }
}

/** Default fetch client instance (no base URL). */
export const fetchClient = new FetchClient();
