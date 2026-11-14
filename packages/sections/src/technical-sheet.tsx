'use client';
/**
 * TechnicalSheet: a system topology drawn as an engineering sheet — frame, dimension line, row
 * labels, request edges with labels, dashed response edges, dotted telemetry, keyboard-operable
 * node boxes and a title block. The ink draws itself in once (pathLength=1), and a packet walks
 * the request trip in a SMIL loop that pauses off screen and is not rendered under reduced motion.
 *
 * Origin: amsborse.github.io redesign, `src/designs/blueprint/HeroDrawing.tsx` (+ the `.bp-hero`
 * rules in `src/designs/design-art.css`). Lift-and-shift: copy this file and
 * `technical-sheet.css`, plus `@arsenal/motion`'s `path-packets.tsx`, `use-pause-svg-offscreen.ts`,
 * `motion-gate.ts` and `draw-in.css` (or import them from the package).
 *
 * Everything product-specific (nodes, rows, edges, trip, title block) comes in as props.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  PathPackets,
  onMotionPreferenceChange,
  shouldReduceMotion,
  usePauseSvgOffscreen,
} from '@arsenal/motion';

export interface TechnicalSheetNode {
  id: string;
  /** Box title (large mono line). */
  name: string;
  /** Optional second line (small caps line), rendered as given. */
  meta?: string;
  /** Top-left corner in viewBox units. */
  x: number;
  y: number;
  /** Accessible name; defaults to `Inspect <name>`. */
  ariaLabel?: string;
}

export interface TechnicalSheetRow {
  id: string;
  label: string;
  /** Where the row label sits (it is drawn 10 units above `y`). */
  x: number;
  y: number;
}

export interface TechnicalSheetEdge {
  id: string;
  /** SVG path data. */
  d: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelAnchor?: 'start' | 'middle' | 'end';
}

export interface TechnicalSheetTitleBlock {
  /** Top-left corner of the 220×92 block. */
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  /** Bottom-left cell, e.g. `SHEET 01 / 01`. */
  sheet?: string;
  /** Bottom-right cell, e.g. `SCALE NTS`. */
  scale?: string;
}

export interface TechnicalSheetDimension {
  label: string;
  from: number;
  to: number;
  y: number;
}

export type TechnicalSheetNodeState = 'idle' | 'hover' | 'failed';

export interface TechnicalSheetProps {
  nodes: readonly TechnicalSheetNode[];
  rows?: readonly TechnicalSheetRow[];
  /** Solid edges that carry a request (drawn in, labelled, arrowed). */
  requests?: readonly TechnicalSheetEdge[];
  /** Dashed return edges. */
  responses?: readonly TechnicalSheetEdge[];
  /** Dotted side-channel paths (path data only). */
  telemetry?: readonly string[];
  /** Edge ids (requests or responses) the packet walks, in order. Empty: no packets. */
  trip?: readonly string[];
  titleBlock?: TechnicalSheetTitleBlock;
  dimension?: TechnicalSheetDimension;
  /** Accessible name of the whole drawing. */
  ariaLabel: string;
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  /** Prefix row labels with `01 · `, `02 · `… */
  numberRows?: boolean;
  /** Seconds each trip leg takes. */
  legSeconds?: number;
  /** Delay before the first packet (lets the draw-in finish). */
  packetBeginSeconds?: number;
  /** Monospace advance per character used by `fit()` for each text size. */
  advance?: Partial<TechnicalSheetAdvance>;
  /** Controlled hovered node id; omit to let the sheet track hover itself. */
  hovered?: string | null;
  failed?: string | null;
  /** Force motion on or off; omitted, the user's preference (and `data-motion=paused`) decides. */
  reducedMotion?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  className?: string;
}

export interface TechnicalSheetAdvance {
  name: number;
  meta: number;
  sheet: number;
}

