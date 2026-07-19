import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  doctorAutoreview,
  installAutoreview,
  removeAutoreview,
  upgradeAutoreview,
  TEMPLATE_VERSION,
  ARSENAL_EXPORTER_VERSION,
  type InstallOptions,
  type InstallResult,
} from "./install.js";
import {
  detectPackageManager,
  inspectRepository,
  resolveMode,
  type InstallMode,
  type Preset,
  type RepoInspection,
} from "./inspect.js";

export {
  doctorAutoreview,
  installAutoreview,
  removeAutoreview,
  upgradeAutoreview,
  TEMPLATE_VERSION,
  ARSENAL_EXPORTER_VERSION,
  detectPackageManager,
  inspectRepository,
  resolveMode,
};

export type { InstallOptions, InstallResult, InstallMode, Preset, RepoInspection };

export function resolveTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [join(here, "../templates"), join(here, "../../templates")]) {
    if (existsSync(candidate)) return candidate;
  }
  return join(here, "../templates");
}

export async function runExporterCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, target, ...rest] = argv;
  const cwdFlag = rest.indexOf("--cwd");
  const cwd = cwdFlag >= 0 ? rest[cwdFlag + 1]! : process.cwd();
  const modeIdx = rest.indexOf("--mode");
  const mode = modeIdx >= 0 ? (rest[modeIdx + 1] as InstallMode) : undefined;
  const presetIdx = rest.indexOf("--preset");
  const preset = presetIdx >= 0 ? (rest[presetIdx + 1] as Preset) : undefined;
  const force = rest.includes("--force");

  if (command === "install" && target === "autoreview") {
    const result = installAutoreview({ cwd, mode, preset, force });
    console.log(result.summary);
    console.log(`Mode: ${result.mode}`);
    console.log(`Generated: ${result.generated.join(", ") || "(none)"}`);
    console.log(`Modified: ${result.modified.join(", ") || "(none)"}`);
    console.log(`Skipped: ${result.skipped.join(", ") || "(none)"}`);
    console.log(`Rollback: ${result.rollback}`);
    return 0;
  }

  if (command === "upgrade" && target === "autoreview") {
    const result = upgradeAutoreview(cwd);
    console.log(result.summary);
    return 0;
  }

  if (command === "doctor" && target === "autoreview") {
    const result = doctorAutoreview(cwd);
    for (const check of result.checks) {
      console.log(`${check.ok ? "✓" : "✗"} ${check.label}`);
    }
    return result.ok ? 0 : 1;
  }

  if (command === "remove" && target === "autoreview") {
    const removed = removeAutoreview(cwd, { keepMemory: !rest.includes("--purge-memory") });
    console.log(removed.length ? removed.join("\n") : "Nothing to remove");
    return 0;
  }

  if (command === "generate") {
    const what = target;
    if (what === "memory") {
      const { ensureMemoryLayout } = await import("@arsenal/agent-memory");
      ensureMemoryLayout(cwd);
      console.log("Generated .agent-memory/");
      return 0;
    }
    if (what === "agent-rules" || what === "autoreview-config" || what === "ci") {
      installAutoreview({ cwd, mode: mode ?? "embedded", force: false });
      console.log(`Generated ${what}`);
      return 0;
    }
  }

  console.log(`Arsenal repository exporter

  arsenal install autoreview [--mode package|embedded] [--preset github-pages|react|nextjs|vite]
  arsenal upgrade autoreview
  arsenal doctor autoreview
  arsenal remove autoreview
  arsenal generate agent-rules|autoreview-config|memory|ci
`);
  return 1;
}
