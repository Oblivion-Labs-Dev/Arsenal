// Background-job failure helpers. Ported from Kaka apps/api/src/jobs/runner.ts (the queue itself
// is tied to Kaka's database and is not part of this port).

/** A failure retrying cannot fix (bad input, unsupported file). The message is user-facing. */
export class PermanentJobError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PermanentJobError';
  }
}

const LEAKS = /failed query|params:|insert into|update .* set|violates|duplicate key|syntax error/i;

/**
 * The failure text that is stored, shown and logged. Handlers write user-facing messages;
 * anything else that may quote SQL or user data (a database error with the inserted row) is
 * reduced to its error code.
 */
export function safeMessage(
  error: unknown,
  fallback = 'Something went wrong while processing this. Please retry.',
): string {
  if (error instanceof PermanentJobError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  if (!LEAKS.test(message) && message.length <= 300) return message;
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return typeof code === 'string' ? `${fallback} (database error ${code})` : fallback;
}
