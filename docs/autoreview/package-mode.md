# Package integration

```bash
pnpm add -D @arsenal/agent-autoreview @arsenal/agent-memory
arsenal install autoreview --mode package
```

```bash
arsenal agent task --task "Update Card"
arsenal review --mode fast
arsenal agent finish
```
