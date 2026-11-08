import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// Spawning a CLI safely, ported from Sutra packages/ai/src/run-cli.ts: never through a shell,
// arguments as argv, untrusted input on stdin, bounded by a timeout (and by the caller's abort
// signal), and with the run directory created first so spawn cannot fail with ENOENT.

export interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Thrown when the child outlives its time limit; the child is killed first. */
export class CliTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`CLI timed out after ${timeoutMs}ms`);
    this.name = 'CliTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export type RunCli = (
  args: string[],
  stdin: string,
  cwd: string,
  timeoutMs: number,
  signal?: AbortSignal,
  /** Replaces the inherited environment, e.g. to keep a paid API key away from a CLI. */
  env?: NodeJS.ProcessEnv,
) => Promise<CliResult>;

const spawnOnce = (
  exe: string,
  rest: string[],
  stdin: string,
  cwd: string,
  timeoutMs: number,
  signal?: AbortSignal,
  env?: NodeJS.ProcessEnv,
) =>
  new Promise<CliResult>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    mkdirSync(cwd, { recursive: true });
    // Never `shell: true`: a path with spaces stays one argument and nothing in the input can
    // be read as a command.
    const child = spawn(exe, rest, {
      cwd,
      shell: false,
      windowsHide: true,
      ...(env ? { env } : {}),
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new CliTimeoutError(timeoutMs));
    }, timeoutMs);
    const abort = () => {
      clearTimeout(timer);
      child.kill('SIGTERM');
      reject(signal!.reason);
    };
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    // A child that exits before reading stdin makes the pipe error with EPIPE; the exit code
    // and stderr already report what went wrong, so that one error is not the failure.
    child.stdin.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') reject(err);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(stdin);
  });

const isMissing = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

export const runCli: RunCli = async (args, stdin, cwd, timeoutMs, signal, env) => {
  const [exe, ...rest] = args;
  if (!exe) throw new Error('runCli needs at least the executable in args');
  try {
    return await spawnOnce(exe, rest, stdin, cwd, timeoutMs, signal, env);
  } catch (error) {
    // On Windows many CLIs are .cmd shims that spawn cannot run without the extension.
    if (process.platform === 'win32' && isMissing(error) && !/\.(cmd|bat|exe)$/i.test(exe)) {
      return spawnOnce(`${exe}.cmd`, rest, stdin, cwd, timeoutMs, signal, env);
    }
    throw error;
  }
};
