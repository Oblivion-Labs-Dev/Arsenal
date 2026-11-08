import { CATALOG } from "./catalog.js";
import type { Diagram, Group } from "./schema.js";

export interface PortPoint {
  x: number;
  y: number;
}

export interface NodePorts {
  n: PortPoint;
  e: PortPoint;
  s: PortPoint;
  w: PortPoint;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ports: NodePorts;
}

export interface LayoutGroup {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
}

export interface LayoutResult {
  width: number;
  height: number;
  nodes: LayoutNode[];
  groups: LayoutGroup[];
}

type NodeSpec = Diagram["nodes"][number];

/**
 * A node is as wide as its words need, within limits, so labels are not clipped at 1:1.
 * Widths estimate the rendered text (13.5px semibold label, 11.5px meta) plus the icon well,
 * gap and padding the stylesheet gives each shape.
 */
function getNodeDimensions(node: NodeSpec): { w: number; h: number } {
  const meta = CATALOG[node.kind];
  const shape = meta ? meta.shape : "card";
  const metricText = node.metric
    ? `${node.metric.value}${node.metric.unit ?? ""} ${node.metric.label ?? ""}`
    : "";
  const text = Math.max(
    node.label.length * 7.6,
    (node.meta ?? "").length * 6.3,
    metricText.length * 6.6,
  );
  const fit = (chrome: number, min: number) =>
    Math.min(260, Math.max(min, Math.ceil((chrome + text) / 8) * 8));
  switch (shape) {
    case "diamond":
      return { w: fit(24 + 44 + 10 + 6, 120), h: 72 };
    case "pill":
      return { w: fit(28 + 44 + 10 + 6, 136), h: 56 };
    case "ring":
      return { w: fit(16 + 44 + 10 + 6, 120), h: 64 };
    case "card":
    default:
      return { w: fit(24 + 44 + 10 + 6, 160), h: 72 };
  }
}

/**
 * Pure, deterministic layered layout engine.
 * Computes longest-path ranks, performs 2-sweep barycenter ordering,
 * places nodes, builds port anchors, and calculates group bounding boxes.
 */
/** Width of the rounded condition pill drawn on an edge (check glyph plus text), shared with render. */
export function conditionPillWidth(condition: string): number {
  return Math.max(42, condition.length * 7 + 26);
}

