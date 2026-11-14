import { describe, expect, it } from 'vitest';
import { createDesignRegistry, type DesignEntry, type DesignHooks } from './registry';

type Design = DesignEntry & DesignHooks<unknown, 'linework' | 'halftone'> & {
  id: 'editorial' | 'blueprint' | 'broadsheet';
};

const DESIGNS: Design[] = [
  { id: 'editorial', label: 'Editorial', hint: 'The original' },
  { id: 'blueprint', label: 'Blueprint', plate: 'linework' },
  { id: 'broadsheet', label: 'Broadsheet', plate: 'halftone' },
];

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};

describe('createDesignRegistry', () => {
  const registry = createDesignRegistry(DESIGNS, { storageKey: 'k' });

  it('defaults to the first design and falls back to it for unknown ids', () => {
    expect(registry.defaultId).toBe('editorial');
    expect(registry.byId('nope').id).toBe('editorial');
    expect(registry.byId('broadsheet').plate).toBe('halftone');
    expect(registry.isDesign('blueprint')).toBe(true);
    expect(registry.isDesign(3)).toBe(false);
  });

  it('lists the switcher menu in registry order', () => {
    expect(registry.menu().map((d) => d.id)).toEqual(['editorial', 'blueprint', 'broadsheet']);
  });

  it('resolves the query parameter before the saved choice, ignoring unknown values', () => {
    const storage = memory({ k: 'blueprint' });
    expect(registry.resolveInitial({ search: '?design=broadsheet', storage })).toBe('broadsheet');
    expect(registry.resolveInitial({ search: '?design=bogus', storage })).toBe('blueprint');
    expect(registry.resolveInitial({ search: '', storage: memory({ k: 'bogus' }) })).toBe(
      'editorial',
    );
    expect(registry.resolveInitial({ search: '', storage: null })).toBe('editorial');
  });

  it('survives blocked storage on read and write', () => {
    const blocked = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(registry.resolveInitial({ search: '', storage: blocked })).toBe('editorial');
    expect(() => registry.save('blueprint', blocked)).not.toThrow();
  });

  it('saves and applies the attribute', () => {
    const storage = memory();
    registry.save('broadsheet', storage);
    expect(storage.data.k).toBe('broadsheet');
    const attrs: Record<string, string> = {};
    registry.apply('blueprint', {
      setAttribute: (k: string, v: string) => (attrs[k] = v),
    } as unknown as Element);
    expect(attrs['data-design']).toBe('blueprint');
  });

  it('rejects an empty list, duplicate ids and an unknown default', () => {
    expect(() => createDesignRegistry([])).toThrow(/at least one/);
    expect(() =>
      createDesignRegistry([
        { id: 'a', label: 'A' },
        { id: 'a', label: 'B' },
      ]),
    ).toThrow(/duplicate/);
    expect(() =>
      createDesignRegistry([{ id: 'a', label: 'A' }], { defaultId: 'b' as 'a' }),
    ).toThrow(/unknown default/);
  });
});
