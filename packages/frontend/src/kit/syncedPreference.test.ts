import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSyncedPreference } from './syncedPreference.js';

type Size = 's' | 'm' | 'l';
const isSize = (v: unknown): v is Size => v === 's' || v === 'm' || v === 'l';

function fakeWindow(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
  return Object.assign(new EventTarget(), { localStorage: storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSyncedPreference', () => {
  it('reads defaults, persists writes and notifies same-tab subscribers', () => {
    const data = new Map<string, string>();
    vi.stubGlobal(
      'window',
      fakeWindow({
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => void data.set(k, v),
        removeItem: (k) => void data.delete(k),
      }),
    );
    const pref = createSyncedPreference<Size>({ key: 'size', defaultValue: 'm', validate: isSize });
    expect(pref.read()).toBe('m');
    const onChange = vi.fn();
    const off = pref.subscribe(onChange);
    pref.write('l');
    expect(data.has('size')).toBe(true);
    expect(pref.read()).toBe('l');
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
    pref.write('s');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid stored values', () => {
    vi.stubGlobal(
      'window',
      fakeWindow({ getItem: () => '"xl"', setItem: () => {}, removeItem: () => {} }),
    );
    const pref = createSyncedPreference<Size>({ key: 'size', defaultValue: 'm', validate: isSize });
    expect(pref.read()).toBe('m');
  });

  it('falls back to memory and reports when storage throws', () => {
    const boom = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('window', fakeWindow({ getItem: boom, setItem: boom, removeItem: boom }));
    const onStorageError = vi.fn();
    const pref = createSyncedPreference<Size>({
      key: 'size',
      defaultValue: 'm',
      validate: isSize,
      onStorageError,
    });
    pref.write('s');
    expect(pref.read()).toBe('s');
    expect(onStorageError).toHaveBeenCalled();
  });
});
