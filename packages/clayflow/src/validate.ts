import {
  diagramSchema,
  NODE_KINDS,
  TONES,
  NODE_STATES,
  type Diagram,
  type FallbackModel,
  type FallbackNode,
  type NodeKind,
  type NodeState,
  type Tone,
} from "./schema.js";

export type { FallbackModel, FallbackNode };

export type ValidationResult =
  { ok: true; diagram: Diagram } | { ok: false; errors: string[]; fallback: FallbackModel };

function extractFallback(input: unknown): FallbackModel {
  let title = "Diagram";
  let summary: string | undefined;
  const nodes: FallbackNode[] = [];

  if (typeof input === "object" && input !== null) {
    const raw = input as Record<string, unknown>;
    if (typeof raw.title === "string" && raw.title.trim().length > 0) {
      title = raw.title.trim().slice(0, 40);
    } else if (typeof raw.name === "string" && raw.name.trim().length > 0) {
      title = raw.name.trim().slice(0, 40);
    }
    if (typeof raw.summary === "string" && raw.summary.trim().length > 0) {
      summary = raw.summary.trim().slice(0, 160);
    } else if (typeof raw.description === "string" && raw.description.trim().length > 0) {
      summary = raw.description.trim().slice(0, 160);
    }

    if (Array.isArray(raw.nodes)) {
      for (const [index, item] of raw.nodes.entries()) {
        if (typeof item === "object" && item !== null) {
          const rawNode = item as Record<string, unknown>;
          const rawId = typeof rawNode.id === "string" ? rawNode.id.trim() : `node-${index + 1}`;
          const rawKind =
            typeof rawNode.kind === "string"
              ? rawNode.kind.trim()
              : typeof rawNode.type === "string"
                ? rawNode.type.trim()
                : "process";
          const rawLabel =
            typeof rawNode.label === "string"
              ? rawNode.label.trim()
              : typeof rawNode.text === "string"
                ? rawNode.text.trim()
                : typeof rawNode.name === "string"
                  ? rawNode.name.trim()
                  : "";

          if (rawLabel.length > 0 && (NODE_KINDS as readonly string[]).includes(rawKind)) {
            const kind = rawKind as NodeKind;
            const label = rawLabel.slice(0, 40);
            const state =
              typeof rawNode.state === "string" &&
              (NODE_STATES as readonly string[]).includes(rawNode.state)
                ? (rawNode.state as NodeState)
                : undefined;
            const tone =
              typeof rawNode.tone === "string" &&
              (TONES as readonly string[]).includes(rawNode.tone)
                ? (rawNode.tone as Tone)
                : undefined;

            nodes.push({
              id: rawId.slice(0, 32),
              kind,
              label,
              ...(state ? { state } : {}),
              ...(tone ? { tone } : {}),
            });
          }
        }
      }
    }
  }

  return { title, summary, nodes };
}

/**
 * Validates a diagram specification.
 * Never throws under any input.
 * Returns either { ok: true, diagram } or { ok: false, errors, fallback }.
 */
