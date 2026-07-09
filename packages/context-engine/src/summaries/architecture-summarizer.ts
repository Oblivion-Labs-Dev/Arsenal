import type { RepoMap } from "../schemas/repo-map.schema.js";
import type { KnowledgeGraph } from "../schemas/knowledge-graph.schema.js";

export function summarizeArchitecture(repoMap: RepoMap, graph: KnowledgeGraph): string {
  const modules = repoMap.modules;
  const routes = graph.nodes.filter((n) => n.type === "Route");
  const apis = graph.nodes.filter((n) => n.type === "APIEndpoint");
  const tests = graph.nodes.filter((n) => n.type === "Test");

  return [
    "# Architecture Summary",
    "",
    `Project type: **${repoMap.projectType}**`,
    `Generated: ${repoMap.generatedAt}`,
    "",
    "## Stats",
    `- Total files: ${repoMap.stats.totalFiles}`,
    `- Source files: ${repoMap.stats.sourceFiles}`,
    `- Test files: ${repoMap.stats.testFiles}`,
    `- Modules: ${modules.length}`,
    "",
    "## Modules",
    ...modules.map((m) => `- \`${m}\``),
    "",
    "## Routes",
    ...(routes.length ? routes.map((r) => `- ${r.label} (\`${r.path}\`)`) : ["- none detected"]),
    "",
    "## API Endpoints",
    ...(apis.length ? apis.map((a) => `- ${a.label}`) : ["- none detected"]),
    "",
    "## Tests",
    `- ${tests.length} test nodes indexed`,
    "",
    "Use `.arsenal/knowledge-graph.json` for precise relationships.",
  ].join("\n");
}
