import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { easeOutCubic } from "../core/math.js";
import {
  RANGES,
  availableRanges,
  changeFromStart,
  lerpPoints,
  nearestIndex,
  resample,
  ridgePoints,
  sliceRange,
  smoothPath,
  type Close,
  type RangeId,
} from "./landscape.js";

export interface MarketLandscapeProps {
  /** Daily closes for the front ridge, oldest first. `null` while loading, `[]` when none are stored. */
  closes: readonly Close[] | null;
  /** What the closes are, e.g. "SPY". Shown on the badge and in the caption. */
  label: string;
  /** The text side of the hero: title, summary and index chips. */
  children: ReactNode;
}

// The art is drawn in a 1000×300 box and stretched to the card; strokes keep their width.
const W = 1000;
const H = 300;
// The real ridge spans PAD..W-PAD so the newest close and its badge never touch the card edge.
const PAD = 50;
const FRONT = { width: W - PAD * 2, top: 92, bottom: 214 };
const SAMPLES = 160;
const MORPH_MS = 750;

// Decorative far ranges. They carry no numbers.
const FAR = [
  "M0 300 L0 170 C60 150 95 118 150 128 C205 138 230 92 300 84 C360 77 392 122 440 116 C500 108 540 66 610 58 C670 52 700 100 760 104 C820 108 850 72 910 80 C950 86 975 104 1000 98 L1000 300 Z",
  "M0 300 L0 196 C70 182 110 160 170 166 C240 174 270 140 330 136 C400 132 420 170 480 166 C540 162 580 120 650 118 C720 116 740 150 800 152 C860 154 900 126 960 132 L1000 136 L1000 300 Z",
  "M0 300 L0 224 C80 214 130 196 200 204 C270 212 300 186 370 184 C440 182 470 210 540 206 C610 202 650 178 720 182 C790 186 820 206 890 200 C940 196 970 190 1000 192 L1000 300 Z",
];
const DECORATIVE_FRONT = resample(
  [
    { x: 0, y: 214 },
    { x: 120, y: 190 },
    { x: 230, y: 206 },
    { x: 360, y: 160 },
    { x: 470, y: 184 },
    { x: 590, y: 128 },
    { x: 700, y: 158 },
    { x: 820, y: 104 },
    { x: 900, y: 136 },
    { x: 1000, y: 120 },
  ],
  SAMPLES,
);

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(2)}%`;
const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const day = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True while the element is on screen and the tab is visible, so motion can pause otherwise. */
function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let seen = false;
    const update = () => setOn(seen && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      seen = Boolean(entry?.isIntersecting);
      update();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [ref]);
  return on;
}

/**
 * Manthan's signature market hero: a night landscape whose front ridge is the real price of `label`.
 * Hover or scrub to read any close; the range chips morph the ridge between periods.
 */
export function MarketLandscape({ closes, label, children }: MarketLandscapeProps) {
  const id = useId().replace(/:/g, "");
  const host = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const active = useOnScreen(host);

  const ranges = useMemo(() => availableRanges(closes?.length ?? 0), [closes]);
  const [range, setRange] = useState<RangeId>("3M");
  const current = ranges.includes(range) ? range : (ranges.at(-1) ?? "1M");
  const sessions = RANGES.find((r) => r.id === current)!.sessions;
  const series = useMemo(() => sliceRange(closes ?? [], sessions), [closes, sessions]);
  const hasData = series.length >= 2;
  const points = useMemo(
    () => ridgePoints(series, FRONT).map((p) => ({ x: p.x + PAD, y: p.y })),
    [series],
  );
  const target = useMemo(
    () => (hasData ? resample(points, SAMPLES) : DECORATIVE_FRONT),
    [hasData, points],
  );

  // Morph the ridge from its current shape to the new range instead of snapping.
  const [shape, setShape] = useState(target);
  const shapeRef = useRef(shape);
  shapeRef.current = shape;
  useEffect(() => {
    const from = shapeRef.current;
    if (reducedMotion() || from.length !== target.length) {
      setShape(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / MORPH_MS);
      setShape(lerpPoints(from, target, easeOutCubic(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const last = series.length - 1;
  const [pinned, setPinned] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => setPinned(null), [current]);
  const index = Math.min(last, hover ?? pinned ?? last);
  const point = points[index];
  const close = series[index];
  const change = hasData ? changeFromStart(series, index) : null;
  const [displayChange, setDisplayChange] = useState(change);
  useEffect(() => {
    if (change == null || reducedMotion() || !active) {
      setDisplayChange(change);
      return;
    }
    const from = displayChange ?? change;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 420);
      const eased = 1 - (1 - t) ** 3;
      setDisplayChange(from + (change - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [change, active]);
  const spoken = RANGES.find((r) => r.id === current)!.spoken;

  // Run the ridge flat out to both edges so the range reads as one landscape.
  const line = smoothPath(
    shape.length ? [{ x: 0, y: shape[0]!.y }, ...shape, { x: W, y: shape.at(-1)!.y }] : [],
  );
  const area = line ? `${line} L${W} ${H} L0 ${H} Z` : "";

  const pick = (clientX: number) => {
    const box = art.current?.getBoundingClientRect();
    if (!box || !hasData) return;
    const pad = (PAD / W) * box.width;
    setHover(nearestIndex(clientX - box.left - pad, box.width - pad * 2, series.length));
  };

  return (
    <div
      ref={host}
      className="sk-land"
      data-active={active ? "true" : "false"}
      data-state={closes === null ? "loading" : hasData ? "ready" : "empty"}
      onPointerMove={(e) => {
        if ((e.target as HTMLElement).closest(".sk-land-controls")) {
          setHover(null);
          return;
        }
        const rect = art.current?.getBoundingClientRect();
        const overArt = Boolean(
          rect &&
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom,
        );
        if (!overArt && !(e.target as HTMLElement).closest(".sk-market-strip")) return;
        pick(e.clientX);
        if (overArt && rect) {
          art.current?.style.setProperty(
            "--sk-parallax-x",
            `${((e.clientX - rect.left) / rect.width - 0.5) * 8}px`,
          );
          art.current?.style.setProperty(
            "--sk-parallax-y",
            `${((e.clientY - rect.top) / rect.height - 0.5) * 4}px`,
          );
        }
      }}
      onPointerLeave={() => {
        setHover(null);
        art.current?.style.setProperty("--sk-parallax-x", "0px");
        art.current?.style.setProperty("--sk-parallax-y", "0px");
      }}
    >
      <div className="sk-land-copy">{children}</div>

      <div
        ref={art}
        className="sk-land-art"
        data-hovering={hover !== null ? "true" : "false"}
        data-tone={change == null ? "flat" : change >= 0 ? "up" : "down"}
      >
        <div className="sk-land-stars" aria-hidden="true" />
        <div className="sk-land-stars sk-land-stars-b" aria-hidden="true" />
        <div className="sk-land-sun" aria-hidden="true" />
        <svg
          className="sk-land-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role={hasData ? "img" : undefined}
          aria-hidden={hasData ? undefined : "true"}
          aria-label={
            hasData
              ? `${label} daily closes over ${spoken}, ${day(series[0]!.date)} to ${day(series[last]!.date)}: ${money(series[0]!.close)} to ${money(series[last]!.close)}.`
              : undefined
          }
        >
          <defs>
            <linearGradient id={`${id}-far0`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--sk-land-far-0)" />
              <stop offset="1" stopColor="var(--sk-land-far-0)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-far1`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--sk-land-far-1)" />
              <stop offset="1" stopColor="var(--sk-land-far-1)" stopOpacity=".1" />
            </linearGradient>
            <linearGradient id={`${id}-far2`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--sk-land-far-2)" />
              <stop offset="1" stopColor="var(--sk-land-far-2)" stopOpacity=".2" />
            </linearGradient>
            <linearGradient id={`${id}-front`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--sk-land-front-top)" />
              <stop offset=".55" stopColor="var(--sk-land-front-mid)" />
              <stop offset="1" stopColor="var(--sk-land-front-low)" />
            </linearGradient>
            <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="var(--si-violet)" stopOpacity=".5" />
              <stop offset=".6" stopColor="var(--si-cyan)" />
              <stop offset="1" stopColor="var(--si-cyan)" />
            </linearGradient>
            <filter id={`${id}-glow`} x="-5%" y="-40%" width="110%" height="180%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          {FAR.map((d, i) => (
            <path
              key={i}
              className={`sk-land-far sk-land-far-${i}`}
              d={d}
              fill={`url(#${id}-far${i})`}
            />
          ))}
          <path className="sk-land-front" d={area} fill={`url(#${id}-front)`} />
          <path
            className="sk-land-edge-glow"
            d={line}
            fill="none"
            stroke={`url(#${id}-edge)`}
            strokeWidth="6"
            filter={`url(#${id}-glow)`}
          />
          <path
            className="sk-land-edge"
            d={line}
            fill="none"
            stroke={`url(#${id}-edge)`}
            strokeWidth="2"
            pathLength={1}
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="sk-land-flow"
            d={line}
            fill="none"
            pathLength={1}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="sk-land-mist" aria-hidden="true" />

        {hasData && point && close && (
          <div
            className="sk-land-marker"
            data-testid="landscape-marker"
            data-index={index}
            style={{
              left: `${(point.x / W) * 100}%`,
              top: `${(point.y / H) * 100}%`,
              ["--sk-land-drop-height" as string]: `${((art.current?.clientHeight ?? H) * (H - point.y)) / H}px`,
            }}
          >
            <span className="sk-land-drop" aria-hidden="true" />
            <span className="sk-land-dot" aria-hidden="true" />
            <span
              className="sk-land-badge"
              data-tone={change == null ? "flat" : change >= 0 ? "up" : "down"}
              data-edge={point.x > W * 0.82 ? "end" : point.x < W * 0.18 ? "start" : "mid"}
              role="status"
              aria-live="off"
              title={`Change in ${label}'s closing price from ${day(series[0]!.date)} to ${day(close.date)}.`}
            >
              <b aria-label={change == null ? "Change unknown" : pct(change)}>
                {displayChange == null ? "—" : pct(displayChange)}
              </b>
              <small>
                {label} {money(close.close)} · {day(close.date)}
              </small>
            </span>
          </div>
        )}
      </div>

      <div className="sk-land-controls">
        {hasData ? (
          <>
            <div className="sk-land-ranges" role="group" aria-label={`${label} period`}>
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={r === current}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              className="sk-land-scrub"
              type="range"
              min={0}
              max={last}
              value={index}
              aria-label={`Scrub through ${label} closes`}
              aria-valuetext={close ? `${day(close.date)}, ${money(close.close)}` : undefined}
              onChange={(e) => setPinned(Number(e.target.value))}
              style={{ ["--sk-land-fill" as string]: `${last ? (index / last) * 100 : 100}%` }}
            />
            <span className="sk-land-caption">
              {label} · {day(series[0]!.date)} – {day(series[last]!.date)}
            </span>
          </>
        ) : (
          <span className="sk-land-caption" role="note">
            {closes === null ? `Loading ${label} history…` : `${label} history unavailable`}
          </span>
        )}
      </div>
    </div>
  );
}
