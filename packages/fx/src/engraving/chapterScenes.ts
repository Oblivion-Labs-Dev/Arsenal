/**
 * Origin: amsborse.github.io redesign, `src/designs/chapterScenes.ts` (Broadsheet and Blueprint
 * chapter plates). Pure: lift and shift with `engraving.ts` and `chapterScenes.test.ts`.
 */
/**
 * The chapter plates as drawn scenes, one per chapter, so the print designs have art of their
 * own instead of filtering the island photographs. Each scene is a tone field (0 paper .. 1 ink)
 * in unit space (x 0..aspect, y 0..1 top to bottom) that both media read: Broadsheet cuts it
 * into engraved ribbons, Blueprint traces its contours. Subjects sit right of centre, clear of
 * the chapter copy. Pure maths; the painters live in DesignPlate.
 */
import { clamp01, fbm, smooth, type ToneField } from './engraving';

export type Chapter =
  'horizon' | 'about' | 'experience' | 'projects' | 'writing' | 'learning' | 'contact';

export const CHAPTERS: readonly Chapter[] = [
  'horizon',
  'about',
  'experience',
  'projects',
  'writing',
  'learning',
  'contact',
];

/** A spot-colour mark a printer adds over the cut (sun, flag, bookmark), in unit space. */
export type Spot = { shape: 'disc' | 'flag' | 'bookmark'; x: number; y: number; size: number };

export type ChapterScene = ToneField & { chapter: Chapter; spots: Spot[] };

type Build = (
  a: number,
  t: number,
) => { tone: (x: number, y: number) => number; spots: Spot[]; horizon?: number };

/** Noise around zero, scaled by the texture amount (Blueprint keeps the shapes, not the grain). */
const grain = (t: number, x: number, y: number, k: number) => (fbm(x, y) - 0.5) * k * t;

const sky = (t: number, x: number, y: number, horizon: number) =>
  0.4 - 0.26 * clamp01(y / horizon) + grain(t, x * 2.5, y * 6, 0.4);

const sea = (t: number, x: number, y: number, horizon: number) => {
  const depth = (y - horizon) / (1 - horizon);
  const crest = smooth(0.62, 0.8, fbm(x * 7, y * 18)) * t;
  return 0.4 + depth * 0.32 - crest * 0.32;
};

/** Sunset over open water, the sun's road broken on the swell. */
const horizon: Build = (a, t) => {
  const h = 0.6;
  const sun = { x: a * 0.68, y: 0.47, r: 0.085 };
  return {
    horizon: h,
    spots: [{ shape: 'disc', x: sun.x, y: sun.y, size: sun.r * 0.62 }],
    tone(x, y) {
      if (y <= h) {
        const d = Math.hypot(x - sun.x, y - sun.y);
        if (d < sun.r) return 0.02;
        return sky(t, x, y, h) * (0.35 + 0.65 * smooth(sun.r, sun.r + 0.32, d)) + 0.04;
      }
      const depth = (y - h) / (1 - h);
      const road = 1 - smooth(0.03 + depth * 0.05, 0.06 + depth * 0.14, Math.abs(x - sun.x));
      const broken = 0.35 + 0.65 * smooth(0.35, 0.7, fbm(x * 22, y * 48)) * t + (1 - t) * 0.3;
      return sea(t, x, y, h) * (1 - road * broken * 0.85);
    },
  };
};

/** A lone tree on a rise: where the story starts. */
const about: Build = (a, t) => {
  const tree = a * 0.72;
  const ground = (x: number) => 0.72 - 0.12 * Math.exp(-(((x - tree) / 0.38) ** 2));
  return {
    horizon: 0.72,
    spots: [],
    tone(x, y) {
      const g = ground(x);
      const cx = x - tree;
      const cy = y - 0.33;
      const edge = 1 + grain(t, x * 9, y * 9, 0.5);
      const canopy = (cx / 0.19) ** 2 + (cy / 0.15) ** 2;
      if (canopy < edge) {
        const lit = clamp01(0.5 - cx * 2.2 - cy * 3);
        return 0.86 - lit * 0.5 + grain(t, x * 28, y * 28, 0.5);
      }
      const trunk = 0.011 + (y - 0.4) * 0.05;
      if (y > 0.4 && y < g + 0.01 && Math.abs(cx) < trunk) return 0.92;
      if (y > g) {
        const depth = (y - g) / (1 - g);
        return 0.42 + depth * 0.35 + grain(t, x * 14, y * 40, 0.5);
      }
      return sky(t, x, y, 0.72);
    },
  };
};

