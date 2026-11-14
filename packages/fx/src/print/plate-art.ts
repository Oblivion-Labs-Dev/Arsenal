/**
 * Print-plate art: re-draw any photograph as a newsprint halftone or an ink line drawing.
 *
 * Origin: amsborse.github.io redesign, `src/designs/plateArt.ts`.
 * Lift-and-shift: copy this file (and `PrintPlate.tsx` + `print-plate.css` for the React
 * wrapper). It has no dependencies; the pure functions run anywhere, the `draw*` helpers need a
 * DOM canvas.
 */

/** A single halftone dot in output-space coordinates. */
export type HalftoneDot = { x: number; y: number; r: number };

/** Colours for the halftone treatment. `dark` prints light ink where the photo is bright. */
export type HalftoneInk = { ink: string; spot: string; dark: boolean };

function assertDimensions(
  name: string,
  length: number,
  width: number,
  height: number,
  stride: number,
) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(
      `${name}: width and height must be positive integers (got ${width}x${height})`,
    );
  }
  if (length < width * height * stride) {
    throw new RangeError(
      `${name}: buffer holds ${length} values but ${width}x${height} needs ${width * height * stride}`,
    );
  }
}

/** Rec.709 luminance of an RGBA buffer, 0..1 per pixel. */
export function luminance(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  assertDimensions('luminance', rgba.length, width, height, 4);
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    out[i] = (0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2]) / 255;
  }
  return out;
}

/** How warm (red over blue) each pixel is, 0..1; drives the spot-colour screen. */
export function warmth(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  assertDimensions('warmth', rgba.length, width, height, 4);
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    out[i] = Math.min(1, Math.max(0, (rgba[p] - rgba[p + 2] - 40) / 120));
  }
  return out;
}

/** Sobel edge magnitude of a grey field, normalised so the strongest edge is 1. Borders are 0. */
export function sobel(gray: ArrayLike<number>, width: number, height: number): Float32Array {
  assertDimensions('sobel', gray.length, width, height, 1);
  const out = new Float32Array(width * height);
  let max = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const tl = gray[i - width - 1];
      const t = gray[i - width];
      const tr = gray[i - width + 1];
      const l = gray[i - 1];
      const r = gray[i + 1];
      const bl = gray[i + width - 1];
      const b = gray[i + width];
      const br = gray[i + width + 1];
      const gx = tr + 2 * r + br - tl - 2 * l - bl;
      const gy = bl + 2 * b + br - tl - 2 * t - tr;
      const m = Math.sqrt(gx * gx + gy * gy);
      out[i] = m;
      if (m > max) max = m;
    }
  }
  if (max > 0) for (let i = 0; i < out.length; i += 1) out[i] /= max;
  return out;
}

/**
 * A rotated halftone screen: one dot per cell, its area proportional to `tone(x, y)` (0..1).
 * Coordinates are in output space (width x height).
 */
