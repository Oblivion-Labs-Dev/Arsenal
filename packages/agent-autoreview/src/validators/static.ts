import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AutoreviewConfig } from "../config/defaults.js";
import type { CheckResult, Finding, ScopeManifest } from "../types.js";

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): { ok: boolean; output: string; durationMs: number } {
  const started = Date.now();
  // On Windows, run via shell for npx/pnpm shims
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    shell: true,
    windowsHide: true,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return {
    ok: result.status === 0,
    output,
    durationMs: Date.now() - started,
  };
}

function splitCommand(command: string): { cmd: string; args: string[] } {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((p) => p.replace(/^"|"$/g, "")) ?? [
    command,
  ];
  return { cmd: parts[0] ?? command, args: parts.slice(1) };
}

export function selectRelatedTests(manifest: ScopeManifest): string[] {
  return [
    ...new Set([
      ...manifest.affectedTests.map((t) => t.path),
      ...manifest.changedFiles.filter((f) => /\.(test|spec)\.[jt]sx?$/.test(f)),
    ]),
  ];
}

export function requiresFullRepositoryChecks(changedFiles: string[]): boolean {
  return changedFiles.some((file) => {
    const posix = file.replace(/\\/g, "/");
    return (
      /(tsconfig|eslint|prettier|vitest|jest|webpack|vite|next\.config|turbo\.json|package\.json)$/.test(
        posix,
      ) || /\/index\.[jt]sx?$/.test(posix)
    );
  });
}

export async function runStaticValidation(options: {
  cwd: string;
  config: AutoreviewConfig;
  manifest: ScopeManifest;
  dryRun?: boolean;
}): Promise<CheckResult[]> {
  const { cwd, config, manifest, dryRun } = options;
  const results: CheckResult[] = [];
  const files = manifest.changedFiles.filter((f) => existsSync(join(cwd, f)));
  const timeout = config.budgets[manifest.mode].maxTestDurationSeconds * 1000;

  if (files.length === 0) {
    results.push({
      name: "static:no-files",
      status: "skip",
      durationMs: 0,
      details: "No changed files to validate",
    });
    return results;
  }

  if (dryRun) {
    results.push({
      name: "static:dry-run",
      status: "skip",
      durationMs: 0,
      details: `Would lint/typecheck/test ${files.length} files`,
    });
    return results;
  }

  // Prefer targeted eslint
  const lint = splitCommand(config.testCommands.lint);
  const lintResult = runCommand(lint.cmd, [...lint.args, ...files], cwd, Math.min(timeout, 60_000));
  results.push({
    name: "static:lint",
    status: lintResult.ok ? "pass" : lintResult.output.includes("ENOENT") ? "skip" : "fail",
    durationMs: lintResult.durationMs,
    details: lintResult.output.slice(0, 2000),
    findings: lintResult.ok
      ? []
      : [
          {
            id: "lint-errors",
            category: "static",
            severity: "high",
            confidence: 0.9,
            explanation: "Lint errors detected in changed files",
            recommendedFix: "Fix lint diagnostics in scoped files",
            source: "deterministic",
          } satisfies Finding,
        ],
  });

  const related = selectRelatedTests(manifest);
  if (related.length > 0) {
    const unit = splitCommand(config.testCommands.unitRelated);
    const testResult = runCommand(
      unit.cmd,
      [...unit.args, ...related],
      cwd,
      timeout,
    );
    results.push({
      name: "static:related-tests",
      status: testResult.ok ? "pass" : testResult.output.includes("ENOENT") ? "skip" : "fail",
      durationMs: testResult.durationMs,
      details: testResult.output.slice(0, 2000),
    });
  } else {
    results.push({
      name: "static:related-tests",
      status: "skip",
      durationMs: 0,
      details: "No related tests selected",
    });
  }

  if (requiresFullRepositoryChecks(manifest.changedFiles)) {
    const tsc = splitCommand(config.testCommands.typecheck);
    const typeResult = runCommand(tsc.cmd, tsc.args, cwd, timeout);
    results.push({
      name: "static:typecheck-full",
      status: typeResult.ok ? "pass" : "fail",
      durationMs: typeResult.durationMs,
      details: "Global config/API change triggered broader typecheck",
    });
  }

  return results;
}
