# Arsenal Context Engine

The Context Engine is Arsenal's reusable package for reducing LLM token usage in any repository. It generates repo-local knowledge under `.arsenal/` while keeping the engine itself project-agnostic.

## Architecture

```
@arsenal/context-engine (Arsenal repo)
  ├── scanners, indexers, graph builder
  ├── summarizers, context builder
  └── CLI: arsenal context <command>

.arsenal/ (consuming repo)
  ├── config.json
  ├── indexes (repo-map, symbols, dependencies)
  ├── knowledge-graph.json
  ├── summaries/
  ├── memory/
  ├── rules/
  └── prompts/
```

## Commands

| Command | Description |
|---------|-------------|
| `arsenal context init` | Create `.arsenal/` structure and default agent rules |
| `arsenal context index` | Scan repo and build indexes |
| `arsenal context summarize` | Generate file, module, and architecture summaries |
| `arsenal context graph` | Build knowledge graph |
| `arsenal context build <query>` | Produce compact context handoff for a task |
| `arsenal context compact` | Compact active task into handoff + history |
| `arsenal context doctor` | Validate `.arsenal/` health |

## Programmatic API

```ts
import {
  scanRepo,
  buildKnowledgeGraph,
  buildContextPackage,
  runIndex,
  DEFAULT_CONFIG,
} from "@arsenal/context-engine";
```

## Package location

Source lives in `packages/context-engine/src/` and is exported from `@arsenal/context-engine`.

## Analytics & Dashboard

Every `context build` logs to `.arsenal/analytics/context-builds.jsonl`. Use:

```bash
arsenal context report      # Print + save savings report
arsenal context analyze     # Detect patterns and improvements
arsenal context dashboard   # Save dashboard JSON + static HTML viewer
arsenal context dashboard --serve [port]  # Optional live server (port 3987)
```

Analytics files live under `.arsenal/analytics/`:

| File | Contents |
|------|----------|
| `dashboard.json` | Full snapshot: overview, trends, quality, suggestions, details |
| `dashboard-details.json` | Raw builds, events, usage log, patterns |
| `dashboard.html` | Self-contained viewer (open in browser) |
| `context-builds.jsonl` | Per-build token logs |
| `savings-report.json` | Aggregated savings metrics |

1. **Engine in Arsenal, knowledge in `.arsenal/`** — no project-specific data in the package.
2. **Summaries before source** — agents read compact indexes first.
3. **Hash-based incremental indexing** — unchanged files are skipped when possible.
4. **Token budgets** — context packages respect configurable limits.
