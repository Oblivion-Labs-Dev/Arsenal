import { describe, it, expect } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { IgnoreResolver } from "./core/ignore-resolver.js";
import { DEFAULT_CONFIG } from "./schemas/arsenal-config.schema.js";
import { scanRepo, hashContent } from "./core/repo-scanner.js";
import { buildImportIndex } from "./indexers/import-indexer.js";
import { buildDependencyGraph } from "./indexers/dependency-indexer.js";
import { buildKnowledgeGraph } from "./graph/graph-builder.js";
import { buildSymbolIndex } from "./indexers/symbol-indexer.js";
import { buildRouteIndex } from "./indexers/route-indexer.js";
import { buildApiIndex } from "./indexers/api-indexer.js";
import { buildTestIndex } from "./indexers/test-indexer.js";
import { buildContextPackage, selectRelevantFiles } from "./core/context-builder.js";
import { enforceTokenBudget } from "./core/context-budgeter.js";
import { estimateTokens } from "./core/token-estimator.js";
import { initRepoRules } from "./core/init-workspace.js";
import { runCompact } from "./cli/commands/compact.js";
import { RepoMapSchema } from "./schemas/repo-map.schema.js";
import { summarizeFile } from "./summaries/file-summarizer.js";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "fake-repo");

describe("IgnoreResolver", () => {
  it("ignores node_modules and gitignored files", () => {
    const resolver = new IgnoreResolver(fixtureRoot, DEFAULT_CONFIG);
    expect(resolver.isIgnored("node_modules/pkg/index.js")).toBe(true);
    expect(resolver.isIgnored("ignored-secret.txt")).toBe(true);
    expect(resolver.isIgnored("src/auth/oauth.ts")).toBe(false);
  });
});

describe("repo scanner", () => {
  it("generates repo map with source and test files", () => {
    const scan = scanRepo(fixtureRoot, DEFAULT_CONFIG, { includeContent: true });
    expect(scan.files.some((f) => f.path === "src/auth/oauth.ts")).toBe(true);
    expect(scan.files.some((f) => f.path.includes("oauth.spec.ts"))).toBe(true);
    expect(scan.files.some((f) => f.path.includes("node_modules"))).toBe(false);

    const stats = {
      totalFiles: scan.files.length,
      sourceFiles: scan.files.filter((f) => f.kind === "source").length,
      testFiles: scan.files.filter((f) => f.kind === "test").length,
      configFiles: scan.files.filter((f) => f.kind === "config").length,
      docFiles: scan.files.filter((f) => f.kind === "doc").length,
    };

    const repoMap = RepoMapSchema.parse({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      root: fixtureRoot,
      projectType: scan.projectType,
      stats,
      modules: scan.modules,
      files: scan.files.map(({ absolutePath: _, content: __, ...rest }) => rest),
    });

    expect(repoMap.stats.sourceFiles).toBeGreaterThan(0);
    expect(repoMap.modules).toContain("src/auth");
  });

  it("skips unchanged files when onlyChanged is set", () => {
    const filePath = join(fixtureRoot, "src/auth/oauth.ts");
    const content = readFileSync(filePath, "utf-8");
    const hash = hashContent(content);
    const previousHashes = { "src/auth/oauth.ts": hash };

    const changed = scanRepo(fixtureRoot, DEFAULT_CONFIG, {
      includeContent: true,
      previousHashes,
      onlyChanged: true,
    });

    expect(changed.files.find((f) => f.path === "src/auth/oauth.ts")).toBeUndefined();
  });
});

describe("dependency graph", () => {
  it("builds edges between local imports", () => {
    const scan = scanRepo(fixtureRoot, DEFAULT_CONFIG, { includeContent: true });
    const allPaths = scan.files.map((f) => f.path);
    const importIndex = buildImportIndex(scan.files, allPaths);
    const graph = buildDependencyGraph(importIndex);

    expect(graph.edges.some((e) => e.from.includes("session") && e.to.includes("oauth"))).toBe(
      true,
    );
  });
});

