import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureMemoryLayout } from "@arsenal/agent-memory";
import {
  inspectRepository,
  resolveMode,
  type InstallMode,
  type Preset,
  type RepoInspection,
} from "./inspect.js";

const HERE = dirname(fileURLToPath(import.meta.url));

function templatesRoot(): string {
  for (const candidate of [join(HERE, "../templates"), join(HERE, "../../templates")]) {
    if (existsSync(candidate)) return candidate;
  }
  return join(HERE, "../templates");
}

export const TEMPLATE_VERSION = "1.0.0";
export const ARSENAL_EXPORTER_VERSION = "0.1.0";

export interface InstallOptions {
  cwd: string;
  mode?: InstallMode;
  preset?: Preset;
  force?: boolean;
}

export interface InstallResult {
  mode: InstallMode;
  inspection: RepoInspection;
  generated: string[];
  modified: string[];
  skipped: string[];
  summary: string;
  rollback: string;
}

function writeSafe(
  cwd: string,
  rel: string,
  content: string,
  force: boolean,
  generated: string[],
  modified: string[],
  skipped: string[],
): void {
  const abs = join(cwd, rel);
  mkdirSync(dirname(abs), { recursive: true });
  if (existsSync(abs) && !force) {
    const existing = readFileSync(abs, "utf8");
    if (existing.trim() === content.trim()) {
      skipped.push(rel);
      return;
    }
    // Merge-preserving: do not overwrite user content
    if (!rel.includes("installation.json") && !rel.startsWith("tools/autoreview/")) {
      skipped.push(`${rel} (exists — preserved)`);
      return;
    }
    const backup = `${abs}.bak-${Date.now()}`;
    copyFileSync(abs, backup);
    modified.push(`${rel} (backup: ${relative(cwd, backup)})`);
  } else if (existsSync(abs)) {
    modified.push(rel);
  } else {
    generated.push(rel);
  }
  writeFileSync(abs, content, "utf8");
}

function agentsMd(): string {
  return `# Agent instructions

1. Start a task session before implementation.
2. Load relevant \`.agent-memory\` rules for the task scope.
3. Implement only the requested changes.
4. Run fast scoped validation (\`npm run review:run\`).
5. Fix critical and high-confidence findings.
6. Re-run only invalidated checks.
7. Generate the completion report.
8. Present an evidence-based final response matching the report.
9. Do **not** run thorough or cross-browser review unless explicitly requested.
10. Do **not** claim full-site verification.

Use: “Verification completed for the current task scope.”
`;
}

function cursorRule(): string {
  return `---
description: Scoped autoreview workflow (always on)
alwaysApply: true
---

# Autoreview

- Start task sessions for implementation work.
- Review only the current task scope.
- Prefer \`npm run review:run\` (fast / Chromium).
- Do not open unrelated routes.
- Do not escalate to Firefox/WebKit unless asked.
- Do not declare completion until scoped gates pass.
- Prefer deterministic checks before model critics.
- Read \`.autoreview/reports/latest.md\` before finishing.
`;
}

function packageScripts(mode: InstallMode): Record<string, string> {
  if (mode === "embedded") {
    return {
      "agent:task": "node tools/autoreview/cli.mjs task start",
      "agent:context": "node tools/autoreview/cli.mjs task context",
      "agent:finish": "node tools/autoreview/cli.mjs task finish",
      "review:run": "node tools/autoreview/cli.mjs review --mode fast",
      "review:thorough": "node tools/autoreview/cli.mjs review --mode thorough",
      "review:visual": "node tools/autoreview/cli.mjs review --checks visual",
      "review:animation": "node tools/autoreview/cli.mjs review --checks animation",
      "review:accessibility": "node tools/autoreview/cli.mjs review --checks accessibility",
      "review:responsive": "node tools/autoreview/cli.mjs review --checks responsive",
      "review:cross-browser": "node tools/autoreview/cli.mjs review --checks cross-browser",
      "review:baseline": "node tools/autoreview/cli.mjs report",
      "review:report": "node tools/autoreview/cli.mjs report",
    };
  }
  return {
    "agent:task": "arsenal agent task",
    "agent:context": "arsenal agent context",
    "agent:finish": "arsenal agent finish",
    "review:run": "arsenal review --mode fast",
    "review:thorough": "arsenal review --mode thorough",
    "review:visual": "arsenal review --checks visual",
    "review:animation": "arsenal review --checks animation",
    "review:accessibility": "arsenal review --checks accessibility",
    "review:responsive": "arsenal review --checks responsive",
    "review:cross-browser": "arsenal review --checks cross-browser",
    "review:baseline:approve": "arsenal baseline approve",
    "review:baseline:list": "arsenal baseline list",
    "review:baseline:diff": "arsenal baseline diff",
    "review:baseline:remove": "arsenal baseline remove",
    "review:report": "arsenal report",
  };
}

