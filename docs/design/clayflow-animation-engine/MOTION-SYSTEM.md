# ClayFlow motion system

Motion explains the diagram's state. Activation identifies the active element, lift gives a node tactile feedback, transforms communicate a semantic change, connector transitions clarify route state, packets show direction and transfer, group states show containment changes, status transitions make outcomes readable, and scene duration gives captions time to be read.

The defaults and ranges live in `src/motion/tokens.ts`. The standard easing is for ordinary transitions, emphasized easing for arrivals, and exit easing for departures. The CSS variables are scoped to `.cf`, so changing a theme during playback does not require JavaScript state changes.

When `prefers-reduced-motion: reduce` is active, durations become zero, playback resolves to the final frame, and packets do not travel. The runtime also pauses when the document is hidden or the diagram is offscreen. Essential information is available in labels, states and the inspect panel; it is not conveyed through motion or hover alone.
