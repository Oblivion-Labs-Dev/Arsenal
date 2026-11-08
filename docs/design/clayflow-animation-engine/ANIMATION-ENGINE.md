# ClayFlow animation engine

## Pipeline

1. A spec is parsed by the Zod schemas in `src/schema.ts`.
2. `validate()` in `src/validate.ts` checks syntax and all node, edge, group, annotation and step references.
3. `compile()` in `src/timeline.ts` creates a deterministic timeline of at most 24 frames.
4. `renderClayFlow()` in `src/render.ts` produces static-first HTML and SVG, accessible text, and embedded frame JSON.
5. The vanilla runtime in `src/runtime.ts` mounts the figure, applies frames, animates packets, exposes controls and cleans up listeners on unmount.

## Step vocabulary

Each step has a required `caption` and may set `nodes`, `edges`, `highlight`, `packets`, `states`, `counters`, and `duration`. `branch: { from, take }` selects an outgoing edge and dims the alternatives. `transform: [{ node, kind?, label? }]` changes node presentation and persists. `expand` and `collapse` set group state, `annotate` reveals annotation ids, `focus` emphasizes one node, `complete` sets completion state, and `loop: { edge, times }` emits one packet frame per iteration (1–5).

```json
{
  "caption": "Approve and notify",
  "branch": { "from": "review", "take": "approved" },
  "transform": [{ "node": "review", "kind": "success", "label": "Approved" }],
  "expand": ["audit"],
  "annotate": ["approved-note"],
  "focus": "notify",
  "complete": true,
  "loop": { "edge": "retry", "times": 2 }
}
```

`transform.kind` uses a valid node kind. `branch.take` must identify an edge whose `from` matches the branch node. Group, annotation, focus and loop references must exist.

## Runtime API

`window.ClayFlow.get(fig)` returns the instance API for a mounted figure, or `null` if it is not mounted. The API provides `play()`, `pause()`, `toggle()`, `replay()`, `reset()`, `step(dir)`, `seek(index)`, `setSpeed(n)`, `inspect(nodeId | null)`, and `on("frame" | "complete", fn)`. `on` returns an unsubscribe function. React exposes this handle with `onReady(api)` and supports `autoPlay` and `initialStep`.

## Stylesheet ownership

| File | Ownership |
| --- | --- |
| `src/style/base.ts` | Existing component surfaces, layout, controls, states and baseline responsive behavior |
| `src/style/motion-nodes.ts` | Node motion and focus states |
| `src/style/motion-edges.ts` | Connector motion and branch states |
| `src/style/motion-groups.ts` | Group expansion and collapse states |
| `src/style/inspect.ts` | Inspect panel and illustrative badge |
| `src/style.ts` | Aggregates the token CSS and owned style modules into `CLAYFLOW_STYLE` |