export const TECHNICAL_SHEET_DEFAULTS = {
  width: 800,
  height: 530,
  nodeWidth: 150,
  nodeHeight: 56,
  legSeconds: 0.85,
  packetBeginSeconds: 1.4,
  advance: { name: 7.8, meta: 4.65, sheet: 6.5 },
} as const;

const TITLE_BLOCK = { width: 220, height: 92 } as const;

/** Squeeze a label into `room` only when its estimated width would overflow it. */
export function fit(
  text: string,
  advance: number,
  room: number,
): { textLength: number; lengthAdjust: 'spacingAndGlyphs' } | Record<string, never> {
  if (!(advance > 0) || !Number.isFinite(advance)) {
    throw new RangeError(`fit: advance must be a positive number (got ${advance})`);
  }
  if (!(room > 0) || !Number.isFinite(room)) {
    throw new RangeError(`fit: room must be a positive number (got ${room})`);
  }
  return text.length * advance > room ? { textLength: room, lengthAdjust: 'spacingAndGlyphs' } : {};
}

function assertFinite(what: string, value: number) {
  if (!Number.isFinite(value))
    throw new TypeError(`TechnicalSheet: ${what} must be a finite number`);
}
function assertPositive(what: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`TechnicalSheet: ${what} must be a positive number (got ${value})`);
  }
}
function assertUnique(what: string, ids: readonly string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (id.trim() === '') throw new TypeError(`TechnicalSheet: ${what} id is empty`);
    if (seen.has(id)) throw new TypeError(`TechnicalSheet: duplicate ${what} id "${id}"`);
    seen.add(id);
  }
}

/** Throws on input the sheet cannot draw faithfully: duplicate ids, unknown trip legs, bad sizes. */
export function validateTechnicalSheet(props: TechnicalSheetProps): void {
  const {
    nodes,
    rows = [],
    requests = [],
    responses = [],
    trip = [],
    width = TECHNICAL_SHEET_DEFAULTS.width,
    height = TECHNICAL_SHEET_DEFAULTS.height,
    nodeWidth = TECHNICAL_SHEET_DEFAULTS.nodeWidth,
    nodeHeight = TECHNICAL_SHEET_DEFAULTS.nodeHeight,
    legSeconds = TECHNICAL_SHEET_DEFAULTS.legSeconds,
    packetBeginSeconds = TECHNICAL_SHEET_DEFAULTS.packetBeginSeconds,
    advance,
    ariaLabel,
  } = props;
  if (ariaLabel.trim() === '') throw new TypeError('TechnicalSheet: ariaLabel is empty');
  assertPositive('width', width);
  assertPositive('height', height);
  assertPositive('nodeWidth', nodeWidth);
  assertPositive('nodeHeight', nodeHeight);
  assertPositive('legSeconds', legSeconds);
  if (!Number.isFinite(packetBeginSeconds) || packetBeginSeconds < 0) {
    throw new RangeError('TechnicalSheet: packetBeginSeconds must be zero or more');
  }
  if (advance) {
    for (const [key, value] of Object.entries(advance)) assertPositive(`advance.${key}`, value);
  }
  if (nodeWidth <= 24)
    throw new RangeError('TechnicalSheet: nodeWidth must leave room for text (> 24)');
  assertUnique(
    'node',
    nodes.map((n) => n.id),
  );
  for (const n of nodes) {
    assertFinite(`node "${n.id}" x`, n.x);
    assertFinite(`node "${n.id}" y`, n.y);
  }
  assertUnique(
    'row',
    rows.map((r) => r.id),
  );
  const edges = [...requests, ...responses];
  assertUnique(
    'edge',
    edges.map((e) => e.id),
  );
  for (const e of edges) {
    if (e.d.trim() === '') throw new TypeError(`TechnicalSheet: edge "${e.id}" has no path data`);
  }
  const known = new Set(edges.map((e) => e.id));
  for (const leg of trip) {
    if (!known.has(leg))
      throw new TypeError(`TechnicalSheet: trip leg "${leg}" is not a known edge`);
  }
}

