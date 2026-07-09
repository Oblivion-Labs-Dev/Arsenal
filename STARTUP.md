# Arsenal AI Context Engine — Startup Guide

Arsenal is a modular **AI Context Engine** for any repository. It sits between your codebase and any LLM (Claude, Cursor, Codex, Gemini, OpenAI) to preprocess repo knowledge, compile task-specific context, and optimize prompts before they reach a model.

**Design principle:** the model should never receive raw repository context unless absolutely necessary.

All repo-specific knowledge lives in `.arsenal/` at the project root. The engine itself stays in the Arsenal monorepo and is reusable across projects.

---

## How the layers fit together

```
Repository
    ↓
Preprocessing        scan → index → summarize → cache
    ↓
Knowledge Graph      symbols, deps, routes, tests, APIs
    ↓
Semantic Retrieval   hybrid ranking (TF-IDF, graph, recency)
    ↓
Context Compiler     progressive expansion, budget enforcement
    ↓
Prompt Compiler      profiles, constraints, acceptance criteria
    ↓
LLM
```

---

## 1. Repository preprocessing

Preprocessing turns a raw codebase into compact, structured artifacts an agent can read cheaply.

### Workspace bootstrap

| Feature | Package | What it does |
|---------|---------|--------------|
| Workspace initializer | `@arsenal/context-engine` | Creates `.arsenal/` structure, default config, memory files, rules, cache, and analytics stubs |
| Configuration loader | `@arsenal/context-engine` | Loads `.arsenal/config.json` — source roots, test roots, token budgets, ignore patterns |
| Agent rule templates | `@arsenal/context-engine` | Seeds `AGENTS.md`, `CLAUDE.md`, cursor rules, testing rules, context policy |

**Outputs:** `.arsenal/config.json`, `.arsenal/memory/*`, `.arsenal/rules/*`, `.arsenal/prompts/*`, `.arsenal/cache/*`

### Scanning & classification

| Feature | Package | What it does |
|---------|---------|--------------|
| Repo scanner | `@arsenal/context-engine` | Walks the repo with ignore rules, hashes files, optionally loads content |
| Ignore resolver | `@arsenal/context-engine` | Merges config ignores, `.gitignore`, and lock-file exclusions |
| File classifier | `@arsenal/context-engine` | Labels files as source / test / config / doc and infers modules and project type |
| Hash-based incremental scan | `@arsenal/cache` | Skips unchanged files by comparing content hashes |

**Outputs:** `.arsenal/repo-map.json`, `.arsenal/file-index.json`, `.arsenal/cache/hashes.json`

### Indexers

| Feature | Package | What it does |
|---------|---------|--------------|
| AST indexer | `@arsenal/context-engine` | Extracts exports, symbols, and side effects from source |
| Symbol indexer | `@arsenal/context-engine` | Builds a flat symbol table (functions, classes, interfaces) |
| Import indexer | `@arsenal/context-engine` | Parses and resolves relative and alias imports |
| Dependency indexer | `@arsenal/context-engine` | Builds import edges and reverse-dependency map |
| Test indexer | `@arsenal/context-engine` | Links test files to inferred source targets |
| Route indexer | `@arsenal/context-engine` | Detects Next.js pages and API routes from paths |
| API indexer | `@arsenal/context-engine` | Detects HTTP handlers (Next route exports, Express-style) |

**Outputs:** `.arsenal/symbol-index.json`, `.arsenal/dependency-graph.json` (feeds the knowledge graph)

### Summarizers

| Feature | Package | What it does |
|---------|---------|--------------|
| File summarizer | `@arsenal/context-engine` | Structured per-file summary: purpose, exports, deps, risks |
| Module summarizer | `@arsenal/context-engine` | Rolls up file summaries into per-module markdown |
| Architecture summarizer | `@arsenal/context-engine` | High-level repo stats, modules, routes, APIs, tests |
| Decision / task parsers | `@arsenal/context-engine` | Parses `decisions.md` and `active-task.md` into sections |
| Multi-level text summarizer | `@arsenal/summary` | Micro / short / detailed text truncation |
| Log compressor | `@arsenal/summary` | Compresses terminal output to errors, warnings, and stats |
| Block deduplication | `@arsenal/summary` | Removes repeated instructions, comments, and code blocks |

