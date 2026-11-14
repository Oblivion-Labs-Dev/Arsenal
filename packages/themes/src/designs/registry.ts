/**
 * Design registry: N selectable site designs in one typed list.
 *
 * Origin: amsborse.github.io redesign, `src/designs/registry.ts` + `src/theme/design.ts`.
 * Adding design N is one entry in the list you pass in, one CSS skin scoped to
 * `[data-design="<id>"]`, and optional lazy hooks (hero, effects, plate treatment) that cost
 * nothing until the design is picked. The first entry, or `defaultId`, is the original design
 * and the fallback for anything unknown.
 *
 * Lift-and-shift: copy this file. It has no dependencies; the DOM and storage are optional and
 * passed in, so it also runs on the server and in tests.
 */

/** The fields every design needs. Extend it with your own hooks (hero, effects, plate). */
export interface DesignEntry {
  id: string;
  label: string;
  /** One line for the switcher menu. */
  hint?: string;
}

/** Common optional hooks; all heavy parts are lazy loaders. */
export interface DesignHooks<HeroProps = unknown, Treatment extends string = string> {
  /** Replaces the default hero while this design is active. */
  hero?: () => Promise<{ default: (props: HeroProps) => unknown }>;
  /** Page-wide interactions; `mount` returns a cleanup function. */
  effects?: () => Promise<{ mount: () => () => void }>;
  /** How section images are redrawn in this design's medium. */
  plate?: Treatment;
}

export interface DesignRegistryOptions<Id extends string> {
  /** The original design. Defaults to the first entry. */
  defaultId?: Id;
  /** localStorage key for the saved choice. */
  storageKey?: string;
  /** Query parameter that wins over the saved choice, for sharing and screenshots. */
  queryParam?: string;
  /** Attribute set on the root element. */
  attribute?: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface DesignRegistry<D extends DesignEntry> {
  readonly designs: readonly D[];
  readonly defaultId: D['id'];
  readonly attribute: string;
  /** `{ id, label, hint }` in registry order, for a switcher. */
  menu(): { id: D['id']; label: string; hint?: string }[];
  isDesign(value: unknown): value is D['id'];
  /** The entry for an id; the default design for anything unknown. */
  byId(id: unknown): D;
  /** Query parameter first, then the saved choice, then the default. Never throws. */
  resolveInitial(source?: { search?: string; storage?: StorageLike | null }): D['id'];
  /** Sets the attribute on `root` (default: `document.documentElement`). */
  apply(id: D['id'], root?: Element | null): void;
  /** Saves the choice; a blocked storage only loses persistence, never throws. */
  save(id: D['id'], storage?: StorageLike | null): void;
}

const browserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

/** Build a registry from a list of designs. Ids must be unique; the list must not be empty. */
export function createDesignRegistry<const D extends DesignEntry>(
  designs: readonly D[],
  options: DesignRegistryOptions<D['id']> = {},
): DesignRegistry<D> {
  if (!designs.length) throw new Error('createDesignRegistry: at least one design is required');
  const ids = designs.map((design) => design.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) throw new Error(`createDesignRegistry: duplicate design id "${duplicate}"`);
  const defaultId = options.defaultId ?? designs[0].id;
  if (!ids.includes(defaultId))
    throw new Error(`createDesignRegistry: unknown default "${defaultId}"`);
  const storageKey = options.storageKey ?? 'site-design';
  const queryParam = options.queryParam ?? 'design';
  const attribute = options.attribute ?? 'data-design';

  const isDesign = (value: unknown): value is D['id'] =>
    typeof value === 'string' && ids.includes(value);

  return {
    designs,
    defaultId,
    attribute,
    menu: () => designs.map(({ id, label, hint }) => ({ id, label, hint })),
    isDesign,
    byId: (id) =>
      designs.find((design) => design.id === id) ?? designs.find((d) => d.id === defaultId)!,
    resolveInitial(source = {}) {
      try {
        const search = source.search ?? (typeof location === 'undefined' ? '' : location.search);
        const fromUrl = new URLSearchParams(search).get(queryParam);
        if (isDesign(fromUrl)) return fromUrl;
        const storage = source.storage === undefined ? browserStorage() : source.storage;
        const stored = storage?.getItem(storageKey);
        if (isDesign(stored)) return stored;
      } catch {
        /* storage blocked: fall back to the default design */
      }
      return defaultId;
    },
    apply(id, root) {
      const target = root ?? (typeof document === 'undefined' ? null : document.documentElement);
      target?.setAttribute(attribute, id);
    },
    save(id, storage) {
      try {
        (storage === undefined ? browserStorage() : storage)?.setItem(storageKey, id);
      } catch {
        /* storage blocked: the choice lasts for this visit only */
      }
    },
  };
}
