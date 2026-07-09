# Arsenal Agent Rules

Before coding:
1. Read `.arsenal/memory/active-task.md`.
2. Read `.arsenal/repo-map.json`.
3. Use `.arsenal/knowledge-graph.json` to locate relevant files.
4. Open full source files only when necessary.
5. Do not load unrelated files.
6. Prefer targeted diffs over full rewrites.
7. After changes, update `.arsenal/memory/active-task.md`.

Context policy:
- Use summaries first.
- Use source code second.
- Use tests when behavior is unclear.
- Use docs/decisions for architecture.
- Never paste entire unrelated files into the prompt.

Before final response:
- Run relevant tests if possible.
- Mention files changed.
- Mention risks.
- Update compact handoff if task is incomplete.
