export interface ClayAsset {
  src: string;
  alt: string;
}

export const CLAYFLOW_ASSET_KEYS = [
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
  "decision",
  "loop",
  "retry",
  "parallel",
  "merge",
  "success",
  "fail",
  "media",
  "knowledge",
  "code",
  "api",
  "queue",
  "cache",
  "ai",
  "finance",
  "science",
  "health",
  "learning",
  "business",
  "money", "technology", "growth", "goal", "launch", "person", "team", "organization", "institution", "education", "general",
  "warning",
  "info",
  "pending",
] as const;

export type ClayAssetKey = (typeof CLAYFLOW_ASSET_KEYS)[number];

export const CLAYFLOW_ASSETS: Record<ClayAssetKey, ClayAsset> = {
  process: { src: "/assets/clayflow/process.webp", alt: "Process workflow step" },
  data: { src: "/assets/clayflow/data.webp", alt: "Data packet" },
  agent: { src: "/assets/clayflow/agent.webp", alt: "Autonomous AI agent" },
  user: { src: "/assets/clayflow/user.webp", alt: "User actor" },
  system: { src: "/assets/clayflow/system.webp", alt: "System host" },
  service: { src: "/assets/clayflow/service.webp", alt: "Backend service" },
  database: { src: "/assets/clayflow/database.webp", alt: "Database storage" },
  tool: { src: "/assets/clayflow/tool.webp", alt: "Integrated tool" },
  document: { src: "/assets/clayflow/document.webp", alt: "Document record" },
  cloud: { src: "/assets/clayflow/cloud.webp", alt: "Cloud infrastructure" },
  decision: { src: "/assets/clayflow/decision.webp", alt: "Decision gateway" },
  loop: { src: "/assets/clayflow/loop.webp", alt: "Loop iteration" },
  retry: { src: "/assets/clayflow/retry.webp", alt: "Retry attempt" },
  parallel: { src: "/assets/clayflow/parallel.webp", alt: "Parallel execution" },
  merge: { src: "/assets/clayflow/merge.webp", alt: "Merge stream" },
  success: { src: "/assets/clayflow/success.webp", alt: "Success completion" },
  fail: { src: "/assets/clayflow/fail.webp", alt: "Failure outcome" },
  media: { src: "/assets/clayflow/media.webp", alt: "Media asset" },
  knowledge: { src: "/assets/clayflow/knowledge.webp", alt: "Knowledge store" },
  code: { src: "/assets/clayflow/code.webp", alt: "Code routine" },
  api: { src: "/assets/clayflow/api.webp", alt: "API interface" },
  queue: { src: "/assets/clayflow/queue.webp", alt: "Message queue" },
  cache: { src: "/assets/clayflow/cache.webp", alt: "Fast cache layer" },
  ai: { src: "/assets/clayflow/ai.webp", alt: "AI intelligence core" },
  finance: { src: "/assets/clayflow/finance.webp", alt: "Financial balance" },
  science: { src: "/assets/clayflow/science.webp", alt: "Scientific discovery" },
  health: { src: "/assets/clayflow/health.webp", alt: "System health" },
  learning: { src: "/assets/clayflow/learning.webp", alt: "Learning memory" },
  business: { src: "/assets/clayflow/business.webp", alt: "Business operations" },
  money: { src: "/assets/clayflow/finance.webp", alt: "Clay coins representing money" },
  technology: { src: "/assets/clayflow/atom.webp", alt: "Clay atom representing technology" },
  growth: { src: "/assets/clayflow/growth.webp", alt: "Growing plant" },
  goal: { src: "/assets/clayflow/target.webp", alt: "Target representing a goal" },
  launch: { src: "/assets/clayflow/launch.webp", alt: "Violet clay rocket launching" },
  person: { src: "/assets/clayflow/person.webp", alt: "Person" },
  team: { src: "/assets/clayflow/team.webp", alt: "Team" },
  organization: { src: "/assets/clayflow/organization.webp", alt: "Organization" },
  institution: { src: "/assets/clayflow/bank.webp", alt: "Institution" },
  education: { src: "/assets/clayflow/student.webp", alt: "Education" },
  general: { src: "/assets/clayflow/idea.webp", alt: "General idea" },
  warning: { src: "/assets/clayflow/warning.webp", alt: "Warning alert" },
  info: { src: "/assets/clayflow/info.webp", alt: "Information notice" },
  pending: { src: "/assets/clayflow/pending.webp", alt: "Pending action" },
};

export function resolveAsset(key: string, assetBase?: string): ClayAsset | undefined {
  if (!(key in CLAYFLOW_ASSETS)) return undefined;
  const asset = CLAYFLOW_ASSETS[key as ClayAssetKey];
  if (!asset) return undefined;
  if (!assetBase) return asset;
  const prefix = assetBase.endsWith("/") ? assetBase.slice(0, -1) : assetBase;
  const path = asset.src.startsWith("/") ? asset.src : `/${asset.src}`;
  return {
    src: `${prefix}${path}`,
    alt: asset.alt,
  };
}