**Outputs:** `.arsenal/summaries/files/*.json`, `.arsenal/summaries/modules/*.md`, `.arsenal/summaries/architecture.md`, `.arsenal/summaries/public-api.md`, `.arsenal/summaries/tests.md`

### Context levels (progressive expansion)

Arsenal never defaults to maximum context. It expands only when needed:

| Level | Name | Content |
|-------|------|---------|
| 0 | Architecture | Repo structure, modules, high-level design |
| 1 | Module | Module-level summaries |
| 2 | Class | Class / interface summaries |
| 3 | Function | Function-level summaries and symbols |
| 4 | Source | Actual source code |

Defined in `@arsenal/core` as `ContextLevel` and enforced by `@arsenal/context`.

### Repository memory

| Feature | Package | What it does |
|---------|---------|--------------|
| Decision store | `@arsenal/context-engine` | Persists architectural decisions across sessions |
| Pitfall store | `@arsenal/context-engine` | Records known bugs, gotchas, and repo-specific traps |
| Active task store | `@arsenal/context-engine` | Tracks current goal, scope, and next steps |
| Session handoff | `@arsenal/session-memory` | Generates agent handoff from active task state |
| Compact history | `@arsenal/context-engine` | Archives completed work into compact history |

**Outputs:** `.arsenal/memory/decisions.md`, `pitfalls.md`, `active-task.md`, `conventions.md`, `compact-history.md`, `.arsenal/prompts/agent-handoff.md`

---

## 2. Repo knowledge graph

The knowledge graph is a persistent, queryable map of how your codebase is connected. Graph exploration should finish before any file reading.

### Graph model

**Node types:** function, class, interface, module, API route, database schema, event, test, config, documentation

**Edge types:** imports, depends-on, calls, tests, owns, documents, configures

| Feature | Package | What it does |
|---------|---------|--------------|
| Graph builder | `@arsenal/context-engine` | Merges repo map, symbols, deps, tests, routes, APIs into one graph |
| Graph store | `@arsenal/context-engine` | In-memory accessor for nodes and edges by type and direction |
| Graph schema | `@arsenal/knowledge` | Zod-validated graph types (standalone package) |

**Output:** `.arsenal/knowledge-graph.json`

### Graph queries

Questions the graph can answer:

- Who calls this?
- Where is authentication handled?
- What breaks if this changes?
- Which tests cover this?
- Which services depend on this?
- Which files usually change together?

| Feature | Package | What it does |
|---------|---------|--------------|
| Term-scored search | `@arsenal/context-engine` | Returns relevant file paths and symbol names for a query |
| Neighbor expansion | `@arsenal/context-engine` | Walks related nodes to pull in dependencies and dependents |
| Query type inference | `@arsenal/knowledge` | Infers intent (`who-calls`, `where-is`, `what-breaks`, etc.) |
| Standalone graph query | `@arsenal/knowledge` | Scored node search and neighbor expansion without context-engine |

### Semantic retrieval

| Feature | Package | What it does |
|---------|---------|--------------|
| Hybrid retrieval | `@arsenal/retrieval` | Combines TF-IDF, symbol index, dependency distance, recency, and git frequency |
| TF-IDF index | `@arsenal/retrieval` | Builds term-frequency index for keyword relevance |

Ranking priorities: current task → recent edits → frequently modified files → dependency distance → historical relevance.

---

## 3. Prompt optimization

User prompts should not go directly to the model. Arsenal compiles structured prompts with budget awareness.

### Token budget engine

| Feature | Package | What it does |
|---------|---------|--------------|
| Budget manager | `@arsenal/budget` | Estimates prompt cost, enforces token limits, suggests optimizations |
| Profile selection | `@arsenal/budget` | Picks budget profile from task complexity (keywords + length) |
| Priority enforcement | `@arsenal/budget` | Drops low-priority context items when over budget |

**Budget profiles:**

| Profile | Max prompt tokens | Use case |
|---------|-------------------|----------|
| `tiny` | 2,000 | Quick fixes, typos |
| `small` | 4,000 | Single-function changes |
| `balanced` | 12,000 | Default feature work |
| `large` | 24,000 | Multi-module features |
| `maximum-quality` | 48,000 | Refactors, migrations |
| `maximum-savings` | 1,500 | Aggressive cost reduction |

### Policy engine

Declarative rules replace scattered hooks. Examples:

- Prefer summaries over raw source
- Reject duplicated context
- Reject files over configured size
- Compress logs and large diffs
- Use graph before file reads

