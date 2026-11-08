import type { LayoutNode, LayoutResult } from "./layout.js";
import type { Diagram, Edge, EdgeStyle } from "./schema.js";

export type PortName = "n" | "e" | "s" | "w";

export interface RoutedEdge {
  id: string;
  from: string;
  to: string;
  style: EdgeStyle;
  path: string;
  labelX: number;
  labelY: number;
  length: number;
  dashed: boolean;
  bidirectional: boolean;
  animated: boolean;
  kind: Edge["kind"];
  condition?: string;
  label?: string;
  fromPort: PortName;
  toPort: PortName;
}

function pickPorts(
  source: LayoutNode,
  target: LayoutNode,
  isHorizontal: boolean,
): { fromPort: PortName; toPort: PortName } {
  const scx = source.x + source.w / 2;
  const scy = source.y + source.h / 2;
  const tcx = target.x + target.w / 2;
  const tcy = target.y + target.h / 2;
  const dx = tcx - scx;
  const dy = tcy - scy;

  if (isHorizontal) {
    if (dx >= source.w / 3) {
      return { fromPort: "e", toPort: "w" };
    }
    if (dx <= -source.w / 3) {
      // Loop or backward edge
      if (dy > 20) return { fromPort: "s", toPort: "s" };
      if (dy < -20) return { fromPort: "n", toPort: "n" };
      return { fromPort: "s", toPort: "s" };
    }
    // Roughly same column
    if (dy > 0) return { fromPort: "s", toPort: "n" };
    return { fromPort: "n", toPort: "s" };
  } else {
    // Vertical layout
    if (dy >= source.h / 3) {
      return { fromPort: "s", toPort: "n" };
    }
    if (dy <= -source.h / 3) {
      // Loop or backward edge
      if (dx > 20) return { fromPort: "e", toPort: "e" };
      if (dx < -20) return { fromPort: "w", toPort: "w" };
      return { fromPort: "e", toPort: "e" };
    }
    // Roughly same row
    if (dx > 0) return { fromPort: "e", toPort: "w" };
    return { fromPort: "w", toPort: "e" };
  }
}

function getPortNormal(port: PortName): { x: number; y: number } {
  switch (port) {
    case "n":
      return { x: 0, y: -1 };
    case "s":
      return { x: 0, y: 1 };
    case "e":
      return { x: 1, y: 0 };
    case "w":
      return { x: -1, y: 0 };
  }
}

/**
 * Route each diagram edge between port anchors based on layout coordinates.
 * Deterministic, pure function of layout and diagram.
 */