describe("knowledge graph", () => {
  it("creates nodes for files, symbols, and routes", () => {
    const scan = scanRepo(fixtureRoot, DEFAULT_CONFIG, { includeContent: true });
    const symbolIndex = buildSymbolIndex(scan.files);
    const importIndex = buildImportIndex(scan.files, scan.files.map((f) => f.path));
    const dependencyGraph = buildDependencyGraph(importIndex);
    const testIndex = buildTestIndex(scan.files);
    const routeIndex = buildRouteIndex(scan.files);
    const apiIndex = buildApiIndex(scan.files);

    const repoMap = RepoMapSchema.parse({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      root: fixtureRoot,
      projectType: "node",
      stats: {
        totalFiles: scan.files.length,
        sourceFiles: 1,
        testFiles: 1,
        configFiles: 1,
        docFiles: 0,
      },
      modules: scan.modules,
      files: scan.files.map(({ absolutePath: _, content: __, ...rest }) => rest),
    });

    const graph = buildKnowledgeGraph({
      repoRoot: fixtureRoot,
      repoMap,
      symbolIndex,
      dependencyGraph,
      testIndex,
      routeIndex,
      apiIndex,
      importIndex,
    });

    expect(graph.nodes.some((n) => n.type === "File")).toBe(true);
    expect(graph.nodes.some((n) => n.type === "Function")).toBe(true);
    expect(graph.nodes.some((n) => n.type === "APIEndpoint")).toBe(true);
    expect(graph.edges.some((e) => e.type === "IMPORTS")).toBe(true);
  });
});

describe("context builder", () => {
  it("selects oauth-related files for token refresh query", () => {
    const scan = scanRepo(fixtureRoot, DEFAULT_CONFIG, { includeContent: true });
    const importIndex = buildImportIndex(scan.files, scan.files.map((f) => f.path));
    const dependencyGraph = buildDependencyGraph(importIndex);
    const testIndex = buildTestIndex(scan.files);
    const summaries = scan.files
      .filter((f) => f.kind === "source")
      .map((f) => summarizeFile(f, dependencyGraph, testIndex));

    const symbolIndex = buildSymbolIndex(scan.files);
    const repoMap = RepoMapSchema.parse({
      version: "1.0",
      generatedAt: new Date().toISOString(),
      root: fixtureRoot,
      projectType: "node",
      stats: {
        totalFiles: scan.files.length,
        sourceFiles: 1,
        testFiles: 1,
        configFiles: 1,
        docFiles: 0,
      },
      modules: scan.modules,
      files: scan.files.map(({ absolutePath: _, content: __, ...rest }) => rest),
    });

    const graph = buildKnowledgeGraph({
      repoRoot: fixtureRoot,
      repoMap,
      symbolIndex,
      dependencyGraph,
      testIndex,
      routeIndex: buildRouteIndex(scan.files),
      apiIndex: buildApiIndex(scan.files),
      importIndex,
    });

    const selected = selectRelevantFiles("fix OAuth token refresh", summaries, graph);
    expect(selected.some((p) => p.includes("oauth"))).toBe(true);

    const pkg = buildContextPackage({
      query: "fix OAuth token refresh",
      config: DEFAULT_CONFIG,
      repoMap,
      graph,
      fileSummaries: summaries,
      symbolIndex,
      testIndex,
      decisions: [],
      pitfalls: [],
      commands: ["npm test"],
    });

    expect(pkg.relevantFiles.length).toBeGreaterThan(0);
    expect(pkg.estimatedTokens).toBeGreaterThan(0);
  });
});

describe("token budget", () => {
  it("enforces max tokens", () => {
    const result = enforceTokenBudget(
      [
        { id: "a", label: "a", content: "x".repeat(400), tokens: estimateTokens("x".repeat(400)), priority: 10 },
        { id: "b", label: "b", content: "y".repeat(400), tokens: estimateTokens("y".repeat(400)), priority: 9 },
      ],
      100,
    );
    expect(result.selected.length).toBe(1);
    expect(result.totalTokens).toBeLessThanOrEqual(100);
  });
});

describe("init", () => {
  it("does not overwrite existing user files", () => {
    const dir = mkdtempSync(join(tmpdir(), "arsenal-init-"));
    writeFileSync(join(dir, "AGENTS.md"), "# My custom agents\n");
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(join(dir, ".cursor", "rules", "arsenal-context.mdc"), "custom");

    const result = initRepoRules(dir);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain("My custom agents");
    expect(result.skipped).toContain(join(dir, "AGENTS.md"));
    expect(existsSync(join(dir, ".arsenal", "config.json"))).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("compact handoff", () => {
  it("generates compact sections from active task", () => {
    const dir = mkdtempSync(join(tmpdir(), "arsenal-compact-"));
    initRepoRules(dir);
    writeFileSync(
      join(dir, ".arsenal", "memory", "active-task.md"),
      `# Active Task\n\n## Goal\n\nFix OAuth\n\n## Next steps\n\n- run tests\n`,
    );

    const result = runCompact(dir);
    const handoff = readFileSync(result.handoffPath, "utf-8");
    expect(handoff).toContain("Fix OAuth");
    expect(handoff).toContain("run tests");

    rmSync(dir, { recursive: true, force: true });
  });
});
