# Visual QA

Every pass ran in the real app: the Next dev server on the engine worktree, in Chrome, in both themes
(`deep-forge` dark and `ivory-graphite` light). Chrome automation could not resize the window, so the
390 px checks used a same-origin iframe that is 390 px wide.

## Pass 1: showcase

- **Empty connector cards.** The connector cards were rendering empty wires. Fixed in `20d1024`:
  `@arsenal/clayflow` now exports the showcase specs, built with a real connector builder
  (test: `showcase-specs.test.ts`).
- **Card overflow.** Cards overflowed at narrow widths. `.showcase-card .cf-stage { min-width: 0 }`
  now lets the stages shrink.
- **Flat backgrounds.** Replaced with layered gradients in both themes.

## Pass 2: interaction stress

- **State buttons.** Every state card, including Reduced, reaches the correct final frame.
- **Mounting.** Mounting and unmounting all 34 diagrams repeatedly, plus rapid play/pause, gave no
  console errors.
- **Theme toggling.** Rapid toggling raised a Next overlay error:
  `AbortError: Transition was skipped`.
  - Cause: the view transition helpers handled the `finished` promise but not `ready` or
    `updateCallbackDone`.
  - Fix: `packages/motion`, commit `bfbf7c1`, with a jsdom regression test that failed before the fix.
  - Re-check: six rapid toggles gave no console errors and no overlay.

## Pass 3: 390 px

- **`/clayflow/showcase`.** No horizontal overflow; connector cards sit in two columns.
- **`/reports` (dark).** The entity map's right node was clipped: the canvas was 416 px wide inside a
  341 px card with `overflow-x: hidden`.
  - Fix: commit `415444a` lets the stage shrink. The test in
    `apps/playground/lib/mobile-overflow.test.ts` failed before the fix.
  - Result: the canvas now measures 341 px, matching the card.
- **`/stock-intelligence` (light).** No overflow; the illustrative labels are present.

## Known minor issues

- In the state cards, the node sits about 19 px left of centre. Left as is.
- On `/stock-intelligence`, the Manthan sidebar can overlap the content at some widths (follow-up).
