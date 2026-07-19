# Generic CLI usage

```bash
# From any repository using @arsenal/agent-autoreview
pnpm exec arsenal-autoreview --task "Describe the task"
pnpm exec arsenal-autoreview --files src/components/Card.tsx --mode fast --dry-run
pnpm exec arsenal-autoreview --report-only

# Via Arsenal CLI (when @arsenal/generator is installed)
pnpm arsenal autoreview --task "Describe the task"
```

Outputs:
- `.autoreview/current-scope.json`
- `.autoreview/reports/latest.md`
- `.autoreview/reports/latest.json`
