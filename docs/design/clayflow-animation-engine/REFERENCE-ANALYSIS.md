# Reference analysis

Three owner-supplied boards set the target look: _Manthan ClayFlow Component Library_, _Manthan Reports
Unified Design System Board_ and _Manthan Stock Intelligence Dashboard_ (kept outside the repo, in the
owner's Downloads folder).

## What the boards ask for

- **Material.** Soft clay: rounded 18–24 px tiles, inner highlight on the top edge, a low warm shadow, pastel
  fills (lavender, sky, peach, mint, rose) on a near-white lavender paper in light mode. Icons are small 3D
  objects, not line glyphs. ClayFlow approximates this with layered gradients and inset shadows on `.cf-well`
  rather than raster art, so the nodes stay crisp, themeable and light.
- **Catalogue structure.** Nodes (process, data, agent, user, system, service), decision and logic (decision,
  branch, loop, condition), connectors (flow, curved, alternative/dashed, bidirectional, parallel), groups
  (group, module, system boundary, section), data and content, status and annotations, progress and metrics,
  objects (money, science, technology, growth, goal, timeline, launch), people and entities, animation
  presets, themes. Every family maps to a node kind and a motion family (`COMPONENT-INVENTORY.md`).
- **Connectors.** A coloured bead at the source, a rounded wire, a chevron head; bidirectional shows two heads
  in two colours; parallel fans into two lanes. This is why packets are clay beads and why bidirectional and
  parallel edges get their own packet behaviour.
- **Status.** Pill chips with a coloured glyph _and_ a word (Success, Pending, Error, Info, Warning, New), so
  meaning never relies on colour alone.
- **Presets.** Data flow, step reveal, pulse, expand, cycle: the `animation.preset` values in `src/schema.ts`, compiled by `src/timeline.ts`.
- **Reports and stock boards.** Editorial reading layout with a calm hierarchy, a segmented period switch, a
  hero summary card, and dashboards whose numbers sit in compact cards with sparklines. Their ClayFlow
  diagrams sit inside cards rather than as full-bleed canvases.

## Deliberate departures

- Dark mode is the default theme and is not on the boards. It uses deep layered violet with light pools,
  following the owner's dark-mode rule; the light theme (`ivory-graphite`) follows the boards.
- No 3D raster icons: SVG/CSS glyphs keep the bundle small and both themes consistent.
- Stock data is never invented: sample figures are labelled as sample, and unknown values stay visibly unknown.
