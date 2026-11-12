# Consolidation ports

Capabilities ported into Arsenal from sibling repositories on `feat/consolidation-ports`. Source
repositories were read only, never modified. Each port was rewritten to Arsenal's conventions and
deduplicated against what Arsenal already had, rather than copied.

## Phase A

| #   | Capability             | Source                                                                                                     | Destination                                                                                  | Replaced or merged                                                                                                                                                                                                                                     | New                                                                                                                                                                  |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Secret redactor        | AgentSkills `history-learning/scripts/lib/redact.mjs` (same owner)                                         | `packages/shared/src/redact` (`@oblivion-labs-dev/arsenal-shared/redact`)                    | autoreview's own regex `redactSecrets` (now a deprecated alias; it missed bare `ghp_` tokens, regression-tested); ad-hoc scrubbing in backend `Logger`, ai-kit telemetry and frontend `createLogger` now calls the shared redactor                     | Deep value redaction (cycles, Maps, Errors), JWT/PEM/URL credentials, guarded entropy rule, opt-in PII                                                               |
| 2   | Grounding evaluator    | Kaka `packages/career` `grounding.ts`, `contradictions.ts`                                                 | `packages/evaluation/src/grounding.ts`, `contradictions.ts`, `dates.ts`, `source-text.ts`    | Nothing; Arsenal had no grounding check                                                                                                                                                                                                                | Claims with evidence spans for quotes, dates, percentages and numbers against several sources; `null` score when there is nothing to check                           |
| 3   | Frame governor         | Sutra `apps/web/src/frameGovernor.ts`                                                                      | `packages/fx/src/gpu/frame-governor.ts`, `useFrameGovernor.ts`                               | Merged onto the existing `nextTier` / `medianFrameMs` quality-tier ladder, so there is still one tier system                                                                                                                                           | Sustained-gap detection, pause handling, recovery ceiling against oscillation, reduced motion, a hook that re-renders only on tier change                            |
| 4   | AI provider resilience | OmniRoute `classify429`, `retryAfterJson`, `modelAccessDenied` (MIT, vendored unmodified with its LICENSE) | `packages/backend/src/ai-kit/resilience`                                                     | Extends the existing `net/retryWithJitter` (gains clamped, NaN-safe `delayFor`, regression-tested) instead of adding a second retry loop                                                                                                               | `classifyProviderFailure`, `CircuitBreaker` + registry, `callProvider` with bounded retries, Retry-After, abort and a structured `ProviderError`                     |
| 5   | ChapterRail            | Sutra `ChapterRail`, portfolio chapter rail                                                                | `packages/ui/src/content/chapter-rail.tsx`, `chapter-rail-logic.ts`, `use-active-section.ts` | Neither source's tracking or framer-motion `useScroll` was copied; progress reuses ui's `scrollProgress`, reduced motion reuses `useReduceMotion`. TableOfContents catalog text corrected (it never tracked scroll itself; `useActiveSection` now can) | One rail: active section, smooth or instant navigation, arrow/Home/End keys, chapter or scroll progress, fixed or sticky, dense mode, compact pill on narrow screens |

## Gate A results (2026-11-12)

- `npx vitest run`: 114 files, 808 tests passed.
- `turbo run build typecheck` for every touched workspace (agent-autoreview, backend, evaluation,
  frontend, fx, shared, ui, playground): 35/35 tasks passed.
- `turbo run typecheck lint` across the repo: 6 packages fail, all untouched by this branch and
  failing before it. `agent-integrations`, `animation-validator`, `report-generator` and
  `visual-validator` have no tsconfig, so `tsc` falls back to the root and sweeps in
  `prototypes/` and `templates/`; `clayflow` (one TS2345 in `src/examples.ts`) and
  `repository-exporter` (one unused import) each have one error. Follow-up, not fixed here.
- Duplicates: no second redactor, circuit breaker, frame governor or active-section tracker
  remains (searched `packages/` and `apps/`).
- Boundaries: `shared/redact`, `evaluation`, `fx` and `ui` import no Node built-ins; resilience
  stays in the server-only backend. `ui` and `fx` keep `sideEffects: false`; redact ships as its
  own `./redact` entry.
- ChapterRail checked in the playground (`/components/chapter-rail`) in deep-forge and
  ivory-graphite, at desktop width and in a 390px frame. The compact pill shrank to half width
  and wrapped its count; fixed with `width: max-content` and a non-wrapping count.

## Phase B

