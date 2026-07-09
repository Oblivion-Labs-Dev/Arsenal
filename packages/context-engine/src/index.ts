// Arsenal Context Engine — public API

export * from "./schemas/arsenal-config.schema.js";
export * from "./schemas/repo-map.schema.js";
export * from "./schemas/file-summary.schema.js";
export * from "./schemas/knowledge-graph.schema.js";
export * from "./schemas/active-task.schema.js";

export * from "./core/paths.js";
export * from "./core/token-estimator.js";
export * from "./core/ignore-resolver.js";
export * from "./core/file-classifier.js";
export * from "./core/repo-scanner.js";
export * from "./core/context-budgeter.js";
export * from "./core/context-builder.js";
export * from "./core/file-io.js";
export * from "./core/init-workspace.js";

export * from "./indexers/ast-indexer.js";
export * from "./indexers/symbol-indexer.js";
export * from "./indexers/import-indexer.js";
export * from "./indexers/dependency-indexer.js";
export * from "./indexers/test-indexer.js";
export * from "./indexers/route-indexer.js";
export * from "./indexers/api-indexer.js";

export * from "./graph/graph-types.js";
export * from "./graph/knowledge-graph.js";
export * from "./graph/graph-builder.js";
export * from "./graph/graph-query.js";

export * from "./summaries/file-summarizer.js";
export * from "./summaries/module-summarizer.js";
export * from "./summaries/architecture-summarizer.js";
export * from "./summaries/decision-summarizer.js";
export * from "./summaries/task-summarizer.js";

export * from "./memory/memory-store.js";
export * from "./memory/decision-store.js";
export * from "./memory/active-task-store.js";
export * from "./memory/pitfall-store.js";

export * from "./prompts/prompt-builder.js";
export * from "./prompts/prompt-templates.js";
export * from "./prompts/model-profiles.js";

export * from "./analytics/analytics-types.js";
export * from "./analytics/analytics-store.js";
export * from "./analytics/usage-logger.js";
export * from "./analytics/savings-calculator.js";
export * from "./analytics/improvement-engine.js";
export * from "./analytics/stale-knowledge-detector.js";
export * from "./analytics/quality-score.js";

export * from "./dashboard/dashboard-data.js";
export * from "./dashboard/dashboard-snapshot.js";
export * from "./dashboard/dashboard-server.js";

export { runContextCli } from "./cli/arsenal-context-cli.js";
export { startDashboardServer, DEFAULT_DASHBOARD_PORT } from "./dashboard/dashboard-server.js";
export { aggregateDashboardData } from "./dashboard/dashboard-data.js";
export { saveDashboardSnapshot, buildDashboardSnapshot } from "./dashboard/dashboard-snapshot.js";
export * from "./cli/commands/index.js";
