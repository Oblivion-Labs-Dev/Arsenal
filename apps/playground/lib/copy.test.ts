import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './copy';

// Regression: the old copy button swallowed clipboard errors and showed nothing.
describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns false and logs loudly when the clipboard rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(copyText('x')).resolves.toBe(false);
    expect(log).toHaveBeenCalledWith('[arsenal] copy to clipboard failed', expect.any(Error));
  });

  it('returns false when there is no clipboard at all', async () => {
    vi.stubGlobal('navigator', {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(copyText('x')).resolves.toBe(false);
  });

  it('returns true when the copy succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });
});
