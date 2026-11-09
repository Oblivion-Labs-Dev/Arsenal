import type { BonsaiBranch, BonsaiOptions, BonsaiPad, BonsaiSkeleton, V3 } from './types';
import { mossHeight } from './pot';
import { createRandom, range } from './random';

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const len = (a: V3) => Math.hypot(...a);

function line(points: V3[], count: number): V3[] {
  const result: V3[] = [];
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + len([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]]));
  const total = lengths[lengths.length - 1];
  for (let j = 0; j < count; j++) {
    const d = (j / (count - 1)) * total;
    let i = 0;
    while (i < lengths.length - 2 && lengths[i + 1] < d) i++;
    result.push(mix(points[i], points[i + 1], (d - lengths[i]) / Math.max(1e-8, lengths[i + 1] - lengths[i])));
  }
  return result;
}

export function buildBonsaiSkeleton(options: BonsaiOptions = {}): BonsaiSkeleton {
  const seed = options.seed ?? 7;
  const random = createRandom(seed);
  const branches: BonsaiBranch[] = [];
  const pads: BonsaiPad[] = [];
  // The silhouette follows a windswept moyogi: the trunk leans left in an S, a wide layered canopy
  // sits over it and one lower-left pad hangs out past the pot. Positions are authored in a view
  // frame (x right, y up, z toward the default camera) and seeded so every tree differs a little.
  const S = 0.85;
  const swayGain = range(random, 0.86, 1.1);
  const trunkView: V3[] = [[0, 0, 0], [-0.1, 0.14, 0.04], [-0.27, 0.3, 0.07], [-0.42, 0.47, 0.06], [-0.52, 0.63, 0.02], [-0.54, 0.78, -0.03], [-0.47, 0.93, -0.05], [-0.38, 1.08, -0.05], [-0.3, 1.24, -0.04]];
  // The view frame faces the default camera at [1.72, 1.16, 2.62]; a small seeded yaw keeps trees distinct.
  const facing = Math.atan2(2.62, 1.72) - Math.PI / 2 + range(random, -0.12, 0.12);
  const right: V3 = [Math.cos(facing), 0, -Math.sin(facing)];
  const toward: V3 = [Math.sin(facing), 0, Math.cos(facing)];
  const world = (p: V3): V3 => [S * (p[0] * right[0] + p[2] * toward[0]), S * p[1], S * (p[0] * right[2] + p[2] * toward[2])];
  const jitter = (amount: number): V3 => [range(random, -amount, amount), range(random, -amount, amount) * 0.5, range(random, -amount, amount)];
  const trunkRaw = trunkView.map((p, i): V3 => world([p[0] * (i === 0 ? 1 : swayGain), p[1], p[2] * swayGain]));
  branches.push({ id: 0, kind: 'trunk', order: 0, points: line(trunkRaw, 32), radii: [], attach: null });

  const addBranch = (kind: BonsaiBranch['kind'], order: number, attach: BonsaiBranch['attach'], raw: V3[], samples: number): number => {
    const id = branches.length;
    branches.push({ id, kind, order, points: line(raw, samples), radii: [], attach });
    return id;
  };
  const pointAt = (branch: BonsaiBranch, t: number): V3 => branch.points[Math.round(t * (branch.points.length - 1))];
  const padYaw = (from: V3, to: V3) => -Math.atan2(to[2] - from[2], to[0] - from[0]);
  type PadSpec = { center: V3; rx: number; rz: number };
  // Lower-left hanging pad, upper-left shelf (with a front pad), right shelf (with a drooping tip
  // pad) and a back shelf; the crown sits on the apex. Spacing keeps the pads distinct clouds.
  const primarySpecs: Array<{ t: number; sag: number; pad: PadSpec; sub?: PadSpec; sub2?: PadSpec }> = [
    { t: 0.5, sag: -0.08, pad: { center: [-1.25, 0.72, 0.1], rx: 0.55, rz: 0.4 } },
    { t: 0.64, sag: 0.05, pad: { center: [-1.05, 1.36, -0.35], rx: 0.45, rz: 0.38 }, sub: { center: [-0.55, 1.2, 0.42], rx: 0.32, rz: 0.27 } },
    { t: 0.76, sag: 0.04, pad: { center: [0.38, 1.28, 0.2], rx: 0.4, rz: 0.34 }, sub: { center: [0.82, 1.02, 0.3], rx: 0.25, rz: 0.21 }, sub2: { center: [-0.1, 1.3, 0.55], rx: 0.3, rz: 0.26 } },
    { t: 0.86, sag: 0.03, pad: { center: [-0.35, 1.15, -0.6], rx: 0.4, rz: 0.34 } },
  ];
  const twigsInto = (secondary: number, cloud: V3, angle: number) => {
    for (let twig = 0; twig < 2; twig++) {
      const twigAt = twig === 0 ? 0.45 : 0.72;
      const twigOrigin = pointAt(branches[secondary], twigAt);
      const twigAngle = angle + (twig === 0 ? -0.8 : 0.8);
      const twigTip: V3 = [cloud[0] + range(random, -0.025, 0.025), cloud[1] + 0.06 + range(random, -0.015, 0.015), cloud[2] + range(random, -0.025, 0.025)];
      addBranch('branch', 3, { parent: secondary, index: Math.round(twigAt * 6) }, [twigOrigin, add(twigOrigin, [Math.cos(twigAngle) * 0.07, 0.03, Math.sin(twigAngle) * 0.07]), twigTip], 4);
    }
  };
  for (const spec of primarySpecs) {
    const attachIndex = Math.round(spec.t * 31);
    const base = branches[0].points[attachIndex];
    const padCenter = add(world(spec.pad.center), jitter(0.035));
    const flat: V3 = [padCenter[0] - base[0], 0, padCenter[2] - base[2]];
    const reach = Math.max(1e-6, Math.hypot(flat[0], flat[2]));
    const direction: V3 = [flat[0] / reach, 0, flat[2] / reach];
    const az = Math.atan2(direction[2], direction[0]);
    const rx = spec.pad.rx * S;
    // The limb enters its pad from underneath, a third of the way in from the trunk side.
    const tip: V3 = [padCenter[0] - direction[0] * rx * 0.35, padCenter[1] - 0.07, padCenter[2] - direction[2] * rx * 0.35];
    const swing = range(random, 0.04, 0.08) * (attachIndex % 2 === 0 ? 1 : -1);
    const mid: V3 = [base[0] + (tip[0] - base[0]) * 0.5 - direction[2] * swing, base[1] + (tip[1] - base[1]) * 0.5 + spec.sag, base[2] + (tip[2] - base[2]) * 0.5 + direction[0] * swing];
    const primary = addBranch('branch', 1, { parent: 0, index: attachIndex }, [base, mid, tip], 11);
    for (let child = 0; child < 2; child++) {
      const at = child === 0 ? 0.45 : 0.73;
      const origin = pointAt(branches[primary], at);
      const sub = child === 0 ? spec.sub : spec.sub2;
      const side = child === 0 ? 1 : -1;
      let secondaryTip: V3;
      let angle: number;
      if (sub) {
        const subCenter = add(world(sub.center), jitter(0.03));
        secondaryTip = [subCenter[0], subCenter[1] - 0.05, subCenter[2]];
        angle = Math.atan2(secondaryTip[2] - origin[2], secondaryTip[0] - origin[0]);
        pads.push({ center: subCenter, radii: [sub.rx * S, Math.max(sub.rx, sub.rz) * S * 0.44, sub.rz * S], yaw: padYaw(origin, subCenter), branch: -1 });
      } else {
        // A secondary without its own pad sweeps into the primary pad, so no bare stub ends in air.
        angle = az + side * (0.98 + range(random, 0, 0.2));
        secondaryTip = add(padCenter, [Math.cos(angle) * rx * 0.3, -0.03, Math.sin(angle) * rx * 0.3]);
      }
      const lead: V3 = [Math.cos(angle) * 0.14, 0.03, Math.sin(angle) * 0.14];
      const secondary = addBranch('branch', 2, { parent: primary, index: Math.round(at * 10) }, [origin, add(origin, lead), secondaryTip], 7);
      if (sub) pads[pads.length - 1].branch = secondary;
      twigsInto(secondary, sub ? secondaryTip : padCenter, angle);
    }
    pads.push({ center: padCenter, radii: [rx, Math.max(spec.pad.rx, spec.pad.rz) * S * 0.42, spec.pad.rz * S], yaw: -az, branch: primary });
  }
  const apex = trunkRaw[trunkRaw.length - 1];
  const crownCenter = add(world([-0.2, 1.6, -0.05]), jitter(0.03));
  const crown = addBranch('branch', 2, { parent: 0, index: 31 }, [apex, mix(apex, crownCenter, 0.5), [crownCenter[0], crownCenter[1] - 0.06, crownCenter[2]]], 6);
  for (const side of [-1, 1]) {
    const origin = branches[crown].points[3];
    const angle = side * 1.1;
    const terminal = add(origin, [Math.cos(angle) * 0.11, 0.04, Math.sin(angle) * 0.11]);
    addBranch('branch', 3, { parent: crown, index: 3 }, [origin, add(origin, [Math.cos(angle) * 0.05, 0.025, Math.sin(angle) * 0.05]), terminal], 4);
  }
  pads.push({ center: crownCenter, radii: [0.45 * S, 0.45 * S * 0.42, 0.4 * S], yaw: facing, branch: crown });

  // Jin and roots are deliberately excluded from the living pipe calculation.
  for (let j = 0; j < 2; j++) {
    const t = j === 0 ? 0.46 : 0.69;
    const index = Math.round(t * 31);
    const origin = branches[0].points[index];
    const angle = 1.1 + j * 2.4;
    addBranch('jin', 1, { parent: 0, index }, [origin, add(origin, [Math.cos(angle) * 0.12, 0.045, Math.sin(angle) * 0.12]), add(origin, [Math.cos(angle) * 0.19, 0.02, Math.sin(angle) * 0.19])], 5);
  }
  for (let root = 0; root < 6; root++) {
    const angle = root * Math.PI * 2 / 6 + range(random, -0.28, 0.28);
    const reach = range(random, 0.27, 0.37);
    // Nebari hug the moss mound half-buried and dive under it at the tip, so no root ends as a spike in the air.
    const along = (f: number, lift: number): V3 => {
      const x = Math.cos(angle + f * 0.18) * reach * f;
      const z = Math.sin(angle + f * 0.18) * reach * f;
      return [x, mossHeight(x, z) + lift, z];
    };
    addBranch('root', 0, { parent: 0, index: 0 }, [branches[0].points[2], along(0.3, 0.03), along(0.62, 0.012), along(1, -0.03)], 9);
  }

  // Every living branch starts with a small twig radius; split radii accumulate from the tips.
  const living = branches.filter((branch) => branch.kind === 'trunk' || branch.kind === 'branch');
  const baseRadii = new Map<number, number>();
  const twigRadius = 0.0072;
  for (const branch of [...living].reverse()) {
    const energy = new Array<number>(branch.points.length).fill(twigRadius ** 2);
    const childEnergyAt = (i: number) => living
      .filter((candidate) => candidate.attach?.parent === branch.id && candidate.attach.index === i)
      .reduce((sum, child) => sum + (baseRadii.get(child.id) ?? twigRadius) ** 2, 0);
    // A child attached at the very tip (the crown on the trunk apex) continues the parent, so the
    // tip carries the child's full cross-section instead of tapering to a twig.
    const last = energy.length - 1;
    const tipChildEnergy = childEnergyAt(last);
    if (tipChildEnergy > 0) energy[last] = tipChildEnergy;
    for (let i = energy.length - 2; i >= 0; i--) {
      const childEnergy = childEnergyAt(i);
      const gradualTaper = childEnergy > 0 ? 1 : branch.kind === 'trunk' ? 1.11 : 1.0012;
      energy[i] = energy[i + 1] * gradualTaper + childEnergy;
    }
    const base = Math.sqrt(energy[0]);
    baseRadii.set(branch.id, base);
    branch.radii = energy.map((value, i) => {
      // Gentle taper between explicit split points, retaining exact pipe balance at attachments.
      const next = Math.sqrt(value);
      if (i === last && tipChildEnergy === 0) return twigRadius;
      return next;
    });
  }
  const scale = 0.15 / (branches[0].radii[0] || 0.15);
  for (const branch of living) branch.radii = branch.radii.map((radius) => radius * scale);
  for (const branch of branches) {
    if (branch.kind === 'jin') branch.radii = branch.points.map((_, i) => 0.018 * (1 - 0.8 * i / (branch.points.length - 1)));
    if (branch.kind === 'root') branch.radii = branch.points.map((_, i) => (0.07 * (1 - i / (branch.points.length - 1) * 0.65)) * (0.9 + 0.1 * Math.sin(i * 0.7)));
  }

  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  const include = (point: V3, radius = 0) => {
    for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], point[axis] - radius); max[axis] = Math.max(max[axis], point[axis] + radius); }
  };
  for (const branch of branches) branch.points.forEach((point, i) => include(point, branch.radii[i]));
  for (const pad of pads) {
    const cosine = Math.cos(pad.yaw);
    const sine = Math.sin(pad.yaw);
    const extentX = Math.hypot(pad.radii[0] * cosine, pad.radii[2] * sine);
    const extentZ = Math.hypot(pad.radii[0] * sine, pad.radii[2] * cosine);
    min[0] = Math.min(min[0], pad.center[0] - extentX);
    max[0] = Math.max(max[0], pad.center[0] + extentX);
    min[1] = Math.min(min[1], pad.center[1] - pad.radii[1]);
    max[1] = Math.max(max[1], pad.center[1] + pad.radii[1]);
    min[2] = Math.min(min[2], pad.center[2] - extentZ);
    max[2] = Math.max(max[2], pad.center[2] + extentZ);
  }
  return { seed, branches, pads, shari: { branch: 0, from: 0.05, to: 0.7, angle: 0.35, halfWidth: 0.35 }, bounds: { min, max } };
}
