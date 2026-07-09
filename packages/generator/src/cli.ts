import { runContextCli } from "@arsenal/context-engine";
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
  default:
    console.log(`
Arsenal CLI

  pnpm arsenal create <name>       Create a new site
  pnpm arsenal blueprint <name>    Create from project blueprint
  pnpm arsenal add <module>        Add blog, dashboard, waitlist…
  pnpm arsenal theme <id>          Set theme palette
  pnpm arsenal preview             Start preview server
  pnpm arsenal doctor              Validate project structure
  pnpm arsenal audit               Show quality gate checklist
  pnpm arsenal analyze             Bundle / performance analysis hints
  pnpm arsenal context <cmd>       AI context engine (init, index, summarize…)
`);
}
