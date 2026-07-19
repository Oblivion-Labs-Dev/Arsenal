# Codex instructions — Arsenal Autoreview

When finishing an implementation task in this repository:

1. Run `arsenal autoreview --task "<task description>"`.
2. Scope comes from Git changes (or `--files` / task session). Never review the whole site.
3. Fix findings, re-run until quality gates pass or iteration budget is exhausted.
4. Attach `.autoreview/reports/latest.md` in your completion summary.
5. Prefer `--mode fast` unless UI polish or high risk; use `--mode thorough` for visual/layout work.
6. Do not send `.env`, secrets, or the full repository to any model.
