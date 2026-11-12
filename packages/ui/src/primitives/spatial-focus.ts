// Spatial (D-pad) focus: pick the nearest target in an arrow direction, in plain geometry. The
// scorer generalises TVApplication's `c2-home/src/logic.ts` `nextInDirection` (same owner) and
// the treemap's arrow-key focus, which now delegates here. `resolveSpatialMove` adds nested
// regions and per-region focus memory on top; `useSpatialFocus` is the DOM adapter.

export type SpatialDirection = 'left' | 'right' | 'up' | 'down';

export interface SpatialRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialScoreOptions {
  /** Cost of sideways offset relative to distance travelled. Default 2; TV grids like ~2.7. */
  sideWeight?: number;
  /** Pixels a centre must lie ahead to count as "in that direction". Default 0 (strictly ahead). */
  minForward?: number;
}

/**
 * Default `minForward` for measured DOM rects. Transforms such as a focus scale move centres by
 * sub-pixel noise, so a same-row tile can read as 0.00001px "below"; 1px ignores that.
 */
export const SPATIAL_DOM_MIN_FORWARD = 1;

const KEY_DIRECTIONS: Record<string, SpatialDirection> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

/** Direction for an arrow key (TV remotes send the same `key` values), or null for any other key. */
export function spatialDirectionForKey(key: string): SpatialDirection | null {
  return Object.prototype.hasOwnProperty.call(KEY_DIRECTIONS, key) ? KEY_DIRECTIONS[key]! : null;
}

const usable = (r: SpatialRect | undefined): r is SpatialRect =>
  !!r && r.width > 0 && r.height > 0 && Number.isFinite(r.x) && Number.isFinite(r.y);

/**
 * Index in `candidates` of the best target from `origin` towards `direction`: lowest distance
 * along the direction plus `sideWeight` × sideways offset, between centres. Empty or degenerate
 * rects are skipped. Returns -1 when nothing lies that way. Ties keep the earlier candidate.
 */
export function pickInDirection(
  origin: SpatialRect,
  candidates: readonly (SpatialRect | undefined)[],
  direction: SpatialDirection,
  { sideWeight = 2, minForward = 0 }: SpatialScoreOptions = {},
): number {
  const cx = origin.x + origin.width / 2;
  const cy = origin.y + origin.height / 2;
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  let best = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((rect, index) => {
    if (!usable(rect)) return;
    const dx = rect.x + rect.width / 2 - cx;
    const dy = rect.y + rect.height / 2 - cy;
    const forward = sign * (horizontal ? dx : dy);
    if (forward <= minForward) return;
    const score = forward + Math.abs(horizontal ? dy : dx) * sideWeight;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

/** Next index from `from` within one flat list of rects; returns `from` at an edge. */
export function nextInDirection(
  rects: readonly SpatialRect[],
  from: number,
  direction: SpatialDirection,
  options?: SpatialScoreOptions,
): number {
  const origin = rects[from];
  if (!origin) return from;
  const index = pickInDirection(
    origin,
    rects.map((r, i) => (i === from ? undefined : r)),
    direction,
    options,
  );
  return index < 0 ? from : index;
}

/** One focus target or region in a spatial tree. `parent` is the enclosing region id, or null. */
export interface SpatialNode {
  id: string;
  rect: SpatialRect;
  parent: string | null;
  /** Regions group items; moving into one lands on its remembered or nearest item. */
  region?: boolean;
}

export interface SpatialMoveOptions extends SpatialScoreOptions {
  /** Last focused item id per region id (`''` for the root). Stale ids are ignored. */
  memory?: ReadonlyMap<string, string>;
}

const centreDistance = (a: SpatialRect, b: SpatialRect) =>
  Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2);

/**
 * Resolves a D-pad move in a tree of nested regions. The move first looks among the current
 * item's siblings; if nothing lies that way it widens to the enclosing region's siblings (so a
 * row can hand focus to a sidebar). Entering a region lands on that region's remembered item, or
 * else the item nearest the origin. Returns the new item id, or null at the outer edge.
 */
export function resolveSpatialMove(
  nodes: readonly SpatialNode[],
  fromId: string,
  direction: SpatialDirection,
  options: SpatialMoveOptions = {},
): string | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const from = byId.get(fromId);
  if (!from || from.region) return null;
  const origin = from.rect;
  let skip: SpatialNode = from;
  // Bounded by tree depth; the guard also stops a malformed (cyclic) parent chain.
  for (let depth = 0; depth <= nodes.length; depth++) {
    const scope = skip.parent;
    const siblings = nodes.filter((n) => n.parent === scope && n !== skip);
    const pick = pickInDirection(
      origin,
      siblings.map((n) => n.rect),
      direction,
      options,
    );
    if (pick >= 0) {
      const target = enter(siblings[pick]!, origin, nodes, byId, options.memory);
      return target === fromId ? null : target;
    }
    if (scope === null) return null;
    const parent = byId.get(scope);
    if (!parent) return null;
    skip = parent;
  }
  return null;
}

function enter(
  node: SpatialNode,
  origin: SpatialRect,
  nodes: readonly SpatialNode[],
  byId: ReadonlyMap<string, SpatialNode>,
  memory: ReadonlyMap<string, string> | undefined,
): string | null {
  let current = node;
  for (let depth = 0; depth <= nodes.length && current.region; depth++) {
    const remembered = memory?.get(current.id);
    if (remembered && isInside(byId.get(remembered), current.id, byId)) return remembered;
    let best: SpatialNode | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const n of nodes) {
      if (n.parent !== current.id || !usable(n.rect)) continue;
      const d = centreDistance(origin, n.rect);
      if (d < bestDistance) {
        bestDistance = d;
        best = n;
      }
    }
    if (!best) return null;
    current = best;
  }
  return current.region ? null : current.id;
}

function isInside(
  node: SpatialNode | undefined,
  regionId: string,
  byId: ReadonlyMap<string, SpatialNode>,
): boolean {
  if (!node || node.region || !usable(node.rect)) return false;
  let parent = node.parent;
  for (let depth = 0; parent !== null && depth <= byId.size; depth++) {
    if (parent === regionId) return true;
    parent = byId.get(parent)?.parent ?? null;
  }
  return false;
}
