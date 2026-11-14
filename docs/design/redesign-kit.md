# Redesign kit

Pieces lifted from the amsborse.github.io redesign (the Blueprint and Broadsheet designs) so other
products can reuse them. Each one can be used two ways:

- **Import** it from its workspace package.
- **Lift and shift**: copy the listed files into your project. Every file starts with a header
  comment naming its origin in the redesign and what to copy with it.

None of them hard-code product selectors or data: selectors, colours and content come in as
options, props or CSS custom properties (each with a fallback).

## PrintPlate (`@arsenal/fx`)

Redraws a photo once as a two-screen newsprint halftone or as Sobel linework on a canvas.

```ts
import { PrintPlate } from '@arsenal/fx';
import '@arsenal/fx/print-plate.css';
```

Copy: `packages/fx/src/print/PrintPlate.tsx`, `plate-art.ts`, `print-plate.css`.
The pure helpers (`luminance`, `warmth`, `sobel`, `halftone`, `edgeAlpha`, `drawHalftone`,
`drawLinework`, `loadImage`) are exported for your own canvases. Colours come from `ink`/`accent`
props, or from the custom properties named by `inkVar`/`accentVar`. The canvas exposes
`data-ready="false" | "true" | "failed"`; load failures are logged with `console.error`.

## Crosshair cursor (`@arsenal/motion`)

Two hairlines and an X/Y readout following a fine pointer.

```ts
import { mountCrosshairCursor } from '@arsenal/motion';
import '@arsenal/motion/crosshair-cursor.css';
const stop = mountCrosshairCursor({ formatLabel: (x, y) => `${x}, ${y}` });
```

Copy: `packages/motion/src/crosshair-cursor.ts`, `crosshair-cursor.css` (and `motion-gate.ts`,
or swap its import for a `prefers-reduced-motion` media query check). Options: `classPrefix`,
`formatLabel`, `zIndex`, `container`.

## TechnicalSheet (`@arsenal/sections`)

An architecture drawn as a self-drawing engineering sheet: nodes, request and response arrows,
telemetry, row labels, a dimension line, a title block and packets walking a trip.

```ts
import { TechnicalSheet, validateTechnicalSheet } from '@arsenal/sections';
import '@arsenal/sections/technical-sheet.css';
import '@arsenal/motion/draw-in.css';
```

Copy: `packages/sections/src/technical-sheet.tsx`, `technical-sheet.css`, plus from motion
`path-packets.tsx`, `use-pause-svg-offscreen.ts`, `motion-gate.ts`, `draw-in.css`.
All geometry and text are props; `validateTechnicalSheet` (also run by the component) throws on
duplicate ids, unknown trip legs, non-finite coordinates and bad sizes. Theme it with
`--arsenal-tsheet-accent | -ink | -ink-soft | -bg | -rule | -failed | -font`, which fall back to
`--color-*` / `--font-mono` tokens.

## Print interactions (`@arsenal/motion`)

Headings rise in once on entering the viewport; underlines grow from the side the pointer
entered; CSS motion pauses while the tab is hidden.

```ts
import { mountPrintInteractions } from '@arsenal/motion';
import '@arsenal/motion/print-interactions.css';
const stop = mountPrintInteractions({ headingSelector: 'article h2' });
```

Copy: `packages/motion/src/print-interactions.ts`, `print-interactions.css`. Every selector,
class and custom property is an option (`PRINT_INTERACTION_DEFAULTS` lists the defaults).

## SVG motion helpers (`@arsenal/motion`)

`PathPackets` / `packetTimings` (packets that walk a list of paths in turn),
`usePauseSvgOffscreen` / `pauseSvgOffscreen` (pause SMIL while off screen) and `draw-in.css`
(`.arsenal-draw-in` for `pathLength="1"` ink, `--late` variant). Copy the matching file.

## Design token skins (`@arsenal/themes`)

Blueprint (dark drafting sheet, cyan ink, light variant) and Broadsheet (warm newsprint,
vermilion, Didot, dark variant) as opt-in token sets. Values are copied verbatim from the
redesign.

```ts
import { designSkinAttributes } from "@arsenal/themes";
import "@arsenal/themes/designs/blueprint.css";

<html {...designSkinAttributes("blueprint")}>          // default mode (dark)
<html {...designSkinAttributes("blueprint", "light")}> // the other mode
```

Copy: `packages/themes/src/designs/blueprint.css` / `broadsheet.css` (and `designs/index.ts` for
the metadata and helper). Nothing changes until `data-design="<id>"` is set on `<html>` or a
container; there are no `:root` or element rules. `DESIGN_TOKEN_SKINS` describes each skin.

**Tokens only.** On the site, the full skins also restyle these selectors (exported as
`DESIGN_SKIN_SITE_SELECTORS`). Map your own components onto them if you port a full skin:

- Chrome: `.site-header`, `.site-footer`, `.site-brand__*`, `.nav-item`, `.chapter-rail__*`
- Headings: `.chapter-title`, `.chapter-lede`, `.chapter-eyebrow`, `main h2`
- Hero: `.hero-section`, `.hero-copy`, `.hero-heading`, `.hero-body`, `.hero-primary-cta`,
  `.hero-proof-strip`, `.page-stage*`
- Content: `.editorial-card`, `.hub-card-enter`, `.project-case*`, `.study`,
  `.showcase-chapter*`, `.essays`, `.essay*`, `.about-content`, `.about-connect-row`,
  `.article-reading__header`, `.article-cover`
- Atmosphere: `.sky`, `.sky-field`, `.cosmic-background`, `.page-depth`,
  `body::before`, `body::after`

## Not ported here

- **The design registry** (switching between designs at runtime) and **the Broadsheet engraving
  hero** are still being built on the site and will be ported from there once stable.
