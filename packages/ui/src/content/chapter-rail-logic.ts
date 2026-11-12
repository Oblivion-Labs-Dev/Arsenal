// Pure rules behind ChapterRail and useActiveSection, kept DOM-free so they are unit-tested.

export interface RailChapter {
  readonly id: string;
  readonly label: string;
}

/** Past this many stops the rail compresses and names only the stop under the pointer. */
export const RAIL_DENSE_AFTER = 10;

/** True when the page is scrolled to its foot (2px slack for fractional zoom). */
export function isAtPageEnd(
  scrollY: number,
  viewportHeight: number,
  scrollHeight: number,
): boolean {
  return scrollY > 0 && scrollY + viewportHeight >= scrollHeight - 2;
}

/**
 * The current section: at the foot of the page the last one (it may be too short to ever reach
 * the middle band); otherwise the last section, in page order, crossing the middle band, so a
 * short section still lights up; otherwise whatever was current before.
 */
export function pickActiveSection(
  ids: readonly string[],
  crossing: ReadonlySet<string>,
  atPageEnd: boolean,
  previous: string | undefined,
): string | undefined {
  if (ids.length === 0) return undefined;
  if (atPageEnd) return ids[ids.length - 1];
  for (let i = ids.length - 1; i >= 0; i--) if (crossing.has(ids[i]!)) return ids[i];
  return previous !== undefined && ids.includes(previous) ? previous : ids[0];
}

/** How far the rail line is filled (0..1) when it follows chapters instead of scroll. */
export function chapterFill(activeIndex: number, count: number): number {
  if (count <= 1) return activeIndex >= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, activeIndex / (count - 1)));
}

/** Where a key moves focus among the rail's stops, or null when the key is not the rail's. */
export function railKeyTarget(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  const last = count - 1;
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return Math.min(last, index + 1);
    case 'ArrowUp':
    case 'ArrowLeft':
      return Math.max(0, index - 1);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}
