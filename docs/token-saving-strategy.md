# Token Saving Strategy

Arsenal reduces agent token usage by layering context from cheap to expensive.

## Priority order

1. **Active task** (`.arsenal/memory/active-task.md`) — ~200 tokens
2. **Architecture summary** — ~600 tokens
3. **Repo map** — structured file listing with kinds and modules
4. **Knowledge graph** — relationships between files, symbols, tests, routes
5. **File summaries** — ~250 tokens per file
6. **Raw source** — only when summaries are insufficient

## Token estimation

Arsenal uses a simple heuristic:

```
estimatedTokens = Math.ceil(text.length / 4)
```

`arsenal context build` reports:

```
Context package estimate: 3,420 tokens
Avoided loading: 82,000 estimated tokens
```

## Budget tiers

Configured in `.arsenal/config.json`:

| Task size | Default budget |
|-----------|----------------|
| Small (≤5 words) | 4,000 tokens |
| Default | 12,000 tokens |
| Large (≥15 words) | 24,000 tokens |

## Best practices

### Do

- Run `index` after significant file changes
- Run `summarize` after architectural changes
- Use `build <query>` at the start of each agent session
- Keep `active-task.md` current

### Avoid

- Pasting entire `node_modules` or build output into prompts
- Loading all source files when summaries exist
- Skipping `graph` — it powers relevance ranking

## Example savings

For a 500-file repo with ~200k estimated source tokens:

| Approach | Est. tokens |
|----------|-------------|
| Load all `src/` | ~200,000 |
| Arsenal context package | ~3,000–12,000 |
| Savings | ~85–98% |

## Limitations

- Summaries are heuristic (not LLM-generated) in the current MVP
- Import resolution is best-effort for path aliases
- Graph `CALLS` edges are not yet extracted from AST
- Non-TypeScript/JavaScript languages have basic support
