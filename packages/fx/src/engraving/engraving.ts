/**
 * Origin: amsborse.github.io redesign, `src/designs/broadsheet/engraving.ts` (Broadsheet hero).
 * Lift-and-shift: copy this file and `engraving.test.ts`; it is pure (no DOM, no React) apart
 * from the two painters, which take a CanvasRenderingContext2D.
 */
/**
 * A wood-engraving renderer and the scene it prints: a lighthouse holding its light over a
 * storm ("clarity under load"). The picture is a tone field (0 paper .. 1 solid ink) read by
 * horizontal engraved lines whose thickness follows the tone, the way a burin cuts a block.
 * Pure geometry plus two small painters; the component owns the canvas and the animation.
 */

export type Point = { x: number; y: number };

/** The scene in unit space: x in 0..aspect, y in 0..1 (top to bottom). */
export type Scene = {
  aspect: number;
  horizon: number;
  lantern: Point;
  /** Tower base centre and half-widths at base and top. */
  tower: { x: number; base: number; top: number; halfBase: number; halfTop: number };
};

export function createScene(aspect: number): Scene {
  const x = aspect * 0.72;
  return {
    aspect,
    horizon: 0.64,
    lantern: { x, y: 0.2 },
    tower: { x, base: 0.66, top: 0.25, halfBase: 0.055, halfTop: 0.036 },
  };
}

