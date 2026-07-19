# Autoreview architecture

## Gap analysis (what we extended vs created)

### Extended (already existed)
- `@arsenal/agent-autoreview` — scope, sessions, pipeline, validators, reports, integrations
- `@arsenal/dashboard` / context-engine dashboard — context intelligence panels
- `@arsenal/session-memory`, `@arsenal/budget`, `@arsenal/cache` — leave as-is for context engine

### Created
- `@arsenal/agent-memory` — repository design feedback + baselines
- `@arsenal/repository-exporter` — package/embedded install, upgrade, doctor, remove
- Faceted packages (no logic duplication): `visual-validator`, `animation-validator`, `report-generator`, `agent-integrations`

## Modes
1. **Package** — depend on Arsenal workspace packages
2. **Embedded** — copy `tools/autoreview/cli.mjs` with zero `@arsenal/*` runtime imports (GitHub Pages safe)

## CLI
```bash
arsenal install autoreview --mode embedded|package
arsenal review --mode fast
arsenal review --checks cross-browser
arsenal agent task|context|finish
arsenal baseline approve|list|diff|remove
```
