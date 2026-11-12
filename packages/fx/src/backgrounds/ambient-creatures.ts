// Ambient creature steering: wandering fireflies or butterflies that scatter from a moving
// pointer and land on a still one. Pure and deterministic for a given `random`, in pixels and
// seconds; the field allocates only at creation. Ported from the portfolio site
// (amsborse.github.io `src/components/ambient/creatures.ts`, same owner) with the tuning
// constants lifted into `CreatureFieldOptions` and names prefixed for the fx barrel.

/** Longest step the field integrates; a stall (tab switch, debugger) never teleports creatures. */
export const CREATURE_MAX_DT = 0.05;

export interface CreatureFieldOptions {
  /** Seconds the pointer must rest before creatures come to land. Default 0.7. */
  stillDelay?: number;
  /** How many creatures may perch on a still pointer. Default 3. */
  landingSlots?: number;
  /** Creatures within this many pixels of a moving pointer flee. Default 155. */
  fleeRadius?: number;
  /** Seconds a startled creature keeps escaping. Default 1.6. */
  fearSeconds?: number;
}

export interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  phase: number;
  /** 0.35..1; nearer creatures are larger, faster and brighter. */
  depth: number;
  wingPhase: number;
  wingRate: number;
  /** Landing slot claimed on the still pointer, or -1. */
  slot: number;
  settled: boolean;
  fearUntil: number;
  escapeX: number;
  escapeY: number;
}

export interface CreatureField {
  width: number;
  height: number;
  time: number;
  /** Creatures currently simulated; the rest of `creatures` sit idle (smaller fields). */
  count: number;
  creatures: Creature[];
  config: Required<CreatureFieldOptions>;
  pointer: {
    x: number;
    y: number;
    active: boolean;
    canLand: boolean;
    lastMove: number;
    speed: number;
  };
}

const DEFAULTS: Required<CreatureFieldOptions> = {
  stillDelay: 0.7,
  landingSlots: 3,
  fleeRadius: 155,
  fearSeconds: 1.6,
};

export function createCreatureField(
  width: number,
  height: number,
  count: number,
  random: () => number = Math.random,
  options: CreatureFieldOptions = {},
): CreatureField {
  return {
    width,
    height,
    time: 0,
    count,
    config: { ...DEFAULTS, ...options },
    pointer: { x: 0, y: 0, active: false, canLand: false, lastMove: 0, speed: 0 },
    creatures: Array.from({ length: count }, () => {
      const phase = random() * Math.PI * 2;
      return {
        x: 8 + random() * Math.max(0, width - 16),
        y: 8 + random() * Math.max(0, height - 16),
        vx: Math.cos(phase) * 10,
        vy: Math.sin(phase) * 10,
        angle: phase,
        phase,
        depth: 0.35 + random() * 0.65,
        wingPhase: phase,
        wingRate: 12,
        slot: -1,
        settled: false,
        fearUntil: 0,
        escapeX: 0,
        escapeY: 0,
      };
    }),
  };
}

function release(field: CreatureField, startle: boolean) {
  for (const c of field.creatures) {
    if (c.slot < 0) continue;
    if (startle) {
      const dx = c.x - field.pointer.x;
      const dy = c.y - field.pointer.y;
      const distance = Math.hypot(dx, dy);
      c.escapeX = distance > 1 ? dx / distance : Math.cos(c.phase);
      c.escapeY = distance > 1 ? dy / distance : Math.sin(c.phase);
      c.fearUntil = field.time + field.config.fearSeconds;
    }
    c.slot = -1;
    c.settled = false;
  }
}

/**
 * Moves the pointer. Perched creatures are startled relative to the old position, so even a large
 * jump scatters them. `canLand = false` (touch) can scatter the field but never recruits a lander.
 */
export function moveCreaturePointer(field: CreatureField, x: number, y: number, canLand = true) {
  const p = field.pointer;
  const distance = Math.hypot(x - p.x, y - p.y);
  if (p.active && distance < 0.5 && canLand === p.canLand) return;
  release(field, true);
  p.speed = p.active ? Math.min(1800, distance / Math.max(1 / 120, field.time - p.lastMove)) : 400;
  p.x = x;
  p.y = y;
  p.lastMove = field.time;
  p.active = true;
  p.canLand = canLand;
}

export function leaveCreaturePointer(field: CreatureField) {
  release(field, false);
  field.pointer.active = false;
  field.pointer.canLand = false;
}

/** Rescales positions proportionally so the field keeps its composition. */
export function resizeCreatureField(field: CreatureField, width: number, height: number) {
  for (const c of field.creatures) {
    c.x = Math.max(0, Math.min(width, (c.x / Math.max(1, field.width)) * width));
    c.y = Math.max(0, Math.min(height, (c.y / Math.max(1, field.height)) * height));
  }
  field.width = width;
  field.height = height;
}

/**
 * Changes how many creatures are simulated (e.g. a quality tier or a smaller light field). Idle
 * creatures give up their landing slots so they cannot block one while hidden.
 */
export function setCreatureCount(field: CreatureField, count: number) {
  field.count = Math.max(0, Math.min(field.creatures.length, Math.floor(count)));
  for (let i = field.count; i < field.creatures.length; i++) {
    field.creatures[i]!.slot = -1;
    field.creatures[i]!.settled = false;
  }
}