function mergePackageJson(cwd: string, mode: InstallMode, inspection: RepoInspection): string[] {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return [];
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  pkg.scripts = { ...pkg.scripts, ...packageScripts(mode) };
  if (mode === "package") {
    pkg.devDependencies = {
      ...pkg.devDependencies,
      "@arsenal/agent-autoreview": "workspace:*",
      "@arsenal/agent-memory": "workspace:*",
    };
  }
  if (!inspection.hasPlaywright && mode === "package") {
    pkg.devDependencies = { ...pkg.devDependencies, playwright: "^1.50.0" };
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  return ["package.json"];
}

export function installAutoreview(options: InstallOptions): InstallResult {
  const { cwd, force = false } = options;
  const inspection = inspectRepository(cwd);
  const mode = resolveMode(options.mode, options.preset, inspection);
  const generated: string[] = [];
  const modified: string[] = [];
  const skipped: string[] = [];

  ensureMemoryLayout(cwd);
  generated.push(".agent-memory/");

  writeSafe(
    cwd,
    "autoreview.config.json",
    JSON.stringify(
      {
        baseBranch: "main",
        mode: "fast",
        app: { url: "http://localhost:3000", startCommand: "npm run dev" },
        scope: { dependencyDepth: 2, reverseDependencyDepth: 1, maxRoutes: 2, maxScreenshots: 6 },
        githubPagesBasePath: inspection.basePath,
      },
      null,
      2,
    ) + "\n",
    force,
    generated,
    modified,
    skipped,
  );

  if (!inspection.hasAgentsMd) {
    writeSafe(cwd, "AGENTS.md", agentsMd(), force, generated, modified, skipped);
  } else {
    skipped.push("AGENTS.md (exists — preserved)");
  }

  writeSafe(
    cwd,
    ".cursor/rules/autoreview.mdc",
    cursorRule(),
    force,
    generated,
    modified,
    skipped,
  );

  if (!inspection.hasClaudeMd) {
    writeSafe(
      cwd,
      "CLAUDE.md",
      "# Claude Code\n\n" + agentsMd(),
      force,
      generated,
      modified,
      skipped,
    );
  } else skipped.push("CLAUDE.md (exists — preserved)");

  if (!inspection.hasCodexInstructions) {
    writeSafe(
      cwd,
      ".codex/instructions.md",
      "# Codex\n\n" + agentsMd(),
      force,
      generated,
      modified,
      skipped,
    );
  } else skipped.push(".codex/instructions.md (exists — preserved)");

  writeSafe(
    cwd,
    ".antigravity/AUTOREVIEW.md",
    "# Antigravity\n\n" + agentsMd(),
    force,
    generated,
    modified,
    skipped,
  );

  const gitignoreAdd = [
    "",
    "# Autoreview",
    ".autoreview/cache/",
    ".autoreview/screenshots/",
    ".autoreview/reports/*.png",
    "",
  ].join("\n");
  const gi = join(cwd, ".gitignore");
  if (existsSync(gi)) {
    const cur = readFileSync(gi, "utf8");
    if (!cur.includes(".autoreview/cache/")) {
      writeFileSync(gi, cur.trimEnd() + gitignoreAdd, "utf8");
      modified.push(".gitignore");
    } else skipped.push(".gitignore");
  } else {
    writeSafe(cwd, ".gitignore", gitignoreAdd, force, generated, modified, skipped);
  }

  if (mode === "embedded") {
    const TEMPLATES = templatesRoot();
    const embeddedCli = join(TEMPLATES, "embedded/tools/autoreview/cli.mjs");
    const destDir = join(cwd, "tools/autoreview");
    mkdirSync(destDir, { recursive: true });
    const dest = join(destDir, "cli.mjs");
    if (existsSync(embeddedCli)) {
      if (existsSync(dest) && !force) {
        copyFileSync(dest, `${dest}.bak-${Date.now()}`);
        modified.push("tools/autoreview/cli.mjs");
      } else {
        generated.push("tools/autoreview/cli.mjs");
      }
      copyFileSync(embeddedCli, dest);
      writeFileSync(
        join(destDir, "README.md"),
        "# Embedded autoreview\n\nSelf-contained. No Arsenal runtime dependency.\n",
        "utf8",
      );
    }
  }

  if (!inspection.hasCi || force) {
    const ciSrc = join(templatesRoot(), "ci/scoped-review.yml");
    if (existsSync(ciSrc)) {
      writeSafe(
        cwd,
        ".github/workflows/scoped-review.yml",
        readFileSync(ciSrc, "utf8"),
        force,
        generated,
        modified,
        skipped,
      );
    }
  }

  const pkgTouched = mergePackageJson(cwd, mode, inspection);
  modified.push(...pkgTouched);

  const installation = {
    arsenalVersion: ARSENAL_EXPORTER_VERSION,
    templateVersion: TEMPLATE_VERSION,
    installMode: mode,
    preset: options.preset ?? null,
    filesGenerated: generated,
    filesModified: modified,
    userCustomizedFiles: skipped.filter((s) => s.includes("preserved")),
    migrationHistory: [
      {
        at: new Date().toISOString(),
        action: "install",
        mode,
      },
    ],
    inspected: inspection,
  };
  writeSafe(
    cwd,
    ".autoreview/installation.json",
    JSON.stringify(installation, null, 2) + "\n",
    true,
    generated,
    modified,
    skipped,
  );

  return {
    mode,
    inspection,
    generated,
    modified,
    skipped,
    summary: `Installed autoreview in ${mode} mode (${generated.length} generated, ${modified.length} modified, ${skipped.length} skipped).`,
    rollback:
      "Restore backups (*.bak-*), remove tools/autoreview and .autoreview/installation.json, and revert package.json scripts if needed.",
  };
}

export function upgradeAutoreview(cwd: string): InstallResult {
  const installMeta = join(cwd, ".autoreview/installation.json");
  let previousMode: InstallMode = "embedded";
  if (existsSync(installMeta)) {
    const meta = JSON.parse(readFileSync(installMeta, "utf8")) as { installMode?: InstallMode };
    previousMode = meta.installMode ?? "embedded";
  }
  const result = installAutoreview({ cwd, mode: previousMode, force: false });
  if (existsSync(installMeta)) {
    const meta = JSON.parse(readFileSync(installMeta, "utf8")) as {
      migrationHistory?: Array<Record<string, unknown>>;
      templateVersion?: string;
    };
    meta.migrationHistory = meta.migrationHistory ?? [];
    meta.migrationHistory.push({
      at: new Date().toISOString(),
      action: "upgrade",
      from: meta.templateVersion,
      to: TEMPLATE_VERSION,
    });
    meta.templateVersion = TEMPLATE_VERSION;
    writeFileSync(installMeta, JSON.stringify(meta, null, 2) + "\n");
  }
  return result;
}

export function doctorAutoreview(cwd: string): { ok: boolean; checks: Array<{ label: string; ok: boolean }> } {
  const checks = [
    { label: ".autoreview/installation.json", ok: existsSync(join(cwd, ".autoreview/installation.json")) },
    { label: ".agent-memory/index.json", ok: existsSync(join(cwd, ".agent-memory/index.json")) },
    { label: "AGENTS.md or preserved", ok: existsSync(join(cwd, "AGENTS.md")) },
    {
      label: "embedded cli or package dep",
      ok:
        existsSync(join(cwd, "tools/autoreview/cli.mjs")) ||
        (existsSync(join(cwd, "package.json")) &&
          readFileSync(join(cwd, "package.json"), "utf8").includes("@arsenal/agent-autoreview")),
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

export function removeAutoreview(cwd: string, options: { keepMemory?: boolean } = {}): string[] {
  const removed: string[] = [];
  // Soft remove: only delete installation marker and embedded toolkit; preserve memory by default
  const targets = [
    "tools/autoreview",
    ".autoreview/installation.json",
    ".github/workflows/scoped-review.yml",
  ];
  if (!options.keepMemory) targets.push(".agent-memory");
  for (const t of targets) {
    const abs = join(cwd, t);
    if (!existsSync(abs)) continue;
    try {
      const dest = `${abs}.removed-${Date.now()}`;
      renameSync(abs, dest);
      removed.push(`${t} → ${relative(cwd, dest)}`);
    } catch {
      // ignore
    }
  }
  return removed;
}
