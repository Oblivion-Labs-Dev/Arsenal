// Runs a document parser in a worker thread with its own memory cap and a time limit. Ported
// from Kaka packages/documents/src/isolated.ts.
//
// The worker receives `workerData = { bytes, format }` and must post exactly one message:
// `{ ok: true, result: ExtractedDocument }` or `{ ok: false, error: string }`. A typical worker
// calls `extractDocument(bytes, format, parsers)` with its own parsers.
import { Worker } from 'node:worker_threads';
import type { FileFormat } from './detect.js';
import { ParseError } from './extract.js';
import type { ExtractedDocument } from './text.js';

export type ParserLocation =
  | {
      /** Path to the built worker entry. */
      workerPath: string;
      /** e.g. ['--import', 'tsx'] for a TypeScript worker in tests. */
      execArgv?: string[];
    }
  /** The worker's CommonJS source, evaluated directly (no parser file unpacked on disk). */
  | { workerSource: string };

export type IsolationOptions = ParserLocation & { timeoutMs?: number; maxMemoryMb?: number };

type WorkerReply = { ok: true; result: ExtractedDocument } | { ok: false; error: string };

/**
 * A malformed or hostile file that makes a parser spin or balloon is killed and reported as a
 * `ParseError`; it cannot take the process down with it.
 */
export function extractIsolated(
  bytes: Uint8Array,
  format: FileFormat,
  options: IsolationOptions,
): Promise<ExtractedDocument> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  return new Promise((resolve, reject) => {
    const limits = {
      workerData: { bytes, format },
      resourceLimits: { maxOldGenerationSizeMb: options.maxMemoryMb ?? 512 },
    };
    const worker =
      'workerSource' in options
        ? new Worker(options.workerSource, { ...limits, eval: true })
        : new Worker(options.workerPath, {
            ...limits,
            ...(options.execArgv ? { execArgv: options.execArgv } : {}),
          });
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      fn();
    };
    const timer = setTimeout(
      () =>
        finish(() =>
          reject(
            new ParseError('Reading this file took too long. Try saving it again, or as a PDF.'),
          ),
        ),
      timeoutMs,
    );
    worker.once('message', (message: WorkerReply) =>
      finish(() =>
        message.ok
          ? resolve(message.result)
          : reject(
              new ParseError(
                `This file could not be read (${message.error}). Try saving it again, or as a PDF.`,
              ),
            ),
      ),
    );
    worker.once('error', (error: Error) =>
      finish(() =>
        reject(
          new ParseError(
            /memory/i.test(error.message)
              ? 'This file needs more memory to read than is allowed. Try a smaller or simpler file.'
              : `This file could not be read (${error.message}).`,
            { cause: error },
          ),
        ),
      ),
    );
    worker.once('exit', (code) =>
      finish(() => reject(new ParseError(`The file reader stopped unexpectedly (code ${code}).`))),
    );
  });
}
