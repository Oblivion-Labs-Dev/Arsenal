import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyTextToClipboard } from './clipboard.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function fakeDocument(execResult: boolean | Error) {
  const textarea = {
    value: '',
    style: {},
    setAttribute: vi.fn(),
    select: vi.fn(),
    focus: vi.fn(),
    remove: vi.fn(),
  };
  const doc = {
    createElement: vi.fn(() => textarea),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
    execCommand: vi.fn(() => {
      if (execResult instanceof Error) throw execResult;
      return execResult;
    }),
  };
  return { doc, textarea };
}

describe('copyTextToClipboard', () => {
  it('uses the Clipboard API when available', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyTextToClipboard('hi')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('falls back to execCommand and reports the Clipboard API failure', async () => {
    const onError = vi.fn();
    vi.stubGlobal('navigator', {
      clipboard: { writeText: async () => Promise.reject(new Error('denied')) },
    });
    const { doc, textarea } = fakeDocument(true);
    vi.stubGlobal('document', doc);
    expect(await copyTextToClipboard('hi', { onError })).toBe(true);
    expect(textarea.value).toBe('hi');
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'denied' }));
  });

  it('returns false and reports when both paths fail', async () => {
    const onError = vi.fn();
    vi.stubGlobal('navigator', {});
    const { doc } = fakeDocument(new Error('no exec'));
    vi.stubGlobal('document', doc);
    expect(await copyTextToClipboard('hi', { onError })).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'no exec' }));
  });

  it('returns false for empty text', async () => {
    expect(await copyTextToClipboard('')).toBe(false);
  });
});
