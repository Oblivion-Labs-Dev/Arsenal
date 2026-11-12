import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// rmSync fails as it would on Windows when a virus scanner or a lingering child holds the folder.
const real = vi.hoisted(() => ({ rmSync: null as null | typeof import('node:fs').rmSync }));
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>();
  real.rmSync = fs.rmSync;
  return {
    ...fs,
    rmSync: () => {
      throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
    },
  };
});

const { runAgent } = await import('./agent-cli.js');

describe('runAgent scratch cleanup', () => {
  const dirs: string[] = [];
  afterEach(async () => {
    for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('keeps its never-throw promise and warns when a scratch folder cannot be removed', async () => {
    // Regression: rmSync in `finally` threw past the result, so runAgent rejected instead of
    // returning the outcome of a run that had already finished.
    const root = mkdtempSync(join(tmpdir(), 'arsenal-agent-cleanup-'));
    dirs.push(root);
    const work = join(root, 'repo');
    mkdirSync(work);
    const fake = join(root, 'fake.cjs');
    writeFileSync(
      fake,
      `const fs = require('node:fs');
       const a = process.argv.indexOf('--output-last-message');
       process.stdin.resume();
       process.stdin.on('end', () => fs.writeFileSync(process.argv[a + 1], 'done'));`,
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await runAgent({
      provider: 'codex',
      task: 'Summarise.',
      tools: 'read',
      cwd: work,
      command: process.execPath,
      commandArgs: [fake],
      timeoutMs: 20_000,
    });
    expect(result).toMatchObject({ ok: true, output: 'done' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not remove scratch folder'));
    const leftover = String(warn.mock.calls[0]?.[0]).match(/folder (.+?): /)?.[1];
    if (leftover) dirs.push(leftover);
    expect(real.rmSync).toBeTypeOf('function');
  });
});
