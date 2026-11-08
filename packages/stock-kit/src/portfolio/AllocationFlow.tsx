import { useEffect, useMemo, useState } from "react";
import "./portfolio.css";

export type AllocationSlice = { key: string; label: string; value: number };
type Props = { slices: AllocationSlice[]; total?: number; currencyLabel?: string };
const money = (value: number, currencyLabel?: string) =>
  `${currencyLabel ?? ""}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const colors = [
  "var(--si-violet)",
  "var(--si-cyan)",
  "var(--si-indigo)",
  "var(--warn)",
  "var(--muted)",
];
const shareArray = (slices: AllocationSlice[], total: number) => {
  let offset = 0;
  return slices.map((slice) => {
    const length = (slice.value / total) * 100;
    const result = { ...slice, length, offset };
    offset -= length;
    return result;
  });
};

export function AllocationFlow({ slices, total, currencyLabel }: Props) {
  const valid = useMemo(
    () => slices.filter((slice) => Number.isFinite(slice.value) && slice.value > 0),
    [slices],
  );
  const sum = total ?? valid.reduce((value, slice) => value + slice.value, 0);
  const target = useMemo(() => shareArray(valid, sum), [valid, sum]);
  const [shown, setShown] = useState(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    const from = shown;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(
        target.map((slice) => {
          const previous = from.find((item) => item.key === slice.key) ?? {
            ...slice,
            length: 0,
            offset: slice.offset,
          };
          return {
            ...slice,
            length: previous.length + (slice.length - previous.length) * eased,
            offset: previous.offset + (slice.offset - previous.offset) * eased,
          };
        }),
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  if (valid.length === 0 || !(sum > 0)) return <p className="sk-empty">No holdings yet</p>;
  const totalLabel = money(sum, currencyLabel);
  const aria = `Allocation across ${valid.length} holdings, total ${totalLabel}.`;
  return (
    <div className="sk-allocation" aria-label={aria}>
      <div className="sk-allocation-chart">
        <svg viewBox="0 0 100 100" role="img" aria-label={aria}>
          <circle className="sk-donut-track" cx="50" cy="50" r="33" />
          {shown.map((slice, index) => (
            <circle
              key={slice.key}
              className="sk-donut-segment"
              style={{ stroke: colors[index % colors.length] }}
              cx="50"
              cy="50"
              r="33"
              pathLength="100"
              strokeDasharray={`${slice.length} ${100 - slice.length}`}
              strokeDashoffset={slice.offset}
            />
          ))}
          <text className="sk-donut-total" x="50" y="49">
            {totalLabel}
          </text>
          <text className="sk-donut-caption" x="50" y="56">
            allocated value
          </text>
        </svg>
      </div>
      <ul className="sk-allocation-legend">
        {valid.map((slice, index) => (
          <li key={slice.key} className="sk-allocation-row">
            <span
              className="sk-allocation-swatch"
              style={{ background: colors[index % colors.length] }}
              aria-hidden="true"
            />
            <span>{slice.label}</span>
            <span className="sk-allocation-value">
              {money(slice.value, currencyLabel)} · {((slice.value / sum) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