/** A road running away to the horizon between ploughed fields: the years so far. */
const experience: Build = (a, t) => {
  const h = 0.46;
  const vp = { x: a * 0.66, y: h };
  return {
    horizon: h,
    spots: [],
    tone(x, y) {
      if (y <= h) {
        const hills = h - 0.035 - 0.03 * Math.sin(x * 4.2) - grain(t, x * 3, 0, 0.06);
        return y > hills ? 0.68 : sky(t, x, y, h);
      }
      const depth = (y - h) / (1 - h);
      const centre = vp.x - 0.42 * depth ** 1.4 + 0.05 * Math.sin(depth * 5);
      const half = 0.004 + 0.3 * depth ** 1.25;
      const off = Math.abs(x - centre);
      if (off < half) {
        const dash = off < 0.002 + depth * 0.008 && (depth ** 0.5 * 18) % 1 < 0.5;
        return dash ? 0.7 : 0.08 + depth * 0.1;
      }
      const furrow = 0.5 + 0.5 * Math.sin(Math.atan2(x - vp.x, y - h) * 70);
      return 0.36 + depth * 0.24 + furrow * 0.22 + grain(t, x * 10, y * 20, 0.3);
    },
  };
};

/** A stone arch bridge and its reflection: things built to carry load. */
const projects: Build = (a, t) => {
  const h = 0.64;
  const deck = { top: 0.38, bottom: 0.43, from: a * 0.36 };
  const span = 0.26;
  const pier = 0.03;
  const masonry = (x: number, y: number) => {
    if (x < deck.from || y < deck.top || y > h) return false;
    if (y < deck.bottom) return true;
    const u = (((x - deck.from) % span) + span) % span;
    if (u < pier) return true;
    const half = (span - pier) / 2;
    const k = (u - pier - half) / half;
    return y < h - (h - deck.bottom - 0.04) * Math.sqrt(Math.max(0, 1 - k * k));
  };
  const stone = (x: number, y: number) => {
    const course = ((y - deck.top) / 0.022) % 1;
    return course < 0.16 ? 0.38 : 0.74 + grain(t, x * 30, y * 30, 0.3);
  };
  return {
    horizon: h,
    spots: [],
    tone(x, y) {
      if (masonry(x, y)) return stone(x, y);
      if (y <= h) return sky(t, x, y, h);
      const mirror = 2 * h - y;
      const ripple = grain(t, x * 4, y * 60, 0.02);
      if (masonry(x + ripple, mirror)) return 0.55 + stone(x, mirror) * 0.3;
      return sea(t, x, y, h) * 0.85;
    },
  };
};

