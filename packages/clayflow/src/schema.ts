import { z } from "zod";

export const ID_REGEX = /^[a-z0-9-]{1,32}$/;

export const idSchema = z
  .string()
  .trim()
  .regex(ID_REGEX, "ID must be 1-32 lowercase alphanumeric characters or hyphens");

export const labelSchema = z.string().trim().min(1).max(40);

export const descriptionSchema = z.string().trim().min(1).max(160);

export const NODE_KINDS = [
  // Core / Architecture
  "process",
  "data",
  "agent",
  "user",
  "system",
  "service",
  "database",
  "tool",
  "document",
  "cloud",
  // Logic
  "decision",
  "branch",
  "condition",
  "loop",
  "retry",
  "parallel",
  "merge",
  "success",
  "fail",
  // Data / Transport
  "media",
  "knowledge",
  "code",
  "api",
  "queue",
  "cache",
  // Domain
  "ai",
  "finance",
  "science",
  "health",
  "learning",
  "business",
  // Progress
  "progress-ring",
  "progress-bar",
  "gauge",
  "counter",
  "timeline",
  "metric",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export const nodeKindSchema = z.enum(NODE_KINDS);

export const NODE_STATES = [
  "idle",
  "active",
  "success",
  "warning",
  "error",
  "pending",
  "disabled",
  "selected",
] as const;

export type NodeState = (typeof NODE_STATES)[number];

export const nodeStateSchema = z.enum(NODE_STATES);

export const TONES = ["violet", "sky", "mint", "peach", "rose", "sand"] as const;

export type Tone = (typeof TONES)[number];

export const toneSchema = z.enum(TONES);

export const EDGE_STYLES = ["straight", "curved", "orthogonal"] as const;

export type EdgeStyle = (typeof EDGE_STYLES)[number];

export const edgeStyleSchema = z.enum(EDGE_STYLES);

export const GROUP_KINDS = ["group", "module", "boundary"] as const;

export type GroupKind = (typeof GROUP_KINDS)[number];

export const groupKindSchema = z.enum(GROUP_KINDS);

export const ANNOTATION_KINDS = [
  "success",
  "pending",
  "error",
  "warning",
  "info",
  "callout",
  "tooltip",
  "label",
] as const;

export type AnnotationKind = (typeof ANNOTATION_KINDS)[number];

export const annotationKindSchema = z.enum(ANNOTATION_KINDS);

export const ANIMATION_PRESETS = [
  "data-flow",
  "request-response",
  "step-reveal",
  "parallel",
  "decision-branch",
  "retry-failure",
  "loop",
  "progress",
  "fan-out-in",
  "timeline",
  "state-transition",
  "highlight",
] as const;

export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export const animationPresetSchema = z.enum(ANIMATION_PRESETS);

export const metricSchema = z.object({
  value: z.number().finite(),
  unit: z.string().trim().max(16).optional(),
  label: z.string().trim().max(40).optional(),
});

export type NodeMetric = z.infer<typeof metricSchema>;

export const nodeSchema = z.object({
  id: idSchema,
  kind: nodeKindSchema,
  label: labelSchema,
  meta: z.string().trim().max(160).optional(),
  state: nodeStateSchema.optional().default("idle"),
  metric: metricSchema.optional(),
  group: idSchema.optional(),
  tone: toneSchema.optional(),
});

export type Node = z.infer<typeof nodeSchema>;

export const edgeSchema = z.object({
  id: idSchema,
  from: idSchema,
  to: idSchema,
  style: edgeStyleSchema.optional().default("curved"),
  dashed: z.boolean().optional().default(false),
  bidirectional: z.boolean().optional().default(false),
  label: z.string().trim().max(40).optional(),
  animated: z.boolean().optional().default(false),
});

export type Edge = z.infer<typeof edgeSchema>;

export const groupSchema = z.object({
  id: idSchema,
  label: labelSchema,
  kind: groupKindSchema.optional().default("group"),
  collapsible: z.boolean().optional().default(false),
  collapsed: z.boolean().optional().default(false),
  parent: idSchema.optional(),
});

export type Group = z.infer<typeof groupSchema>;

export const annotationSchema = z.object({
  id: idSchema,
  kind: annotationKindSchema,
  text: z.string().trim().min(1).max(160),
  target: idSchema,
});

export type Annotation = z.infer<typeof annotationSchema>;

export const animationStepSchema = z.object({
  caption: z.string().trim().min(1).max(160),
  nodes: z.array(idSchema).max(40).optional(),
  edges: z.array(idSchema).max(80).optional(),
  highlight: z.array(idSchema).max(40).optional(),
  packets: z
    .array(
      z.object({
        edge: idSchema,
        reverse: z.boolean().optional(),
      }),
    )
    .max(80)
    .optional(),
  states: z.record(idSchema, nodeStateSchema).optional(),
  counters: z.record(idSchema, z.number().finite()).optional(),
  duration: z.number().finite().positive().max(10000).optional(),
});

export type AnimationStep = z.infer<typeof animationStepSchema>;

export const animationSchema = z.object({
  preset: animationPresetSchema,
  speed: z.number().finite().min(0.5).max(2).optional().default(1),
  loop: z.boolean().optional().default(true),
  steps: z.array(animationStepSchema).max(24).optional(),
});

export type AnimationConfig = z.infer<typeof animationSchema>;

export const explanationsSchema = z.object({
  eli5: z.string().trim().max(2000).optional(),
  advanced: z.string().trim().max(2000).optional(),
});

export type Explanations = z.infer<typeof explanationsSchema>;

export const diagramSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: idSchema,
  title: labelSchema,
  summary: descriptionSchema.optional(),
  layout: z.enum(["horizontal", "vertical"]).default("horizontal"),
  theme: z.enum(["auto", "light", "dark"]).optional().default("auto"),
  nodes: z.array(nodeSchema).min(1).max(40),
  edges: z.array(edgeSchema).max(80).default([]),
  groups: z.array(groupSchema).max(8).optional().default([]),
  annotations: z.array(annotationSchema).max(40).optional().default([]),
  animation: animationSchema.optional(),
  explanations: explanationsSchema.optional(),
});

export type Diagram = z.infer<typeof diagramSchema>;
/** Authored shape: defaulted fields may be omitted. Parse with diagramSchema to get a Diagram. */
export type DiagramSpec = z.input<typeof diagramSchema>;

export interface FallbackNode {
  id: string;
  kind: NodeKind;
  label: string;
  state?: NodeState;
  tone?: Tone;
}

export interface FallbackModel {
  title: string;
  summary?: string;
  nodes: FallbackNode[];
}
