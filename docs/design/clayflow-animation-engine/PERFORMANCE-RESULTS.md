# Performance results

## Size budgets (owner decision pending)

| Asset | Old budget | Size after engine work (A) | New budget |
| --- | --- | --- | --- |
| `CLAYFLOW_STYLE` | 16,384 B | 17,369 B (A); 35,042 B after B + C (6,665 B gzip) | 36,864 B |
| `CLAYFLOW_RUNTIME` | 12,288 B | 17,731 B (A); 18,122 B after B + C (4,970 B gzip) | 20,480 B |

Why: the engine brief adds click-to-inspect, step/seek/speed controls, twelve step kinds,
motion tokens and per-family node/edge/group motion CSS (workstreams B and C). Both strings
are injected once per page as singletons, not per diagram. The style budget leaves room for
B and C. B and C landed at 35 KB, so the style budget was raised a second time to 36 KB.
Whitespace/comment minification was measured and only reaches 31.4 KB, so it cannot restore
28 KB on its own; gzip on the wire is 6.7 KB. Alternative if the owner prefers a tighter limit:
minify at build time and trim per-family motion rules.

Measurements from browser QA are appended below as they are taken.
