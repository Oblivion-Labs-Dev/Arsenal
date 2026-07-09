import {
  runInit,
  runIndex,
  runSummarize,
  runGraph,
  runBuild,
  runCompact,
  runDoctor,
  saveDashboardFiles,
  startDashboardWithServer,
  runReport,
  runAnalyze,
  runHandoff,
} from "./commands/index.js";

function log(msg: string) {
  console.log(`\x1b[36m[arsenal context]\x1b[0m ${msg}`);
}

export function runContextCli(argv: string[]): void {
  const [subcommand, ...rest] = argv;

  try {
    const repoRoot = process.cwd();

    switch (subcommand) {
      case "init": {
        const result = runInit(repoRoot);
        log("Initialized `.arsenal/` workspace");
        for (const f of result.created) log(`  created ${f}`);
        for (const f of result.skipped) log(`  skipped (exists) ${f}`);
        break;
      }
      case "index": {
        const result = runIndex(repoRoot);
        log(`Indexed ${result.scanned} files`);
        log(`  repo-map → ${result.repoMapPath}`);
        break;
      }
      case "summarize": {
        const result = runSummarize(repoRoot);
        log(`Summarized ${result.fileSummaries} files across ${result.modules} modules`);
        break;
      }
      case "graph": {
        const result = runGraph(repoRoot);
        log(`Knowledge graph: ${result.nodes} nodes, ${result.edges} edges`);
        log(`  → ${result.path}`);
        break;
      }
      case "build": {
        const query = rest.join(" ");
        const result = runBuild(repoRoot, query);
        log(`Context package estimate: ${result.formatted.estimate} tokens`);
        log(`Avoided loading: ${result.formatted.avoided} estimated tokens`);
        log(`  → ${result.path}`);
        break;
      }
      case "compact": {
        const result = runCompact(repoRoot);
        log(`Compact handoff written`);
        log(`  → ${result.handoffPath}`);
        break;
      }
      case "doctor": {
        const result = runDoctor(repoRoot);
        for (const issue of result.issues) {
          const icon = issue.level === "error" ? "✗" : issue.level === "warn" ? "!" : "•";
          log(`${icon} ${issue.message}`);
        }
        if (result.ok && result.issues.length === 0) log("All checks passed");
        if (!result.ok) process.exit(1);
        break;
      }
      case "dashboard": {
        const serve = rest.includes("--serve");
        const portArg = rest.find((a) => /^\d+$/.test(a));
        if (serve) {
          startDashboardWithServer(repoRoot, portArg ? Number(portArg) : undefined).then((result) => {
            log(`Dashboard running at ${result.url}`);
            log(`  dashboard → ${result.jsonPath}`);
            log("Press Ctrl+C to stop");
          });
        } else {
          const result = saveDashboardFiles(repoRoot);
          log("Dashboard saved to JSON (file mode)");
          log(`  dashboard → ${result.jsonPath}`);
          log(`  details   → ${result.detailsPath}`);
          log(`  viewer    → ${result.viewerPath}`);
          log("Open dashboard.html in a browser, or use --serve for live mode");
        }
        break;
      }
      case "report": {
        const result = runReport(repoRoot);
        console.log(result.text);
        log(`Report saved → ${result.mdPath}`);
        break;
      }
      case "analyze": {
        const result = runAnalyze(repoRoot);
        log(`Analysis complete — quality ${result.data.quality.score}/100`);
        log(`  dashboard → ${result.dashboardPath}`);
        log(`  details   → ${result.detailsPath}`);
        if (result.patterns.repeatedModules.length) {
          log(`Repeated modules: ${result.patterns.repeatedModules.map((m) => m.module).join(", ")}`);
        }
        for (const s of result.data.suggestions.slice(0, 5)) {
          log(`  • ${s.message}`);
        }
        log(`Report → ${result.reportPath}`);
        break;
      }
      case "handoff": {
        const result = runHandoff(repoRoot);
        log("Session handoff generated");
        log(`  → .arsenal/prompts/agent-handoff.md`);
        log(`  Next: ${result.recommendedNextPrompt}`);
        break;
      }
      default:
        printHelp();
        if (subcommand) process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\x1b[31m[arsenal context]\x1b[0m ${message}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Arsenal Context Engine

  arsenal context init
  arsenal context index
  arsenal context summarize
  arsenal context graph
  arsenal context build <query>
  arsenal context compact
  arsenal context doctor
  arsenal context dashboard [--serve] [port]
  arsenal context report
  arsenal context analyze
  arsenal context handoff
`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const [, , , ...args] = process.argv;
  runContextCli(args.length ? args : []);
}