export function halftone(
  width: number,
  height: number,
  cell: number,
  angleDeg: number,
  tone: (x: number, y: number) => number,
): HalftoneDot[] {
  if (!(width > 0) || !(height > 0)) {
    throw new RangeError(`halftone: width and height must be positive (got ${width}x${height})`);
  }
  // A zero or negative cell would never advance the screen loop.
  if (!(cell > 0) || !Number.isFinite(cell)) {
    throw new RangeError(`halftone: cell must be a positive finite number (got ${cell})`);
  }
  const dots: HalftoneDot[] = [];
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const reach = Math.hypot(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = cell * 0.62;
  for (let v = -reach / 2; v <= reach / 2; v += cell) {
    for (let u = -reach / 2; u <= reach / 2; u += cell) {
      const x = cx + u * cos - v * sin;
      const y = cy + u * sin + v * cos;
      if (x < -cell || y < -cell || x > width + cell || y > height + cell) continue;
      const t = tone(Math.min(width - 1, Math.max(0, x)), Math.min(height - 1, Math.max(0, y)));
      if (t <= 0.02) continue;
      dots.push({ x, y, r: maxR * Math.sqrt(Math.min(1, t)) });
    }
  }
  return dots;
}

const loaded = new Map<string, Promise<HTMLImageElement>>();

/** Load (and cache) an image. A failed load is evicted so a later call can retry. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!src) return Promise.reject(new TypeError('loadImage: src must be a non-empty string'));
  let pending = loaded.get(src);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => {
        loaded.delete(src);
        reject(new Error(`Could not load plate ${src}`));
      };
      image.src = src;
    });
    loaded.set(src, pending);
  }
  return pending;
}

function pixels(image: CanvasImageSource, width: number, height: number) {
  const scratch = document.createElement('canvas');
  scratch.width = width;
  scratch.height = height;
  const context = scratch.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('2D canvas is unavailable');
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

/** Newsprint halftone: an ink screen at 45° plus a sparse spot-colour screen at 15°. */
export function drawHalftone(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  colors: HalftoneInk,
) {
  const width = canvas.width;
  const height = canvas.height;
  const sw = Math.max(1, Math.round(width / 3));
  const sh = Math.max(1, Math.round(height / 3));
  const data = pixels(image, sw, sh);
  const lum = luminance(data, sw, sh);
  const warm = warmth(data, sw, sh);
  const at = (field: Float32Array, x: number, y: number) =>
    field[Math.min(sh - 1, Math.floor(y / 3)) * sw + Math.min(sw - 1, Math.floor(x / 3))];
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas is unavailable');
  context.clearRect(0, 0, width, height);
  const cell = Math.max(5, Math.round(width / 210));
  // Light edition prints dark ink where the photo is dark; the dark edition prints light ink
  // where the photo is bright, so the plate reads the same way round on a dark ground.
  const tone = (x: number, y: number) => {
    const l = at(lum, x, y);
    const t = colors.dark ? (l - 0.06) / 0.9 : (0.97 - l) / 0.9;
    return Math.pow(Math.max(0, t), 1.15);
  };
  context.fillStyle = colors.ink;
  context.beginPath();
  for (const dot of halftone(width, height, cell, 45, tone)) {
    context.moveTo(dot.x + dot.r, dot.y);
    context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
  }
  context.fill();
  context.fillStyle = colors.spot;
  context.globalAlpha = 0.85;
  context.beginPath();
  const spotTone = (x: number, y: number) => at(warm, x, y) * 0.55;
  for (const dot of halftone(width, height, cell * 1.6, 15, spotTone)) {
    context.moveTo(dot.x + dot.r, dot.y);
    context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
  }
  context.fill();
  context.globalAlpha = 1;
}

/** Map a Sobel edge value to stroke alpha: lift faint edges, drop noise below the threshold. */
export function edgeAlpha(edge: number): number {
  return edge < 0.07 ? 0 : Math.min(1, Math.pow((edge - 0.07) / 0.45, 0.7));
}

/** Ink line drawing: Sobel edges of the image, drawn in `ink` on a clear sheet. */
export function drawLinework(canvas: HTMLCanvasElement, image: CanvasImageSource, ink: string) {
  const width = canvas.width;
  const height = canvas.height;
  const data = pixels(image, width, height);
  const edges = sobel(luminance(data, width, height), width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas is unavailable');
  const probe = document.createElement('canvas').getContext('2d');
  let [r, g, b] = [70, 200, 234];
  if (probe) {
    probe.fillStyle = ink;
    probe.fillRect(0, 0, 1, 1);
    [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  }
  const out = context.createImageData(width, height);
  for (let i = 0, p = 0; i < edges.length; i += 1, p += 4) {
    out.data[p] = r;
    out.data[p + 1] = g;
    out.data[p + 2] = b;
    out.data[p + 3] = Math.round(edgeAlpha(edges[i]) * 255);
  }
  context.putImageData(out, 0, 0);
}
