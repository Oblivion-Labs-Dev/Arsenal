# Performance results

## Size budgets (owner decision pending)

| Asset | Old budget | Size after engine work (A) | New budget |
| --- | --- | --- | --- |
| `CLAYFLOW_STYLE` | 16,384 B | 17,369 B | 28,672 B |
| `CLAYFLOW_RUNTIME` | 12,288 B | 17,731 B | 20,480 B |

Why: the engine brief adds click-to-inspect, step/seek/speed controls, twelve step kinds,
motion tokens and per-family node/edge/group motion CSS (workstreams B and C). Both strings
are injected once per page as singletons, not per diagram. The style budget leaves room for
B and C. Alternative if the owner prefers the old limits: minify the strings at build time.

Measurements from browser QA are appended below as they are taken.
