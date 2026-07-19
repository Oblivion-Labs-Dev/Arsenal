import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type Framework = "nextjs" | "vite" | "react" | "static" | "unknown";
export type InstallMode = "package" | "embedded";
export type Preset =
  | "github-pages"
  | "react"
  | "nextjs"
  | "vite"
  | "static"
  | "generic";

export interface RepoInspection {
  packageManager: PackageManager;
  framework: Framework;
  hasPlaywright: boolean;
  hasVitest: boolean;
  hasJest: boolean;
  hasGithubPages: boolean;
  basePath: string | null;
  hasAgentsMd: boolean;
  hasCursorRules: boolean;
  hasClaudeMd: boolean;
  hasCodexInstructions: boolean;
  hasCi: boolean;
  existingAutoreview: boolean;
  router: "app" | "pages" | "hash" | "unknown";
}

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) return "bun";
  return "npm";
}

export function inspectRepository(cwd: string): RepoInspection {
  const pkgPath = join(cwd, "package.json");
  const pkg = existsSync(pkgPath)
    ? (JSON.parse(readFileSync(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      })
    : {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  let framework: Framework = "unknown";
  if (deps.next) framework = "nextjs";
  else if (deps.vite) framework = "vite";
  else if (deps.react) framework = "react";
  else if (
    existsSync(join(cwd, "index.html")) &&
    !deps.react
  ) {
    framework = "static";
  }

  const hasGithubPages =
    Boolean(pkg.scripts?.["deploy"]?.includes("gh-pages")) ||
    existsSync(join(cwd, ".github/workflows")) &&
      readdirSync(join(cwd, ".github/workflows")).some((f) =>
        /pages|gh-pages/i.test(f),
      );

  let basePath: string | null = null;
  for (const candidate of ["vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs"]) {
    const abs = join(cwd, candidate);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, "utf8");
    const m = text.match(/base:\s*['"`]([^'"`]+)['"`]/) || text.match(/basePath:\s*['"`]([^'"`]+)['"`]/);
    if (m) basePath = m[1] ?? null;
  }

  let router: RepoInspection["router"] = "unknown";
  if (existsSync(join(cwd, "app")) || existsSync(join(cwd, "src/app"))) router = "app";
  else if (existsSync(join(cwd, "pages")) || existsSync(join(cwd, "src/pages"))) router = "pages";
  else if (/HashRouter|createHashRouter/.test(JSON.stringify(pkg))) router = "hash";

  return {
    packageManager: detectPackageManager(cwd),
    framework,
    hasPlaywright: Boolean(deps.playwright || deps["@playwright/test"]),
    hasVitest: Boolean(deps.vitest),
    hasJest: Boolean(deps.jest),
    hasGithubPages,
    basePath,
    hasAgentsMd: existsSync(join(cwd, "AGENTS.md")),
    hasCursorRules: existsSync(join(cwd, ".cursor/rules")),
    hasClaudeMd: existsSync(join(cwd, "CLAUDE.md")),
    hasCodexInstructions: existsSync(join(cwd, ".codex/instructions.md")),
    hasCi: existsSync(join(cwd, ".github/workflows")),
    existingAutoreview:
      existsSync(join(cwd, ".autoreview")) ||
      existsSync(join(cwd, "tools/autoreview")) ||
      Boolean(deps["@arsenal/agent-autoreview"]),
    router,
  };
}

export function resolveMode(
  mode: InstallMode | undefined,
  preset: Preset | undefined,
  inspection: RepoInspection,
): InstallMode {
  if (mode) return mode;
  if (preset === "github-pages" || inspection.hasGithubPages) return "embedded";
  return "package";
}
