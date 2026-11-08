# Transformation recipes

A transformation changes what a node _means_ without moving it. A `transform` step sets a new `kind`,
a new `label`, or both, on an existing node, and the change persists into later frames. The node keeps
its position and edges, so the reader sees one object evolve rather than a new one appear.

```json
{
  "caption": "Clean data takes shape.",
  "transform": [{ "node": "data", "kind": "data", "label": "Clean data" }]
}
```

The runtime swaps the node's `data-kind`, so its motion family and glyph change with it, and
cross-fades the label. Under reduced motion the change is applied instantly.

## Shipped recipes

The recipes are defined in `packages/clayflow/src/examples/showcase-specs.ts` (`TRANSFORMATION_RECIPES`)
and shown in section 04 of `/clayflow/showcase`. All of them are marked `illustrative: true`.

| Recipe                 | From → to                                                   |
| ---------------------- | ----------------------------------------------------------- |
| Raw data to clean data | data "Raw data" → data "Clean data"                         |
| Idea to launch         | general "Idea" → process "Prototype" → launch "Launch"      |
| Question to answer     | user "Question" → agent "Research" → document "Answer"      |
| Investment to growth   | money "Investment" → finance "Allocation" → growth "Growth" |

## Writing a new one

Use the `recipe(id, title, explanation, entries)` helper. Each entry has the form
`[nodeId, beforeKind, beforeLabel, afterKind, afterLabel]`. The helper chains the entries with plain
edges and compiles them with the `state-transition` preset, one step per entry.

- `transform.kind` must be a valid node kind.
- `validate()` rejects unknown node ids.
- Keep labels short, because they share the node's width.
- Never put real financial figures in a recipe.
