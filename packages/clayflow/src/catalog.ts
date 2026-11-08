import type { NodeKind, Tone } from "./schema.js";

export type ComponentFamily = "node" | "logic" | "data" | "domain" | "progress";
export type ComponentShape = "card" | "diamond" | "pill" | "ring";

export interface ComponentMetadata {
  family: ComponentFamily;
  tone: Tone;
  asset: string | null;
  noun: string;
  shape: ComponentShape;
}

export const CATALOG: Record<NodeKind, ComponentMetadata> = {
  // Core / Architecture (node)
  process: {
    family: "node",
    tone: "violet",
    asset: "process",
    noun: "Process",
    shape: "card",
  },
  agent: {
    family: "node",
    tone: "violet",
    asset: "agent",
    noun: "AI Agent",
    shape: "card",
  },
  user: {
    family: "node",
    tone: "sky",
    asset: "user",
    noun: "User",
    shape: "card",
  },
  system: {
    family: "node",
    tone: "sand",
    asset: "system",
    noun: "System",
    shape: "card",
  },
  service: {
    family: "node",
    tone: "violet",
    asset: "service",
    noun: "Service",
    shape: "card",
  },
  database: {
    family: "data",
    tone: "sky",
    asset: "database",
    noun: "Database",
    shape: "card",
  },
  tool: {
    family: "node",
    tone: "sand",
    asset: "tool",
    noun: "Tool",
    shape: "card",
  },
  document: {
    family: "node",
    tone: "sand",
    asset: "document",
    noun: "Document",
    shape: "card",
  },
  cloud: {
    family: "node",
    tone: "sky",
    asset: "cloud",
    noun: "Cloud Infrastructure",
    shape: "card",
  },

  // Logic
  decision: {
    family: "logic",
    tone: "peach",
    asset: "decision",
    noun: "Decision Point",
    shape: "diamond",
  },
  branch: {
    family: "logic",
    tone: "peach",
    asset: "decision",
    noun: "Branch",
    shape: "diamond",
  },
  condition: {
    family: "logic",
    tone: "peach",
    asset: "decision",
    noun: "Condition",
    shape: "diamond",
  },
  loop: {
    family: "logic",
    tone: "peach",
    asset: "loop",
    noun: "Loop Iteration",
    shape: "card",
  },
  retry: {
    family: "logic",
    tone: "peach",
    asset: "retry",
    noun: "Retry Policy",
    shape: "card",
  },
  parallel: {
    family: "logic",
    tone: "violet",
    asset: "parallel",
    noun: "Parallel Fan-out",
    shape: "card",
  },
  merge: {
    family: "logic",
    tone: "violet",
    asset: "merge",
    noun: "Merge Fan-in",
    shape: "card",
  },
  success: {
    family: "logic",
    tone: "mint",
    asset: "success",
    noun: "Success State",
    shape: "pill",
  },
  fail: {
    family: "logic",
    tone: "rose",
    asset: "fail",
    noun: "Failure State",
    shape: "pill",
  },

  // Data / Transport
  data: {
    family: "data",
    tone: "sky",
    asset: "data",
    noun: "Data Payload",
    shape: "card",
  },
  media: {
    family: "data",
    tone: "sky",
    asset: "media",
    noun: "Media Asset",
    shape: "card",
  },
  knowledge: {
    family: "data",
    tone: "sand",
    asset: "knowledge",
    noun: "Knowledge Store",
    shape: "card",
  },
  code: {
    family: "data",
    tone: "violet",
    asset: "code",
    noun: "Code Execution",
    shape: "card",
  },
  api: {
    family: "data",
    tone: "sky",
    asset: "api",
    noun: "API Endpoint",
    shape: "card",
  },
  queue: {
    family: "data",
    tone: "peach",
    asset: "queue",
    noun: "Message Queue",
    shape: "card",
  },
  cache: {
    family: "data",
    tone: "sky",
    asset: "cache",
    noun: "Cache Layer",
    shape: "card",
  },

  // Domain
  ai: {
    family: "domain",
    tone: "violet",
    asset: "ai",
    noun: "AI Intelligence",
    shape: "card",
  },
  finance: {
    family: "domain",
    tone: "mint",
    asset: "finance",
    noun: "Financial Ledger",
    shape: "card",
  },
  science: {
    family: "domain",
    tone: "sky",
    asset: "science",
    noun: "Science & Discovery",
    shape: "card",
  },
  health: {
    family: "domain",
    tone: "rose",
    asset: "health",
    noun: "Health & Vitality",
    shape: "card",
  },
  learning: {
    family: "domain",
    tone: "violet",
    asset: "learning",
    noun: "Learning Memory",
    shape: "card",
  },
  business: {
    family: "domain",
    tone: "sand",
    asset: "business",
    noun: "Business Operations",
    shape: "card",
  },

  // Progress
  "progress-ring": {
    family: "progress",
    tone: "violet",
    asset: null,
    noun: "Progress Ring",
    shape: "ring",
  },
  "progress-bar": {
    family: "progress",
    tone: "violet",
    asset: null,
    noun: "Progress Bar",
    shape: "card",
  },
  gauge: {
    family: "progress",
    tone: "peach",
    asset: null,
    noun: "Gauge",
    shape: "card",
  },
  counter: {
    family: "progress",
    tone: "mint",
    asset: null,
    noun: "Counter",
    shape: "pill",
  },
  timeline: {
    family: "progress",
    tone: "sky",
    asset: null,
    noun: "Timeline Milestone",
    shape: "card",
  },
  metric: {
    family: "progress",
    tone: "mint",
    asset: null,
    noun: "Metric Measurement",
    shape: "card",
  },
};
