# Embedded integration (GitHub Pages safe)

```bash
arsenal install autoreview --mode embedded --preset github-pages
```

Creates `tools/autoreview/cli.mjs` with **no `@arsenal/*` imports**.

```bash
npm run agent:task -- --task "Fix mobile overlap"
# ... implement ...
npm run review:run
npm run agent:finish
```

Cross-browser is explicit:

```bash
npm run review:cross-browser
```