// ---------- noise ----------

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Fractal noise in 0..1. */
export function fbm(x: number, y: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += amp * valueNoise(x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

// ---------- scene shapes ----------

/** Top edge of the headland the tower stands on (y of the rock surface at x), or null over sea. */
export function rockTop(scene: Scene, x: number): number | null {
  const start = scene.aspect * 0.5;
  if (x < start) return null;
  const t = (x - start) / (scene.aspect - start);
  // The headland climbs out of the sea to a shelf under the tower, then falls a little away.
  const rise = smooth(0, 0.42, t) * 0.085 - smooth(0.7, 1, t) * 0.02;
  return scene.horizon + 0.035 - rise + (fbm(x * 9, 3.1) - 0.5) * 0.03;
}

export function towerHalfWidth(scene: Scene, y: number) {
  const { base, top, halfBase, halfTop } = scene.tower;
  if (y < top || y > base) return 0;
  return halfTop + ((y - top) / (base - top)) * (halfBase - halfTop);
}

/** Vertical displacement of an engraved line: swell on the sea, slow drift in the sky. */
export function lineDisplacement(scene: Scene, x: number, y: number) {
  if (y > scene.horizon) {
    const depth = (y - scene.horizon) / (1 - scene.horizon);
    const amp = 0.004 + depth * 0.022;
    return Math.sin(x * (34 - depth * 22) + y * 60) * amp + (fbm(x * 4, y * 6) - 0.5) * amp * 2;
  }
  return (fbm(x * 2.2, y * 5) - 0.5) * 0.03;
}

/** Open water: darker with depth, broken by pale wave crests. */
function seaTone(scene: Scene, x: number, y: number) {
  const depth = (y - scene.horizon) / (1 - scene.horizon);
  const crest = smooth(0.62, 0.8, fbm(x * 7, y * 18));
  return 0.42 + depth * 0.3 - crest * 0.38;
}

/**
 * Ink tone at a point: 0 paper, 1 solid. `lit` is how much of the lighthouse beam falls on the
 * point (0..1), which lifts the ink off the storm.
 */
export function toneAt(scene: Scene, x: number, y: number, lit = 0): number {
  const { lantern, tower } = scene;
  let tone: number;

  const halfWidth = towerHalfWidth(scene, y);
  const dx = x - tower.x;
  const rock = rockTop(scene, x);

  if (Math.abs(dx) < 0.03 && y > lantern.y - 0.035 && y < tower.top) {
    // Lantern room: a glazed box with a dark cap above it.
    if (y < lantern.y - 0.018) tone = 0.92;
    else tone = Math.abs(dx) > 0.024 ? 0.9 : 0.04;
  } else if (Math.abs(dx) < 0.044 && Math.abs(y - (tower.top - 0.002)) < 0.006) {
    tone = 0.95; // gallery rail
  } else if (halfWidth > 0 && Math.abs(dx) < halfWidth) {
    // Striped tower, shaded as a cylinder lit from the lantern side.
    const across = dx / halfWidth;
    const band = Math.floor(((y - tower.top) / (tower.base - tower.top)) * 5) % 2 === 0;
    const shade = smooth(-0.6, 1, across) * 0.55;
    tone = band ? 0.72 + shade * 0.4 : 0.06 + shade;
  } else if (rock !== null && y > rock) {
    // Weathered rock: a pale lip where it meets the weather, crags and shadow beneath.
    const crag = fbm(x * 16, y * 16);
    const strata = Math.sin((y + fbm(x * 5, y * 3) * 0.08) * 160) * 0.5 + 0.5;
    const rockTone = 0.34 + crag * 0.4 + strata * 0.12 + smooth(rock, rock + 0.14, y) * 0.22;
    // Where the headland first rises it is still awash, so it fades in from the sea; without
    // this the rock starts on a straight vertical line.
    const emerged = smooth(0, 0.3, (x - scene.aspect * 0.5) / (scene.aspect * 0.5));
    tone = y > scene.horizon ? seaTone(scene, x, y) * (1 - emerged) + rockTone * emerged : rockTone;
  } else if (y > scene.horizon) {
    tone = seaTone(scene, x, y);
  } else {
    // Storm sky: heavier towards the top, torn by cloud.
    const height = 1 - y / scene.horizon;
    const cloud = fbm(x * 2.6 + 4, y * 5.5);
    tone = 0.18 + height * 0.32 + (cloud - 0.45) * 0.55;
    const glow = Math.hypot(x - lantern.x, (y - lantern.y) * 1.3);
    tone -= smooth(0.16, 0, glow) * 0.45;
  }

  tone -= lit * 0.55;
  return clamp01(tone);
}

// ---------- the beam ----------

export type Beam = { angle: number; spread: number; reach: number };

/** Default beam: out to sea on the left, a little below level. */
export const RESTING_BEAM: Beam = { angle: Math.PI * 1.03, spread: 0.11, reach: 2.4 };

/** Aim the beam at a point, kept out to sea (the left half-plane, not into the rock). */
export function aimBeam(scene: Scene, target: Point, beam: Beam = RESTING_BEAM): Beam {
  const raw = Math.atan2(target.y - scene.lantern.y, target.x - scene.lantern.x);
  const angle = raw < 0 ? raw + Math.PI * 2 : raw;
  return { ...beam, angle: Math.min(Math.PI * 1.32, Math.max(Math.PI * 0.86, angle)) };
}

/** How much of the beam reaches a point: 1 on its axis, fading to the edges and with range. */
export function beamLight(scene: Scene, beam: Beam, x: number, y: number) {
  const dx = x - scene.lantern.x;
  const dy = y - scene.lantern.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return 1;
  let off = Math.atan2(dy, dx) - beam.angle;
  off = Math.atan2(Math.sin(off), Math.cos(off));
  const across = 1 - smooth(beam.spread * 0.55, beam.spread, Math.abs(off));
  return across * (1 - smooth(beam.reach * 0.35, beam.reach, distance));
}

/** The beam's cone as a triangle in unit space, for clipping the lit print. */
export function beamCone(scene: Scene, beam: Beam): [Point, Point, Point] {
  const { lantern } = scene;
  const edge = (sign: number) => ({
    x: lantern.x + Math.cos(beam.angle + sign * beam.spread) * beam.reach,
    y: lantern.y + Math.sin(beam.angle + sign * beam.spread) * beam.reach,
  });
  return [lantern, edge(-1), edge(1)];
}

// ---------- engraving ----------

/** One engraved line as a closed ribbon: the top edge left to right, then the bottom back. */
export type Ribbon = Point[];

export type EngraveOptions = {
  /** Distance between lines, in unit space. */
  spacing: number;
  /** Horizontal sampling step, in unit space. */
  step: number;
  /** Fraction of the spacing a solid tone fills. */
  fill?: number;
  /** Beam lighting the print; null prints the storm unlit. */
  beam?: Beam | null;
  /** Even light over the whole print (0..1), used for the lit layer the beam reveals. */
  lift?: number;
  /**
   * Light lines on dark paper: line weight follows brightness instead of darkness, scaled
   * down so the print still reads as night.
   */
  invert?: boolean;
};

/** Any picture the burin can cut: tone (0 paper .. 1 ink) and how far each line wanders. */
export type ToneField = {
  aspect: number;
  tone: (x: number, y: number) => number;
  displace?: (x: number, y: number) => number;
};

/**
 * Cut a tone field into ribbons. A ribbon's thickness follows the tone, and it breaks wherever
 * the tone falls to paper, so highlights read as clean white cuts.
 */
export function cutRibbons(
  field: ToneField,
  options: Pick<EngraveOptions, 'spacing' | 'step' | 'fill' | 'invert'>,
): Ribbon[][] {
  const { spacing, step, fill = 0.92, invert = false } = options;
  const lines: Ribbon[][] = [];
  for (let base = spacing / 2; base < 1 + spacing; base += spacing) {
    const ribbons: Ribbon[] = [];
    let top: Point[] = [];
    let bottom: Point[] = [];
    const flush = () => {
      if (top.length > 1) ribbons.push([...top, ...bottom.reverse()]);
      top = [];
      bottom = [];
    };
    for (let x = 0; x <= field.aspect + step; x += step) {
      const y = base + (field.displace ? field.displace(x, base) : 0);
      const tone = field.tone(x, y);
      const weight = invert ? (1 - tone) * 0.78 : tone;
      const half = (spacing * fill * weight ** 1.15) / 2;
      if (half < spacing * 0.03) {
        flush();
        continue;
      }
      top.push({ x, y: y - half });
      bottom.push({ x, y: y + half });
    }
    flush();
    lines.push(ribbons);
  }
  return lines;
}

/** Cut the lighthouse scene, lit by the beam (or an even lift) where it falls. */
export function engrave(scene: Scene, options: EngraveOptions): Ribbon[][] {
  const { beam = null, lift = 0 } = options;
  return cutRibbons(
    {
      aspect: scene.aspect,
      displace: (x, y) => lineDisplacement(scene, x, y),
      tone: (x, y) => toneAt(scene, x, y, beam ? beamLight(scene, beam, x, y) : lift),
    },
    options,
  );
}

export type EngravingInk = { ink: string; paper: string; spot: string };

/** Paint ribbons into a context already scaled to unit space (1 unit = canvas height). */
export function paintRibbons(context: CanvasRenderingContext2D, lines: Ribbon[][], ink: string) {
  context.fillStyle = ink;
  for (const ribbons of lines) {
    context.beginPath();
    for (const ribbon of ribbons) {
      context.moveTo(ribbon[0].x, ribbon[0].y);
      for (let i = 1; i < ribbon.length; i += 1) context.lineTo(ribbon[i].x, ribbon[i].y);
      context.closePath();
    }
    context.fill();
  }
}

/** The lantern's spot colour and the crisp keylines a printer would add over the cut. */
export function paintDetails(
  context: CanvasRenderingContext2D,
  scene: Scene,
  colors: EngravingInk,
) {
  const { lantern, tower } = scene;
  context.save();
  context.lineWidth = 0.0025;
  context.strokeStyle = colors.ink;
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(tower.x - tower.halfTop, tower.top);
  context.lineTo(tower.x - tower.halfBase, tower.base);
  context.moveTo(tower.x + tower.halfTop, tower.top);
  context.lineTo(tower.x + tower.halfBase, tower.base);
  context.rect(tower.x - 0.024, lantern.y - 0.018, 0.048, tower.top - lantern.y + 0.018);
  context.moveTo(tower.x - 0.044, tower.top - 0.002);
  context.lineTo(tower.x + 0.044, tower.top - 0.002);
  context.stroke();
  context.fillStyle = colors.spot;
  context.beginPath();
  context.arc(lantern.x, lantern.y, 0.013, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
