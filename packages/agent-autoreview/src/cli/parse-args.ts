import type { AutoreviewCliOptions, CheckKind, ReviewMode } from "../types.js";

export function parseAutoreviewArgs(argv: string[]): {
  command:
    | "autoreview"
    | "session"
    | "help"
    | "agent"
    | "task"
    | "baseline"
    | "report";
  sessionAction?: "start" | "status" | "finish" | "context";
  agentAction?: "task" | "context" | "finish";
  baselineAction?: "approve" | "list" | "diff" | "remove";
  options: AutoreviewCliOptions;
  taskForSession?: string;
  baselineArgs?: string[];
} {
  const args = [...argv];
  if (args[0] === "autoreview" || args[0] === "review") args.shift();

  if (args[0] === "session" || args[0] === "task") {
    const isTaskAlias = args[0] === "task";
    if (isTaskAlias) args.shift();
    const action = (isTaskAlias ? args[0] ?? "start" : args[1]) as
      | "start"
      | "status"
      | "finish"
      | "context"
      | undefined;
    let taskForSession: string | undefined;
    const startIdx = isTaskAlias ? 1 : 2;
    for (let i = startIdx; i < args.length; i++) {
      if (args[i] === "--task" && args[i + 1]) taskForSession = args[++i];
    }
    if (isTaskAlias && action === "start") {
      return { command: "session", sessionAction: "start", options: {}, taskForSession };
    }
    return {
      command: "session",
      sessionAction: isTaskAlias ? action : (args[1] as typeof action),
      options: {},
      taskForSession,
    };
  }

  if (args[0] === "agent") {
    return {
      command: "agent",
      agentAction: args[1] as "task" | "context" | "finish",
      options: {},
      taskForSession: (() => {
        for (let i = 2; i < args.length; i++) {
          if (args[i] === "--task" && args[i + 1]) return args[++i];
        }
        return undefined;
      })(),
    };
  }

  if (args[0] === "baseline") {
    return {
      command: "baseline",
      baselineAction: args[1] as "approve" | "list" | "diff" | "remove",
      options: {},
      baselineArgs: args.slice(2),
    };
  }

  if (args[0] === "report") {
    return { command: "report", options: { reportOnly: true } };
  }

  if (args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    return { command: "help", options: {} };
  }

  const options: AutoreviewCliOptions = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--task":
        options.task = next;
        i++;
        break;
      case "--base":
        options.base = next;
        i++;
        break;
      case "--files": {
        const files: string[] = [];
        while (args[i + 1] && !args[i + 1]!.startsWith("--")) files.push(args[++i]!);
        options.files = files;
        break;
      }
      case "--route":
        options.route = options.route ?? [];
        if (next && !next.startsWith("--")) {
          options.route.push(next);
          i++;
        }
        break;
      case "--max-iterations":
        options.maxIterations = Number(next);
        i++;
        break;
      case "--mode":
        options.mode = next as ReviewMode;
        i++;
        break;
      case "--checks": {
        options.checks = options.checks ?? [];
        while (args[i + 1] && !args[i + 1]!.startsWith("--")) {
          options.checks.push(args[++i] as CheckKind);
        }
        break;
      }
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--report-only":
        options.reportOnly = true;
        break;
      case "--cwd":
        options.cwd = next;
        i++;
        break;
      case "--config":
        options.configPath = next;
        i++;
        break;
      default:
        break;
    }
  }

  return { command: "autoreview", options };
}

export function printHelp(): void {
  console.log(`
arsenal autoreview / review — scoped implementation verification

Usage:
  arsenal review [options]
  arsenal review --mode fast|thorough
  arsenal review --checks visual animation accessibility responsive cross-browser baseline
  arsenal task start --task "<description>"
  arsenal task status | context | finish
  arsenal agent task --task "<request>"
  arsenal agent context
  arsenal agent finish
  arsenal baseline approve|list|diff|remove
  arsenal report

Notes:
  Fast mode uses Chromium only. Firefox/WebKit require --checks cross-browser or --mode thorough.
  Reviews only the current task scope.
`);
}
