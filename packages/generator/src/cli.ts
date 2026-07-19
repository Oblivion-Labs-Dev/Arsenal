import { runContextCli } from "@arsenal/context-engine";
import { runAutoreviewCli } from "@arsenal/agent-autoreview";
import { runExporterCli } from "@arsenal/repository-exporter";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { defineSite, defineProject, resolveProjectToSite } from "@arsenal/config";
import { DEFAULT_QUALITY_GATES } from "@arsenal/testing";
import { generatePackageJson, generateSiteConfigFile, generateProjectBlueprintFile } from "./index.js";

const [, , command, ...args] = process.argv;

function log(msg: string) {
  console.log(`\x1b[36m[arsenal]\x1b[0m ${msg}`);
}

function cmdCreate(name: string) {
  if (!name) {
    console.error("Usage: arsenal create <name>");
    process.exit(1);
  }
  const dir = join(process.cwd(), name);
  if (existsSync(dir)) {
    console.error(`Directory ${name} already exists`);
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "app"), { recursive: true });

  const config = defineSite({
    type: "saas",
    name,
    tagline: `${name} — built with Arsenal`,
    pages: ["landing"],
    modules: ["waitlist"],
  });

  writeFileSync(join(dir, "site.config.ts"), generateSiteConfigFile(config));
  writeFileSync(join(dir, "package.json"), generatePackageJson(name));
  writeFileSync(
    join(dir, "app", "page.tsx"),
    `export default function Page() {
  return <main><h1>${name}</h1></main>;
}
`,
  );
  log(`Created ${name}/ with site.config.ts`);
}

function cmdBlueprint(name: string) {
  if (!name) {
    console.error("Usage: arsenal blueprint <name>");
    process.exit(1);
  }
  const dir = join(process.cwd(), name);
  if (existsSync(dir)) {
    console.error(`Directory ${name} already exists`);
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "app"), { recursive: true });

  const blueprint = defineProject({
    domain: "ai",
    audience: "developers",
    brand: name,
    capabilities: ["landing-page", "docs", "dashboard", "analytics"],
  });
  const site = resolveProjectToSite(blueprint);

  writeFileSync(join(dir, "project.config.ts"), generateProjectBlueprintFile(blueprint));
  writeFileSync(join(dir, "site.config.ts"), generateSiteConfigFile(site));
  writeFileSync(join(dir, "package.json"), generatePackageJson(name));
  log(`Created ${name}/ with project.config.ts + resolved site.config.ts`);
}

function cmdAdd(module: string) {
  log(`Module "${module}" scaffold — add to site.config.ts modules array`);
}

function cmdTheme(theme: string) {
  log(`Set theme to "${theme}" in site.config.ts`);
}

function cmdPreview() {
  log("Run: pnpm dev — in your generated site or apps/playground");
}

function cmdDoctor() {
  if (args[0] === "autoreview") {
    void runExporterCli(["doctor", "autoreview", ...args.slice(1)]).then((code) => {
      process.exitCode = code;
    });
    return;
  }
  const checks = [
    { label: "site.config.ts", ok: existsSync(join(process.cwd(), "site.config.ts")) },
    { label: "project.config.ts", ok: existsSync(join(process.cwd(), "project.config.ts")) },
    { label: "package.json", ok: existsSync(join(process.cwd(), "package.json")) },
  ];
  let failed = 0;
  for (const check of checks) {
    if (check.ok) log(`✓ ${check.label}`);
    else log(`✗ ${check.label} missing`);
    if (!check.ok && check.label === "site.config.ts") failed++;
  }
  if (failed > 0) process.exit(1);
  log("Project structure looks healthy");
}

function cmdAudit() {
  log("Quality gates configured:");
  for (const [gate, enabled] of Object.entries(DEFAULT_QUALITY_GATES)) {
    if (enabled === true) log(`  • ${gate}`);
    else if (Array.isArray(enabled)) log(`  • ${gate}: ${enabled.length} thresholds`);
  }
  log("Run full audit in CI with: pnpm test && pnpm typecheck && pnpm lint");
}

function cmdAnalyze() {
  log("Bundle analysis — integrate with @next/bundle-analyzer in your app");
  log("Performance budgets: see @arsenal/testing DEFAULT_QUALITY_GATES");
}

switch (command) {
  case "create":
    cmdCreate(args[0] ?? "");
    break;
  case "blueprint":
    cmdBlueprint(args[0] ?? "");
    break;
  case "add":
    cmdAdd(args[0] ?? "");
    break;
  case "theme":
    cmdTheme(args[0] ?? "obsidian-cyber");
    break;
  case "preview":
    cmdPreview();
    break;
  case "doctor":
    cmdDoctor();
    break;
  case "audit":
    cmdAudit();
    break;
  case "analyze":
    cmdAnalyze();
    break;
  case "context":
    runContextCli(args);
    break;
  case "autoreview":
  case "review":
  case "task":
  case "agent":
  case "baseline":
  case "report":
    void runAutoreviewCli([command === "autoreview" ? "autoreview" : command, ...args]).then(
      (code) => {
        if (code !== 0) process.exitCode = code;
      },
    );
    break;
  case "install":
  case "upgrade":
  case "remove":
  case "generate":
    void runExporterCli([command, ...args]).then((code) => {
      process.exitCode = code;
    });
    break;
  default:
    console.log(`
Arsenal CLI

  pnpm arsenal create <name>
  pnpm arsenal blueprint <name>
  pnpm arsenal context <cmd>
  pnpm arsenal review [opts]              Scoped validation (alias: autoreview)
  pnpm arsenal task start --task "..."
  pnpm arsenal agent task|context|finish
  pnpm arsenal baseline approve|list|diff|remove
  pnpm arsenal install autoreview [--mode package|embedded] [--preset github-pages|react|nextjs|vite]
  pnpm arsenal upgrade autoreview
  pnpm arsenal doctor autoreview
  pnpm arsenal remove autoreview
  pnpm arsenal generate agent-rules|memory|ci|autoreview-config
`);
}