| Feature | Package | What it does |
|---------|---------|--------------|
| Policy engine | `@arsenal/policy` | Evaluates declarative rules against context candidates |
| Negative constraints | `@arsenal/policy` | Injects standard guardrails into compiled prompts |

Default constraints injected into every prompt:

- Do not modify unrelated files
- Do not rename existing APIs
- Prefer minimal diff
- Follow repository conventions
- Preserve comments
- No unnecessary dependencies

### Prompt compiler

| Feature | Package | What it does |
|---------|---------|--------------|
| Prompt compiler | `@arsenal/prompt` | Assembles objective, rules, context, constraints, output format, acceptance criteria |
| Profile inference | `@arsenal/prompt` | Selects prompt profile from task keywords |

**Prompt profiles:** implementation, debugging, architecture, review, refactor, performance, security, testing, documentation

Each profile defines temperature, verbosity, constraints, expected output format, and token budget.

### Context compiler

| Feature | Package | What it does |
|---------|---------|--------------|
| Context compiler | `@arsenal/context` | Full pipeline: intent → symbols → deps → tests → docs → compiled prompt |
| Context package builder | `@arsenal/context-engine` | Graph + summaries + memory → scored context package with savings estimate |
| Framework build bridge | `@arsenal/context-engine` | Wires modular packages into the build pipeline |
| Model profiles | `@arsenal/context-engine` | Per-vendor hints for Claude, Cursor, OpenAI |

**Compiled prompt sections:** Objective → Profile → Repository Rules → Coding Standards → Relevant Context → Negative Constraints → Output Format → Acceptance Criteria → Token Budget

**Output:** `.arsenal/prompts/agent-handoff.md`

### Token estimation

```
estimatedTokens = Math.ceil(text.length / 4)
```

Typical savings for a 500-file repo: **85–98%** vs loading all source (3k–12k tokens vs ~200k).

---

## 4. Observability & analytics

Every context build is measurable. All analytics persist as JSON files under `.arsenal/analytics/`.

| Feature | Package | What it does |
|---------|---------|--------------|
| Usage logger | `@arsenal/context-engine` | Logs context builds and agent events |
| Savings calculator | `@arsenal/context-engine` | Aggregates token savings across builds |
| Quality scorer | `@arsenal/context-engine` | Grades context freshness, file selection, memory usage |
| Stale knowledge detector | `@arsenal/context-engine` | Finds summaries out of sync with file hashes |
| Improvement engine | `@arsenal/context-engine` | Suggests index and summary improvements from patterns |
| Pattern detector | `@arsenal/context-engine` | Detects recurring module access and edit patterns |
| Learning engine | `@arsenal/observability` | Records request metrics and updates retrieval ranking signals |
| Dashboard snapshot | `@arsenal/context-engine` | Aggregates all metrics into a single JSON snapshot + HTML viewer |

### Analytics files

| File | Contents |
|------|----------|
| `dashboard.json` | Full snapshot: overview, trends, quality, suggestions, details |
| `dashboard-details.json` | Raw builds, events, usage log, patterns |
| `dashboard.html` | Self-contained viewer (open in browser) |
| `context-builds.jsonl` | Per-build token logs |
| `agent-events.jsonl` | File opens, edits, test runs |
| `usage-log.jsonl` | General usage entries |
| `savings-report.json` | Aggregated savings metrics |
| `improvement-suggestions.json` | Actionable optimization suggestions |
| `stale-knowledge-report.json` | Out-of-date summaries and missing indexes |

---

## 5. Package map

| Package | Role |
|---------|------|
| `@arsenal/core` | Types, tokens, paths, file I/O, feature flags, plugin registry |
| `@arsenal/context-engine` | Indexers, graph, summaries, memory, analytics, repo integration |
| `@arsenal/knowledge` | Graph types and standalone query helpers |
| `@arsenal/retrieval` | Hybrid TF-IDF + graph retrieval ranking |
| `@arsenal/summary` | Multi-level summarization, log compression, deduplication |
| `@arsenal/cache` | Hash-based cache invalidation |
| `@arsenal/budget` | Token budget profiles and enforcement |
| `@arsenal/policy` | Declarative context rules |
| `@arsenal/prompt` | Prompt profiles and compilation |
| `@arsenal/context` | Context compiler pipeline |
| `@arsenal/session-memory` | Session state and handoff generation |
| `@arsenal/observability` | Request tracking and learning loop |
| `@arsenal/dashboard` | Analytics dashboard facade |

