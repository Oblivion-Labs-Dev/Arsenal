/** HTTP API error with status code and parsed response body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, options: { status?: number; body?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.body = options.body;
  }
}

/** Type guard for ApiError instances. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