export function computeLayout(
  diagram: Diagram,
  forcedLayout?: "horizontal" | "vertical",
): LayoutResult {
  const isHorizontal = (forcedLayout ?? diagram.layout) === "horizontal";
  const nodes = diagram.nodes;
  const edges = diagram.edges;

  if (nodes.length === 0) {
    return { width: 400, height: 200, nodes: [], groups: [] };
  }

  const nodeIndexMap = new Map<string, number>();
  for (const [i, n] of nodes.entries()) {
    nodeIndexMap.set(n.id, i);
  }

  // Build DAG for ranking by removing/ignoring back-edges deterministically
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  // Pre-sort edges to ensure deterministic order
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  // Detect back-edges using DFS with visiting set
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const dagEdges: { from: string; to: string }[] = [];

  function dfs(u: string) {
    visiting.add(u);
    visited.add(u);

    // Filter edges originating from u
    const outEdges = sortedEdges.filter((e) => e.from === u);
    for (const e of outEdges) {
      if (visiting.has(e.to)) {
        // Back edge detected, skip for DAG ranking
        continue;
      }
      dagEdges.push({ from: e.from, to: e.to });
      if (!visited.has(e.to)) {
        dfs(e.to);
      }
    }
    visiting.delete(u);
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) {
      dfs(n.id);
    }
  }

  // Populate DAG adjacency and in-degree
  for (const e of dagEdges) {
    adj.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  // Longest-path ranking
  const ranks = new Map<string, number>();
  for (const n of nodes) {
    ranks.set(n.id, 0);
  }

  // Topological sort queue
  const queue: string[] = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id)
    .sort((a, b) => (nodeIndexMap.get(a) ?? 0) - (nodeIndexMap.get(b) ?? 0));

  const topoOrder: string[] = [];
  const processedInDegree = new Map(inDegree);

  while (queue.length > 0) {
    const u = queue.shift()!;
    topoOrder.push(u);

    const neighbors = adj.get(u) ?? [];
    for (const v of neighbors) {
      ranks.set(v, Math.max(ranks.get(v) ?? 0, (ranks.get(u) ?? 0) + 1));
      const curIn = (processedInDegree.get(v) ?? 1) - 1;
      processedInDegree.set(v, curIn);
      if (curIn === 0) {
        queue.push(v);
        queue.sort((a, b) => (nodeIndexMap.get(a) ?? 0) - (nodeIndexMap.get(b) ?? 0));
      }
    }
  }

  // Handle any nodes not reached by topological order (e.g. disconnected components)
  for (const n of nodes) {
    if (!topoOrder.includes(n.id)) {
      ranks.set(n.id, 0);
    }
  }

  let maxRank = 0;
  for (const r of ranks.values()) {
    if (r > maxRank) maxRank = r;
  }

  // Group nodes by rank
  const layers: string[][] = [];
  for (let r = 0; r <= maxRank; r++) {
    layers[r] = [];
  }
  for (const n of nodes) {
    const r = ranks.get(n.id) ?? 0;
    layers[r]!.push(n.id);
  }

  // Initial order in layers by node definition order
  for (let r = 0; r <= maxRank; r++) {
    layers[r]!.sort((a, b) => (nodeIndexMap.get(a) ?? 0) - (nodeIndexMap.get(b) ?? 0));
  }

  // Barycenter ordering (2 sweeps)
  // Predecessors and successors map
  const predsMap = new Map<string, string[]>();
  const succsMap = new Map<string, string[]>();
  for (const n of nodes) {
    predsMap.set(n.id, []);
    succsMap.set(n.id, []);
  }
  for (const e of edges) {
    predsMap.get(e.to)?.push(e.from);
    succsMap.get(e.from)?.push(e.to);
  }

  const getPos = () => {
    const pos = new Map<string, number>();
    for (let r = 0; r <= maxRank; r++) {
      const layer = layers[r]!;
      for (let i = 0; i < layer.length; i++) {
        pos.set(layer[i]!, i);
      }
    }
    return pos;
  };

  // Sweep 1: Forward (rank 1 to maxRank)
  let pos = getPos();
  for (let r = 1; r <= maxRank; r++) {
    const layer = layers[r]!;
    layer.sort((a, b) => {
      const predsA = (predsMap.get(a) ?? []).filter((p) => (ranks.get(p) ?? 0) < r);
      const predsB = (predsMap.get(b) ?? []).filter((p) => (ranks.get(p) ?? 0) < r);

      const bcA =
        predsA.length > 0
          ? predsA.reduce((sum, p) => sum + (pos.get(p) ?? 0), 0) / predsA.length
          : (pos.get(a) ?? 0);
      const bcB =
        predsB.length > 0
          ? predsB.reduce((sum, p) => sum + (pos.get(p) ?? 0), 0) / predsB.length
          : (pos.get(b) ?? 0);

      if (bcA !== bcB) return bcA - bcB;
      return (nodeIndexMap.get(a) ?? 0) - (nodeIndexMap.get(b) ?? 0);
    });
    pos = getPos();
  }

  // Sweep 2: Backward (maxRank - 1 down to 0)
  for (let r = maxRank - 1; r >= 0; r--) {
    const layer = layers[r]!;
    layer.sort((a, b) => {
      const succsA = (succsMap.get(a) ?? []).filter((s) => (ranks.get(s) ?? 0) > r);
      const succsB = (succsMap.get(b) ?? []).filter((s) => (ranks.get(s) ?? 0) > r);

      const bcA =
        succsA.length > 0
          ? succsA.reduce((sum, s) => sum + (pos.get(s) ?? 0), 0) / succsA.length
          : (pos.get(a) ?? 0);
      const bcB =
        succsB.length > 0
          ? succsB.reduce((sum, s) => sum + (pos.get(s) ?? 0), 0) / succsB.length
          : (pos.get(b) ?? 0);

      if (bcA !== bcB) return bcA - bcB;
      return (nodeIndexMap.get(a) ?? 0) - (nodeIndexMap.get(b) ?? 0);
    });
    pos = getPos();
  }

  // Spatial coordinates assignment
  const nodeLayoutMap = new Map<string, { x: number; y: number; w: number; h: number }>();
  // The vertical variant is the phone layout: tighter margins and gaps keep its text near 1:1.
  const padding = isHorizontal ? 56 : 24;
  const rankGap = isHorizontal ? 88 : 64;
  const nodeGap = isHorizontal ? 32 : 16;

  if (isHorizontal) {
    // Columns are ranks along X, layers are vertical rows
    const colWidths: number[] = [];
    const colHeights: number[] = [];

    for (let r = 0; r <= maxRank; r++) {
      const layer = layers[r]!;
      let maxW = 0;
      let totalH = 0;
      for (const id of layer) {
        const node = nodes.find((n) => n.id === id)!;
        const dims = getNodeDimensions(node);
        if (dims.w > maxW) maxW = dims.w;
        totalH += dims.h;
      }
      totalH += Math.max(0, layer.length - 1) * nodeGap;
      colWidths[r] = Math.max(maxW, 148);
      colHeights[r] = totalH;
    }

    const maxColHeight = Math.max(...colHeights, 160);

    // A condition pill or label sits on the wire between two adjacent columns; widen that gap so it fits.
    const gapAfter: number[] = [];
    for (const e of edges) {
      const from = ranks.get(e.from) ?? 0;
      const to = ranks.get(e.to) ?? 0;
      if (Math.abs(to - from) !== 1) continue;
      const need = Math.max(e.condition ? conditionPillWidth(e.condition) : 0, e.label ? e.label.length * 7 + 16 : 0) + 24;
      const r = Math.min(from, to);
      gapAfter[r] = Math.max(gapAfter[r] ?? rankGap, need);
    }

    let curX = padding;
    for (let r = 0; r <= maxRank; r++) {
      const layer = layers[r]!;
      const colW = colWidths[r]!;
      const colH = colHeights[r]!;
      let curY = padding + Math.round((maxColHeight - colH) / 2);

      for (const id of layer) {
        const node = nodes.find((n) => n.id === id)!;
        const dims = getNodeDimensions(node);
        const nodeX = curX + Math.round((colW - dims.w) / 2);
        const nodeY = curY;

        nodeLayoutMap.set(id, {
          x: nodeX,
          y: nodeY,
          w: dims.w,
          h: dims.h,
        });

        curY += dims.h + nodeGap;
      }

      curX += colW + (gapAfter[r] ?? rankGap);
    }
  } else {
    // Vertical (narrow screens): ranks run down the page. A rank wider than three nodes wraps
    // into rows of two, so a phone-width diagram keeps readable text instead of shrinking.
    const maxPerRow = 2;
    const rows: { ids: string[]; lastOfRank: boolean }[] = [];
    for (let r = 0; r <= maxRank; r++) {
      // Nodes fed from above sit in the first row and nodes feeding below in the last, so wires
      // between ranks do not pass under the rank's other rows. The short row comes first.
      const side = (id: string) => {
        if ((succsMap.get(id) ?? []).some((v) => (ranks.get(v) ?? 0) > r)) return 2;
        if ((predsMap.get(id) ?? []).some((v) => (ranks.get(v) ?? 0) < r)) return 0;
        return 1;
      };
      const layer = layers[r]!.map((id, i) => ({ id, i, s: side(id) }))
        .sort((a, b) => a.s - b.s || a.i - b.i)
        .map((x) => x.id);
      const first = layer.length % maxPerRow || maxPerRow;
      for (let i = 0; i < layer.length; i = i === 0 ? first : i + maxPerRow) {
        const end = i === 0 ? first : i + maxPerRow;
        rows.push({ ids: layer.slice(i, end), lastOfRank: end >= layer.length });
      }
    }
    const rowDims = rows.map((row) => {
      let maxH = 0;
      let totalW = 0;
      for (const id of row.ids) {
        const dims = getNodeDimensions(nodes.find((n) => n.id === id)!);
        if (dims.h > maxH) maxH = dims.h;
        totalW += dims.w;
      }
      return {
        h: Math.max(maxH, 64),
        w: totalW + Math.max(0, row.ids.length - 1) * nodeGap,
      };
    });

    const maxRowWidth = Math.max(...rowDims.map((d) => d.w));

    let curY = padding;
    rows.forEach((row, i) => {
      const { h: rowH, w: rowW } = rowDims[i]!;
      let curX = padding + Math.round((maxRowWidth - rowW) / 2);

      for (const id of row.ids) {
        const dims = getNodeDimensions(nodes.find((n) => n.id === id)!);
        nodeLayoutMap.set(id, {
          x: curX,
          y: curY + Math.round((rowH - dims.h) / 2),
          w: dims.w,
          h: dims.h,
        });
        curX += dims.w + nodeGap;
      }

      curY += rowH + (row.lastOfRank ? rankGap : nodeGap);
    });
  }

  // Calculate depths for groups
  const groupMap = new Map<string, Group>();
  for (const g of diagram.groups) {
    groupMap.set(g.id, g);
  }

  const groupDepths = new Map<string, number>();
  for (const g of diagram.groups) {
    let depth = 1;
    let curr = g.parent;
    while (curr) {
      depth++;
      curr = groupMap.get(curr)?.parent;
      if (depth > 10) break;
    }
    groupDepths.set(g.id, depth);
  }

  // Build group bounding boxes
  const layoutGroups: LayoutGroup[] = [];
  const groupPadding = { top: 38, left: 24, right: 24, bottom: 24 };

  for (const g of diagram.groups) {
    // Find all nodes in this group or its subgroups
    const memberNodeIds: string[] = [];
    for (const n of nodes) {
      let gId: string | undefined = n.group;
      let depthLimit = 0;
      while (gId && depthLimit++ < 10) {
        if (gId === g.id) {
          memberNodeIds.push(n.id);
          break;
        }
        gId = groupMap.get(gId)?.parent;
      }
    }

    if (memberNodeIds.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const id of memberNodeIds) {
        const lNode = nodeLayoutMap.get(id);
        if (lNode) {
          if (lNode.x < minX) minX = lNode.x;
          if (lNode.y < minY) minY = lNode.y;
          if (lNode.x + lNode.w > maxX) maxX = lNode.x + lNode.w;
          if (lNode.y + lNode.h > maxY) maxY = lNode.y + lNode.h;
        }
      }

      const gx = Math.round(minX - groupPadding.left);
      const gy = Math.round(minY - groupPadding.top);
      const gw = Math.round(maxX - minX + groupPadding.left + groupPadding.right);
      const gh = Math.round(maxY - minY + groupPadding.top + groupPadding.bottom);

      layoutGroups.push({
        id: g.id,
        x: gx,
        y: gy,
        w: gw,
        h: gh,
        depth: groupDepths.get(g.id) ?? 1,
      });
    }
  }

  // Sort groups by depth ascending so outer groups render before inner ones
  layoutGroups.sort((a, b) => a.depth - b.depth);

  // Compute overall bounding box
  let minAllX = Infinity;
  let minAllY = Infinity;
  let maxAllX = 0;
  let maxAllY = 0;

  for (const lNode of nodeLayoutMap.values()) {
    if (lNode.x < minAllX) minAllX = lNode.x;
    if (lNode.y < minAllY) minAllY = lNode.y;
    if (lNode.x + lNode.w > maxAllX) maxAllX = lNode.x + lNode.w;
    if (lNode.y + lNode.h > maxAllY) maxAllY = lNode.y + lNode.h;
  }
  for (const g of layoutGroups) {
    if (g.x < minAllX) minAllX = g.x;
    if (g.y < minAllY) minAllY = g.y;
    if (g.x + g.w > maxAllX) maxAllX = g.x + g.w;
    if (g.y + g.h > maxAllY) maxAllY = g.y + g.h;
  }

  // Shift if negative coordinates exist
  const shiftX = minAllX < padding ? Math.round(padding - minAllX) : 0;
  const shiftY = minAllY < padding ? Math.round(padding - minAllY) : 0;

  if (shiftX > 0 || shiftY > 0) {
    for (const lNode of nodeLayoutMap.values()) {
      lNode.x += shiftX;
      lNode.y += shiftY;
    }
    for (const g of layoutGroups) {
      g.x += shiftX;
      g.y += shiftY;
    }
    maxAllX += shiftX;
    maxAllY += shiftY;
  }

  // Construct LayoutNode array in original diagram node order
  const layoutNodes: LayoutNode[] = [];
  for (const n of nodes) {
    const lNode = nodeLayoutMap.get(n.id)!;
    const nx = Math.round(lNode.x);
    const ny = Math.round(lNode.y);
    const nw = Math.round(lNode.w);
    const nh = Math.round(lNode.h);

    layoutNodes.push({
      id: n.id,
      x: nx,
      y: ny,
      w: nw,
      h: nh,
      ports: {
        n: { x: Math.round(nx + nw / 2), y: ny },
        e: { x: nx + nw, y: Math.round(ny + nh / 2) },
        s: { x: Math.round(nx + nw / 2), y: ny + nh },
        w: { x: nx, y: Math.round(ny + nh / 2) },
      },
    });
  }

  const finalWidth = Math.max(Math.round(maxAllX + padding), isHorizontal ? 320 : 240);
  const finalHeight = Math.max(Math.round(maxAllY + padding), 160);

  return {
    width: finalWidth,
    height: finalHeight,
    nodes: layoutNodes,
    groups: layoutGroups,
  };
}
