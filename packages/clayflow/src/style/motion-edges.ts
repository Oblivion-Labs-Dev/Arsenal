/** Connector motion and state styling. Values are exposed as ClayFlow tokens for theme overrides. */
export const MOTION_EDGES_STYLE = `
.cf {
  --cf-edge-width: 2.5px;
  --cf-edge-active-width: 3.25px;
  --cf-edge-track-opacity: .6;
  --cf-edge-dim-opacity: .3;
  --cf-edge-dash: 6px 5px;
  --cf-edge-dim-dash: 4px 5px;
  --cf-edge-label-size: 11.5px;
  --cf-edge-march-distance: -11px;
  --cf-edge-packet-glow: 0 0 4px var(--cf-accent);
}
.cf-edge-track {
  fill: none;
  stroke: var(--cf-line);
  stroke-width: var(--cf-edge-width);
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: var(--cf-edge-track-opacity);
}
.cf-edge:not(.cf-off) .cf-edge-wire {
  stroke-width: var(--cf-edge-width);
  stroke-dasharray: var(--cf-edge-length);
  stroke-dashoffset: var(--cf-edge-length);
  animation: cf-edge-draw var(--cf-dur-connector) var(--cf-ease-standard) forwards;
}
.cf-edge.cf-off .cf-edge-wire { stroke-dashoffset: var(--cf-edge-length); animation: none; }
.cf-edge[data-dashed="true"] .cf-edge-wire {
  stroke-dasharray: var(--cf-edge-dash);
  stroke-dashoffset: 0;
  animation: none;
}
.cf-edge[data-dashed="true"].is-active .cf-edge-wire {
  animation: cf-edge-march var(--cf-dur-packet) linear infinite;
}
.cf-edge.is-active .cf-edge-wire {
  stroke-width: var(--cf-edge-active-width);
}
.cf-edge[data-kind="parallel"] .cf-edge-wire { stroke-width: var(--cf-edge-width); }
.cf-edge[data-kind="parallel"].is-active .cf-edge-wire { stroke-width: var(--cf-edge-active-width); }
.cf-edge.is-dimmed {
  opacity: var(--cf-edge-dim-opacity);
}
.cf-edge.is-dimmed .cf-edge-wire {
  stroke-dasharray: var(--cf-edge-dim-dash);
  stroke-dashoffset: 0;
  animation: none;
}
.cf-edge.is-dimmed.is-active .cf-edge-wire { stroke: var(--cf-accent); }
.cf-edge-condition { opacity: .72; transition: opacity var(--cf-dur-activation) var(--cf-ease-standard); }
.cf-edge-condition-pill { fill: var(--cf-surface); stroke: var(--cf-line); stroke-width: var(--cf-edge-width); }
.cf-edge-condition-text, .cf-edge-condition-check, .cf-edge-not-taken {
  fill: var(--cf-ink-soft);
  font-size: var(--cf-edge-label-size);
  font-weight: 600;
}
.cf-edge-condition-check { opacity: 0; fill: var(--cf-accent); }
.cf-edge.is-active .cf-edge-condition { opacity: 1; }
.cf-edge.is-active .cf-edge-condition-pill { stroke: var(--cf-accent); }
.cf-edge.is-active .cf-edge-condition-check { opacity: 1; }
.cf-edge.is-active .cf-edge-condition-text { fill: var(--cf-ink); }
.cf-edge-not-taken { display: none; }
.cf-edge.is-dimmed[data-kind="branch"] .cf-edge-not-taken { display: block; }
.cf-packet {
  fill: var(--cf-accent);
  stroke: var(--cf-surface);
  stroke-width: var(--cf-edge-width);
  filter: drop-shadow(var(--cf-edge-packet-glow));
}
@keyframes cf-edge-draw { to { stroke-dashoffset: 0; } }
@keyframes cf-edge-march { to { stroke-dashoffset: var(--cf-edge-march-distance); } }
.force-reduced .cf-edge:not(.cf-off) .cf-edge-wire { stroke-dasharray: none; stroke-dashoffset: 0; animation: none !important; }
.force-reduced .cf-edge[data-dashed="true"] .cf-edge-wire { stroke-dasharray: var(--cf-edge-dash); }
.force-reduced .cf-packet { display: none !important; }
@media (prefers-reduced-motion: reduce) {
  .cf-edge:not(.cf-off) .cf-edge-wire { stroke-dasharray: none; stroke-dashoffset: 0; animation: none; }
  .cf-edge[data-dashed="true"] .cf-edge-wire { stroke-dasharray: var(--cf-edge-dash); }
  .cf-packet { display: none; }
  .cf-edge.is-active .cf-edge-wire { stroke: var(--cf-accent); stroke-width: var(--cf-edge-active-width); }
}
`;
