/**
 * Decorative-line collision detector.
 * Samples points along SVG path data / line segments and compares to protected rects.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  source: string;
}

export interface DecorativeLineFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  lineSource: string;
  targetSelector: string;
  explanation: string;
  recommendedFix: string;
}

export interface DecorativeScene {
  protectedRects: Array<{ selector: string; rect: Rect; kind: "text" | "control" | "card" | "icon" }>;
  lines: LineSegment[];
  /** Simple SVG path `d` attributes for sampling */
  svgPaths?: Array<{ id: string; d: string; transform?: string }>;
}

function pointInRect(x: number, y: number, r: Rect, pad = 1): boolean {
  return x >= r.x - pad && x <= r.right + pad && y >= r.y - pad && y <= r.bottom + pad;
}

function sampleSegment(line: LineSegment, samples = 20): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    pts.push({
      x: line.x1 + (line.x2 - line.x1) * t,
      y: line.y1 + (line.y2 - line.y1) * t,
    });
  }
  return pts;
}

/** Minimal path sampler for M/L absolute commands and simple C approximations. */
export function sampleSvgPath(d: string, samplesPerSeg = 12): Array<{ x: number; y: number }> {
  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) ?? [];
  const points: Array<{ x: number; y: number }> = [];
  let cx = 0;
  let cy = 0;
  for (const cmd of commands) {
    const type = cmd[0]!;
    const nums = (cmd.slice(1).match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (type === "M" || type === "L") {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = nums[i]!;
        const y = nums[i + 1]!;
        if (type === "L") {
          points.push(...sampleSegment({ x1: cx, y1: cy, x2: x, y2: y, source: "path" }, samplesPerSeg));
        }
        cx = x;
        cy = y;
        points.push({ x, y });
      }
    } else if (type === "H") {
      for (const x of nums) {
        points.push(...sampleSegment({ x1: cx, y1: cy, x2: x, y2: cy, source: "path" }, samplesPerSeg));
        cx = x;
      }
    } else if (type === "V") {
      for (const y of nums) {
        points.push(...sampleSegment({ x1: cx, y1: cy, x2: cx, y2: y, source: "path" }, samplesPerSeg));
        cy = y;
      }
    } else if (type === "C" && nums.length >= 6) {
      // Approximate cubic as line to end point with mid samples
      for (let i = 0; i + 5 < nums.length; i += 6) {
        const x = nums[i + 4]!;
        const y = nums[i + 5]!;
        const mx = (cx + nums[i]! + nums[i + 2]! + x) / 4;
        const my = (cy + nums[i + 1]! + nums[i + 3]! + y) / 4;
        points.push({ x: mx, y: my });
        points.push(...sampleSegment({ x1: cx, y1: cy, x2: x, y2: y, source: "path" }, samplesPerSeg));
        cx = x;
        cy = y;
      }
    }
  }
  return points;
}

export function detectDecorativeLineCollisions(
  scene: DecorativeScene,
): DecorativeLineFinding[] {
  const findings: DecorativeLineFinding[] = [];
  let n = 0;

  const allPoints: Array<{ x: number; y: number; source: string }> = [];
  for (const line of scene.lines) {
    for (const p of sampleSegment(line)) {
      allPoints.push({ ...p, source: line.source });
    }
  }
  for (const path of scene.svgPaths ?? []) {
    for (const p of sampleSvgPath(path.d)) {
      allPoints.push({ ...p, source: path.id });
    }
  }

  for (const target of scene.protectedRects) {
    let hits = 0;
    let source = "";
    for (const p of allPoints) {
      if (pointInRect(p.x, p.y, target.rect, 2)) {
        hits += 1;
        source = p.source;
      }
    }
    if (hits < 2) continue;

    const isText = target.kind === "text";
    const isControl = target.kind === "control";
    findings.push({
      id: `deco-line-${++n}`,
      severity: isText || isControl ? "high" : "medium",
      confidence: Math.min(0.95, 0.55 + hits * 0.05),
      lineSource: source,
      targetSelector: target.selector,
      explanation:
        hits >= 4
          ? `Decorative line (${source}) crosses ${target.kind} ${target.selector}`
          : `Decorative line (${source}) likely intersects ${target.kind} ${target.selector}`,
      recommendedFix:
        "Offset the connector/timeline/decoration or reposition the protected content so lines do not reduce readability",
    });
  }

  return findings;
}