/** Advances the field by `elapsed` seconds, clamped to `CREATURE_MAX_DT`; invalid steps are ignored. */
export function stepCreatureField(field: CreatureField, elapsed: number) {
  const dt = Number.isFinite(elapsed) ? Math.max(0, Math.min(CREATURE_MAX_DT, elapsed)) : 0;
  if (!dt) return;
  const { stillDelay, landingSlots, fleeRadius, fearSeconds } = field.config;
  const creatures = field.creatures;
  field.time += dt;
  const p = field.pointer;
  const sinceMove = field.time - p.lastMove;
  const curious = p.active && p.canLand && sinceMove >= stillDelay;
  if (!curious) release(field, false);

  // Claim the nearest free neighbour per empty slot, once per still-pointer visit; no sorting.
  if (curious) {
    for (let slot = 0; slot < Math.min(landingSlots, field.count); slot++) {
      let occupied = false;
      for (let i = 0; i < field.count; i++) {
        if (creatures[i]!.slot === slot) occupied = true;
      }
      if (occupied) continue;
      let closest = -1;
      let best = Math.max(260, Math.min(field.width, field.height) * 0.6);
      for (let i = 0; i < field.count; i++) {
        const c = creatures[i]!;
        if (c.slot >= 0 || c.fearUntil > field.time) continue;
        const distance = Math.hypot(c.x - p.x, c.y - p.y);
        if (distance < best) {
          closest = i;
          best = distance;
        }
      }
      if (closest >= 0) creatures[closest]!.slot = slot;
    }
  }

  const slotAngle = (Math.PI * 2) / Math.max(1, landingSlots);
  for (let i = 0; i < field.count; i++) {
    const c = creatures[i]!;
    const landing = curious && c.slot >= 0;
    const fear = Math.max(0, (c.fearUntil - field.time) / fearSeconds);
    const t = field.time;
    let targetVx = Math.cos(c.phase + t * 0.28 + Math.sin(t * 0.43 + c.phase)) * (9 + c.depth * 10);
    let targetVy = Math.sin(c.phase + t * 0.23) * 9 + Math.cos(t * 1.7 + c.phase) * 3;
    let response = 1.6;

    if (landing) {
      const offsetAngle = c.slot * slotAngle - Math.PI / 2;
      const tx = Math.max(4, Math.min(field.width - 4, p.x + Math.cos(offsetAngle) * 8));
      const ty = Math.max(4, Math.min(field.height - 4, p.y + Math.sin(offsetAngle) * 8));
      const dx = tx - c.x;
      const dy = ty - c.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const speed = Math.min(210, distance * 4);
      const curve = Math.min(28, distance * 0.38) * Math.sin(c.phase + t);
      targetVx = (dx * speed - dy * curve) / distance;
      targetVy = (dy * speed + dx * curve) / distance;
      response = 10;
      c.settled = distance < 3 && Math.hypot(c.vx, c.vy) < 8;
    } else {
      c.settled = false;
    }

    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    if (p.active && sinceMove < 0.45 && distance < fleeRadius) {
      const strength =
        (1 - distance / fleeRadius) * (65 + p.speed * 0.16) * Math.exp(-sinceMove * 5);
      targetVx += (dx / distance) * strength;
      targetVy += (dy / distance) * strength;
      response = 7;
    }
    targetVx += c.escapeX * fear * 170;
    targetVy += c.escapeY * fear * 170;
    if (fear > 0) response = 7;

    // Separation is deliberately tiny at the pointer so arrivals can perch together.
    for (let j = 0; j < field.count; j++) {
      if (i === j) continue;
      const other = creatures[j]!;
      const sx = c.x - other.x;
      const sy = c.y - other.y;
      const gap = Math.max(0.1, Math.hypot(sx, sy));
      const radius = landing ? 5 : 25;
      if (gap < radius) {
        targetVx += (sx / gap) * (radius - gap) * 1.3;
        targetVy += (sy / gap) * (radius - gap) * 1.3;
      }
    }
    if (!landing) {
      const margin = Math.min(60, field.width / 4, field.height / 4);
      targetVx += Math.max(0, margin - c.x) * 1.4 - Math.max(0, c.x - field.width + margin) * 1.4;
      targetVy += Math.max(0, margin - c.y) * 1.4 - Math.max(0, c.y - field.height + margin) * 1.4;
    }
    const blend = 1 - Math.exp(-response * dt);
    c.vx += (targetVx - c.vx) * blend;
    c.vy += (targetVy - c.vy) * blend;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    // Safety net for extreme resize or pointer events; normal motion uses the soft margins above.
    if (c.x < 0 || c.x > field.width) {
      c.x = Math.max(0, Math.min(field.width, c.x));
      c.vx *= -0.3;
    }
    if (c.y < 0 || c.y > field.height) {
      c.y = Math.max(0, Math.min(field.height, c.y));
      c.vy *= -0.3;
    }
    const angle = c.settled
      ? -Math.PI / 2 + Math.sin(t * 0.6 + c.phase) * 0.16
      : Math.atan2(c.vy, c.vx);
    c.angle +=
      Math.atan2(Math.sin(angle - c.angle), Math.cos(angle - c.angle)) * (1 - Math.exp(-4 * dt));
    c.wingRate += ((c.settled ? 1.7 : 12) - c.wingRate) * (1 - Math.exp(-3 * dt));
    c.wingPhase += c.wingRate * dt;
  }
}

/** Glow alpha pulse in 0.2..1 for a firefly at `time` seconds. */
export function creaturePulse(c: Creature, time: number): number {
  return 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(time * (0.75 + c.depth * 0.4) + c.phase), 2);
}
