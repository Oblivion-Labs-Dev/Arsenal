export type TabOrientation = 'horizontal' | 'vertical';

/**
 * Roving-focus index for a tab list (WAI-ARIA tabs pattern). Returns the next index for a key, or
 * null when the key is not a navigation key. Wraps at both ends and skips disabled tabs.
 */
export function nextTabIndex(
  key: string,
  current: number,
  length: number,
  options: { orientation?: TabOrientation; isDisabled?: (index: number) => boolean } = {},
): number | null {
  if (length <= 0) return null;
  const { orientation = 'horizontal', isDisabled = () => false } = options;
  const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
  const backward = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';

  const scan = (start: number, step: 1 | -1): number | null => {
    for (let offset = 0; offset < length; offset += 1) {
      const index = (((start + step * offset) % length) + length) % length;
      if (!isDisabled(index)) return index;
    }
    return null;
  };

  switch (key) {
    case 'Home':
      return scan(0, 1);
    case 'End':
      return scan(length - 1, -1);
    case forward:
      return scan(current + 1, 1);
    case backward:
      return scan(current - 1, -1);
    default:
      return null;
  }
}

export function tabId(idBase: string, id: string): string {
  return `${idBase}-tab-${id}`;
}

export function tabPanelId(idBase: string, id: string): string {
  return `${idBase}-panel-${id}`;
}
