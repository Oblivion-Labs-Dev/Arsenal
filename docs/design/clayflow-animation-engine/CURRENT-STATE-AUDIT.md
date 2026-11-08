# ClayFlow animation engine — current-state audit (Phase 0)

Audited 2026-11-08 on branch `feat/clayflow-engine` (base `2858d52`).

## What exists (packages/clayflow)

| Area                | File                                                   | State                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec schema (zod 4) | `src/schema.ts`                                        | Nodes (72 kinds incl. people/objects), 8 node states, 6 tones, edges (straight/curved/orthogonal, dashed, bidirectional, label, animated), groups (group/module/boundary/section, collapsible, nested), annotations, 15 animation presets, optional `steps`, explanations, topic themes.                                                                                                                  |
| Validation          | `src/validate.ts`                                      | Referential checks, fallback model for invalid specs (`renderFallback` list).                                                                                                                                                                                                                                                                                                                             |
| Layout              | `src/layout.ts`, `src/route.ts`                        | Deterministic horizontal + vertical layouts, ports, edge routing with label positions.                                                                                                                                                                                                                                                                                                                    |
| Timeline            | `src/timeline.ts`                                      | `compile(diagram) → Frame[]` (≤24 frames, deterministic, 800 ms default). Frame = visible, highlight, packets, states, counters, caption. `frameAt` loops. Presets synthesize frames; explicit `steps` override.                                                                                                                                                                                          |
| Render              | `src/render.ts`                                        | Static HTML+SVG string (SSR safe). Two stages (horizontal/vertical), nodes as `<figure class="cf-node" data-node data-kind data-tone data-state>`, edges `<g class="cf-edge" data-edge>` with track, wire, packet circle. Controls (play, replay, prev, next, scrub, speed), live caption, ordered step list, ELI5/advanced explanation. Frames embedded as JSON.                                         |
| Runtime             | `src/runtime.ts`                                       | Vanilla ES2019 IIFE string, one shared rAF loop. Mount/unmount (`window.ClayFlow`), play/pause/toggle/replay/step, scrub, speed, keyboard (Space, arrows, Home), IntersectionObserver offscreen pause, visibilitychange pause, ResizeObserver layout switch, reduced-motion (step instead of play, packets hidden), listener cleanup on unmount. Packets follow the real SVG path via `getPointAtLength`. |
| Style               | `src/style.ts`                                         | One CSS string (~600 lines): clay surfaces, states, tones, groups, chips, keyframes (pulse/expand/cycle…), reduced-motion block.                                                                                                                                                                                                                                                                          |
| React               | `src/react/ClayFlowDiagram.tsx`, `ClayFlowGallery.tsx` | SSR-safe wrapper (assets injected in layout effect), gallery of ~41 specs at `/clayflow`.                                                                                                                                                                                                                                                                                                                 |
| Tests               | `src/*.test.ts`                                        | 19 files / 152 tests incl. runtime (jsdom), offscreen pause, SSR hydration regression.                                                                                                                                                                                                                                                                                                                    |

## Gaps against the engine brief

1. **Motion tokens** — durations are scattered literals (800 ms frame, CSS transitions); no named activation/lift/transform/connector/packet/group/status/scene tokens.
2. **Per-kind meaningful motion** — every node animates the same way (state class + highlight). No kind-specific motion (agent "thinking", data "filling", money "stacking", launch "lift-off", people "gathering").
3. **Logic semantics** — decision/branch highlight all outgoing edges; there is no way to say _which_ branch is taken, dim the others, iterate a loop edge N times, or show a condition label lighting up.
4. **Connector variants** — no parallel, branching, conditional or feedback connector kinds; feedback edges route like normal edges.
5. **Step vocabulary** — steps cover visible/highlight/packets/states/counters. Missing: transform (node kind/label change), expand/collapse group, annotate (reveal a chip), focus, complete.
6. **Inspect** — nodes are focusable `role="img"` only; no click-to-inspect panel (what, role, inputs, outputs, state, evidence). Node spec has no inputs/outputs/evidence fields.
7. **Control API** — controls are DOM-only; there is no `reset` (to start, paused) and no programmatic handle for React/manual triggers beyond `mount/unmount`.
8. **Illustrative labelling** — no spec flag to mark a diagram as illustrative/sample.
9. **Showcase** — `/clayflow` shows specs but not each component in its states (rest/hover/active/complete/error/reduced) with manual triggers.
10. **Stock Intelligence** — dashboard exists (sample data, labelled) but below reference fidelity; no "How we arrived at a pick" research flow driven by the engine.
11. **Reports** — no Manthan report (daily/weekly/monthly/yearly, story connections, timelines) built on the engine.
12. **Docs** — none for the engine.

## Constraints carried forward

- Extend the existing schema/timeline/runtime; no second engine. Specs valid today must stay valid and render the same.
- SSR-safe string render + vanilla runtime stays the core; React is a thin wrapper.
- Sample data must be visibly labelled; no fabricated metrics or validation stages.
- Reduced motion → final state, no movement. Pause offscreen. No leaks on unmount.
- Verify target: playground dev server `http://localhost:3111`, both themes (`data-theme` dark / `ivory-graphite`), 390 px mobile.