| #   | Capability         | Source                                                                                                             | Destination                                                                                    | Replaced or merged                                                                                                                                                                                                              | New                                                                                                                                                                                             |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | Ambient creatures  | Portfolio `amsborse.github.io` creature steering (same owner)                                                      | `packages/fx/src/backgrounds/ambient-creatures.ts`, `AmbientCreatures.tsx`                     | Not a second loop or tier system: theme via `useArsenalTheme`, density via the Phase A `useFrameGovernor`, reduced motion and offscreen pause via `useCanvasLoop`                                                               | A pure, seeded firefly/butterfly simulation (testable without a DOM) plus a canvas component with its tuning lifted into options                                                                |
| 7   | Spatial focus      | TVApplication `c2-home` `nextInDirection`                                                                          | `packages/ui/src/primitives/spatial-focus.ts`, `use-spatial-focus.ts`                          | The treemap's private arrow-key scorer now delegates to the shared one (`treemapMoveFocus` kept as a thin wrapper)                                                                                                              | Nested regions with per-region focus memory, roving tabindex, Enter activation, focus recovery; parity-tested against the original over 200 random layouts                                      |
| 8   | Headless agent CLI | Sutra `packages/ai/src/claude-cli.ts`, `codex-cli.ts`, `run-cli.ts`; AgentSkills `tools/codex-bridge` (same owner) | `packages/backend/src/ai-kit/agent-cli.ts` (`runAgent`), `packages/backend/src/net/run-cli.ts` | Builds on the existing `net/runCli` instead of a second spawner; fixed three `runCli` bugs on the way, each with a regression test (orphaned grandchildren on timeout/cancel, `.cmd` fallback EINVAL on Windows, no output cap) | `runAgent({provider, task, tools, cwd, schema, …})` for Claude Code and Codex: never throws, normalized result and error kinds, fixed tool policy, nonce-fenced untrusted task, redacted errors |

### runAgent trust model

- **Three separate channels.**
  - Trusted harness text goes in the system prompt for Claude, or at the start of stdin for Codex.
  - Execution configuration becomes validated argv only.
  - The untrusted task goes on stdin inside a `<task-NONCE>` fence with a random 16-hex nonce. A
    fake closing tag inside the task cannot match the nonce.
- **Repository content cannot change permissions.**
  - `tools: 'none' | 'read' | 'write'` is required, with no default, and maps to fixed flags.
  - Claude gets `--tools` with only the tools for that level, so anything else is not even loaded
    (`tools: 'none'` loads none). Bash, PowerShell, web, Task and notebook-read tools are also
    listed in `--disallowedTools`.
  - File tools are pre-approved only inside the run directory (`Read(./**)`, `Edit(./**)`, …), and
    reads and writes of `~/.claude`, `~/.codex`, `~/.ssh`, `~/.aws` and `~/.config/gh` are denied,
    so a prompt-injected task cannot read CLI credentials or plant hooks in user settings.
  - Claude runs with `--permission-mode dontAsk`, `--strict-mcp-config` and
    `--setting-sources user`, so repository settings, hooks and MCP servers are not loaded.
  - Codex runs with `--ignore-user-config` and `--sandbox read-only|workspace-write`.
  - `commandArgs` is an allow-list: any element starting with `-` is rejected before spawning
    (a blocklist missed `--config=…`, `-csandbox_mode=…`, `--profile`, `--system-prompt`, …). The
    model name is validated.
- **Process and environment.**
  - The environment is an allow-list. `*_API_KEY` is dropped unless named in `passEnv`, which also
    keeps runs on the subscription instead of paid API billing.
  - The cwd must be an absolute, existing, real directory: not a filesystem root, not the home
    directory or any folder above it, not a UNC share root, and inside `allowedRoots` when given.
  - Timeout and cancel kill the whole process tree, on POSIX even after the direct child exited.
    Output is capped. Scratch files are removed; a failed removal warns instead of throwing.
  - Error messages and stderr are redacted first and truncated after, so a secret split by the cut
    cannot leak. A schema JSON Schema cannot express is a `config` error before spawning.
- **Known limits.**
  - Claude still reads `CLAUDE.md` in the cwd. It can steer the model's text but not its
    permissions. `--bare` would stop that but needs a paid `ANTHROPIC_API_KEY`, so it is an owner
    decision and not the default.
  - Codex has no "no tools" mode, so `tools: 'none'` is a config error for Codex.
  - The opencode and Antigravity adapters were not ported.
  - The real Claude flags were checked against `claude --help` and the binary, with no paid run.
    How the live CLI enforces `--tools` and scoped rules has not been exercised.
  - The real Codex CLI could not be checked here: the local `codex` wrapper fails to start.
  - All tests use a fake CLI.

## Gate B results (2026-11-12)

- `npx vitest run`: 117 files, 857 tests passed.
- `turbo run build typecheck lint` for every touched workspace (agent-autoreview, backend,
  evaluation, frontend, fx, shared, ui, scene, playground): all passed. The playground's `lint`
  (`tsc` over `.next/types`) fails if it runs while `next build` or `next dev` is rewriting
  `.next` in the same run. That race existed before this branch; it passes when run on its own.
- Repo-wide typecheck: the same 6 untouched packages fail as at Gate A, with no new failures.
- Dependencies: none added or removed (no `package.json` or lockfile changes since Gate A).
- Boundaries: `fx`, `ui`, `shared/redact` and `evaluation` still import no Node built-ins.
  `runAgent` and `runCli` live in the server-only backend.
- Duplicates: no second spatial-focus scorer, canvas loop, tier system or CLI spawner remains.
- Security review of `runAgent` and `runCli` (`db3aa0c`, `4ceed79`): ten findings fixed, each with
  a regression test. Against the pre-fix code 19 of the new tests fail; with the fixes the full
  suite is 118 files, 876 tests passed, 1 skipped (the POSIX-only process-group test on Windows),
  and the backend typecheck is clean. The UNC share-root test passes on the old code too, so it
  guards the case but does not prove that fix.
- `arsenal-scene`: verified as absorbed into `packages/scene`; see
  `docs/archive/arsenal-scene/ARCHIVE-READY.md`. Not deleted or archived.
