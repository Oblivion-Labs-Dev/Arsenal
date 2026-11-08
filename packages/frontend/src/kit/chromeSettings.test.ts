import { describe, it, expect, vi } from 'vitest';
import {
  createChromeSettings,
  type StorageAreaLike,
  type StorageChangedEventLike,
  type StorageChangesLike,
} from './chromeSettings.js';

interface Settings {
  enabled: boolean;
  mode: 'a' | 'b';
  version: number;
}
const defaults: Settings = { enabled: true, mode: 'a', version: 2 };

function fakeArea(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial };
  const area = {
    get: vi.fn(async (key: string) => (key in data ? { [key]: data[key] } : {})),
    set: vi.fn(async (items: Record<string, unknown>) => void Object.assign(data, items)),
  };
  return { data, area: area as unknown as StorageAreaLike };
}

type Listener = (c: StorageChangesLike, area: string) => void;
function fakeEvent() {
  const listeners = new Set<Listener>();
  const ev = {
    addListener: (cb: Listener) => void listeners.add(cb),
    removeListener: (cb: Listener) => void listeners.delete(cb),
  };
  return {
    ev: ev as unknown as StorageChangedEventLike,
    emit: (c: StorageChangesLike, area = 'local') => listeners.forEach((l) => l(c, area)),
    size: () => listeners.size,
  };
}

const migrate = (s: Partial<Settings>): Partial<Settings> =>
  (s.version ?? 0) >= 2 ? s : { ...s, version: 2, mode: 'b' };

describe('createChromeSettings', () => {
  it('writes defaults on first load', async () => {
    const { data, area } = fakeArea();
    const s = createChromeSettings({ key: 'k', defaults, area, onChanged: fakeEvent().ev });
    expect(await s.load()).toEqual(defaults);
    expect(data.k).toEqual(defaults);
  });

  it('migrates and merges stored values over defaults', async () => {
    const { area } = fakeArea({ k: { enabled: false } });
    const s = createChromeSettings({
      key: 'k',
      defaults,
      migrate,
      area,
      onChanged: fakeEvent().ev,
    });
    expect(await s.load()).toEqual({ enabled: false, mode: 'b', version: 2 });
  });

  it('returns defaults and reports when storage fails or holds garbage', async () => {
    const onError = vi.fn();
    const broken = {
      get: async () => Promise.reject(new Error('quota')),
      set: async () => {},
    } as unknown as StorageAreaLike;
    const s = createChromeSettings({
      key: 'k',
      defaults,
      area: broken,
      onChanged: fakeEvent().ev,
      onError,
    });
    expect(await s.load()).toEqual(defaults);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'quota' }));

    const onError2 = vi.fn();
    const { area } = fakeArea({ k: 'not an object' });
    const s2 = createChromeSettings({
      key: 'k',
      defaults,
      area,
      onChanged: fakeEvent().ev,
      onError: onError2,
    });
    expect(await s2.load()).toEqual(defaults);
    expect(onError2).toHaveBeenCalledTimes(1);
  });

  it('notifies changes for its key and area only, and unsubscribes', () => {
    const e = fakeEvent();
    const s = createChromeSettings({
      key: 'k',
      defaults,
      migrate,
      area: fakeArea().area,
      onChanged: e.ev,
    });
    const cb = vi.fn();
    const off = s.onChange(cb);
    e.emit({ other: { newValue: {} } });
    e.emit({ k: { newValue: { mode: 'a' } } }, 'sync');
    e.emit({ k: { newValue: { mode: 'a' } } });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ enabled: true, mode: 'b', version: 2 });
    off();
    expect(e.size()).toBe(0);
  });
});
