export const CLAYFLOW_STYLE = `
.cf {
  --cf-canvas: #f6f1ea;
  --cf-surface: #fffdf9;
  --cf-surface-2: #f1ebf7;
  --cf-ink: #2a2540;
  --cf-ink-soft: #5b5573;
  --cf-accent: #6d4fe6;
  --cf-line: #cfc4e6;
  --cf-shadow: 0 10px 24px -12px rgb(60 40 120 / .28), 0 2px 4px rgb(60 40 120 / .08);
  --cf-radius: 18px;
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 24px 0;
  padding: 0;
  background: var(--cf-canvas);
  background-image: radial-gradient(circle at 12% 18%, rgb(255 255 255 / .8) 0%, transparent 60%);
  border-radius: 20px;
  border: 1px solid var(--cf-line);
  box-shadow: var(--cf-shadow);
  color: var(--cf-ink);
  font-family: inherit;
  box-sizing: border-box;
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .cf {
    --cf-canvas: #141225;
    --cf-surface: #24203f;
    --cf-surface-2: #2d2850;
    --cf-ink: #f2effa;
    --cf-ink-soft: #bfb8d9;
    --cf-accent: #a48bff;
    --cf-line: #4b437a;
    --cf-shadow: 0 14px 30px -14px rgb(0 0 0 / .6), 0 0 0 1px rgb(255 255 255 / .04) inset;
    background-image: radial-gradient(circle at 10% 15%, rgb(123 92 240 / .22) 0%, transparent 65%), linear-gradient(180deg, #141225 0%, #1c1836 100%);
  }
}

:root[data-theme="dark"] .cf {
  --cf-canvas: #141225;
  --cf-surface: #24203f;
  --cf-surface-2: #2d2850;
  --cf-ink: #f2effa;
  --cf-ink-soft: #bfb8d9;
  --cf-accent: #a48bff;
  --cf-line: #4b437a;
  --cf-shadow: 0 14px 30px -14px rgb(0 0 0 / .6), 0 0 0 1px rgb(255 255 255 / .04) inset;
  background-image: radial-gradient(circle at 10% 15%, rgb(123 92 240 / .22) 0%, transparent 65%), linear-gradient(180deg, #141225 0%, #1c1836 100%);
}

.cf:focus-visible {
  outline: 2px solid var(--cf-accent);
  outline-offset: 3px;
}

.cf[data-topic] { --cf-accent: var(--cf-topic-accent); }
.cf-group-section { border-style: solid; border-color: color-mix(in srgb, var(--cf-accent) 52%, var(--cf-line)); background: color-mix(in srgb, var(--cf-accent) 9%, transparent); }
.cf-chip-new { color: var(--cf-accent); font-weight: 700; }
.cf-chip-new .cf-chip-icon { background: var(--cf-accent); }
.cf[data-cf-preset="pulse"] .cf-node.is-highlight { animation: cf-pulse 1.4s ease-in-out infinite alternate; }
.cf[data-cf-preset="expand"] .cf-node.is-highlight { animation: cf-expand 1.4s cubic-bezier(.22,1,.36,1) infinite alternate; }
.cf[data-cf-preset="cycle"] .cf-edge.is-active .cf-edge-wire { stroke-dasharray: 8 7; animation: cf-cycle 1.3s linear infinite; }
.force-reduced .cf[data-cf-preset] .cf-node.is-highlight, .force-reduced .cf[data-cf-preset] .cf-edge.is-active .cf-edge-wire { animation: none !important; }
@keyframes cf-pulse { to { box-shadow: var(--cf-shadow), 0 0 0 5px color-mix(in srgb, var(--cf-accent) 32%, transparent); } }
@keyframes cf-expand { to { transform: scale(1.045); } }
@keyframes cf-cycle { to { stroke-dashoffset: -30; } }

.cf-canvas {
  position: relative;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
}

@media (max-width: 480px) {
  .cf-canvas { padding: 8px; }
}

.cf-stage {
  position: relative;
  width: 100%;
  margin: 0 auto;
  height: auto;
  box-sizing: border-box;
  container-type: inline-size;
  min-width: calc(var(--cf-w) * 0.72px);
  --u: calc(100cqw / var(--cf-w));
}

.cf-stage[hidden] {
  display: none !important;
}

.cf-edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  z-index: 10;
}

.cf-edge-track {
  fill: none;
  stroke: var(--cf-line);
  stroke-width: 2.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.6;
}

.cf-edge-wire {
  fill: none;
  stroke: var(--cf-line);
  stroke-width: 2.5px;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: var(--cf-line);
  transition: stroke 0.3s cubic-bezier(.22,.8,.24,1), color 0.3s cubic-bezier(.22,.8,.24,1);
}

.cf-edge[data-dashed="true"] .cf-edge-track,
.cf-edge[data-dashed="true"] .cf-edge-wire {
  stroke-dasharray: 6 5;
}

.cf-edge.is-active .cf-edge-wire {
  stroke: var(--cf-accent);
  color: var(--cf-accent);
}

.cf-edge-label {
  font-size: 11.5px;
  font-weight: 500;
  fill: var(--cf-ink-soft);
  paint-order: stroke;
  stroke: var(--cf-canvas);
  stroke-width: 3px;
  stroke-linejoin: round;
}

.cf-packet {
  fill: var(--cf-accent);
  filter: drop-shadow(0 2px 5px var(--cf-accent));
  transition: opacity 0.2s ease;
}

.cf-group {
  position: absolute;
  border-radius: calc(16*var(--u));
  border: 1px dashed var(--cf-line);
  background: color-mix(in srgb, var(--cf-surface-2) 40%, transparent);
  box-sizing: border-box;
  pointer-events: none;
}

.cf-group-tab {
  position: absolute;
  top: calc(6*var(--u));
  left: calc(12*var(--u));
  font-size: calc(11*var(--u));
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--cf-ink-soft);
  padding: calc(2*var(--u)) calc(8*var(--u));
  background: var(--cf-surface-2);
  border-radius: calc(6*var(--u));
}

.cf-node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: calc(10*var(--u));
  padding: calc(8*var(--u)) calc(12*var(--u));
  margin: 0;
  border-radius: var(--cf-radius);
  background: var(--cf-surface);
  border: 1px solid color-mix(in srgb, var(--cf-line) 70%, transparent);
  box-shadow: var(--cf-shadow), inset 0 1px 1px rgb(255 255 255 / .6);
  box-sizing: border-box;
  z-index: 20;
  cursor: pointer;
  transition: transform 0.28s cubic-bezier(.22,.8,.24,1), box-shadow 0.28s cubic-bezier(.22,.8,.24,1), border-color 0.28s ease, opacity 0.6s cubic-bezier(.22,.8,.24,1);
}

.cf-node:hover,
.cf-node:focus-visible {
  transform: translateY(-2px);
  box-shadow: var(--cf-shadow), 0 6px 14px -4px rgb(60 40 120 / .35);
  outline: none;
}

.cf-node:focus-visible {
  outline: 2px solid var(--cf-accent);
  outline-offset: 2px;
}

.cf-shape-diamond {
  border-radius: calc(14*var(--u));
}

.cf-shape-pill {
  border-radius: 999px;
  padding: calc(6*var(--u)) calc(14*var(--u));
}

.cf-shape-ring {
  border-radius: 999px;
  padding: calc(8*var(--u));
}

/* Tones */
.cf-node[data-tone="violet"] { --tone-body: #ece6ff; --tone-core: #7b5cf0; }
.cf-node[data-tone="sky"]    { --tone-body: #e3f1ff; --tone-core: #3d8bd9; }
.cf-node[data-tone="mint"]   { --tone-body: #e2f6ec; --tone-core: #2f9e6b; }
.cf-node[data-tone="peach"]  { --tone-body: #ffeedd; --tone-core: #d9822b; }
.cf-node[data-tone="rose"]   { --tone-body: #ffe4e8; --tone-core: #d0475e; }
.cf-node[data-tone="sand"]   { --tone-body: #f4ede2; --tone-core: #9a7b4f; }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .cf-node[data-tone="violet"] { --tone-body: #2b224d; --tone-core: #a48bff; }
  :root:not([data-theme="light"]) .cf-node[data-tone="sky"]    { --tone-body: #1c2b44; --tone-core: #68aff0; }
  :root:not([data-theme="light"]) .cf-node[data-tone="mint"]   { --tone-body: #183327; --tone-core: #42c286; }
  :root:not([data-theme="light"]) .cf-node[data-tone="peach"]  { --tone-body: #3d2c1d; --tone-core: #f59e42; }
  :root:not([data-theme="light"]) .cf-node[data-tone="rose"]   { --tone-body: #3c1e26; --tone-core: #eb6078; }
  :root:not([data-theme="light"]) .cf-node[data-tone="sand"]   { --tone-body: #302921; --tone-core: #c4a16e; }
}

:root[data-theme="dark"] .cf-node[data-tone="violet"] { --tone-body: #2b224d; --tone-core: #a48bff; }
:root[data-theme="dark"] .cf-node[data-tone="sky"]    { --tone-body: #1c2b44; --tone-core: #68aff0; }
:root[data-theme="dark"] .cf-node[data-tone="mint"]   { --tone-body: #183327; --tone-core: #42c286; }
:root[data-theme="dark"] .cf-node[data-tone="peach"]  { --tone-body: #3d2c1d; --tone-core: #f59e42; }
:root[data-theme="dark"] .cf-node[data-tone="rose"]   { --tone-body: #3c1e26; --tone-core: #eb6078; }
:root[data-theme="dark"] .cf-node[data-tone="sand"]   { --tone-body: #302921; --tone-core: #c4a16e; }

.cf-well {
  width: calc(44*var(--u));
  height: calc(44*var(--u));
  border-radius: calc(12*var(--u));
  background: var(--tone-body, var(--cf-surface-2));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 2px 4px rgb(0 0 0 / .08), 0 1px 2px rgb(255 255 255 / .6);
  overflow: hidden;
}

.cf-art {
  width: calc(36*var(--u));
  height: calc(36*var(--u));
  object-fit: contain;
  pointer-events: none;
}

.cf-art-fallback {
  width: calc(14*var(--u));
  height: calc(14*var(--u));
  border-radius: 50%;
  background: var(--tone-core, var(--cf-accent));
}

.cf-node-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.cf-node-label {
  font-size: calc(13.5*var(--u));
  font-weight: 600;
  line-height: 1.25;
  color: var(--cf-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cf-node-meta {
  font-size: calc(11.5*var(--u));
  font-weight: 500;
  line-height: 1.2;
  color: var(--cf-ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: calc(2*var(--u));
}

.cf-node-metric {
  display: inline-flex;
  align-items: baseline;
  gap: calc(3*var(--u));
  margin-top: calc(3*var(--u));
  font-size: calc(12*var(--u));
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--cf-accent);
}

.cf-metric-unit, .cf-metric-label {
  font-size: calc(10.5*var(--u));
  font-weight: 500;
  color: var(--cf-ink-soft);
}

/* Node States */
.cf-node[data-state="active"] {
  border-color: var(--cf-accent);
  box-shadow: var(--cf-shadow), 0 0 0 2px var(--cf-accent);
  transform: translateY(-2px);
}

.cf-node[data-state="success"] {
  border-color: #2f9e6b;
  box-shadow: var(--cf-shadow), 0 0 0 2px #2f9e6b;
}

.cf-node[data-state="warning"] {
  border-color: #d9822b;
  box-shadow: var(--cf-shadow), 0 0 0 2px #d9822b;
}

.cf-node[data-state="error"] {
  border-color: #d0475e;
  box-shadow: var(--cf-shadow), 0 0 0 2px #d0475e;
}

.cf-node[data-state="pending"] {
  opacity: 0.82;
  border-style: dashed;
}

.cf-node[data-state="disabled"] {
  opacity: 0.45;
  filter: grayscale(0.85);
  pointer-events: none;
}

.cf-node[data-state="selected"] {
  outline: 2px solid var(--cf-accent);
  outline-offset: 3px;
}

/* Annotations & Chips */
.cf-chip {
  position: absolute;
  transform: translate(-50%, -100%);
  display: inline-flex;
  align-items: center;
  gap: calc(5*var(--u));
  padding: calc(3*var(--u)) calc(9*var(--u));
  border-radius: calc(12*var(--u));
  background: var(--cf-surface);
  border: 1px solid var(--cf-line);
  box-shadow: 0 4px 12px -2px rgb(60 40 120 / .2);
  font-size: calc(11.5*var(--u));
  font-weight: 500;
  color: var(--cf-ink);
  z-index: 25;
  white-space: nowrap;
}

.cf-chip-icon {
  width: calc(6*var(--u));
  height: calc(6*var(--u));
  border-radius: 50%;
  background: var(--cf-accent);
}

.cf-chip-success .cf-chip-icon { background: #2f9e6b; }
.cf-chip-warning .cf-chip-icon { background: #d9822b; }
.cf-chip-error .cf-chip-icon   { background: #d0475e; }

/* Controls */
.cf-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--cf-surface);
  border-top: 1px solid var(--cf-line);
  z-index: 30;
}

.cf-controls[hidden] {
  display: none !important;
}

.cf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--cf-line);
  background: var(--cf-surface-2);
  color: var(--cf-ink);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
}

.cf-btn:hover {
  background: var(--cf-accent);
  color: #fff;
  border-color: var(--cf-accent);
}

.cf-btn:active {
  transform: scale(0.96);
}

.cf-btn:focus-visible {
  outline: 2px solid var(--cf-accent);
  outline-offset: 2px;
}

.cf-scrub {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  accent-color: var(--cf-accent);
  background: var(--cf-surface-2);
  cursor: pointer;
}

.cf-speed {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--cf-line);
  background: var(--cf-surface-2);
  color: var(--cf-ink);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

/* Captions and Alternatives */
.cf-caption-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 18px;
  border-top: 1px solid color-mix(in srgb, var(--cf-line) 40%, transparent);
}

.cf-title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.cf-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cf-ink);
}

.cf-summary {
  font-size: 13px;
  color: var(--cf-ink-soft);
}

.cf-live-caption {
  font-size: 13px;
  line-height: 1.4;
  color: var(--cf-accent);
  min-height: 18px;
}

.cf-explanation {
  padding: 10px 18px;
  font-size: 13px;
  line-height: 1.5;
  background: color-mix(in srgb, var(--cf-surface-2) 40%, transparent);
  border-top: 1px dashed var(--cf-line);
}

.cf-explanation p {
  margin: 4px 0 0 0;
  color: var(--cf-ink-soft);
}

.cf-exp-eyebrow {
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--cf-ink);
}

.cf-steps {
  margin: 0;
  padding: 12px 18px 16px 36px;
  border-top: 1px solid var(--cf-line);
  background: color-mix(in srgb, var(--cf-surface-2) 20%, transparent);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--cf-ink-soft);
}

.cf-steps li {
  margin-bottom: 4px;
}

.cf-steps li strong {
  color: var(--cf-ink);
}

/* Fallback Notice View */
.cf-fallback {
  border-style: dashed;
}

.cf-fallback-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fff4e5;
  color: #8c4a00;
  border-bottom: 1px solid #ffd8a8;
}

.cf-fallback-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: #d9822b;
  color: #fff;
}

.cf-fallback-msg {
  margin: 0;
  font-size: 13px;
}

.cf-fallback-list {
  list-style: none;
  margin: 0;
  padding: 14px 18px;
  display: grid;
  gap: 8px;
}

.cf-fallback-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--cf-ink);
}

.cf-fallback-node-kind {
  color: var(--cf-ink-soft);
  font-size: 12px;
  transition: opacity 0.6s cubic-bezier(.22,.8,.24,1);
}

.cf-edge {
  transition: opacity 0.6s cubic-bezier(.22,.8,.24,1);
}

.cf .cf-off {
  opacity: 0;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .cf,
  .cf-node,
  .cf-edge,
  .cf-chip,
  .cf-edge-wire,
  .cf-packet,
  .cf-btn {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
  .cf[data-cf-preset] .cf-node.is-highlight, .cf[data-cf-preset] .cf-edge.is-active .cf-edge-wire { animation: none !important; }
}

/* Print Overrides */
@media print {
  .cf {
    box-shadow: none !important;
    border: 1px solid #ccc !important;
    break-inside: avoid;
  }
  .cf-controls {
    display: none !important;
  }
}
`.trim();
