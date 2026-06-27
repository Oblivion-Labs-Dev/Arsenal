/** Application error with HTTP status and optional error code. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { statusCode?: number; code?: string; details?: unknown; cause?: Error } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details;
  }

  /** Serialize to a JSON-safe object for API responses. */
  toJSON(): { message: string; code: string; statusCode: number; details?: unknown } {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

/** Type guard for AppError instances. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