export function validate(input: unknown): ValidationResult {
  const fallback = extractFallback(input);

  const parsed = diagramSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
    );
    return { ok: false, errors, fallback };
  }

  const diagram = parsed.data;
  const errors: string[] = [];

  // Referential Integrity: Unique IDs
  const nodeIds = new Set<string>();
  for (const [index, node] of diagram.nodes.entries()) {
    if (nodeIds.has(node.id)) {
      errors.push(`nodes.${index}: Duplicate node id "${node.id}"`);
    }
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const [index, edge] of diagram.edges.entries()) {
    if (edgeIds.has(edge.id)) {
      errors.push(`edges.${index}: Duplicate edge id "${edge.id}"`);
    }
    edgeIds.add(edge.id);
  }

  const groupIds = new Set<string>();
  const groupMap = new Map<string, (typeof diagram.groups)[number]>();
  for (const [index, group] of diagram.groups.entries()) {
    if (groupIds.has(group.id)) {
      errors.push(`groups.${index}: Duplicate group id "${group.id}"`);
    }
    groupIds.add(group.id);
    groupMap.set(group.id, group);
  }

  const annotationIds = new Set<string>();
  for (const [index, ann] of diagram.annotations.entries()) {
    if (annotationIds.has(ann.id)) {
      errors.push(`annotations.${index}: Duplicate annotation id "${ann.id}"`);
    }
    annotationIds.add(ann.id);
  }

  // Edge referential checks
  for (const [index, edge] of diagram.edges.entries()) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`edges.${index}.from: Node "${edge.from}" does not exist`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`edges.${index}.to: Node "${edge.to}" does not exist`);
    }
    if (edge.from === edge.to) {
      errors.push(`edges.${index}: Self-referential edges are not supported ("${edge.from}")`);
    }
  }

  // Node group reference checks
  for (const [index, node] of diagram.nodes.entries()) {
    if (node.group && !groupIds.has(node.group)) {
      errors.push(`nodes.${index}.group: Group "${node.group}" does not exist`);
    }
  }

  // Group parent hierarchy and cycle checks (max depth 3)
  for (const [index, group] of diagram.groups.entries()) {
    if (group.parent) {
      if (!groupIds.has(group.parent)) {
        errors.push(`groups.${index}.parent: Parent group "${group.parent}" does not exist`);
      } else if (group.parent === group.id) {
        errors.push(`groups.${index}.parent: Group "${group.id}" cannot be its own parent`);
      }
    }

    // Depth check & cycle check
    let depth = 1;
    let curr = group.parent;
    const visited = new Set<string>([group.id]);
    while (curr) {
      depth++;
      if (visited.has(curr)) {
        errors.push(`groups.${index}: Cycle detected in group hierarchy involving "${curr}"`);
        break;
      }
      visited.add(curr);
      if (depth > 3) {
        errors.push(
          `groups.${index}: Group "${group.id}" exceeds maximum nesting depth of 3 (depth: ${depth})`,
        );
        break;
      }
      const parentGroup = groupMap.get(curr);
      curr = parentGroup?.parent;
    }
  }

  // Annotation target checks
  for (const [index, ann] of diagram.annotations.entries()) {
    if (!nodeIds.has(ann.target)) {
      errors.push(`annotations.${index}.target: Target node "${ann.target}" does not exist`);
    }
  }

  // Animation step reference checks
  if (diagram.animation?.steps) {
    if (diagram.animation.steps.length > 24) {
      errors.push(`animation.steps: Exceeds maximum allowed steps of 24`);
    }
    for (const [stepIdx, step] of diagram.animation.steps.entries()) {
      if (step.nodes) {
        for (const nId of step.nodes) {
          if (!nodeIds.has(nId)) {
            errors.push(`animation.steps.${stepIdx}.nodes: Node "${nId}" does not exist`);
          }
        }
      }
      if (step.edges) {
        for (const eId of step.edges) {
          if (!edgeIds.has(eId)) {
            errors.push(`animation.steps.${stepIdx}.edges: Edge "${eId}" does not exist`);
          }
        }
      }
      if (step.highlight) {
        for (const hId of step.highlight) {
          if (!nodeIds.has(hId) && !edgeIds.has(hId)) {
            errors.push(
              `animation.steps.${stepIdx}.highlight: Target "${hId}" is neither a node nor an edge`,
            );
          }
        }
      }
      if (step.packets) {
        for (const pkt of step.packets) {
          if (!edgeIds.has(pkt.edge)) {
            errors.push(`animation.steps.${stepIdx}.packets: Edge "${pkt.edge}" does not exist`);
          }
        }
      }
      if (step.states) {
        for (const sNodeId of Object.keys(step.states)) {
          if (!nodeIds.has(sNodeId)) {
            errors.push(`animation.steps.${stepIdx}.states: Node "${sNodeId}" does not exist`);
          }
        }
      }
      if (step.counters) {
        for (const cNodeId of Object.keys(step.counters)) {
          if (!nodeIds.has(cNodeId)) {
            errors.push(`animation.steps.${stepIdx}.counters: Node "${cNodeId}" does not exist`);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, fallback };
  }

  return { ok: true, diagram };
}

function truncateString(str: string, maxLen: number): string {
  const trimmed = str.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 3) + "...";
}

function toSlugId(raw: string, fallback: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug.length > 0 ? slug : fallback;
}

/**
 * Tolerant adapter for LLM output.
 * Accepts a JSON string or object, maps aliases, truncates over-long strings,
 * drops unknown fields, and returns the result of validate(). Never throws.
 */
export function fromModelOutput(input: unknown): ValidationResult {
  let data: unknown = input;

  if (typeof input === "string") {
    let clean = input.trim();
    // Strip markdown code fences if present
    const codeBlockMatch = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (codeBlockMatch?.[1]) {
      clean = codeBlockMatch[1].trim();
    }
    try {
      data = JSON.parse(clean);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        errors: [`JSON parse failure: ${msg}`],
        fallback: { title: "Diagram", nodes: [] },
      };
    }
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {
      ok: false,
      errors: ["Input must be a JSON object or stringified JSON object"],
      fallback: { title: "Diagram", nodes: [] },
    };
  }

  const raw = data as Record<string, unknown>;

  // Coerce top-level diagram
  const titleRaw =
    typeof raw.title === "string"
      ? raw.title
      : typeof raw.name === "string"
        ? raw.name
        : typeof raw.label === "string"
          ? raw.label
          : "Diagram";
  const title = truncateString(titleRaw, 40);

  const idRaw =
    typeof raw.id === "string" && raw.id.trim().length > 0
      ? raw.id.trim()
      : toSlugId(title, "cf-diagram");
  const id = toSlugId(idRaw, "cf-diagram");

  const summaryRaw =
    typeof raw.summary === "string"
      ? raw.summary
      : typeof raw.description === "string"
        ? raw.description
        : typeof raw.desc === "string"
          ? raw.desc
          : undefined;
  const summary = summaryRaw ? truncateString(summaryRaw, 160) : undefined;

  const layout = raw.layout === "vertical" ? "vertical" : "horizontal";
    const theme =
    raw.theme === "light" || raw.theme === "dark" || raw.theme === "auto" ? raw.theme : "auto";
    const topic = ["ai-tech", "finance", "health", "education", "business", "general"].includes(String(raw.topic)) ? raw.topic : undefined;

  // Nodes coercion
  const nodes: unknown[] = [];
  if (Array.isArray(raw.nodes)) {
    for (const [index, rawNode] of raw.nodes.entries()) {
      if (typeof rawNode === "object" && rawNode !== null) {
        const n = rawNode as Record<string, unknown>;
        const labelCandidate =
          typeof n.label === "string"
            ? n.label
            : typeof n.text === "string"
              ? n.text
              : typeof n.name === "string"
                ? n.name
                : typeof n.title === "string"
                  ? n.title
                  : `Node ${index + 1}`;
        const nodeLabel = truncateString(labelCandidate, 40);

        const nodeIdCandidate =
          typeof n.id === "string" && n.id.trim().length > 0
            ? n.id.trim()
            : toSlugId(nodeLabel, `node-${index + 1}`);
        const nodeId = toSlugId(nodeIdCandidate, `node-${index + 1}`);

        const kindCandidate =
          typeof n.kind === "string"
            ? n.kind.toLowerCase()
            : typeof n.type === "string"
              ? n.type.toLowerCase()
              : typeof n.category === "string"
                ? n.category.toLowerCase()
                : "process";
        const kind = (NODE_KINDS as readonly string[]).includes(kindCandidate)
          ? kindCandidate
          : "process";

        const metaCandidate =
          typeof n.meta === "string"
            ? n.meta
            : typeof n.description === "string"
              ? n.description
              : typeof n.detail === "string"
                ? n.detail
                : undefined;
        const meta = metaCandidate ? truncateString(metaCandidate, 160) : undefined;

        const stateCandidate =
          typeof n.state === "string"
            ? n.state.toLowerCase()
            : typeof n.status === "string"
              ? n.status.toLowerCase()
              : "idle";
        const state = (NODE_STATES as readonly string[]).includes(stateCandidate)
          ? stateCandidate
          : "idle";

        const groupCandidate =
          typeof n.group === "string"
            ? n.group.trim()
            : typeof n.groupId === "string"
              ? n.groupId.trim()
              : undefined;
        const group = groupCandidate ? toSlugId(groupCandidate, "") : undefined;

        const toneCandidate = typeof n.tone === "string" ? n.tone.toLowerCase().trim() : undefined;
        const tone =
          toneCandidate && (TONES as readonly string[]).includes(toneCandidate)
            ? toneCandidate
            : undefined;

        let metric: unknown = undefined;
        if (typeof n.metric === "object" && n.metric !== null) {
          const m = n.metric as Record<string, unknown>;
          if (typeof m.value === "number" && Number.isFinite(m.value)) {
            metric = {
              value: m.value,
              unit: typeof m.unit === "string" ? truncateString(m.unit, 16) : undefined,
              label: typeof m.label === "string" ? truncateString(m.label, 40) : undefined,
            };
          }
        } else if (typeof n.value === "number" && Number.isFinite(n.value)) {
          metric = {
            value: n.value,
            unit: typeof n.unit === "string" ? truncateString(n.unit, 16) : undefined,
          };
        }

        nodes.push({
          id: nodeId,
          kind,
          label: nodeLabel,
          ...(meta ? { meta } : {}),
          state,
          ...(metric ? { metric } : {}),
          ...(group ? { group } : {}),
          ...(tone ? { tone } : {}),
        });
      }
    }
  }

  // Edges coercion
  const edges: unknown[] = [];
  if (Array.isArray(raw.edges)) {
    for (const [index, rawEdge] of raw.edges.entries()) {
      if (typeof rawEdge === "object" && rawEdge !== null) {
        const e = rawEdge as Record<string, unknown>;
        const fromRaw =
          typeof e.from === "string"
            ? e.from
            : typeof e.source === "string"
              ? e.source
              : typeof e.src === "string"
                ? e.src
                : typeof e.start === "string"
                  ? e.start
                  : "";
        const toRaw =
          typeof e.to === "string"
            ? e.to
            : typeof e.target === "string"
              ? e.target
              : typeof e.dst === "string"
                ? e.dst
                : typeof e.end === "string"
                  ? e.end
                  : "";

        const edgeIdCandidate =
          typeof e.id === "string" && e.id.trim().length > 0 ? e.id.trim() : `edge-${index + 1}`;
        const edgeId = toSlugId(edgeIdCandidate, `edge-${index + 1}`);

        const styleCandidate =
          typeof e.style === "string"
            ? e.style.toLowerCase()
            : typeof e.type === "string"
              ? e.type.toLowerCase()
              : "curved";
        const style = ["straight", "curved", "orthogonal"].includes(styleCandidate)
          ? styleCandidate
          : "curved";

        const labelCandidate =
          typeof e.label === "string"
            ? e.label
            : typeof e.text === "string"
              ? e.text
              : typeof e.name === "string"
                ? e.name
                : undefined;
        const label = labelCandidate ? truncateString(labelCandidate, 40) : undefined;

        edges.push({
          id: edgeId,
          from: toSlugId(fromRaw, fromRaw),
          to: toSlugId(toRaw, toRaw),
          style,
          dashed: Boolean(e.dashed),
          bidirectional: Boolean(e.bidirectional),
          animated: Boolean(e.animated),
          ...(label ? { label } : {}),
        });
      }
    }
  }

  // Groups coercion
  const groups: unknown[] = [];
  if (Array.isArray(raw.groups)) {
    for (const [index, rawGroup] of raw.groups.entries()) {
      if (typeof rawGroup === "object" && rawGroup !== null) {
        const g = rawGroup as Record<string, unknown>;
        const labelCandidate =
          typeof g.label === "string"
            ? g.label
            : typeof g.name === "string"
              ? g.name
              : typeof g.title === "string"
                ? g.title
                : `Group ${index + 1}`;
        const groupLabel = truncateString(labelCandidate, 40);

        const groupIdCandidate =
          typeof g.id === "string" && g.id.trim().length > 0
            ? g.id.trim()
            : toSlugId(groupLabel, `group-${index + 1}`);
        const groupId = toSlugId(groupIdCandidate, `group-${index + 1}`);

        const kindCandidate =
          typeof g.kind === "string"
            ? g.kind.toLowerCase()
            : typeof g.type === "string"
              ? g.type.toLowerCase()
              : "group";
        const kind = ["group", "module", "boundary", "section"].includes(kindCandidate)
          ? kindCandidate
          : "group";

        const parentCandidate =
          typeof g.parent === "string" && g.parent.trim().length > 0
            ? toSlugId(g.parent.trim(), "")
            : undefined;

        groups.push({
          id: groupId,
          label: groupLabel,
          kind,
          collapsible: Boolean(g.collapsible),
          collapsed: Boolean(g.collapsed),
          ...(parentCandidate ? { parent: parentCandidate } : {}),
        });
      }
    }
  }

  // Annotations coercion
  const annotations: unknown[] = [];
  if (Array.isArray(raw.annotations)) {
    for (const [index, rawAnn] of raw.annotations.entries()) {
      if (typeof rawAnn === "object" && rawAnn !== null) {
        const a = rawAnn as Record<string, unknown>;
        const textCandidate =
          typeof a.text === "string"
            ? a.text
            : typeof a.label === "string"
              ? a.label
              : typeof a.message === "string"
                ? a.message
                : "Annotation";
        const text = truncateString(textCandidate, 160);

        const annIdCandidate =
          typeof a.id === "string" && a.id.trim().length > 0 ? a.id.trim() : `ann-${index + 1}`;
        const annId = toSlugId(annIdCandidate, `ann-${index + 1}`);

        const kindCandidate =
          typeof a.kind === "string"
            ? a.kind.toLowerCase()
            : typeof a.type === "string"
              ? a.type.toLowerCase()
              : "info";
        const validKinds = [
          "success",
          "pending",
          "error",
          "warning",
          "info",
          "callout",
          "tooltip",
          "label",
          "new",
        ];
        const kind = validKinds.includes(kindCandidate) ? kindCandidate : "info";

        const targetCandidate =
          typeof a.target === "string"
            ? a.target
            : typeof a.node === "string"
              ? a.node
              : typeof a.nodeId === "string"
                ? a.nodeId
                : "";
        const target = toSlugId(targetCandidate, targetCandidate);

        annotations.push({
          id: annId,
          kind,
          text,
          target,
        });
      }
    }
  }

  // Coerce animation
  let animation: unknown = undefined;
  if (typeof raw.animation === "object" && raw.animation !== null) {
    const anim = raw.animation as Record<string, unknown>;
    const presetCandidate =
      typeof anim.preset === "string" ? anim.preset.toLowerCase() : "data-flow";
    const validPresets = [
      "data-flow",
      "request-response",
      "step-reveal",
      "parallel",
      "decision-branch",
      "retry-failure",
      "loop",
      "progress",
      "fan-out-in",
      "timeline",
      "state-transition",
      "highlight",
      "pulse",
      "expand",
      "cycle",
    ];
    const preset = validPresets.includes(presetCandidate) ? presetCandidate : "data-flow";

    const speed =
      typeof anim.speed === "number" && Number.isFinite(anim.speed)
        ? Math.max(0.5, Math.min(2, anim.speed))
        : 1;
    const loop = anim.loop !== undefined ? Boolean(anim.loop) : true;

    let steps: unknown[] | undefined = undefined;
    if (Array.isArray(anim.steps)) {
      steps = anim.steps.slice(0, 24).map((s, idx) => {
        if (typeof s === "object" && s !== null) {
          const rawStep = s as Record<string, unknown>;
          return {
            caption: truncateString(
              typeof rawStep.caption === "string" ? rawStep.caption : `Step ${idx + 1}`,
              160,
            ),
            nodes: Array.isArray(rawStep.nodes)
              ? rawStep.nodes.map((n) => toSlugId(String(n), String(n)))
              : undefined,
            edges: Array.isArray(rawStep.edges)
              ? rawStep.edges.map((e) => toSlugId(String(e), String(e)))
              : undefined,
            highlight: Array.isArray(rawStep.highlight)
              ? rawStep.highlight.map((h) => toSlugId(String(h), String(h)))
              : undefined,
          };
        }
        return { caption: `Step ${idx + 1}` };
      });
    }

    animation = {
      preset,
      speed,
      loop,
      ...(steps ? { steps } : {}),
    };
  }

  // Coerce explanations
  let explanations: unknown = undefined;
  if (typeof raw.explanations === "object" && raw.explanations !== null) {
    const exp = raw.explanations as Record<string, unknown>;
    const eli5 = typeof exp.eli5 === "string" ? exp.eli5.trim().slice(0, 2000) : undefined;
    const advanced =
      typeof exp.advanced === "string" ? exp.advanced.trim().slice(0, 2000) : undefined;
    if (eli5 || advanced) {
      explanations = {
        ...(eli5 ? { eli5 } : {}),
        ...(advanced ? { advanced } : {}),
      };
    }
  }

  const coerced = {
    schemaVersion: "1.0",
    id,
    title,
    ...(summary ? { summary } : {}),
    layout,
    theme,
    ...(topic ? { topic } : {}),
    nodes,
    edges,
    groups,
    annotations,
    ...(animation ? { animation } : {}),
    ...(explanations ? { explanations } : {}),
  };

  return validate(coerced);
}
