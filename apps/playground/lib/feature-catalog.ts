export interface Capability {
  name: string;
  package: string;
  description: string;
  outputs?: string;
}

export interface FeatureArea {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  packages: string[];
  capabilities: Capability[];
  relatedLinks?: { label: string; href: string }[];
}

export const FEATURE_AREAS: FeatureArea[] = [
  {
    id: "preprocessing",
    slug: "preprocessing",
    title: "Repository Preprocessing",
    tagline: "Scan, index, and summarize before any LLM sees your code",
    description:
      "Turns a raw codebase into compact structured artifacts under `.arsenal/`. Agents read summaries and indexes first — not full source files.",
    packages: ["@arsenal/context-engine", "@arsenal/cache", "@arsenal/summary"],
    capabilities: [
      { name: "Workspace initializer", package: "@arsenal/context-engine", description: "Creates `.arsenal/` structure, config, memory, rules, cache, analytics", outputs: ".arsenal/config.json, memory/, rules/" },
      { name: "Repo scanner", package: "@arsenal/context-engine", description: "Walks repo with ignore rules, hashes files, classifies by kind", outputs: "repo-map.json, file-index.json" },
      { name: "AST indexer", package: "@arsenal/context-engine", description: "Extracts exports, symbols, side effects from source" },
      { name: "Symbol indexer", package: "@arsenal/context-engine", description: "Flat symbol table for functions, classes, interfaces", outputs: "symbol-index.json" },
      { name: "Import & dependency indexers", package: "@arsenal/context-engine", description: "Resolves imports and builds dependency edges", outputs: "dependency-graph.json" },
      { name: "Test indexer", package: "@arsenal/context-engine", description: "Links test files to inferred source targets" },
      { name: "Route & API indexers", package: "@arsenal/context-engine", description: "Detects Next.js routes and HTTP handlers" },
      { name: "File summarizer", package: "@arsenal/context-engine", description: "Per-file purpose, exports, deps, risks", outputs: "summaries/files/*.json" },
      { name: "Module summarizer", package: "@arsenal/context-engine", description: "Rolls up file summaries per module", outputs: "summaries/modules/*.md" },
      { name: "Architecture summarizer", package: "@arsenal/context-engine", description: "High-level repo stats, modules, routes, APIs", outputs: "summaries/architecture.md" },
      { name: "Context cache", package: "@arsenal/cache", description: "Hash-based incremental indexing — skip unchanged files", outputs: "cache/hashes.json" },
      { name: "Text summarizer", package: "@arsenal/summary", description: "Multi-level truncation (micro → detailed)" },
      { name: "Log compressor", package: "@arsenal/summary", description: "Terminal output → errors, warnings, stats only" },
      { name: "Block deduplication", package: "@arsenal/summary", description: "Removes repeated instructions and code blocks" },
      { name: "Session memory", package: "@arsenal/session-memory", description: "Active task, decisions, pitfalls across sessions", outputs: "memory/*.md" },
    ],
  },
  {
    id: "knowledge-graph",
    slug: "knowledge-graph",
    title: "Knowledge Graph",
    tagline: "Queryable map of how your codebase connects",
    description:
      "Persistent graph of symbols, modules, routes, tests, and dependencies. Graph exploration finishes before file reads.",
    packages: ["@arsenal/context-engine", "@arsenal/knowledge", "@arsenal/retrieval"],
    capabilities: [
      { name: "Graph builder", package: "@arsenal/context-engine", description: "Merges repo map, symbols, deps, tests, routes into one graph", outputs: "knowledge-graph.json" },
      { name: "Graph store", package: "@arsenal/context-engine", description: "In-memory accessor for nodes and edges by type" },
      { name: "Graph schema", package: "@arsenal/knowledge", description: "Zod-validated node/edge types (14 node, 11 edge types)" },
      { name: "Term-scored search", package: "@arsenal/context-engine", description: "Returns relevant files and symbols for a query" },
      { name: "Neighbor expansion", package: "@arsenal/context-engine", description: "Walks dependencies and dependents from a node" },
      { name: "Query type inference", package: "@arsenal/knowledge", description: "Infers who-calls, where-is, what-breaks intent" },
      { name: "Hybrid retrieval", package: "@arsenal/retrieval", description: "TF-IDF + symbols + dependency distance + recency" },
      { name: "TF-IDF index", package: "@arsenal/retrieval", description: "Keyword relevance ranking for context selection" },
    ],
    relatedLinks: [
      { label: "Graph answers: who calls this?, what breaks?, which tests cover this?", href: "#queries" },
    ],
  },
  {
    id: "prompt-optimization",
    slug: "prompt-optimization",
    title: "Prompt Optimization",
    tagline: "Compile structured prompts — never send raw user text to the model",
    description:
      "Assembles objective, rules, context, constraints, and budget into a compiled prompt. Policy engine enforces guardrails automatically.",
    packages: ["@arsenal/prompt", "@arsenal/policy", "@arsenal/context", "@arsenal/budget"],
    capabilities: [
      { name: "Prompt compiler", package: "@arsenal/prompt", description: "9 profiles: implementation, debugging, architecture, review, refactor, performance, security, testing, documentation" },
      { name: "Profile inference", package: "@arsenal/prompt", description: "Selects profile from task keywords (fix → debugging, refactor → refactor)" },
      { name: "Policy engine", package: "@arsenal/policy", description: "Declarative rules: reject duplicates, oversized files, prefer summaries" },
      { name: "Negative constraints", package: "@arsenal/policy", description: "Auto-injects: minimal diff, no unrelated files, preserve conventions" },
      { name: "Context compiler", package: "@arsenal/context", description: "Intent → symbols → deps → tests → compiled context (levels 0–4)" },
      { name: "Budget manager", package: "@arsenal/budget", description: "6 profiles from tiny (2k) to maximum-quality (48k tokens)" },
      { name: "Profile selection", package: "@arsenal/budget", description: "Adaptive budget from task complexity and keywords" },
      { name: "Priority enforcement", package: "@arsenal/budget", description: "Drops low-priority context when over budget" },
      { name: "Context package builder", package: "@arsenal/context-engine", description: "Graph + summaries + memory → scored handoff package", outputs: "prompts/agent-handoff.md" },
    ],
  },
  {
    id: "token-usage",
    slug: "token-usage",
    title: "Cut Token Usage",
    tagline: "Measure, reduce, and track LLM context cost",
    description:
      "Layer context from cheap to expensive: active task → architecture → summaries → source. Typical savings: 85–98% vs loading all source.",
    packages: ["@arsenal/budget", "@arsenal/context-engine", "@arsenal/observability"],
    capabilities: [
      { name: "Token estimator", package: "@arsenal/core", description: "Heuristic: ceil(chars / 4) — fast pre-send estimates" },
      { name: "Progressive context levels", package: "@arsenal/core", description: "Expand only when needed: Architecture → Module → Class → Function → Source" },
      { name: "Savings calculator", package: "@arsenal/context-engine", description: "Compares selected context vs full repo token estimate" },
      { name: "Usage logger", package: "@arsenal/context-engine", description: "Logs every context build with tokens saved", outputs: "analytics/context-builds.jsonl" },
      { name: "Quality scorer", package: "@arsenal/context-engine", description: "Grades freshness, file selection, memory usage" },
      { name: "Stale knowledge detector", package: "@arsenal/context-engine", description: "Finds summaries out of sync with file hashes" },
      { name: "Improvement engine", package: "@arsenal/context-engine", description: "Suggests index and summary improvements from patterns" },
      { name: "Learning engine", package: "@arsenal/observability", description: "Records request metrics and retrieval signals" },
      { name: "Dashboard snapshot", package: "@arsenal/context-engine", description: "Full analytics JSON + HTML viewer", outputs: "analytics/dashboard.json" },
    ],
    relatedLinks: [
      { label: "Live Context Intelligence Dashboard", href: "/context" },
    ],
  },
];

