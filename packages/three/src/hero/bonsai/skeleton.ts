import type { BonsaiBranch, BonsaiOptions, BonsaiPad, BonsaiSkeleton, V3 } from './types';
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
  // Seeded moyogi S-curve: amplitude, phase and lean vary per seed, the overall form does not.
  const swayX = range(random, 0.085, 0.125);
  const swayZ = range(random, 0.075, 0.11);
  const phaseX = range(random, -0.25, 0.25);
  const phaseZ = range(random, 0.05, 0.6);
  const lean = range(random, -0.055, -0.015);
  const trunkRaw = Array.from({ length: 9 }, (_, i): V3 => {
    const t = i / 8;
    return [swayX * Math.sin(t * Math.PI * 2.15 + phaseX) - swayX * Math.sin(phaseX) + lean * t, 1.36 * t, swayZ * Math.sin(t * Math.PI * 3.1 + phaseZ) - swayZ * Math.sin(phaseZ)];
  });
  branches.push({ id: 0, kind: 'trunk', order: 0, points: line(trunkRaw, 32), radii: [], attach: null });

  const addBranch = (kind: BonsaiBranch['kind'], order: number, attach: BonsaiBranch['attach'], raw: V3[], samples: number): number => {
    const id = branches.length;
    branches.push({ id, kind, order, points: line(raw, samples), radii: [], attach });
    return id;
  };
  const pointAt = (branch: BonsaiBranch, t: number): V3 => branch.points[Math.round(t * (branch.points.length - 1))];
  const baseAzimuth = 0.25 + range(random, -0.35, 0.35);
  for (let tier = 0; tier < 4; tier++) {
    const t = 0.24 + tier * 0.19;
    const attachIndex = Math.round(t * 31);
    const base = branches[0].points[attachIndex];
    const az = baseAzimuth + tier * 2.18 + range(random, -0.16, 0.16);
    const direction: V3 = [Math.cos(az), 0, Math.sin(az)];
    const distance = 0.63 - tier * 0.075;
    const mid = add(base, [direction[0] * distance * 0.52, 0.12 + range(random, -0.02, 0.025), direction[2] * distance * 0.52]);
    const tip = add(base, [direction[0] * distance, 0.065 + range(random, -0.015, 0.035), direction[2] * distance]);
    const primary = addBranch('branch', 1, { parent: 0, index: attachIndex }, [base, mid, tip], 11);
    for (let child = 0; child < 2; child++) {
      const at = child === 0 ? 0.45 : 0.73;
      const index = Math.round(at * 10);
      const origin = pointAt(branches[primary], at);
      const side = child === 0 ? 1 : -1;
      const angle = az + side * (0.74 + range(random, 0, 0.22));
      const direction2: V3 = [Math.cos(angle), 0, Math.sin(angle)];
      const secondaryTip = add(origin, [direction2[0] * (0.34 - tier * 0.025), 0.07, direction2[2] * (0.34 - tier * 0.025)]);
      const secondary = addBranch('branch', 2, { parent: primary, index }, [origin, add(origin, [direction2[0] * 0.16, 0.035, direction2[2] * 0.16]), secondaryTip], 7);
      const secondaryHasPad = child === 0 && (tier % 2 === 0 || tier === 3);
      const twigCloud: V3 = secondaryHasPad
        ? secondaryTip
        : [tip[0] + direction[0] * 0.18, tip[1], tip[2] + direction[2] * 0.18];
      for (let twig = 0; twig < 2; twig++) {
        const twigAt = twig === 0 ? 0.45 : 0.72;
        const twigIndex = Math.round(twigAt * 6);
        const twigOrigin = pointAt(branches[secondary], twigAt);
        const twigAngle = angle + (twig === 0 ? -0.8 : 0.8);
        const twigTip: V3 = [twigCloud[0] + range(random, -0.025, 0.025), twigCloud[1] + 0.075 + range(random, -0.018, 0.018), twigCloud[2] + range(random, -0.025, 0.025)];
        addBranch('branch', 3, { parent: secondary, index: twigIndex }, [twigOrigin, add(twigOrigin, [Math.cos(twigAngle) * 0.08, 0.035, Math.sin(twigAngle) * 0.08]), twigTip], 4);
      }
      if (secondaryHasPad) pads.push({ center: [secondaryTip[0], secondaryTip[1] + 0.07, secondaryTip[2]], radii: [0.185, 0.082, 0.17], yaw: az, branch: secondary });
    }
    pads.push({ center: [tip[0] + direction[0] * 0.18, tip[1] + 0.075, tip[2] + direction[2] * 0.18], radii: [0.205 - tier * 0.012, 0.086, 0.19 - tier * 0.012], yaw: az, branch: primary });
  }
  const apex: V3 = [trunkRaw[8][0], 1.36, trunkRaw[8][2]];
  const crown = addBranch('branch', 2, { parent: 0, index: 31 }, [apex, [apex[0] + 0.035, 1.43, apex[2] - 0.015], [apex[0] + 0.015, 1.48, apex[2] + 0.015]], 6);
  for (const side of [-1, 1]) {
    const origin = branches[crown].points[3];
    const angle = side * 1.1;
    const terminal = add(origin, [Math.cos(angle) * 0.12, 0.035, Math.sin(angle) * 0.12]);
    addBranch('branch', 3, { parent: crown, index: 3 }, [origin, add(origin, [Math.cos(angle) * 0.06, 0.025, Math.sin(angle) * 0.06]), terminal], 4);
  }
  pads.push({ center: [apex[0], 1.51, apex[2]], radii: [0.19, 0.085, 0.18], yaw: 0, branch: crown });

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
    const reach = range(random, 0.27, 0.4);
    addBranch('root', 0, { parent: 0, index: 0 }, [[0, 0.02, 0], [Math.cos(angle) * reach * 0.42, -0.005, Math.sin(angle) * reach * 0.42], [Math.cos(angle) * reach, range(random, -0.06, -0.03), Math.sin(angle) * reach]], 9);
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
      const gradualTaper = childEnergy > 0 ? 1 : branch.kind === 'trunk' ? 1.002 : 1.0012;
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
  const scale = 0.13 / (branches[0].radii[0] || 0.13);
  for (const branch of living) branch.radii = branch.radii.map((radius) => radius * scale);
  for (const branch of branches) {
    if (branch.kind === 'jin') branch.radii = branch.points.map((_, i) => 0.027 * (1 - 0.78 * i / (branch.points.length - 1)));
    if (branch.kind === 'root') branch.radii = branch.points.map((_, i) => (0.052 * (1 - i / (branch.points.length - 1) * 0.78)) * (0.9 + 0.1 * Math.sin(i * 0.7)));
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
