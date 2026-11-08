# Accessibility QA

Checked in Chrome on the engine dev server, on `/clayflow/showcase`, `/reports` and `/stock-intelligence`.

- **Reduced motion.** One stylesheet (`src/style/motion-reduced.ts`) covers both
  `prefers-reduced-motion: reduce` and `html.force-reduced`. It is appended last so it wins.
  - Durations drop to zero, playback resolves to the final frame, and packets do not travel.
  - The showcase "Reduced" state button exercises this path, and the final state is fully readable.
- **Meaning without motion or colour.**
  - Status chips carry a word and a glyph, not colour alone.
  - Branch states dim the alternatives but keep them labelled.
  - Condition pills carry text.
- **Text alternative.** `renderClayFlow()` emits static-first HTML with accessible text for each
  diagram. Captions are live text, not canvas.
- **Inspect.** Clicking a node opens a panel with its role, inputs, outputs and note, so no detail
  depends on hover.
- **Controls.** Play/pause, step, seek and speed are real, labelled buttons. Keyboard focus is visible
  in both themes.
- **Illustrative data.** Every sample diagram shows an "Illustrative" badge. No stock metric is
  invented; unknown values stay visibly unknown.
- **Offscreen and hidden tabs.** The runtime pauses while the document is hidden or the diagram is
  offscreen.

Not done yet (follow-ups): a screen-reader pass with NVDA or VoiceOver, and an automated axe run.
