export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreemapItem {
  weight?: number;
}

const worst = (row: number[], side: number) => {
  if (!row.length || side <= 0) return Number.POSITIVE_INFINITY;
  const sum = row.reduce((total, value) => total + value, 0);
  const smallest = Math.min(...row);
  const largest = Math.max(...row);
  const sideSquared = side * side;
  return Math.max((sideSquared * largest) / (sum * sum), (sum * sum) / (sideSquared * smallest));
};

/** Squarified treemap rectangles in input order, normalized to the supplied bounds. */
export function squarify(
  items: readonly TreemapItem[],
  width: number,
  height: number,
): TreemapRect[] {
  if (!items.length || width <= 0 || height <= 0)
    return items.map(() => ({ x: 0, y: 0, width: 0, height: 0 }));
  const validWeights = items.map((item) => item.weight);
  const useEqualWeights = validWeights.every((weight) => weight === undefined);
  const weights = validWeights.map((weight) =>
    useEqualWeights
      ? 1
      : typeof weight === "number" && Number.isFinite(weight) && weight > 0
        ? weight
        : 0,
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!total) return items.map(() => ({ x: 0, y: 0, width: 0, height: 0 }));

  const areaScale = (width * height) / total;
  const remaining = weights
    .map((weight, index) => ({ index, area: weight * areaScale }))
    .filter((item) => item.area > 0);
  const result = items.map(() => ({ x: 0, y: 0, width: 0, height: 0 }));
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  const placeRow = (row: typeof remaining) => {
    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    if (w >= h) {
      const rowWidth = rowArea / h;
      let cursorY = y;
      for (const item of row) {
        const cellHeight = item.area / rowWidth;
        result[item.index] = { x, y: cursorY, width: rowWidth, height: cellHeight };
        cursorY += cellHeight;
      }
      x += rowWidth;
      w -= rowWidth;
    } else {
      const rowHeight = rowArea / w;
      let cursorX = x;
      for (const item of row) {
        const cellWidth = item.area / rowHeight;
        result[item.index] = { x: cursorX, y, width: cellWidth, height: rowHeight };
        cursorX += cellWidth;
      }
      y += rowHeight;
      h -= rowHeight;
    }
  };

  let row: typeof remaining = [];
  while (remaining.length) {
    const next = remaining[0]!;
    const side = Math.min(w, h);
    if (
      row.length &&
      worst(row.map((item) => item.area).concat(next.area), side) >
        worst(
          row.map((item) => item.area),
          side,
        )
    ) {
      placeRow(row);
      row = [];
    } else {
      row.push(next);
      remaining.shift();
    }
  }
  if (row.length) placeRow(row);
  return result;
}

/** CSS percentages for a rect laid out on a `width` x `height` grid, so it fills the container on both axes. */
export function rectToPercent(rect: TreemapRect, width: number, height: number) {
  const pct = (n: number, of: number) => `${Number(((n / of) * 100).toFixed(4))}%`;
  return {
    left: pct(rect.x, width),
    top: pct(rect.y, height),
    width: pct(rect.width, width),
    height: pct(rect.height, height),
  };
}
