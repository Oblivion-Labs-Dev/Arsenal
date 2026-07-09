# Arsenal AI Context Optimization Framework

Arsenal is a modular **AI Context Engine** that sits between developers and any LLM (Claude, Cursor, Codex, Gemini, OpenAI). It maximizes information density and minimizes irrelevant context.

## Architecture

```
Repository
    ↓
Knowledge Graph        (@arsenal/knowledge + context-engine indexers)
    ↓
Semantic Index         (@arsenal/retrieval — hybrid TF-IDF + graph + git)
    ↓
Dependency Graph     (context-engine)
    ↓
Context Compiler       (@arsenal/context)
    ↓
Budget Optimizer       (@arsenal/budget)
    ↓
Prompt Compiler        (@arsenal/policy + @arsenal/prompt)
    ↓
LLM
```

## Packages

| Package | Responsibility |
|---------|----------------|
| `@arsenal/core` | Types, tokens, paths, file I/O, plugins, feature flags |
| `@arsenal/budget` | Token budget profiles and enforcement |
| `@arsenal/policy` | Declarative context rules |
| `@arsenal/prompt` | Prompt profiles and compilation |
| `@arsenal/context` | Context compiler pipeline |
| `@arsenal/retrieval` | Hybrid retrieval ranking |
| `@arsenal/summary` | Multi-level summarization, log compression |
| `@arsenal/knowledge` | Graph types and queries |
| `@arsenal/session-memory` | Session state and handoff |
| `@arsenal/cache` | Hash-based cache invalidation |
| `@arsenal/observability` | Request tracking and learning loop |
| `@arsenal/dashboard` | Cost analytics UI (facade) |
| `@arsenal/context-engine` | CLI, indexers, repo integration |

## Budget Profiles

- `tiny` — 2k prompt tokens, max savings
- `small` — 4k tokens
- `balanced` — 12k tokens (default)
- `large` — 24k tokens
- `maximum-quality` — 48k tokens
- `maximum-savings` — 1.5k tokens

## Context Levels

Progressive expansion (0–4): Architecture → Module → Class → Function → Source

## CLI

```bash
arsenal context init
arsenal context index
arsenal context summarize
arsenal context graph
arsenal context build "task"
arsenal context handoff
arsenal context report
arsenal context analyze
arsenal context dashboard
```

## Programmatic API

```ts
import { ContextCompiler } from "@arsenal/context";
import { BudgetManager } from "@arsenal/budget";
import { PromptCompiler } from "@arsenal/prompt";
import { PolicyEngine } from "@arsenal/policy";
import { hybridRetrieve } from "@arsenal/retrieval";
import { generateHandoff } from "@arsenal/session-memory";

const compiler = new ContextCompiler();
const result = compiler.compile({
  intent: "fix OAuth token refresh",
  fileSummaries: [{ path: "src/auth/oauth.ts", purpose: "OAuth handler" }],
  budgetProfile: "balanced",
});
```

## Plugin Architecture

Register swappable providers via `@arsenal/core`:

- `EmbeddingProvider`
- `SummarizerProvider`
- `KnowledgeGraphProvider`
- `BudgetProvider`

## Feature Flags

```ts
import { setFeatureFlags } from "@arsenal/core";
setFeatureFlags({ embeddings: true, gitIntelligence: true, contextCompiler: false });
```

`context build` uses the framework pipeline (`ContextCompiler` + `PromptCompiler` + `BudgetManager`) when `contextCompiler` and `budgetEngine` are enabled (default: both on). Disable `contextCompiler` to fall back to the legacy builder.

## Roadmap (not yet in MVP)

- Vector embeddings provider
- Git co-change intelligence
- Terminal output interceptor hook
- CI token regression gates
- Full package extraction from context-engine monolith

## Best Practices

1. Run `index` + `summarize` + `graph` before agent sessions
2. Use `build` or `ContextCompiler` — never paste raw repo context
3. Use `handoff` between sessions
4. Run `analyze` weekly to improve summaries
5. Keep `.arsenal/memory/` updated with decisions and pitfalls