---

## 6. Plugin architecture

All major components are replaceable. Register providers via `@arsenal/core`:

| Provider | Purpose |
|----------|---------|
| `EmbeddingProvider` | Vector embeddings for semantic retrieval |
| `SummarizerProvider` | LLM-powered summarization |
| `KnowledgeGraphProvider` | Custom graph backends |
| `BudgetProvider` | Custom token estimation and enforcement |

---

## 7. Feature flags

Toggle components at runtime via `@arsenal/core`:

| Flag | Default | Controls |
|------|---------|----------|
| `budgetEngine` | `true` | Token budget enforcement |
| `contextCompiler` | `true` | Modular context compiler pipeline |
| `policyEngine` | `true` | Declarative policy rules |
| `deduplication` | `true` | Context deduplication |
| `learningEngine` | `true` | Learning loop updates |
| `semanticRetrieval` | `false` | Embedding-based retrieval |
| `embeddings` | `false` | Vector embedding provider |
| `gitIntelligence` | `false` | Git co-change and blame signals |
| `terminalInterceptor` | `false` | Token-aware terminal output compression |

---

## 8. Programmatic entry points

```ts
// Preprocessing
import { scanRepo, buildKnowledgeGraph, loadFileSummaries } from "@arsenal/context-engine";
import { ContextCache } from "@arsenal/cache";
import { summarizeText, deduplicateBlocks } from "@arsenal/summary";

// Knowledge graph
import { queryGraph, expandNeighbors } from "@arsenal/knowledge";
import { hybridRetrieve } from "@arsenal/retrieval";

// Prompt optimization
import { ContextCompiler } from "@arsenal/context";
import { BudgetManager, selectProfileForQuery } from "@arsenal/budget";
import { PromptCompiler } from "@arsenal/prompt";
import { PolicyEngine } from "@arsenal/policy";

// Memory & handoff
import { generateHandoff } from "@arsenal/session-memory";

// Analytics
import { aggregateDashboardData } from "@arsenal/context-engine";
import { LearningEngine } from "@arsenal/observability";
```

---

## 9. `.arsenal/` output contract

Everything the engine produces for a consuming repo:

```
.arsenal/
├── config.json                  # Repo configuration
├── repo-map.json                # File listing with kinds and modules
├── file-index.json              # Scanned file metadata
├── symbol-index.json            # Flat symbol table
├── dependency-graph.json        # Import edges
├── knowledge-graph.json         # Full knowledge graph
├── summaries/
│   ├── files/*.json             # Per-file summaries
│   ├── modules/*.md             # Per-module summaries
│   ├── architecture.md          # Architecture overview
│   ├── public-api.md            # Exported API surface
│   └── tests.md                 # Test coverage map
├── memory/
│   ├── active-task.md           # Current session goal
│   ├── decisions.md             # Architectural decisions
│   ├── pitfalls.md              # Known gotchas
│   ├── conventions.md           # Coding conventions
│   └── compact-history.md       # Completed work archive
├── prompts/
│   └── agent-handoff.md         # Compiled context for agents
├── rules/                       # Agent rule files
├── cache/
│   ├── hashes.json              # File content hashes
│   └── token-estimates.json     # Cached token counts
└── analytics/
    ├── dashboard.json             # Full analytics snapshot
    ├── dashboard-details.json     # Raw logs and patterns
    ├── dashboard.html             # Static viewer
    ├── context-builds.jsonl       # Per-build records
    ├── agent-events.jsonl         # Agent activity log
    ├── savings-report.json        # Token savings summary
    └── improvement-suggestions.json
```

---

## 10. Roadmap (not yet in MVP)

- Vector embeddings provider
- Git co-change intelligence (blame, PR history, co-edit signals)
- Token-aware terminal output interceptor
- CI token regression gates
- Full extraction of indexers/graph from context-engine into standalone packages
- LLM-powered summarization (current summaries are heuristic)

---

## Further reading

- [`docs/context-optimization-framework.md`](docs/context-optimization-framework.md) — architecture and package design
- [`docs/context-engine.md`](docs/context-engine.md) — context engine overview
- [`docs/token-saving-strategy.md`](docs/token-saving-strategy.md) — token layering and savings
- [`docs/using-arsenal-in-any-repo.md`](docs/using-arsenal-in-any-repo.md) — integration guide
