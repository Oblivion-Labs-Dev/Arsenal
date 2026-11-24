# Agent System Instructions

> [!IMPORTANT]
> **Mandatory Startup Rule:** Before making any changes, every agent MUST first read:
>
> 1. [AGENTS.md](./AGENTS.md)
> 2. [rules/common.md](./rules/common.md)
> 3. [rules/naming.md](./rules/naming.md)
> 4. [rules/architecture.md](./rules/architecture.md)
> 5. [rules/arsenal.md](./rules/arsenal.md)
>
> Do not make any modifications until these files have been read.

---

## Context Policy (`.arsenal/` Knowledge Layer)

Use `.arsenal/` context files before reading raw source to keep token usage lean.

**Priority order before editing:**
1. `.arsenal/memory/active-task.md`
2. `.arsenal/summaries/architecture.md`
3. `.arsenal/repo-map.json`
4. `.arsenal/knowledge-graph.json`
5. Relevant file summaries
6. Raw source files only when required

**After editing:**
- Update `.arsenal/memory/active-task.md`
- Update summaries if architecture changed
- Run relevant tests (`pnpm build` / `pnpm test`)
- Prefer precise edits; avoid rewriting whole files unless necessary.

---

## Repository Layout
- `packages/*` - Core reusable blocks. Product-agnostic.

## Commands
Run from this directory (`Arsenal/`):
```bash
pnpm install
pnpm build
pnpm test
```