/** An open book on a desk, its lines set in type: the essays. */
const writing: Build = (a, t) => {
  const book = { x: a * 0.7, half: 0.34, desk: 0.74 };
  const top = (u: number) => 0.32 + 0.045 * (1 - Math.sqrt(Math.abs(u)));
  return {
    spots: [{ shape: 'bookmark', x: book.x + 0.02, y: 0.66, size: 0.1 }],
    tone(x, y) {
      const u = (x - book.x) / book.half;
      const pageTop = top(Math.max(-1, Math.min(1, u)));
      const pageBottom = pageTop + 0.33;
      if (Math.abs(u) < 1 && y > pageTop && y < pageBottom) {
        const gutter = 0.45 * Math.exp(-((u * 12) ** 2));
        const row = (y - pageTop - 0.045) / 0.021;
        const inText = Math.abs(u) > 0.1 && Math.abs(u) < 0.88 && row > 0 && y < pageBottom - 0.04;
        const word = fbm(x * 38, Math.floor(row) * 3.1) > 0.34;
        const set = inText && row % 1 < 0.32 && word;
        return 0.04 + gutter + (set ? 0.5 : 0);
      }
      if (Math.abs(u) < 1.04 && y > pageTop - 0.006 && y < pageBottom + 0.016) return 0.9;
      if (y > book.desk) {
        const shadow = Math.abs(u) < 1.12 && y < pageBottom + 0.07 ? 0.18 : 0;
        const wood = 0.5 + 0.5 * Math.sin(y * 160 + fbm(x * 3, y * 8) * 6 * t + x * 2);
        return 0.48 + wood * 0.18 + shadow;
      }
      return 0.58 - 0.18 * clamp01((y - 0.1) / 0.6) + grain(t, x * 2, y * 4, 0.2);
    },
  };
};

/** A mountain with snow on the summit and a flag at the top: the climb. */
const learning: Build = (a, t) => {
  const h = 0.76;
  const peak = { x: a * 0.7, y: 0.25 };
  const ridge = (x: number) => {
    const main = peak.y + Math.abs(x - peak.x) * 0.95;
    const side = 0.43 + Math.abs(x - a * 0.95) * 1.1;
    const far = 0.52 + Math.abs(x - a * 0.4) * 0.7;
    return Math.min(main, side, far, h) + grain(t, x * 7, 0, 0.06);
  };
  return {
    horizon: h,
    spots: [{ shape: 'flag', x: peak.x, y: peak.y - 0.005, size: 0.05 }],
    tone(x, y) {
      const r = ridge(x);
      if (y < r) return sky(t, x, y, h);
      if (y > h) return 0.62 + ((y - h) / (1 - h)) * 0.25 + grain(t, x * 12, y * 30, 0.3);
      const onMain = Math.abs(r - (peak.y + Math.abs(x - peak.x) * 0.95)) < 0.08;
      const lit = x < peak.x ? 0.32 : 0.78;
      const snow = onMain && y < peak.y + 0.12 + grain(t, x * 20, y * 10, 0.08);
      if (snow) return x < peak.x ? 0.03 : 0.22;
      return lit + grain(t, x * 16, y * 16, 0.4);
    },
  };
};

/** Telegraph poles striding across a meadow, wires sagging between them: lines that carry a message. */
const contact: Build = (a, t) => {
  const near = { x: a * 0.93, base: 0.94, top: 0.16 };
  const far = { x: a * 0.5, base: 0.7, top: 0.62 };
  const poles = Array.from({ length: 7 }, (_, i) => {
    const s = 0.6 ** i;
    return {
      s,
      x: far.x + (near.x - far.x) * s,
      base: far.base + (near.base - far.base) * s,
      top: far.top + (near.top - far.top) * s,
    };
  });
  const ground = (x: number) => 0.7 - 0.025 * Math.sin(x * 3.1 + 0.6);
  return {
    horizon: 0.7,
    spots: [{ shape: 'disc', x: a * 0.64, y: 0.33, size: 0.03 }],
    tone(x, y) {
      for (const pole of poles) {
        const half = 0.0018 + 0.009 * pole.s;
        if (Math.abs(x - pole.x) < half && y > pole.top && y < pole.base) return 0.94;
        const arm = pole.top + 0.03 * pole.s;
        if (Math.abs(y - arm) < 0.0015 + 0.004 * pole.s && Math.abs(x - pole.x) < 0.06 * pole.s)
          return 0.9;
      }
      for (let i = 0; i + 1 < poles.length; i += 1) {
        const p = poles[i];
        const q = poles[i + 1];
        if (x > p.x || x < q.x) continue;
        for (const side of [-1, 0, 1]) {
          // Three wires: one per crossarm end, the middle one a touch higher.
          const lift = side === 0 ? 0.004 : 0;
          const from = p.top + (0.03 - lift) * p.s;
          const to = q.top + (0.03 - lift) * q.s;
          const xFrom = p.x + side * 0.05 * p.s;
          const xTo = q.x + side * 0.05 * q.s;
          if (x > Math.max(xFrom, xTo) || x < Math.min(xFrom, xTo)) continue;
          const v = (xFrom - x) / (xFrom - xTo);
          const wire = from + (to - from) * v + 0.035 * p.s * 4 * v * (1 - v);
          if (Math.abs(y - wire) < 0.0012 + (0.0016 * (p.s + q.s)) / 2) return 0.9;
        }
      }
      const g = ground(x);
      if (y > g) {
        const depth = (y - g) / (1 - g);
        const blades = 0.5 + 0.5 * Math.sin(x * (90 + depth * 160) + fbm(x * 6, y * 12) * 8 * t);
        return 0.3 + depth * 0.3 + blades * 0.22 * (0.4 + depth) * t;
      }
      return sky(t, x, y, 0.7);
    },
  };
};

