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

## Design registry (`@arsenal/themes`)

Switch between N designs at runtime. One typed list; the first entry is the original design
and the fallback for anything unknown. A `?design=` query wins over the saved choice, so a link
opens a specific design.

```ts
import { createDesignRegistry } from "@arsenal/themes";

const designs = createDesignRegistry([
  { id: "editorial", label: "Editorial" },
  { id: "blueprint", label: "Blueprint", plate: "linework", effects: () => import("./crosshair") },
  { id: "broadsheet", label: "Broadsheet", plate: "halftone", hero: () => import("./FrontPage") },
]);
const id = designs.resolveInitial();   // ?design= -> localStorage -> default
designs.apply(id);                     // <html data-design="...">
designs.save(id);                      // when the switcher changes it
```

Copy: `packages/themes/src/designs/registry.ts` and its test. No dependencies; storage and
the root element can be passed in, and blocked storage never throws. Adding design N is one
entry, one skin scoped to `[data-design="<id>"]`, and lazy hooks that cost nothing until
picked.

## EngravingHero (`@arsenal/fx`)

Broadsheet's hero: a procedural wood engraving of a lighthouse over a storm. It prints itself
in line by line on load; the beam follows the pointer with a damped spring and lifts the storm
where it falls.

```tsx
import { EngravingHero } from "@arsenal/fx";

<EngravingHero theme={dark ? "dark" : "light"} reducedMotion={reduced}
  style={{ width: "100%", aspectRatio: "7 / 5" }} />
```

Colours come from `ink` or, by default, from `--color-ink`, `--color-bg` and `--color-accent`
on the canvas (`inkVars` renames them). Copy: `packages/fx/src/engraving/engraving.ts` (pure
geometry and two painters) and `EngravingHero.tsx` (the canvas binding). The site keeps its
dateline and caption around it. Pauses offscreen, ignores touch, and draws the finished print
at once under reduced motion.

## Chapter scenes (`@arsenal/fx`)

One procedural picture per chapter (horizon, about, experience, projects, writing, learning,
contact) as a tone field, so print designs get their own art instead of filtering photographs.
The same field feeds two media: `cutRibbons` engraves it (Broadsheet), `contours` traces it as
survey lines (Blueprint). Deterministic, subjects right of centre, `Spot`s mark where an accent
belongs.

```ts
import { chapterScene, cutRibbons, contours, contourLevels, paintRibbons } from "@arsenal/fx";
const scene = chapterScene("about", 16 / 9);
paintRibbons(ctx, cutRibbons(scene, { spacing: 0.0085, step: 0.0025 }), ink); // engraving
const lines = contours(chapterScene("about", 16 / 9, 0.3), 0.5, 420, 236); // [x1,y1,x2,y2][]
// Several levels: sample the field once and trace each, not one contours() call per level.
const survey = contourLevels(chapterScene("about", 16 / 9, 0.3), [0.2, 0.5, 0.8], 420, 236);
```

Draw in unit space (`ctx.setTransform(h, 0, 0, h, 0, 0)`). Tips from the site: map the faintest
tones to paper (`(tone - 0.18) / 0.82`) and feather the edges so the cut never prints as a grey
block; soften the field by a fraction of a grid cell before `contours` so thin wires close into
outlines. Copy: `packages/fx/src/engraving/chapterScenes.ts` with `engraving.ts` and the test.
