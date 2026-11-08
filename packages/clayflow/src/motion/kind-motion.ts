import { CATALOG, type ComponentFamily } from "../catalog.js";
import { NODE_KINDS, type NodeKind } from "../schema.js";

export const MOTION_FAMILIES = [
  "mechanism",
  "reservoir",
  "thinking",
  "people",
  "logic",
  "coins",
  "growth",
  "goal",
  "timeline",
  "launch",
  "orbit",
  "education",
  "progress",
  "status",
  "object",
] as const;

export type MotionFamily = (typeof MOTION_FAMILIES)[number];

const catalogFamilyMotion: Record<ComponentFamily, MotionFamily> = {
  node: "mechanism",
  logic: "logic",
  data: "reservoir",
  domain: "orbit",
  people: "people",
  progress: "progress",
};

const kindOverrides: Partial<Record<NodeKind, MotionFamily>> = {
  agent: "thinking",
  ai: "thinking",
  data: "reservoir",
  document: "reservoir",
  cache: "reservoir",
  decision: "logic",
  branch: "logic",
  condition: "logic",
  loop: "logic",
  success: "status",
  fail: "status",
  user: "people",
  person: "people",
  team: "people",
  organization: "people",
  institution: "people",
  business: "people",
  finance: "coins",
  money: "coins",
  growth: "growth",
  goal: "goal",
  timeline: "timeline",
  launch: "launch",
  science: "orbit",
  technology: "orbit",
  health: "orbit",
  learning: "education",
  education: "education",
  general: "object",
};

/** Exhaustive kind-to-motion map. Catalog families provide defaults; semantic kinds refine them. */
export const KIND_MOTION_FAMILY: Record<NodeKind, MotionFamily> = Object.fromEntries(
  NODE_KINDS.map((kind) => [kind, kindOverrides[kind] ?? catalogFamilyMotion[CATALOG[kind].family]]),
) as Record<NodeKind, MotionFamily>;

export function getKindMotionFamily(kind: NodeKind): MotionFamily {
  return KIND_MOTION_FAMILY[kind];
}

/**
 * Sets the percent metric fill without inventing progress for other units.
 * The runtime should call this when applying a counter to a metric node.
 */
export function setMetricProgress(metric: HTMLElement, value: number, unit: string | undefined): boolean {
  if (unit !== "%" || !Number.isFinite(value)) return false;
  metric.style.setProperty("--cf-progress", String(Math.max(0, Math.min(1, value / 100))));
  return true;
}
