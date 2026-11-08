import { resolveAsset } from "./assets.js";
import { CATALOG } from "./catalog.js";
import { getKindMotionFamily } from "./motion/kind-motion.js";
import { computeLayout, type LayoutResult } from "./layout.js";
import { routeEdges, type RoutedEdge } from "./route.js";
import { TOPIC_THEMES, type Diagram, type FallbackModel, type Tone } from "./schema.js";
import { compile, type Frame } from "./timeline.js";

export interface RenderOptions {
  assetBase?: string;
  idPrefix?: string;
  mode?: "eli5" | "advanced";
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStage(
  diagram: Diagram,
  layout: LayoutResult,
  routed: RoutedEdge[],
  layoutType: "horizontal" | "vertical",
  isHidden: boolean,
  finalFrame: Frame | undefined,
  opts?: RenderOptions,
): string {
  const prefix = opts?.idPrefix ? `${escapeHtml(opts.idPrefix)}-` : "";
  const markerId = `${prefix}cf-arr-${layoutType}`;
  const markerStartId = `${prefix}cf-arr-start-${layoutType}`;

  // SVG connector layer
  let svgContent = `<svg class="cf-edges" viewBox="0 0 ${layout.width} ${layout.height}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">`;
  svgContent += `<defs>`;
  svgContent += `<marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`;
  svgContent += `<path d="M 2 2 L 8 5 L 2 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  svgContent += `</marker>`;
  svgContent += `<marker id="${markerStartId}" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">`;
  svgContent += `<path d="M 8 2 L 2 5 L 8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  svgContent += `</marker>`;
  svgContent += `</defs>`;

  for (const edge of routed) {
    const isDashed = edge.dashed ? ' data-dashed="true"' : "";
    const isAnim = edge.animated ? ' data-animated="true"' : "";
    const markerStart = edge.bidirectional ? ` marker-start="url(#${markerStartId})"` : "";
    const kind = edge.kind;
    const dimmed = finalFrame?.dimmed?.includes(edge.id) ? " is-dimmed" : "";
    const condition = edge.condition ? ` data-condition="${escapeHtml(edge.condition)}"` : "";
    const labelY = edge.condition && edge.label ? edge.labelY - 18 : edge.labelY;
    svgContent += `<g class="cf-edge${dimmed}" data-edge="${escapeHtml(edge.id)}" data-kind="${escapeHtml(kind)}"${condition}${isDashed}${isAnim}>`;
    svgContent += `<path class="cf-edge-track" d="${edge.path}" />`;
    svgContent += `<path class="cf-edge-wire" d="${edge.path}" style="--cf-edge-length:${edge.length}px" marker-end="url(#${markerId})"${markerStart} />`;
    if (edge.label) {
      svgContent += `<text class="cf-edge-label" x="${edge.labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="central">${escapeHtml(edge.label)}</text>`;
    }
    if (edge.condition) {
      const pillWidth = Math.max(42, edge.condition.length * 7 + 26);
      const pillX = edge.labelX - pillWidth / 2;
      const pillY = edge.labelY - 11;
      svgContent += `<g class="cf-edge-condition" transform="translate(${pillX} ${pillY})"><rect class="cf-edge-condition-pill" width="${pillWidth}" height="22" rx="11"/><text class="cf-edge-condition-check" x="10" y="11" dominant-baseline="central">✓</text><text class="cf-edge-condition-text" x="${pillWidth / 2 + 5}" y="11" text-anchor="middle" dominant-baseline="central">${escapeHtml(edge.condition)}</text></g>`;
    }
    if (kind === "branch") svgContent += `<text class="cf-edge-not-taken" x="${edge.labelX}" y="${edge.labelY + 16}" text-anchor="middle" dominant-baseline="central">Not taken</text>`;
    svgContent += `<circle class="cf-packet" data-edge="${escapeHtml(edge.id)}" r="4.5" cx="0" cy="0" opacity="0" />`;
    if (edge.bidirectional) svgContent += `<circle class="cf-packet" data-edge="${escapeHtml(edge.id)}" data-reverse="true" r="4.5" cx="0" cy="0" opacity="0" />`;
    svgContent += `</g>`;
  }
  svgContent += `</svg>`;

  // Groups
  let groupsContent = "";
  for (const g of layout.groups) {
    const gSpec = diagram.groups.find((item) => item.id === g.id);
    const leftPct = ((g.x / layout.width) * 100).toFixed(3);
    const topPct = ((g.y / layout.height) * 100).toFixed(3);
    const widthPct = ((g.w / layout.width) * 100).toFixed(3);
    const heightPct = ((g.h / layout.height) * 100).toFixed(3);
    const kind = gSpec?.kind ?? "group";

    const expanded = finalFrame?.expanded?.includes(g.id) ? " is-expanded" : "";
    const collapsed = finalFrame?.collapsed?.includes(g.id) ? " is-collapsed" : "";
    groupsContent += `<div class="cf-group cf-group-${kind}${expanded}${collapsed}" data-group="${escapeHtml(g.id)}" style="left:${leftPct}%;top:${topPct}%;width:${widthPct}%;height:${heightPct}%;z-index:${g.depth};">`;
    groupsContent += `<span class="cf-group-tab">${escapeHtml(gSpec?.label ?? g.id)}</span>`;
    groupsContent += `</div>`;
  }

  // Nodes
  let nodesContent = "";
  const inspectData: string[] = [];
  for (const n of layout.nodes) {
    const nSpec = diagram.nodes.find((item) => item.id === n.id);
    if (!nSpec) continue;

    const meta = CATALOG[nSpec.kind] ?? {
      family: "node",
      tone: "violet",
      asset: "process",
      noun: "Node",
      shape: "card",
    };
    const tone: Tone = nSpec.tone ?? meta.tone;
    const shape = meta.shape;
    const finalState = finalFrame?.states[n.id] ?? nSpec.state ?? "idle";
    const transform = finalFrame?.transforms?.[n.id];
    const renderedKind = transform?.kind ?? nSpec.kind;
    const renderedLabel = transform?.label ?? nSpec.label;
    const counterVal = finalFrame?.counters[n.id] ?? nSpec.metric?.value;

    const leftPct = ((n.x / layout.width) * 100).toFixed(3);
    const topPct = ((n.y / layout.height) * 100).toFixed(3);
    const widthPct = ((n.w / layout.width) * 100).toFixed(3);
    const heightPct = ((n.h / layout.height) * 100).toFixed(3);

    const asset = meta.asset ? resolveAsset(meta.asset, opts?.assetBase) : undefined;

    const inspectable = Boolean(nSpec.role || nSpec.inputs || nSpec.outputs || nSpec.evidence || nSpec.meta);
    if (inspectable) inspectData.push(`<template class="cf-inspect-data" data-node="${escapeHtml(n.id)}">${escapeHtml(JSON.stringify({ label: nSpec.label, kind: nSpec.kind, noun: meta.noun, role: nSpec.role ?? "", inputs: nSpec.inputs ?? [], outputs: nSpec.outputs ?? [], meta: nSpec.meta ?? "", evidence: nSpec.evidence ?? "" }))}</template>`);
    nodesContent += `<figure class="cf-node cf-shape-${shape}${finalFrame?.dimmed?.includes(n.id) ? ' is-dimmed' : ''}${finalFrame?.focus === n.id ? ' is-focus' : ''}${finalFrame?.focus && finalFrame.focus !== n.id ? ' is-focus-dim' : ''}" data-node="${escapeHtml(n.id)}" data-kind="${escapeHtml(renderedKind)}" data-motion="${getKindMotionFamily(renderedKind)}"${transform ? ` data-original-kind="${escapeHtml(nSpec.kind)}" data-original-label="${escapeHtml(nSpec.label)}" data-original-motion="${getKindMotionFamily(nSpec.kind)}"` : ''} data-tone="${tone}" data-state="${finalState}"${inspectable ? ' data-inspectable="true"' : ''} style="left:${leftPct}%;top:${topPct}%;width:${widthPct}%;height:${heightPct}%;" tabindex="0" role="${inspectable ? 'button' : 'img'}" aria-label="${escapeHtml(renderedLabel)} (${escapeHtml(meta.noun)})">`;
    nodesContent += `<div class="cf-well">`;
    if (asset) {
      nodesContent += `<img class="cf-art" src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.alt)}" loading="lazy" />`;
    } else {
      nodesContent += `<span class="cf-art-fallback" aria-hidden="true"></span>`;
    }
    nodesContent += `</div>`;

    nodesContent += `<div class="cf-node-body">`;
    nodesContent += `<strong class="cf-node-label">${escapeHtml(renderedLabel)}</strong>`;
    if (nSpec.meta) {
      nodesContent += `<span class="cf-node-meta">${escapeHtml(nSpec.meta)}</span>`;
    }
    if (nSpec.metric) {
      nodesContent += `<div class="cf-node-metric" data-metric="${escapeHtml(n.id)}">`;
      nodesContent += `<span class="cf-metric-val">${counterVal !== undefined ? counterVal : nSpec.metric.value}</span>`;
      if (nSpec.metric.unit) {
        nodesContent += `<span class="cf-metric-unit">${escapeHtml(nSpec.metric.unit)}</span>`;
      }
      if (nSpec.metric.label) {
        nodesContent += `<span class="cf-metric-label">${escapeHtml(nSpec.metric.label)}</span>`;
      }
      nodesContent += `</div>`;
    }
    nodesContent += `</div>`;
    nodesContent += `</figure>`;
  }

  // Annotations
  let annotationsContent = "";
  for (const ann of diagram.annotations) {
    const targetNode = layout.nodes.find((item) => item.id === ann.target);
    if (!targetNode) continue;

    const leftPct = (((targetNode.x + targetNode.w / 2) / layout.width) * 100).toFixed(3);
    const topPct = (((targetNode.y - 14) / layout.height) * 100).toFixed(3);

    const annotationSteps = diagram.animation?.steps?.some((step) => step.annotate !== undefined) ?? false;
    const annotatedInitially = !annotationSteps || finalFrame?.annotations?.includes(ann.id) === true;
    annotationsContent += `<aside class="cf-chip cf-chip-${ann.kind}" data-annotation="${escapeHtml(ann.id)}" data-target="${escapeHtml(ann.target)}"${annotationSteps && !annotatedInitially ? ' hidden' : ''} style="left:${leftPct}%;top:${topPct}%;">`;
    annotationsContent += `<span class="cf-chip-icon" aria-hidden="true"></span>`;
    annotationsContent += `<span class="cf-chip-text">${escapeHtml(ann.text)}</span>`;
    annotationsContent += `</aside>`;
  }

  const hiddenAttr = isHidden ? " hidden" : "";
  const stageClass = `cf-stage cf-stage-${layoutType}${layoutType === "vertical" ? " cf-stage-vertical" : ""}`;

  return `<div class="${stageClass}" data-cf-layout="${layoutType}"${hiddenAttr} data-cf-w="${layout.width}" style="aspect-ratio:${layout.width} / ${layout.height};max-width:${layout.width}px;--cf-w:${layout.width};">
${groupsContent}
${svgContent}
${nodesContent}
${inspectData.join("\n")}
${annotationsContent}
</div>`;
}

