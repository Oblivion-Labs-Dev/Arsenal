# Using Arsenal in Any Repo

Arsenal's context engine can be added to any Node.js project (monorepo or standalone).

## Install

From the Arsenal monorepo (development):

```bash
pnpm add @arsenal/context-engine --workspace
```

When published:

```bash
npm install @arsenal/generator
# or
npm install @arsenal/context-engine
```

## Quick start

```bash
npx arsenal context init
npx arsenal context index
npx arsenal context summarize
npx arsenal context graph
npx arsenal context build "add login validation"
```

## What gets created

### Committed (recommended)

- `.arsenal/config.json`
- `.arsenal/summaries/`
- `.arsenal/memory/`
- `.arsenal/rules/`
- `AGENTS.md`, `CLAUDE.md` (if not already present)
- `.cursor/rules/arsenal-context.mdc`

### Generated / cache (gitignored)

- `.arsenal/cache/`
- Raw indexes can be regenerated with `index`

Add to `.gitignore`:

```
.arsenal/cache/
```

## Workflow for agents

1. Agent reads `.arsenal/memory/active-task.md`
2. Agent uses `repo-map.json` and `knowledge-graph.json` to find relevant files
3. Agent reads file summaries instead of full sources when possible
4. After work, run `arsenal context compact` or update `active-task.md`

## Configuration

Edit `.arsenal/config.json`:

```json
{
  "sourceRoots": ["src"],
  "testRoots": ["test", "tests", "__tests__"],
  "contextBudget": {
    "defaultMaxTokens": 12000
  }
}
```

## CI integration

```yaml
- run: npx arsenal context index
- run: npx arsenal context doctor
```

Regenerate summaries on main branch merges when architecture changes.
