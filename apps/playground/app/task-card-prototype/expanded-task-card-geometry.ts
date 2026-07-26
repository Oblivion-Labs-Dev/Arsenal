export interface CardRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function getExpandedCardRect(viewportWidth: number, viewportHeight: number): CardRect {
  const margin = viewportWidth <= 600 ? 16 : 24;
  const width = Math.min(660, Math.max(1, viewportWidth - margin * 2));
  const height = Math.min(880, Math.max(1, viewportHeight - margin * 2));

  return {
    top: Math.max(margin, (viewportHeight - height) / 2),
    left: Math.max(margin, (viewportWidth - width) / 2),
    width,
    height,
  };
}