/**
 * Renders a validated diagram into a framework-agnostic HTML string.
 * Emits static-first final-state markup, embedded frame JSON, SVG connector paths,
 * controls bar, live caption region, and accessible text alternatives.
 */
export function renderClayFlow(diagram: Diagram, opts?: RenderOptions): string {
  const frames = compile(diagram);
  const finalFrame = frames.length > 0 ? frames[frames.length - 1] : undefined;

  const layoutHorizontal = computeLayout(diagram, "horizontal");
  const layoutVertical = computeLayout(diagram, "vertical");

  const routedH = routeEdges(diagram, layoutHorizontal, "horizontal");
  const routedV = routeEdges(diagram, layoutVertical, "vertical");

  const isSpecVertical = diagram.layout === "vertical";
  const primaryLayout = isSpecVertical ? "vertical" : "horizontal";

  // Precomputed stage variants
  const stageH = renderStage(
    diagram,
    layoutHorizontal,
    routedH,
    "horizontal",
    isSpecVertical,
    finalFrame,
    opts,
  );
  const stageV = renderStage(
    diagram,
    layoutVertical,
    routedV,
    "vertical",
    !isSpecVertical,
    finalFrame,
    opts,
  );

  // Every "<" escaped so captions cannot close the script or open a comment
  const framesJson = JSON.stringify(frames).replace(/</g, "\\u003c");

  // Explanations
  const idPrefix = opts?.idPrefix ? `${escapeHtml(opts.idPrefix)}-` : "";
  const mode = opts?.mode ?? "eli5";
  let explanationHtml = "";
  if (diagram.explanations) {
    if (mode === "eli5" && diagram.explanations.eli5) {
      explanationHtml = `<div class="cf-explanation cf-explanation-eli5"><strong class="cf-exp-eyebrow">ELI5:</strong> <p>${escapeHtml(diagram.explanations.eli5)}</p></div>`;
    } else if (mode === "advanced" && diagram.explanations.advanced) {
      explanationHtml = `<div class="cf-explanation cf-explanation-advanced"><strong class="cf-exp-eyebrow">Technical Architecture:</strong> <p>${escapeHtml(diagram.explanations.advanced)}</p></div>`;
    } else if (diagram.explanations.eli5) {
      explanationHtml = `<div class="cf-explanation cf-explanation-eli5"><strong class="cf-exp-eyebrow">ELI5:</strong> <p>${escapeHtml(diagram.explanations.eli5)}</p></div>`;
    }
  }

  // Ordered list text alternative
  const stepsList = `<ol class="cf-steps" aria-label="Step-by-step diagram walk-through">
${frames
  .map(
    (f, idx) =>
      `<li data-step="${idx}"><strong>Step ${idx + 1}:</strong> ${escapeHtml(f.caption)}</li>`,
  )
  .join("\n")}
</ol>`;

  const preset = diagram.animation?.preset ?? "data-flow";
  const speed = diagram.animation?.speed ?? 1;
  const loop = diagram.animation?.loop !== false;

  const topicAttr = diagram.topic ? ` data-topic="${escapeHtml(diagram.topic)}" style="--cf-topic-accent:${TOPIC_THEMES[diagram.topic].accent}"` : "";
  return `<figure class="cf"${topicAttr} data-cf-preset="${escapeHtml(preset)}" data-cf-id="${escapeHtml(diagram.id)}" data-cf-speed="${speed}" data-cf-loop="${loop}" data-cf-active-layout="${primaryLayout}" data-cf-annotations="${diagram.animation?.steps?.some((step) => step.annotate !== undefined) ? 'true' : 'false'}" data-complete="${finalFrame?.complete ? 'true' : 'false'}" tabindex="0" aria-label="${escapeHtml(diagram.title)}">
<script type="application/json" class="cf-frames">${framesJson}</script>
<div class="cf-canvas">
${stageH}
${stageV}
</div>
<div class="cf-controls" hidden aria-label="Animation controls">
  <button type="button" class="cf-btn cf-btn-play" data-action="play" aria-label="Play animation" title="Play animation (Space)">
    <span class="cf-icon cf-icon-play" aria-hidden="true">▶</span>
    <span class="cf-icon cf-icon-pause" aria-hidden="true" hidden>⏸</span>
  </button>
  <button type="button" class="cf-btn cf-btn-replay" data-action="replay" aria-label="Replay animation" title="Replay (Home)">
    <span class="cf-icon" aria-hidden="true">↺</span>
  </button>
  <button type="button" class="cf-btn cf-btn-reset" data-action="reset" aria-label="Reset animation" title="Reset animation">↺</button>
  <button type="button" class="cf-btn cf-btn-prev" data-action="prev" aria-label="Previous step" title="Previous step (ArrowLeft)">
    <span class="cf-icon" aria-hidden="true">⏮</span>
  </button>
  <button type="button" class="cf-btn cf-btn-next" data-action="next" aria-label="Next step" title="Next step (ArrowRight)">
    <span class="cf-icon" aria-hidden="true">⏭</span>
  </button>
  <input type="range" class="cf-scrub" min="0" max="${Math.max(0, frames.length - 1)}" step="1" value="${Math.max(0, frames.length - 1)}" aria-label="Scrub animation timeline" />
  <select class="cf-speed" aria-label="Playback speed">
    <option value="0.5">0.5×</option>
    <option value="1" selected>1×</option>
    <option value="1.5">1.5×</option>
    <option value="2">2×</option>
  </select>
</div>
<figcaption class="cf-caption-bar">
  <div class="cf-title-row">
    <span class="cf-title">${escapeHtml(diagram.title)}</span>
    ${diagram.illustrative ? '<span class="cf-illustrative">Illustrative</span>' : ''}
    ${diagram.summary ? `<span class="cf-summary">${escapeHtml(diagram.summary)}</span>` : ""}
  </div>
  <div class="cf-live-caption" aria-live="polite">${escapeHtml(finalFrame?.caption ?? "")}</div>
</figcaption>
${explanationHtml}
${stepsList}
<div class="cf-inspect" hidden role="dialog" aria-modal="false" aria-labelledby="${idPrefix}cf-inspect-title"><button type="button" class="cf-btn cf-inspect-close" data-action="inspect-close" aria-label="Close inspection">×</button><h2 id="${idPrefix}cf-inspect-title">Node details</h2><dl><dt>What</dt><dd data-inspect="what"></dd><dt>Role</dt><dd data-inspect="role"></dd><dt>Inputs</dt><dd data-inspect="inputs"></dd><dt>Outputs</dt><dd data-inspect="outputs"></dd><dt>Current state</dt><dd data-inspect="state"></dd><dt>Evidence</dt><dd data-inspect="evidence"></dd></dl></div>
</figure>`;
}

