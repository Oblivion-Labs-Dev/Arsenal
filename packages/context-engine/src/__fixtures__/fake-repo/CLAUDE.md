# Claude Context Policy

Use Arsenal context files before reading raw source.

Priority order:
1. `.arsenal/memory/active-task.md`
2. `.arsenal/summaries/architecture.md`
3. `.arsenal/repo-map.json`
4. `.arsenal/knowledge-graph.json`
5. Relevant file summaries
6. Raw files only when required

Do not consume large token context unless the task requires it.
Prefer precise edits.
Do not rewrite whole files unless necessary.
