# Claude Code — autoreview

Add a custom command or include in CLAUDE.md:

```
After implementing a task, run:
  arsenal autoreview --task "<task>"

Rules:
- Review only the current task scope.
- Do not inspect unrelated pages.
- Do not declare completion until scoped gates pass.
- Do not hide unresolved findings.
- Prefer deterministic checks before model critics.
- Reuse .autoreview/cache when possible.
```

Slash-style helper:

```bash
pnpm exec arsenal-autoreview --task "..."
```