export function routeEdges(
  diagram: Diagram,
  layout: LayoutResult,
  forcedLayout?: "horizontal" | "vertical",
): RoutedEdge[] {
  const isHorizontal = (forcedLayout ?? diagram.layout) === "horizontal";
  const nodeMap = new Map<string, LayoutNode>();
  for (const n of layout.nodes) {
    nodeMap.set(n.id, n);
  }

  // Group edges by connected pair to calculate symmetric parallel offsets
  const pairGroups = new Map<string, Edge[]>();
  for (const edge of diagram.edges) {
    const key = [edge.from, edge.to].sort().join(":::");
    let list = pairGroups.get(key);
    if (!list) {
      list = [];
      pairGroups.set(key, list);
    }
    list.push(edge);
  }

  const routedEdges: RoutedEdge[] = [];

  for (const edge of diagram.edges) {
    const source = nodeMap.get(edge.from);
    const target = nodeMap.get(edge.to);

    if (!source || !target) {
      continue;
    }

    const { fromPort, toPort } = pickPorts(source, target, isHorizontal);
    const p1 = source.ports[fromPort];
    const p2 = target.ports[toPort];

    if (!p1 || !p2) {
      continue;
    }

    // Calculate parallel offset
    const key = [edge.from, edge.to].sort().join(":::");
    const siblings = pairGroups.get(key) ?? [edge];
    const siblingIndex = siblings.findIndex((e) => e.id === edge.id);
    const count = siblings.length;
    let offset = 0;
    if (count > 1) {
      const step = edge.kind === "parallel" && siblings.every((item) => item.kind === "parallel")
        ? 12 / (count - 1)
        : 20;
      offset = Math.round((siblingIndex - (count - 1) / 2) * step);
      if (edge.from > edge.to) {
        offset = -offset;
      }
    }

    const style = edge.style ?? "curved";
    let path: string;
    let labelX: number;
    let labelY: number;
    let length: number;

    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;

    if (edge.kind === "feedback") {
      // Feedback paths leave from the outward-facing port and arc around the node pair.
      // Controls are placed beyond the pair's bounds so the return never cuts through either node.
      if (isHorizontal) {
        const side = fromPort === "n" || fromPort === "s" ? (fromPort === "n" ? -1 : 1) : (y2 <= y1 ? -1 : 1);
        const outsideY = Math.round((side < 0 ? Math.min(y1, y2) : Math.max(y1, y2)) + side * (64 + Math.abs(offset)));
        const cx1 = Math.round(x1 + (x2 - x1) / 3);
        const cx2 = Math.round(x1 + (x2 - x1) * 2 / 3);
        path = `M ${x1} ${y1} C ${cx1} ${outsideY}, ${cx2} ${outsideY}, ${x2} ${y2}`;
        labelX = Math.round((cx1 + cx2) / 2);
        labelY = outsideY + side * 10;
        length = Math.round(Math.hypot(x2 - x1, outsideY - y1) + Math.hypot(x2 - x1, y2 - outsideY));
      } else {
        const side = fromPort === "w" || fromPort === "e" ? (fromPort === "w" ? -1 : 1) : (x2 <= x1 ? -1 : 1);
        const outsideX = Math.round((side < 0 ? Math.min(x1, x2) : Math.max(x1, x2)) + side * (64 + Math.abs(offset)));
        const cy1 = Math.round(y1 + (y2 - y1) / 3);
        const cy2 = Math.round(y1 + (y2 - y1) * 2 / 3);
        path = `M ${x1} ${y1} C ${outsideX} ${cy1}, ${outsideX} ${cy2}, ${x2} ${y2}`;
        labelX = outsideX + side * 10;
        labelY = Math.round((cy1 + cy2) / 2);
        length = Math.round(Math.hypot(outsideX - x1, y2 - y1) + Math.hypot(x2 - outsideX, y2 - y1));
      }
    } else if (style === "straight") {
      if (offset === 0) {
        path = `M ${x1} ${y1} L ${x2} ${y2}`;
        labelX = Math.round((x1 + x2) / 2);
        labelY = Math.round((y1 + y2) / 2) - 10;
        length = Math.round(Math.hypot(x2 - x1, y2 - y1));
      } else {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dLen = Math.hypot(dx, dy) || 1;
        const nx = -dy / dLen;
        const ny = dx / dLen;
        const ox1 = Math.round(x1 + nx * offset);
        const oy1 = Math.round(y1 + ny * offset);
        const ox2 = Math.round(x2 + nx * offset);
        const oy2 = Math.round(y2 + ny * offset);
        path = `M ${ox1} ${oy1} L ${ox2} ${oy2}`;
        labelX = Math.round((ox1 + ox2) / 2);
        labelY = Math.round((oy1 + oy2) / 2) - 10;
        length = Math.round(Math.hypot(ox2 - ox1, oy2 - oy1));
      }
    } else if (style === "orthogonal") {
      if (fromPort === "e" && toPort === "w") {
        if (y1 === y2 && offset === 0) {
          path = `M ${x1} ${y1} L ${x2} ${y2}`;
          labelX = Math.round((x1 + x2) / 2);
          labelY = y1 - 10;
          length = Math.abs(x2 - x1);
        } else {
          const midX = Math.round((x1 + x2) / 2) + offset;
          const r = Math.min(12, Math.abs(midX - x1) / 2, Math.abs(y2 - y1) / 2);
          const signY = y2 >= y1 ? 1 : -1;
          const signX = x2 >= midX ? 1 : -1;
          path = `M ${x1} ${y1} L ${midX - signX * r} ${y1} Q ${midX} ${y1} ${midX} ${y1 + signY * r} L ${midX} ${y2 - signY * r} Q ${midX} ${y2} ${midX + signX * r} ${y2} L ${x2} ${y2}`;
          labelX = midX + 8;
          labelY = Math.round((y1 + y2) / 2);
          length = Math.abs(midX - x1) + Math.abs(y2 - y1) + Math.abs(x2 - midX);
        }
      } else if (fromPort === "s" && toPort === "n") {
        if (x1 === x2 && offset === 0) {
          path = `M ${x1} ${y1} L ${x2} ${y2}`;
          labelX = x1 + 10;
          labelY = Math.round((y1 + y2) / 2);
          length = Math.abs(y2 - y1);
        } else {
          const midY = Math.round((y1 + y2) / 2) + offset;
          const r = Math.min(12, Math.abs(midY - y1) / 2, Math.abs(x2 - x1) / 2);
          const signX = x2 >= x1 ? 1 : -1;
          const signY = y2 >= midY ? 1 : -1;
          path = `M ${x1} ${y1} L ${x1} ${midY - signY * r} Q ${x1} ${midY} ${x1 + signX * r} ${midY} L ${x2 - signX * r} ${midY} Q ${x2} ${midY} ${x2} ${midY + signY * r} L ${x2} ${y2}`;
          labelX = Math.round((x1 + x2) / 2);
          labelY = midY - 10;
          length = Math.abs(midY - y1) + Math.abs(x2 - x1) + Math.abs(y2 - midY);
        }
      } else {
        const midX = Math.round((x1 + x2) / 2) + offset;
        path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
        labelX = midX;
        labelY = Math.round((y1 + y2) / 2);
        length = Math.abs(midX - x1) + Math.abs(y2 - y1) + Math.abs(x2 - midX);
      }
    } else {
      // style === "curved" (cubic bezier)
      if (fromPort === "e" && toPort === "w") {
        if (x2 > x1) {
          const spanX = x2 - x1;
          const cx1 = Math.round(x1 + spanX * 0.5);
          const cy1 = Math.round(y1 + offset);
          const cx2 = Math.round(x2 - spanX * 0.5);
          const cy2 = Math.round(y2 + offset);
          path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
          labelX = Math.round(0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2);
          labelY = Math.round(0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2) - 10;
          length = Math.round(Math.hypot(x2 - x1, y2 - y1) * 1.15);
        } else {
          // Backward / loop edge
          const loopDepth = Math.max(Math.abs(y2 - y1), 80) + Math.abs(offset);
          const dirY = y2 >= y1 ? 1 : -1;
          const cx1 = Math.round(x1 + 64);
          const cy1 = Math.round(y1 + dirY * loopDepth);
          const cx2 = Math.round(x2 - 64);
          const cy2 = Math.round(y2 + dirY * loopDepth);
          path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
          labelX = Math.round((cx1 + cx2) / 2);
          labelY = Math.round((cy1 + cy2) / 2);
          length = Math.round(Math.hypot(x2 - x1, y2 - y1) + loopDepth * 2);
        }
      } else if (fromPort === "s" && toPort === "n") {
        if (y2 > y1) {
          const spanY = y2 - y1;
          const cx1 = Math.round(x1 + offset);
          const cy1 = Math.round(y1 + spanY * 0.5);
          const cx2 = Math.round(x2 + offset);
          const cy2 = Math.round(y2 - spanY * 0.5);
          path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
          labelX = Math.round(0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2) + 10;
          labelY = Math.round(0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2);
          length = Math.round(Math.hypot(x2 - x1, y2 - y1) * 1.15);
        } else {
          const loopDepth = Math.max(Math.abs(x2 - x1), 80) + Math.abs(offset);
          const dirX = x2 >= x1 ? 1 : -1;
          const cx1 = Math.round(x1 + dirX * loopDepth);
          const cy1 = Math.round(y1 + 64);
          const cx2 = Math.round(x2 + dirX * loopDepth);
          const cy2 = Math.round(y2 - 64);
          path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
          labelX = Math.round((cx1 + cx2) / 2);
          labelY = Math.round((cy1 + cy2) / 2);
          length = Math.round(Math.hypot(x2 - x1, y2 - y1) + loopDepth * 2);
        }
      } else {
        const norm1 = getPortNormal(fromPort);
        const norm2 = getPortNormal(toPort);
        const dist = Math.max(Math.hypot(x2 - x1, y2 - y1) * 0.4, 40);
        const cx1 = Math.round(x1 + norm1.x * dist + (norm1.y !== 0 ? offset : 0));
        const cy1 = Math.round(y1 + norm1.y * dist + (norm1.x !== 0 ? offset : 0));
        const cx2 = Math.round(x2 + norm2.x * dist + (norm2.y !== 0 ? offset : 0));
        const cy2 = Math.round(y2 + norm2.y * dist + (norm2.x !== 0 ? offset : 0));
        path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
        labelX = Math.round(0.125 * x1 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * x2);
        labelY = Math.round(0.125 * y1 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * y2) - 10;
        length = Math.round(Math.hypot(x2 - x1, y2 - y1) * 1.15);
      }
    }

    routedEdges.push({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      style,
      path,
      labelX,
      labelY,
      length: Math.max(length, 10),
      dashed: Boolean(edge.dashed),
      bidirectional: Boolean(edge.bidirectional),
      animated: Boolean(edge.animated),
      kind: edge.kind ?? "flow",
      ...(edge.condition ? { condition: edge.condition } : {}),
      ...(edge.label ? { label: edge.label } : {}),
      fromPort,
      toPort,
    });
  }

  return routedEdges;
}