/**
 * Renders an accessible fallback view when specification validation fails.
 */
export function renderFallback(fallback: FallbackModel): string {
  const nodesList =
    fallback.nodes.length > 0
      ? `<ul class="cf-fallback-list">
${fallback.nodes
  .map((n) => {
    const toneAttr = n.tone ? ` data-tone="${n.tone}"` : "";
    const stateAttr = n.state ? ` [${escapeHtml(n.state)}]` : "";
    return `<li class="cf-fallback-item" data-kind="${escapeHtml(n.kind)}"${toneAttr}>
  <strong class="cf-fallback-node-label">${escapeHtml(n.label)}</strong>
  <span class="cf-fallback-node-kind">(${escapeHtml(n.kind)})</span>
  ${stateAttr ? `<span class="cf-fallback-node-state">${escapeHtml(stateAttr)}</span>` : ""}
</li>`;
  })
  .join("\n")}
</ul>`
      : `<p class="cf-fallback-empty">No valid diagram components could be recovered.</p>`;

  return `<figure class="cf cf-fallback" aria-label="${escapeHtml(fallback.title)}">
<div class="cf-fallback-notice" role="alert">
  <span class="cf-fallback-badge">Notice</span>
  <p class="cf-fallback-msg">Diagram specification could not be rendered graphically. Showing accessible component breakdown.</p>
</div>
<figcaption class="cf-caption-bar">
  <div class="cf-title-row">
    <span class="cf-title">${escapeHtml(fallback.title)}</span>
    ${fallback.summary ? `<span class="cf-summary">${escapeHtml(fallback.summary)}</span>` : ""}
  </div>
</figcaption>
${nodesList}
</figure>`;
}
