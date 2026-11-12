# Consolidation ports

Capabilities ported into Arsenal from sibling repositories on `feat/consolidation-ports`. Source
repositories were read only, never modified. Each port was rewritten to Arsenal's conventions and
deduplicated against what Arsenal already had, rather than copied.

## Phase A

| #   | Capability             | Source                                                                                | Destination                                                                                  | Replaced or merged                                                                                                                                                                                                                                     | New                                                                                                                                                                  |
| --- | ---------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Secret redactor        | AgentSkills `history-learning/scripts/lib/redact.mjs` (same owner)                    | `packages/shared/src/redact` (`@oblivion-labs-dev/arsenal-shared/redact`)                    | autoreview's own regex `redactSecrets` (now a deprecated alias; it missed bare `ghp_` tokens, regression-tested); ad-hoc scrubbing in backend `Logger`, ai-kit telemetry and frontend `createLogger` now calls the shared redactor                     | Deep value redaction (cycles, Maps, Errors), JWT/PEM/URL credentials, guarded entropy rule, opt-in PII                                                               |
| 2   | Grounding evaluator    | Kaka `packages/career` `grounding.ts`, `contradictions.ts`                            | `packages/evaluation/src/grounding.ts`, `contradictions.ts`, `dates.ts`, `source-text.ts`    | Nothing; Arsenal had no grounding check                                                                                                                                                                                                                | Claims with evidence spans for quotes, dates, percentages and numbers against several sources; `null` score when there is nothing to check                           |
| 3   | Frame governor         | Sutra `apps/web/src/frameGovernor.ts`                                                 | `packages/fx/src/gpu/frame-governor.ts`, `useFrameGovernor.ts`                               | Merged onto the existing `nextTier` / `medianFrameMs` quality-tier ladder, so there is still one tier system                                                                                                                                           | Sustained-gap detection, pause handling, recovery ceiling against oscillation, reduced motion, a hook that re-renders only on tier change                            |
| 4   | AI provider resilience | OmniRoute `classify429`, `retryAfterJson`, `modelAccessDenied` (MIT, vendored unmodified with its LICENSE) | `packages/backend/src/ai-kit/resilience`                                                     | Extends the existing `net/retryWithJitter` (gains clamped, NaN-safe `delayFor`, regression-tested) instead of adding a second retry loop                                                                                                               | `classifyProviderFailure`, `CircuitBreaker` + registry, `callProvider` with bounded retries, Retry-After, abort and a structured `ProviderError`                     |
| 5   | ChapterRail            | Sutra `ChapterRail`, portfolio chapter rail                                           | `packages/ui/src/content/chapter-rail.tsx`, `chapter-rail-logic.ts`, `use-active-section.ts` | Neither source's tracking or framer-motion `useScroll` was copied; progress reuses ui's `scrollProgress`, reduced motion reuses `useReduceMotion`. TableOfContents catalog text corrected (it never tracked scroll itself; `useActiveSection` now can) | One rail: active section, smooth or instant navigation, arrow/Home/End keys, chapter or scroll progress, fixed or sticky, dense mode, compact pill on narrow screens |

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
