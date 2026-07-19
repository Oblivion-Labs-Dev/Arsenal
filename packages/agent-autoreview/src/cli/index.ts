import {
  approveBaseline,
  diffBaseline,
  listBaselines,
  removeBaseline,
  ensureMemoryLayout,
} from "@arsenal/agent-memory";
import { loadConfig } from "../config/index.js";
import {
  finishTaskSession,
  sessionStatus,
  startTaskSession,
  taskContextSummary,
} from "../git/index.js";
import { runAutoreviewPipeline } from "../pipeline/index.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runAgentContext, runAgentFinish, runAgentTask } from "./agent.js";
import { parseAutoreviewArgs, printHelp } from "./parse-args.js";

export async function runAutoreviewCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseAutoreviewArgs(argv);

  if (parsed.command === "help") {
    printHelp();
    return 0;
  }

  const cwd = parsed.options.cwd ?? process.cwd();

  if (parsed.command === "agent") {
    switch (parsed.agentAction) {
      case "task": {
        if (!parsed.taskForSession) {
          console.error('Usage: arsenal agent task --task "<request>"');
          return 1;
        }
        const result = await runAgentTask(cwd, parsed.taskForSession);
        console.log(result.context);
        return result.code;
      }
      case "context": {
        const result = await runAgentContext(cwd);
        console.log(result.context);
        return result.code;
      }
      case "finish": {
        const result = await runAgentFinish(cwd);
        console.log(result.output);
        return result.code;
      }
      default:
        console.error("Usage: arsenal agent <task|context|finish>");
        return 1;
    }
  }

  if (parsed.command === "baseline") {
    ensureMemoryLayout(cwd);
    switch (parsed.baselineAction) {
      case "list":
        console.log(JSON.stringify(listBaselines(cwd), null, 2));
        return 0;
      case "approve": {
        const shot = parsed.baselineArgs?.[0];
        const route = parsed.baselineArgs?.[1] ?? "/";
        const viewport = parsed.baselineArgs?.[2] ?? "desktop";
        if (!shot) {
          console.error("Usage: arsenal baseline approve <screenshot> [route] [viewport]");
          return 1;
        }
        const baseline = approveBaseline({
          cwd,
          screenshotPath: shot,
          route,
          viewport,
        });
        console.log(JSON.stringify(baseline, null, 2));
        return 0;
      }
      case "diff": {
        const id = parsed.baselineArgs?.[0];
        const candidate = parsed.baselineArgs?.[1];
        if (!id || !candidate) {
          console.error("Usage: arsenal baseline diff <id> <candidate.png>");
          return 1;
        }
        console.log(JSON.stringify(diffBaseline(cwd, id, candidate), null, 2));
        return 0;
      }
      case "remove": {
        const id = parsed.baselineArgs?.[0];
        if (!id) {
          console.error("Usage: arsenal baseline remove <id>");
          return 1;
        }
        console.log(removeBaseline(cwd, id) ? "removed" : "not found");
        return 0;
      }
      default:
        console.error("Usage: arsenal baseline <approve|list|diff|remove>");
        return 1;
    }
  }

  if (parsed.command === "report") {
    const path = join(cwd, ".autoreview/reports/latest.md");
    if (!existsSync(path)) {
      console.error("No report at .autoreview/reports/latest.md");
      return 1;
    }
    console.log(readFileSync(path, "utf8"));
    return 0;
  }

  if (parsed.command === "session") {
    switch (parsed.sessionAction) {
      case "start": {
        if (!parsed.taskForSession) {
          console.error('Usage: arsenal task start --task "<description>"');
          return 1;
        }
        const session = startTaskSession(cwd, parsed.taskForSession);
        console.log(`Task session started: ${session.id}`);
        console.log(`Task: ${session.taskDescription}`);
        console.log(`Starting commit: ${session.startingCommit ?? "(none)"}`);
        console.log(`Pre-existing modified files: ${session.existingModifiedFiles.length}`);
        return 0;
      }
      case "status": {
        const status = sessionStatus(cwd);
        if (!status.session) {
          console.log("No task session");
          return 0;
        }
        console.log(JSON.stringify(status, null, 2));
        return 0;
      }
      case "context": {
        console.log(taskContextSummary(cwd));
        return 0;
      }
      case "finish": {
        const finished = finishTaskSession(cwd);
        if (!finished) {
          console.log("No active task session");
          return 1;
        }
        console.log(`Task session finished: ${finished.id}`);
        return 0;
      }
      default:
        console.error("Usage: arsenal task <start|status|context|finish>");
        return 1;
    }
  }

  const config = await loadConfig(cwd, parsed.options.configPath);
  if (parsed.options.mode) config.review.mode = parsed.options.mode;
  if (parsed.options.maxIterations) {
    config.review.maxIterations = parsed.options.maxIterations;
  }
  if (parsed.options.base) config.baseBranch = parsed.options.base;

  // Targeted check modes adjust skips via checks array on pipeline options
  const result = await runAutoreviewPipeline({
    ...parsed.options,
    cwd,
    config,
  });

  console.log(`Scope: ${result.manifestPath}`);
  console.log(`Report: ${result.reportPaths.markdownPath}`);
  console.log(
    result.report.qualityGatesPassed
      ? "Quality gates: PASSED (current task scope)"
      : "Quality gates: FAILED (current task scope)",
  );
  console.log(result.report.disclaimer);

  return result.report.qualityGatesPassed ? 0 : 2;
}

export { parseAutoreviewArgs, printHelp } from "./parse-args.js";
export { runAgentTask, runAgentContext, runAgentFinish, renderFinalResponse } from "./agent.js";

const isDirect =
  typeof process !== "undefined" &&
  process.argv[1] &&
  /agent-autoreview|arsenal-autoreview|cli[/\\]index/.test(
    process.argv[1].replace(/\\/g, "/"),
  );

if (isDirect) {
  runAutoreviewCli()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