export const GRAPH_QUERIES = [
  "Who calls this?",
  "Where is authentication handled?",
  "What breaks if this changes?",
  "Which tests cover this?",
  "Which services depend on this?",
  "Which files usually change together?",
];

export const BUDGET_PROFILES = [
  { name: "tiny", tokens: "2,000", use: "Quick fixes, typos" },
  { name: "small", tokens: "4,000", use: "Single-function changes" },
  { name: "balanced", tokens: "12,000", use: "Default feature work" },
  { name: "large", tokens: "24,000", use: "Multi-module features" },
  { name: "maximum-quality", tokens: "48,000", use: "Refactors, migrations" },
  { name: "maximum-savings", tokens: "1,500", use: "Aggressive cost reduction" },
];

export const ALL_PACKAGES = [
  "@arsenal/core",
  "@arsenal/context-engine",
  "@arsenal/budget",
  "@arsenal/policy",
  "@arsenal/prompt",
  "@arsenal/context",
  "@arsenal/retrieval",
  "@arsenal/summary",
  "@arsenal/knowledge",
  "@arsenal/session-memory",
  "@arsenal/cache",
  "@arsenal/observability",
  "@arsenal/dashboard",
];

export function getFeatureBySlug(slug: string): FeatureArea | undefined {
  return FEATURE_AREAS.find((f) => f.slug === slug);
}
