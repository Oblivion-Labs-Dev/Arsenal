# Antigravity — Autoreview

Post-implementation checklist:

- [ ] `arsenal autoreview session start --task "..."` at task start (recommended)
- [ ] Implement changes
- [ ] `arsenal autoreview --task "..."`
- [ ] Address remaining issues from `.autoreview/reports/latest.md`
- [ ] Re-run until gates pass
- [ ] `arsenal autoreview session finish`

Constraints: task-scope only; no full-site crawl; budgets are hard caps.
