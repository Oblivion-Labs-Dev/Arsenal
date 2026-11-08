/**
 * Typed, migrating settings in `chrome.storage` (from AdhocPluginAndExtention `shared/storage.ts`).
 * The storage area and change event are injectable so it runs in tests and non-extension builds.
 */

export interface StorageAreaLike {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export type StorageChangesLike = Record<string, { newValue?: unknown; oldValue?: unknown }>;

export interface StorageChangedEventLike {
  addListener(cb: (changes: StorageChangesLike, areaName: string) => void): void;
  removeListener(cb: (changes: StorageChangesLike, areaName: string) => void): void;
}

export interface ChromeSettingsOptions<T extends object> {
  key: string;
  defaults: T;
  /** Upgrade an older stored shape. Must be idempotent (runs on every load). */
  migrate?: (stored: Partial<T>) => Partial<T>;
  /** Default `chrome.storage.local`. */
  area?: StorageAreaLike;
  /** Default `chrome.storage.onChanged`. */
  onChanged?: StorageChangedEventLike;
  /** Area name to accept change events from. Default `local`. */
  areaName?: string;
  onError?: (error: unknown) => void;
}

export interface ChromeSettings<T extends object> {
  /** Stored settings merged over defaults; writes defaults on first run; defaults on read failure (reported). */
  load(): Promise<T>;
  save(settings: T): Promise<void>;
  onChange(cb: (settings: T) => void): () => void;
}

function chromeStorage(): { local: StorageAreaLike; onChanged: StorageChangedEventLike } {
  const c = (
    globalThis as {
      chrome?: { storage?: { local: StorageAreaLike; onChanged: StorageChangedEventLike } };
    }
  ).chrome;
  if (!c?.storage) throw new Error('chrome.storage is not available; pass `area` and `onChanged`');
  return c.storage;
}

export function createChromeSettings<T extends object>(
  options: ChromeSettingsOptions<T>,
): ChromeSettings<T> {
  const { key, defaults } = options;
  const migrate = options.migrate ?? ((s: Partial<T>) => s);
  const onError = options.onError ?? ((e: unknown) => console.error(`[settings:${key}]`, e));
  const area = (): StorageAreaLike => options.area ?? chromeStorage().local;
  const events = (): StorageChangedEventLike => options.onChanged ?? chromeStorage().onChanged;
  const merge = (stored: Partial<T>): T => ({ ...defaults, ...migrate(stored) });

  return {
    async load() {
      try {
        const res = await area().get(key);
        const stored = res[key];
        if (stored === undefined || stored === null) {
          await area().set({ [key]: defaults });
          return { ...defaults };
        }
        if (typeof stored !== 'object') throw new Error(`Stored "${key}" is not an object`);
        return merge(stored as Partial<T>);
      } catch (err) {
        onError(err);
        return { ...defaults };
      }
    },
    async save(settings) {
      await area().set({ [key]: settings });
    },
    onChange(cb) {
      const areaName = options.areaName ?? 'local';
      const listener = (changes: StorageChangesLike, changedArea: string): void => {
        if (changedArea !== areaName) return;
        const next = changes[key]?.newValue;
        if (next && typeof next === 'object') cb(merge(next as Partial<T>));
      };
      const ev = events();
      ev.addListener(listener);
      return () => ev.removeListener(listener);
    },
  };
}