const BUILDERS: Record<Chapter, Build> = {
  horizon,
  about,
  experience,
  projects,
  writing,
  learning,
  contact,
};

/**
 * The scene for a chapter. `texture` 1 prints the full grain (engraving); lower values keep the
 * shapes and calm the noise, so a contour trace draws forms rather than speckle.
 */
export function chapterScene(chapter: Chapter, aspect: number, texture = 1): ChapterScene {
  const built = BUILDERS[chapter](aspect, texture);
  const horizonLine = built.horizon;
  const displace = (x: number, y: number) => {
    if (horizonLine !== undefined && y > horizonLine) {
      const depth = (y - horizonLine) / (1 - horizonLine);
      return Math.sin(x * (30 - depth * 20) + y * 60) * (0.002 + depth * 0.008) * texture;
    }
    return (fbm(x * 2.2, y * 5) - 0.5) * 0.018 * texture;
  };
  return {
    chapter,
    aspect,
    spots: built.spots,
    displace,
    tone: (x, y) => clamp01(built.tone(x, y)),
  };
}

export type Segment = [number, number, number, number];

/**
 * Marching squares: the line segments where `tone` crosses `level`, sampled on a cols x rows
 * grid over the scene. Each segment is [x1, y1, x2, y2] in unit space.
 */
export function contours(field: ToneField, level: number, cols: number, rows: number): Segment[] {
  return contourLevels(field, [level], cols, rows)[0];
}

/**
 * Several level sets of one field. The field is sampled once and shared by every level, so a
 * survey of five levels costs one pass over the tone field, not five.
 */
export function contourLevels(
  field: ToneField,
  levels: readonly number[],
  cols: number,
  rows: number,
): Segment[][] {
  const dx = field.aspect / cols;
  const dy = 1 / rows;
  const grid = new Float32Array((cols + 1) * (rows + 1));
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= cols; i += 1) grid[j * (cols + 1) + i] = field.tone(i * dx, j * dy);
  }
  return levels.map((level) => traceLevel(grid, level, cols, rows, dx, dy));
}

function traceLevel(
  grid: Float32Array,
  level: number,
  cols: number,
  rows: number,
  dx: number,
  dy: number,
): Segment[] {
  const at = (i: number, j: number) => grid[j * (cols + 1) + i];
  const cross = (v0: number, v1: number) => (level - v0) / (v1 - v0);
  const segments: Segment[] = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      const x = i * dx;
      const y = j * dy;
      const points: [number, number][] = [];
      if (a < level !== b < level) points.push([x + cross(a, b) * dx, y]);
      if (b < level !== c < level) points.push([x + dx, y + cross(b, c) * dy]);
      if (c < level !== d < level) points.push([x + cross(d, c) * dx, y + dy]);
      if (d < level !== a < level) points.push([x, y + cross(a, d) * dy]);
      if (points.length === 2) segments.push([...points[0], ...points[1]]);
      // A saddle has four crossings: pair them along the cell's edges.
      if (points.length === 4) {
        segments.push([...points[0], ...points[1]], [...points[2], ...points[3]]);
      }
    }
  }
  return segments;
}
