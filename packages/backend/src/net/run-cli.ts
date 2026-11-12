import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, win32 } from 'node:path';

// Spawning a CLI safely, ported from Sutra packages/ai/src/run-cli.ts: never through a shell,
// arguments as argv, untrusted input on stdin, bounded by a timeout (and by the caller's abort
// signal), and with the run directory created first so spawn cannot fail with ENOENT. Process-tree
// cleanup follows AgentSkills tools/codex-bridge/codex-bridge.mjs `killTree` (same owner).

export interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Thrown when the child outlives its time limit; the child's whole process tree is killed first. */
export class CliTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`CLI timed out after ${timeoutMs}ms`);
    this.name = 'CliTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/** Thrown when stdout plus stderr pass `maxOutputBytes`; the process tree is killed first. */
export class CliOutputLimitError extends Error {
  readonly maxOutputBytes: number;

  constructor(maxOutputBytes: number) {
    super(`CLI output passed ${maxOutputBytes} bytes`);
    this.name = 'CliOutputLimitError';
    this.maxOutputBytes = maxOutputBytes;
  }
}

export interface RunCliLimits {
  /** Combined stdout + stderr cap. Default 16 MiB, so a runaway child cannot exhaust memory. */
  maxOutputBytes?: number;
}

export type RunCli = (
  args: string[],
  stdin: string,
  cwd: string,
  timeoutMs: number,
  signal?: AbortSignal,
  /** Replaces the inherited environment, e.g. to keep a paid API key away from a CLI. */
  env?: NodeJS.ProcessEnv,
  limits?: RunCliLimits,
) => Promise<CliResult>;

const DEFAULT_MAX_OUTPUT = 16 * 1024 * 1024;
const IS_WIN = process.platform === 'win32';

/**
 * Kills the child and everything it started. A CLI is often a wrapper (a .cmd shim, a node
 * launcher) whose real process would otherwise outlive a timeout or cancel. POSIX children run in
 * their own process group (`detached`), so the group is signalled; Windows uses `taskkill /T`.
 */
function killTree(child: ChildProcessWithoutNullStreams) {
  const pid = child.pid;
  if (pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  if (IS_WIN) {
    const result = spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    if (result.status !== 0) child.kill();
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  // A child that ignores SIGTERM is not allowed to linger.
  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }, 2000).unref();
}

const spawnOnce = (
  exe: string,
  rest: string[],
  stdin: string,
  cwd: string,
  timeoutMs: number,
  signal?: AbortSignal,
  env?: NodeJS.ProcessEnv,
  limits?: RunCliLimits,
) =>
  new Promise<CliResult>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    mkdirSync(cwd, { recursive: true });
    const maxOutput = limits?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
    // Never `shell: true`: a path with spaces stays one argument and nothing in the input can
    // be read as a command.
    const child = spawn(exe, rest, {
      cwd,
      shell: false,
      windowsHide: true,
      detached: !IS_WIN,
      ...(env ? { env } : {}),
    });
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      killTree(child);
      reject(error);
    };
    const timer = setTimeout(() => fail(new CliTimeoutError(timeoutMs)), timeoutMs);
    const abort = () => fail(signal!.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const collect = (append: (text: string) => void) => (d: Buffer) => {
      if (settled) return;
      bytes += d.length;
      if (bytes > maxOutput) return fail(new CliOutputLimitError(maxOutput));
      append(d.toString());
    };
    child.stdout.on(
      'data',
      collect((t) => (stdout += t)),
    );
    child.stderr.on(
      'data',
      collect((t) => (stderr += t)),
    );
    // A child that exits before reading stdin makes the pipe error with EPIPE; the exit code
    // and stderr already report what went wrong, so that one error is not the failure.
    child.stdin.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') fail(err);
    });
    child.on('error', fail);
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(stdin);
  });

const isMissing = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

/** Finds `<exe>.cmd` beside a path, or on PATH for a bare name. */
function findCmdShim(exe: string, env: NodeJS.ProcessEnv | undefined): string | null {
  if (isAbsolute(exe) || /[\\/]/.test(exe)) return existsSync(`${exe}.cmd`) ? `${exe}.cmd` : null;
  const path = Object.entries(env ?? process.env).find(([k]) => k.toUpperCase() === 'PATH')?.[1];
  for (const dir of (path ?? '').split(delimiter)) {
    const candidate = dir && win32.join(dir, `${exe}.cmd`);
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * The command a generated `.cmd` shim (npm cmd-shim, a `node "%~dp0\x.js" %*` wrapper) runs, as
 * argv. Node refuses to spawn .cmd files without a shell, and a shell would re-parse every
 * argument, so the shim's own target is run directly instead. Anything this cannot read as a plain
 * `program [fixed args] %*` line is refused rather than guessed.
 */
export function resolveCmdShim(shimPath: string, text = readFileSync(shimPath, 'utf8')): string[] {
  const dir = `${dirname(shimPath)}\\`;
  const line = text
    .split(/\r?\n/)
    .reverse()
    .find((l) => l.includes('%*'));
  if (!line) throw new Error(`Cannot run ${shimPath} without a shell: no "%*" command line`);
  // cmd-shim ends with `... || title %COMSPEC% & "%_prog%" "%dp0%\cli.js" %*`: the command is the
  // part after the last `&`.
  let command = line.slice(0, line.lastIndexOf('%*'));
  command = command.slice(command.lastIndexOf('&') + 1).replace(/^\s*@/, '');
  const tokens = [...command.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]!);
  const argv = tokens.map((t) => t.replace(/%~dp0|%dp0%/gi, dir).replace(/^%_prog%$/i, 'node'));
  if (argv.length === 0 || argv.some((t) => /[%&|<>^()]/.test(t))) {
    throw new Error(`Cannot run ${shimPath} without a shell: unsupported shim syntax`);
  }
  const [prog, ...fixed] = argv.map((t) => (/[\\/]/.test(t) ? win32.normalize(t) : t));
  return [/^node(\.exe)?$/i.test(prog!) ? process.execPath : prog!, ...fixed];
}

export const runCli: RunCli = async (args, stdin, cwd, timeoutMs, signal, env, limits) => {
  const [exe, ...rest] = args;
  if (!exe) throw new Error('runCli needs at least the executable in args');
  try {
    return await spawnOnce(exe, rest, stdin, cwd, timeoutMs, signal, env, limits);
  } catch (error) {
    // On Windows many CLIs are only .cmd shims, which spawn cannot run without a shell.
    if (IS_WIN && isMissing(error) && !/\.(cmd|bat|exe|com)$/i.test(exe)) {
      const shim = findCmdShim(exe, env);
      if (shim) {
        const [prog, ...fixed] = resolveCmdShim(shim);
        return spawnOnce(prog!, [...fixed, ...rest], stdin, cwd, timeoutMs, signal, env, limits);
      }
    }
    throw error;
  }
};