function usePrefersReducedMotion(forced: boolean | undefined): boolean {
  // Until mounted, assume reduced: the server never ships packets, so hydration always matches.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (forced !== undefined) return;
    setReduced(shouldReduceMotion());
    return onMotionPreferenceChange(setReduced);
  }, [forced]);
  return forced ?? reduced;
}

export function TechnicalSheet(props: TechnicalSheetProps) {
  validateTechnicalSheet(props);
  const {
    nodes,
    rows = [],
    requests = [],
    responses = [],
    telemetry = [],
    trip = [],
    titleBlock,
    dimension,
    ariaLabel,
    width = TECHNICAL_SHEET_DEFAULTS.width,
    height = TECHNICAL_SHEET_DEFAULTS.height,
    nodeWidth: W = TECHNICAL_SHEET_DEFAULTS.nodeWidth,
    nodeHeight: H = TECHNICAL_SHEET_DEFAULTS.nodeHeight,
    numberRows = true,
    legSeconds = TECHNICAL_SHEET_DEFAULTS.legSeconds,
    packetBeginSeconds = TECHNICAL_SHEET_DEFAULTS.packetBeginSeconds,
    hovered,
    failed = null,
    onHover,
    onSelect,
    className,
  } = props;
  const advance = { ...TECHNICAL_SHEET_DEFAULTS.advance, ...props.advance };
  const reducedMotion = usePrefersReducedMotion(props.reducedMotion);
  const svg = useRef<SVGSVGElement>(null);
  usePauseSvgOffscreen(svg, !reducedMotion && trip.length > 0);

  const [ownHover, setOwnHover] = useState<string | null>(null);
  const hoveredId = hovered === undefined ? ownHover : hovered;
  const hover = (id: string | null) => {
    setOwnHover(id);
    onHover?.(id);
  };

  // useId can contain characters that break `url(#…)` references.
  const uid = `ts${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const arrow = `url(#${uid}-arrow)`;
  const route = new Map([...requests, ...responses].map((e) => [e.id, e.d]));

  return (
    <div className={['arsenal-tsheet', className].filter(Boolean).join(' ')}>
      <svg
        ref={svg}
        className="arsenal-tsheet__sheet"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={ariaLabel}
        style={{ ['--arsenal-tsheet-hatch' as string]: `url(#${uid}-hatch)` }}
      >
        <defs>
          <marker
            id={`${uid}-arrow`}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L8 4 L0 8 z" className="arsenal-tsheet__arrowhead" />
          </marker>
          <pattern
            id={`${uid}-hatch`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" className="arsenal-tsheet__hatch" />
          </pattern>
        </defs>

        <rect
          className="arsenal-tsheet__frame arsenal-draw-in"
          x="6"
          y="6"
          width={width - 12}
          height={height - 12}
          pathLength={1}
        />

        {dimension && (
          <g className="arsenal-tsheet__dimension">
            <path
              className="arsenal-draw-in"
              d={`M${dimension.from} ${dimension.y} H${dimension.to}`}
              pathLength={1}
              markerStart={arrow}
              markerEnd={arrow}
            />
            <path
              d={`M${dimension.from} ${dimension.y - 8} V${dimension.y + 10} M${dimension.to} ${dimension.y - 8} V${dimension.y + 10}`}
            />
            <text
              x={(dimension.from + dimension.to) / 2}
              y={dimension.y - 5}
              textAnchor="middle"
              className="arsenal-tsheet__dim-label"
            >
              {dimension.label}
            </text>
          </g>
        )}

        {rows.map((row, index) => (
          <text key={row.id} className="arsenal-tsheet__row-label" x={row.x} y={row.y - 10}>
            {numberRows ? `${String(index + 1).padStart(2, '0')} · ${row.label}` : row.label}
          </text>
        ))}

        <g className="arsenal-tsheet__telemetry">
          {telemetry.map((d, index) => (
            <path key={`${index}:${d}`} d={d} markerEnd={arrow} />
          ))}
        </g>
        <g className="arsenal-tsheet__responses">
          {responses.map((edge) => (
            <path key={edge.id} d={edge.d} markerEnd={arrow} />
          ))}
        </g>
        <g className="arsenal-tsheet__requests">
          {requests.map((edge) => (
            <g key={edge.id}>
              <path className="arsenal-draw-in" d={edge.d} pathLength={1} markerEnd={arrow} />
              {edge.label && edge.labelX !== undefined && edge.labelY !== undefined && (
                <text x={edge.labelX} y={edge.labelY} textAnchor={edge.labelAnchor ?? 'middle'}>
                  {edge.label}
                </text>
              )}
            </g>
          ))}
        </g>

        {nodes.map((node) => {
          const state: TechnicalSheetNodeState =
            failed === node.id ? 'failed' : hoveredId === node.id ? 'hover' : 'idle';
          const select = () => onSelect?.(node.id);
          return (
            <g
              key={node.id}
              className="arsenal-tsheet__node"
              data-state={state}
              data-node={node.id}
              transform={`translate(${node.x} ${node.y})`}
              role="button"
              tabIndex={0}
              aria-label={node.ariaLabel ?? `Inspect ${node.name}`}
              onPointerEnter={() => hover(node.id)}
              onPointerLeave={() => hover(null)}
              onFocus={() => hover(node.id)}
              onBlur={() => hover(null)}
              onClick={select}
              onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }}
            >
              <rect
                className="arsenal-tsheet__box arsenal-draw-in arsenal-draw-in--late"
                width={W}
                height={H}
                pathLength={1}
              />
              <rect className="arsenal-tsheet__box-fill" x="3" y="3" width={W - 6} height={H - 6} />
              <path
                className="arsenal-tsheet__ticks"
                d={`M-5 0 H5 M0 -5 V5 M${W - 5} ${H} H${W + 5} M${W} ${H - 5} V${H + 5}`}
              />
              <text
                className="arsenal-tsheet__node-name"
                x="12"
                y={Math.round(H * 0.43)}
                {...fit(node.name, advance.name, W - 24)}
              >
                {node.name}
              </text>
              {node.meta && (
                <text
                  className="arsenal-tsheet__node-meta"
                  x="12"
                  y={Math.round(H * 0.75)}
                  {...fit(node.meta, advance.meta, W - 24)}
                >
                  {node.meta}
                </text>
              )}
            </g>
          );
        })}

        {titleBlock && (
          <g
            className="arsenal-tsheet__title-block"
            transform={`translate(${titleBlock.x} ${titleBlock.y})`}
          >
            <rect
              className="arsenal-draw-in"
              width={TITLE_BLOCK.width}
              height={TITLE_BLOCK.height}
              pathLength={1}
            />
            <path d="M0 30 H220 M0 61 H220 M120 61 V92" />
            <text x="10" y="20" className="arsenal-tsheet__tb-strong">
              {titleBlock.title}
            </text>
            {titleBlock.subtitle && (
              <text x="10" y="50" {...fit(titleBlock.subtitle, advance.sheet, 200)}>
                {titleBlock.subtitle}
              </text>
            )}
            {titleBlock.sheet && (
              <text x="10" y="81">
                {titleBlock.sheet}
              </text>
            )}
            {titleBlock.scale && (
              <text x="130" y="81">
                {titleBlock.scale}
              </text>
            )}
          </g>
        )}

        {!reducedMotion && trip.length > 0 && (
          <PathPackets
            paths={trip.map((leg) => route.get(leg) ?? '')}
            legSeconds={legSeconds}
            beginSeconds={packetBeginSeconds}
            className="arsenal-tsheet__packet"
          />
        )}
      </svg>
    </div>
  );
}
