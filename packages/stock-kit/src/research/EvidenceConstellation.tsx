import { useMemo, useState } from "react";
import { layoutEvidence, type EvidenceItem } from "./layout.js";
import "./research.css";

type Signal = { key: string; polarity: string; explanation: string };
type Props = {
  symbol: string;
  bull: string[];
  bear: string[];
  signals: Signal[];
  peers: { symbol: string }[];
  dimensions?: Record<string, { score: number }>;
};
const side = (polarity: string): EvidenceItem["polarity"] => {
  const value = polarity.toLowerCase();
  return value.includes("bull") || value.includes("positive")
    ? "positive"
    : value.includes("bear") || value.includes("negative")
      ? "negative"
      : "neutral";
};
const title = (polarity: EvidenceItem["polarity"]) =>
  polarity === "positive"
    ? "Supports"
    : polarity === "negative"
      ? "Weighs against"
      : "Neutral signal";

export function EvidenceConstellation({ symbol, bull, bear, signals, peers, dimensions }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const items = useMemo<EvidenceItem[]>(
    () => [
      ...bull.map((text, i) => ({
        id: `bull-${i}`,
        text,
        kind: "bull" as const,
        polarity: "positive" as const,
      })),
      ...bear.map((text, i) => ({
        id: `bear-${i}`,
        text,
        kind: "bear" as const,
        polarity: "negative" as const,
      })),
      ...signals.map((signal, i) => ({
        id: `signal-${i}`,
        text: `${signal.key}: ${signal.explanation}`,
        kind: "signal" as const,
        polarity: side(signal.polarity),
      })),
      ...Object.entries(dimensions ?? {}).map(([key, dimension], i) => ({
        id: `dimension-${i}`,
        text: `${key}: ${dimension.score}`,
        kind: "signal" as const,
        polarity: "neutral" as const,
      })),
      ...peers.map((peer, i) => ({
        id: `peer-${i}`,
        text: peer.symbol,
        kind: "peer" as const,
        polarity: "peer" as const,
      })),
    ],
    [bull, bear, signals, peers, dimensions],
  );
  const positioned = useMemo(() => layoutEvidence(items), [items]);
  const drawn = new Set(positioned.map((item) => item.id));
  const sides = ["positive", "negative", "neutral"] as const;
  const groups = sides.map((polarity) => ({
    polarity,
    entries: items.filter((item) => item.kind !== "peer" && item.polarity === polarity),
  }));
  const svgDescription = `${symbol} evidence constellation: ${bull.length} supporting items, ${bear.length} opposing items, ${signals.length} signals and ${peers.length} peers.`;
  return (
    <div className="sk-constellation">
      <figure className="sk-constellation-figure" aria-label={svgDescription}>
        <svg
          className="sk-constellation-svg"
          viewBox="0 0 100 100"
          role="img"
          aria-label={svgDescription}
        >
          {positioned
            .filter((item) => item.kind !== "peer")
            .map((item) => (
              <line
                key={`edge-${item.id}`}
                x1="50"
                y1="50"
                x2={item.x}
                y2={item.y}
                className={`sk-edge sk-edge-${item.polarity} ${active === item.id ? "sk-edge-active" : ""}`}
              >
                <title>{title(item.polarity)}</title>
              </line>
            ))}
          {positioned
            .filter((item) => item.kind === "peer")
            .map((item) => (
              <line
                key={`edge-${item.id}`}
                x1="50"
                y1="50"
                x2={item.x}
                y2={item.y}
                className="sk-edge"
              >
                <title>Peer</title>
              </line>
            ))}
          {positioned.map((item) => (
            <g
              key={item.id}
              className={`sk-node sk-node-${item.polarity} ${active === item.id ? "sk-node-active" : ""}`}
              transform={`translate(${item.x} ${item.y})`}
              tabIndex={0}
              role="button"
              aria-label={`${item.kind === "peer" ? "Peer:" : title(item.polarity)} ${item.text}`}
              onFocus={() => setActive(item.id)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(item.id)}
              onMouseLeave={() => setActive(null)}
            >
              <circle r={item.kind === "peer" ? 2.1 : 2.6} />
              {item.kind === "bull" || item.kind === "bear" ? (
                <text className="sk-node-index">{Number(item.id.split("-").at(-1)) + 1}</text>
              ) : (
                <text y={item.kind === "peer" ? 4.6 : 5.2}>
                  {item.kind === "peer" ? item.text : item.text.split(":")[0]!.slice(0, 12)}
                </text>
              )}
            </g>
          ))}
          <g className="sk-node-center" transform="translate(50 50)">
            <circle r="6" />
            <text y=".5">{symbol}</text>
          </g>
        </svg>
      </figure>
      <div className="sk-constellation-list" aria-label="Evidence details">
        {groups.map(({ polarity, entries }) => (
          <section key={polarity} className="sk-evidence-group">
            <h4>{title(polarity)}</h4>
            <ul className="sk-evidence-items">
              {entries.map((item) => (
                <li key={item.id}>
                  <button
                    className={`sk-evidence-row ${active === item.id ? "sk-evidence-row-active" : ""}`}
                    type="button"
                    onFocus={() => setActive(item.id)}
                    onBlur={() => setActive(null)}
                    onMouseEnter={() => setActive(item.id)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <span
                      className={`sk-evidence-mark sk-evidence-mark-${item.polarity}`}
                      aria-hidden="true"
                    />
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
            <p className="sk-more" aria-live="polite">
              {entries.filter((item) => !drawn.has(item.id)).length > 0
                ? `+${entries.filter((item) => !drawn.has(item.id)).length} more shown in list`
                : null}
            </p>
          </section>
        ))}
        <section className="sk-evidence-group">
          <h4>Peers</h4>
          <ul className="sk-evidence-items">
            {items
              .filter((item) => item.kind === "peer")
              .map((item) => (
                <li key={item.id}>
                  <button
                    className={`sk-evidence-row ${active === item.id ? "sk-evidence-row-active" : ""}`}
                    type="button"
                    onFocus={() => setActive(item.id)}
                    onBlur={() => setActive(null)}
                    onMouseEnter={() => setActive(item.id)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <span className="sk-evidence-mark sk-evidence-mark-peer" aria-hidden="true" />
                    Peer: {item.text}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
