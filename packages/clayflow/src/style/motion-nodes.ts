/** Node motion communicates work, state changes, and semantic changes. */
export const MOTION_NODES_STYLE = `
.cf-node { transform-origin: center; }
.cf-node.is-focus { outline: 2px solid var(--cf-accent); outline-offset: 3px; }
.cf-node.is-focus-dim,
.cf-node.is-dimmed { opacity: .42; }
.cf-node.is-transforming { animation: cf-clay-remould var(--cf-dur-transform) var(--cf-ease-emphasized) both; }
.cf-node.cf-off { pointer-events: none; }
.cf-node .cf-well { position: relative; }
.cf-node .cf-well { transition: transform var(--cf-dur-activation) var(--cf-ease-emphasized), opacity var(--cf-dur-activation) var(--cf-ease-emphasized); }
.cf-node.cf-off .cf-well { transform: scale(.92); opacity: 0; }
.cf-node .cf-art { position: relative; z-index: 1; transform-origin: center; }
.cf-node.is-highlight .cf-art { animation: cf-highlight-attend var(--cf-dur-lift) var(--cf-ease-standard) both; }

/* Machinery turns into its active position. */
.cf-node[data-motion="mechanism"][data-state="active"] .cf-art {
  animation: cf-gear-engage var(--cf-dur-lift) var(--cf-ease-standard) both;
}

/* Data wells fill only while work is active; success lets the fill settle. */
.cf-node[data-motion="reservoir"] .cf-well::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tone-core, var(--cf-accent)) 68%, white), var(--tone-core, var(--cf-accent)));
  transform: scaleY(0);
  transform-origin: bottom;
}
.cf-node[data-motion="reservoir"][data-state="active"] .cf-well::before {
  animation: cf-well-fill var(--cf-dur-activation) var(--cf-ease-standard) forwards;
}
.cf-node[data-motion="reservoir"][data-state="success"] .cf-well::before {
  transform: scaleY(.72);
  transition: transform var(--cf-dur-status) var(--cf-ease-standard);
}

/* Thinking has a quiet breath and three orbiting dots only while active. */
.cf-node[data-motion="thinking"][data-state="active"] .cf-well {
  animation: cf-thinking-breathe var(--cf-dur-scene) var(--cf-ease-standard) infinite alternate;
}
.cf-node[data-motion="thinking"][data-state="active"] .cf-well::after {
  content: "";
  position: absolute;
  inset: 3px;
  z-index: 0;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--cf-accent) 22%, transparent), transparent 70%);
  opacity: .25;
  animation: cf-thinking-glow var(--cf-dur-scene) var(--cf-ease-standard) infinite alternate;
}
.cf-node[data-motion="thinking"][data-state="active"] .cf-well::before {
  content: "";
  position: absolute;
  z-index: 2;
  width: 3px;
  height: 3px;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  background: var(--cf-accent);
  box-shadow: 0 -15px 0 var(--cf-accent), 13px 8px 0 var(--cf-accent);
  animation: cf-think-orbit var(--cf-dur-scene) var(--cf-ease-standard) infinite;
}

/* People gather on reveal; groups join in a short stagger. */
.cf-node[data-motion="people"] .cf-art,
.cf-node[data-motion="people"] .cf-node-body {
  transition: transform var(--cf-dur-activation) var(--cf-ease-emphasized), opacity var(--cf-dur-activation) var(--cf-ease-emphasized);
}
.cf-node[data-motion="people"].cf-off .cf-art,
.cf-node[data-motion="people"].cf-off .cf-node-body {
  transform: scale(.88);
  opacity: 0;
}
.cf-node[data-motion="people"][data-state="active"] .cf-art {
  animation: cf-people-nod var(--cf-dur-lift) var(--cf-ease-standard) both;
}
.cf-node[data-motion="people"][data-kind="team"] .cf-art,
.cf-node[data-motion="people"][data-kind="organization"] .cf-art {
  transition-delay: var(--cf-dur-status);
}

/* Decisions lean into the selected route; loops mark a single iteration. */
.cf-node[data-motion="logic"][data-state="active"] .cf-art {
  animation: cf-logic-choose var(--cf-dur-activation) var(--cf-ease-standard) both;
}
.cf-node[data-motion="logic"][data-kind="loop"] .cf-well::before {
  content: "";
  position: absolute;
  inset: 5px;
  border: 2px solid var(--cf-accent);
  border-left-color: transparent;
  border-radius: 50%;
  opacity: 0;
}
.cf-node[data-motion="logic"][data-kind="loop"][data-state="active"] .cf-well::before {
  animation: cf-loop-turn var(--cf-dur-packet) var(--cf-ease-standard) both;
}

/* Domain objects each show the change they represent. */
.cf-node[data-motion="coins"][data-state="active"] .cf-art { animation: cf-coins-stack var(--cf-dur-lift) var(--cf-ease-emphasized) both; }
.cf-node[data-motion="coins"] .cf-well::before {
  content: "";
  position: absolute;
  z-index: 2;
  left: calc(50% - 7px);
  bottom: 6px;
  width: 14px;
  height: 4px;
  border-radius: 50%;
  background: var(--tone-core, var(--cf-accent));
  box-shadow: 0 -4px 0 color-mix(in srgb, var(--tone-core, var(--cf-accent)) 72%, white), 0 -8px 0 var(--tone-core, var(--cf-accent));
  transform: translateY(4px);
  opacity: 0;
}
.cf-node[data-motion="coins"][data-state="active"] .cf-well::before { animation: cf-coin-stack var(--cf-dur-lift) var(--cf-ease-emphasized) both; }
.cf-node[data-motion="growth"][data-state="active"] .cf-art { transform-origin: bottom center; animation: cf-growth-rise var(--cf-dur-activation) var(--cf-ease-emphasized) both; }
.cf-node[data-motion="goal"] .cf-well::after { content: ""; position: absolute; inset: 4px; border: 2px solid var(--tone-core, var(--cf-accent)); border-radius: 50%; opacity: 0; transform: scale(1.18); }
.cf-node[data-motion="goal"][data-state="success"] .cf-well::after { animation: cf-goal-tighten var(--cf-dur-status) var(--cf-ease-standard) both; }
.cf-node[data-motion="timeline"][data-state="active"] .cf-art { animation: cf-timeline-tick var(--cf-dur-activation) var(--cf-ease-standard) both; }
.cf-node[data-motion="launch"][data-state="active"] .cf-art { animation: cf-launch-lift var(--cf-dur-lift) var(--cf-ease-emphasized) both; }
.cf-node[data-motion="launch"][data-state="success"] .cf-well::before {
  content: "";
  position: absolute;
  width: 4px;
  height: 14px;
  left: calc(50% - 2px);
  bottom: 2px;
  border-radius: 50%;
  background: linear-gradient(180deg, transparent, var(--tone-core, var(--cf-accent)));
  opacity: 0;
  animation: cf-launch-trail var(--cf-dur-status) var(--cf-ease-exit) both;
}
.cf-node[data-motion="orbit"][data-state="active"] .cf-art { animation: cf-science-orbit var(--cf-dur-scene) var(--cf-ease-standard) both; }
.cf-node[data-motion="education"][data-state="active"] .cf-art { transform-origin: left center; animation: cf-page-turn var(--cf-dur-activation) var(--cf-ease-standard) both; }
.cf-node[data-motion="object"][data-state="active"] .cf-art { animation: cf-object-present var(--cf-dur-lift) var(--cf-ease-standard) both; }
.cf-node[data-motion="status"][data-state="success"] .cf-art { animation: cf-status-settle var(--cf-dur-status) var(--cf-ease-standard) both; }

/* Progress is data-driven. The helper sets --cf-progress only for percent metrics. */
.cf-node[data-motion="progress"] .cf-node-metric { position: relative; }
.cf-node[data-motion="progress"] .cf-node-metric::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 2px;
  border-radius: 2px;
  background: var(--cf-accent);
  transform: scaleX(var(--cf-progress, 0));
  transform-origin: left center;
  transition: transform var(--cf-dur-activation) var(--cf-ease-standard);
}

/* State cues pair shape and glyph with the existing visible label/state text. */
.cf-node[data-state="success"]::after,
.cf-node[data-state="warning"]::after,
.cf-node[data-state="error"]::after,
.cf-node[data-state="pending"]::after,
.cf-node[data-state="disabled"]::after {
  position: absolute;
  top: 2px;
  right: 4px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: var(--cf-surface);
  transform-origin: left center;
  pointer-events: none;
}
.cf-node[data-state="success"]::after { content: "✓"; background: #2f9e6b; animation: cf-status-success var(--cf-dur-status) var(--cf-ease-standard) both; }
.cf-node[data-state="success"] { box-shadow: var(--cf-shadow), 0 0 0 3px rgb(47 158 107 / .18); }
.cf-node[data-state="warning"]::after { content: "!"; background: #d9822b; animation: cf-status-nudge var(--cf-dur-status) var(--cf-ease-standard) both; }
.cf-node[data-state="error"]::after { content: "×"; background: #d0475e; animation: cf-status-shake var(--cf-dur-status) var(--cf-ease-standard) both; }
.cf-node[data-state="pending"]::after { content: "…"; background: #3d8bd9; animation: cf-status-pending var(--cf-dur-scene) var(--cf-ease-standard) infinite; }
.cf-node[data-state="disabled"]::after { content: "–"; background: var(--cf-ink-soft); }

@keyframes cf-gear-engage { 0% { transform: translateY(0) rotate(0); } 70% { transform: translateY(-3px) rotate(90deg); } 100% { transform: translateY(-2px) rotate(90deg); } }
@keyframes cf-well-fill { to { transform: scaleY(.78); } }
@keyframes cf-thinking-breathe { to { transform: translateY(-1px); } }
@keyframes cf-thinking-glow { to { opacity: .8; } }
@keyframes cf-think-orbit { to { transform: rotate(1turn); } }
@keyframes cf-people-nod { 45% { transform: translateY(-3px) scale(1.02); } 100% { transform: translateY(-1px); } }
@keyframes cf-logic-choose { to { transform: rotate(-5deg) translateY(-1px); } }
@keyframes cf-loop-turn { 0% { opacity: 0; transform: rotate(0); } 15%, 85% { opacity: 1; } 100% { opacity: 0; transform: rotate(1turn); } }
@keyframes cf-coins-stack { 0% { transform: translateY(3px); } 65% { transform: translateY(-3px); } 100% { transform: translateY(-2px); } }
@keyframes cf-coin-stack { 0% { opacity: 0; transform: translateY(4px); } 65% { opacity: 1; transform: translateY(-2px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes cf-growth-rise { from { transform: scaleY(.72); } to { transform: scaleY(1); } }
@keyframes cf-goal-tighten { 0% { opacity: 0; transform: scale(1.18); } 50% { opacity: 1; transform: scale(.92); } 100% { opacity: 1; transform: scale(1); } }
@keyframes cf-timeline-tick { 50% { transform: translateX(3px) rotate(8deg); } 100% { transform: translateX(0); } }
@keyframes cf-launch-lift { 60% { transform: translateY(-6px); } 100% { transform: translateY(-4px); } }
@keyframes cf-launch-trail { from { opacity: .8; transform: translateY(-4px) scaleY(.25); } to { opacity: 0; transform: translateY(2px) scaleY(1); } }
@keyframes cf-science-orbit { to { transform: rotate(1turn); } }
@keyframes cf-page-turn { 45% { transform: perspective(60px) rotateY(-22deg); } 100% { transform: none; } }
@keyframes cf-object-present { 55% { transform: translateY(-2px) scale(1.03); } 100% { transform: none; } }
@keyframes cf-status-settle { 55% { transform: scale(1.04); } 100% { transform: none; } }
@keyframes cf-highlight-attend { 48% { transform: translateY(-2px) scale(1.035); } 100% { transform: none; } }
@keyframes cf-status-success { from { transform: scaleX(0); opacity: .65; } to { transform: scaleX(1); opacity: 1; } }
@keyframes cf-status-nudge { 25%, 75% { transform: translateX(-2px); } 50% { transform: translateX(2px); } }
@keyframes cf-status-shake { 20%, 60% { transform: translateX(-2px); } 40%, 80% { transform: translateX(2px); } }
@keyframes cf-status-pending { to { opacity: .45; transform: scale(.88); } }
@keyframes cf-clay-remould { 0% { transform: scale(1); } 38% { transform: scale(1.04, .92); } 72% { transform: scale(.97, 1.03); } 100% { transform: scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .cf-node,
  .cf-node *,
  .cf-node::after,
  .cf-group,
  .cf-group-tab { animation: none !important; transition: none !important; }
  .cf-node[data-motion="reservoir"][data-state="success"] .cf-well::before { transform: scaleY(.72); }
  .cf-node[data-motion="thinking"] .cf-well::before { display: none; }
  .cf-node[data-motion="coins"][data-state="active"] .cf-well::before { opacity: 1; transform: none; }
  .cf-node[data-motion="goal"][data-state="success"] .cf-well::after { opacity: 1; transform: none; }
  .cf-node[data-motion="launch"][data-state="success"] .cf-well::before { opacity: .25; }
}
`;
