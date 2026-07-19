# @arsenal/agent-autoreview

Scoped autonomous implementation-verification for coding agents (Cursor, Codex, Antigravity, Claude Code, CI).

**Reviews only code changed by the current task.** It does not inspect the entire website or repository by default.

## What it does

1. Detects files changed by the current task (Git + optional task sessions)
2. Builds a bounded change-impact graph (components, routes, tests, interactions)
3. Runs targeted static, runtime, visual, interaction, and animation checks
4. Uses model critics only when needed — after deterministic validators
5. Plans repairs, invalidates only stale stages, loops until gates pass or budget ends
6. Writes evidence reports under `.autoreview/reports/`

## What it intentionally does not do

- Crawl or verify the entire site
- Send the full repository to a model
- Silently expand review budgets
- Assume all uncommitted files belong to the current task
- Require a subjective numeric design score by default

## Install / use in a monorepo

```bash
pnpm add -D @arsenal/agent-autoreview
# or from Arsenal workspace:
pnpm --filter @arsenal/agent-autoreview build
```

CLI:

```bash
arsenal autoreview
arsenal autoreview --task "Add Card hover state"
arsenal autoreview --base main
arsenal autoreview --files src/components/Card.tsx
arsenal autoreview --route /components
arsenal autoreview --max-iterations 3
arsenal autoreview --mode fast
arsenal autoreview --mode thorough
arsenal autoreview --dry-run
arsenal autoreview --report-only
```

Also: `pnpm exec arsenal-autoreview` (package bin).

### Task sessions

```bash
arsenal autoreview session start --task "Add Card hover state"
# ... implement ...
arsenal autoreview --task "Add Card hover state"
arsenal autoreview session status
arsenal autoreview session finish
```

Sessions record the starting commit and pre-existing dirty files so older uncommitted work is not attributed to the task.

## How task scoping works

Change detection priority:

1. `--files`
2. Active task session delta
3. Uncommitted staged + unstaged (`git diff` / `git diff --cached`)
4. Branch diff vs base (`git diff --name-only <base>...HEAD`)
5. HEAD commit (`git show --name-only --format="" HEAD`)

Impact graph defaults: `dependencyDepth: 2`, `reverseDependencyDepth: 1`, with hard stop patterns for node_modules, frameworks, generated files, and large utility trees.

Scope is written to `.autoreview/current-scope.json`. Every included route/component has a reason.

## Quotas / budgets

| Budget | Fast | Thorough |
|--------|------|----------|
| Changed source files | 20 | 50 |
| Affected routes | 3 | 6 |
| Screenshots | 8 | 16 |
| Critic calls | 2 | 4 |
| Repair iterations | 2 | 4 |
| Dependency depth | 2 | 3 |

When scope exceeds budget, files/routes are ranked and excluded — exclusions appear in the report. Budgets are never silently expanded.

## Configure routes and previews

Copy `autoreview.config.ts` / `quality-gates.yml` to your repo root.

```ts
export default {
  baseBranch: "main",
  app: { startCommand: "pnpm dev", url: "http://localhost:3000" },
  routeMappings: {
    "/components": ["src/components/Card.tsx"],
  },
  componentPreviewMappings: {
    "src/components/Card.tsx": "http://localhost:6006/?path=/story/card--default",
  },
  review: { mode: "fast", maxIterations: 2, maxCriticCalls: 2 },
};
```

Manual include: `--files` / `--route`.  
Manual exclude: `scope.ignoredFiles` / `scope.ignoredRoutes`.

## Agent integrations

See `integrations/`:

- Cursor rules, command, hooks (`integrations/cursor/`)
- Claude Code (`integrations/claude-code/`)
- Codex (`integrations/codex/`)
- Antigravity (`integrations/antigravity/`)
- CI PR workflow (`integrations/ci/autoreview.yml`)

Shared agent rules: run autoreview after implementing; scope-only; no unrelated pages; no completion until gates pass; no hiding findings; prefer deterministic checks; reuse cache.

## Reading reports

- `.autoreview/reports/latest.md`
- `.autoreview/reports/latest.json`

Language used: *“Verification completed for the current task scope.”* — not full-site verification.

## Troubleshooting incorrect scope

| Symptom | Fix |
|---------|-----|
| Too many files | Start a task session before dirtying unrelated files; or pass `--files` |
| Missing route | Add `routeMappings` or `--route` |
| Budget truncating important routes | `--mode thorough` or raise `scope.maxRoutes` deliberately |
| Unrelated route opened | File a bug — runtime must visit only `affectedRoutes` |

## Fast vs thorough

- **fast** — tight budgets, fewer screenshots/critics; default for most tasks
- **thorough** — deeper graph, more routes/screenshots/iterations; use for layout/visual polish

## Cache

`.autoreview/cache/` keyed by file content, task, route, viewport, interaction, config, graph version.

## Limitations

- Playwright is an optional peer — without it, browser stages are skipped (static/scope/report still run)
- Model providers default to `none`; wire your own `CriticProvider` for live multimodal review
- TypeScript config loading may require a TS loader in the host; JSON config always works
- Reverse-dependency scan is bounded to common source roots (`src`, `app`, `pages`, …), not a whole-monorepo index
- Actual code edits in the repair loop are planned for the coding agent; this package orchestrates verification + plans

## Development

```bash
pnpm --filter @arsenal/agent-autoreview test
pnpm --filter @arsenal/agent-autoreview build
```

Fixture frontend: `fixtures/mini-frontend` (Card change → `/components` only).
