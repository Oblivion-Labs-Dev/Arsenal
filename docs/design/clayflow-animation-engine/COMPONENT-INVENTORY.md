# ClayFlow component inventory

Each node kind receives its motion family from `src/motion/kind-motion.ts`, using its catalog family as the default and refining kinds with specific semantics. Motion uses the scoped duration and easing tokens in `src/motion/tokens.ts`; all state-driven loops stop when their state stops applying.

| Kind | Motion family | What the motion communicates |
| --- | --- | --- |
| `process` | mechanism | Active work engages like a turning gear and lifts into place. |
| `data` | reservoir | The data well fills while work is active and settles on success. |
| `agent` | thinking | Active reasoning breathes softly with three orbiting dots; both stop when thinking ends. |
| `user` | people | A person gathers into view and gives a small nod while active. |
| `system` | mechanism | Active system work engages like a turning gear and lifts. |
| `service` | mechanism | Active service work engages like a turning gear and lifts. |
| `database` | reservoir | The data well fills while active and holds a settled fill on success. |
| `tool` | mechanism | Active tool work engages like a turning gear and lifts. |
| `document` | reservoir | The document well fills to show data being received and settles on success. |
| `cloud` | mechanism | Active infrastructure work engages and lifts into place. |
| `decision` | logic | Active art leans toward the selected route; dimmed alternatives stay subdued. |
| `branch` | logic | Active art leans toward the selected branch; dimmed alternatives stay subdued. |
| `condition` | logic | Active art leans toward the evaluated route; dimmed alternatives stay subdued. |
| `loop` | logic | The active loop draws one rotating ring for the packet iteration. |
| `retry` | logic | Active retry logic engages; dimmed routes remain visually secondary. |
| `parallel` | logic | Active fan-out engages to mark concurrent work. |
| `merge` | logic | Active fan-in engages to mark work rejoining. |
| `success` | status | A check draws in with a success cue while its label and state remain visible. |
| `fail` | status | Error state uses a brief shake and a visible cross cue. |
| `media` | reservoir | The well fills to show content arriving and settles on success. |
| `knowledge` | reservoir | The well fills to show stored information arriving and settles on success. |
| `code` | reservoir | The well fills to show code entering the execution surface and settles on success. |
| `api` | reservoir | The well fills to show a response arriving and settles on success. |
| `queue` | reservoir | The well fills to show queued data arriving and settles on success. |
| `cache` | reservoir | The cache well fills while active and settles on success. |
| `ai` | thinking | Active reasoning breathes softly with three orbiting dots; both stop when thinking ends. |
| `finance` | coins | Active financial value stacks with a short, upward coin motion. |
| `science` | orbit | Active science art completes one orbit to show a cycle of investigation. |
| `health` | orbit | Active health art completes one orbit to show a measured cycle. |
| `learning` | education | Active learning art turns like a page to mark a new lesson. |
| `business` | people | The business entity gathers into view and gives a small active nod. |
| `money` | coins | Active value stacks with a short, upward coin motion. |
| `technology` | orbit | Active technology art completes one orbit to show a system cycle. |
| `growth` | growth | Active growth art rises from its base. |
| `goal` | goal | Success tightens the goal ring to show completion. |
| `launch` | launch | Active launch art lifts; success leaves a short, soft trail. |
| `person` | people | A person gathers into view and gives a small nod while active. |
| `team` | people | Team artwork and its label gather into view in a brief stagger, then nod while active. |
| `organization` | people | Organization artwork and its label gather into view in a brief stagger, then nod while active. |
| `institution` | people | The institution gathers into view and gives a small active nod. |
| `education` | education | Active education art turns like a page to mark a new lesson. |
| `general` | object | Active general concepts rise slightly to mark attention. |
| `progress-ring` | progress | Progress is represented by the displayed value; percent metric fills use the supplied value. |
| `progress-bar` | progress | Progress is represented by the displayed value; percent metric fills use the supplied value. |
| `gauge` | progress | The displayed metric remains the source of truth; no value is fabricated. |
| `counter` | progress | Runtime-updated counters remain the source of truth and are not replaced by a guessed value. |
| `timeline` | timeline | Active art advances one tick to mark the current milestone. |
| `metric` | progress | Runtime-updated metric values remain the source of truth; percent fill is opt-in via `setMetricProgress`. |

`setMetricProgress(element, value, unit)` sets `--cf-progress` only when `unit` is `%`, normalizing the supplied percentage to `0–1`. The runtime should call it when applying counter values to percent metrics. It deliberately does not infer progress for other units.

Status cues apply to nodes in any motion family: success draws a check, warning nudges once, error shakes no more than two cycles, pending pulses only while pending, and disabled nodes show a dash and remain desaturated. Existing node labels and any annotation text remain visible. Reduced motion disables movement and animation while retaining final state cues.

## Connectors

- Straight, curved, and orthogonal wires draw in with the connector duration token. Active wires use the accent token and show a clay packet.
- Dashed wires march only while active. Bidirectional edges render a reverse packet marker and arrowheads at both ends.
- Parallel-kind edges route with symmetric 6 px offsets. Branch edges share the source port; untaken branches remain dashed and dim with a “Not taken” label.
- Conditional edges carry an SVG pill on the wire. The active state lights the pill and reveals its check mark.
- Feedback edges use an outward return arc beyond the connected node pair. Reduced motion shows the complete wire and active state without packets or animation.
- Motion and presentation styles live in `src/style/motion-edges.ts`; route geometry lives in `src/route.ts`; SVG output lives in the edge block in `src/render.ts`.
