export interface MarketIndex {
  symbol: string;
  name: string;
  day: number | null;
}

export interface MarketBreadth {
  advancing: number;
  declining: number;
  unchanged: number;
}

export interface MarketStripProps {
  indexes: MarketIndex[];
  breadth: MarketBreadth | null;
  asOf: string | null;
  stale?: boolean;
}

const signedMove = (day: number | null) =>
  day === null ? "unknown" : `${day > 0 ? "▲ +" : day < 0 ? "▼ " : ""}${(day * 100).toFixed(2)}%`;

export function MarketStrip({ indexes, breadth, asOf, stale = false }: MarketStripProps) {
  const total = breadth ? breadth.advancing + breadth.declining : 0;
  const advancingShare = total ? (breadth!.advancing / total) * 100 : 0;
  const decliningShare = total ? (breadth!.declining / total) * 100 : 0;
  const summary = breadth
    ? `${breadth.advancing} advancing, ${breadth.declining} declining, ${breadth.unchanged} unchanged`
    : "Breadth unknown";
  return (
    <section
      className="sk-market-strip"
      aria-label={`Market indexes and breadth. ${summary}${asOf ? ` as of ${asOf}` : ""}.`}
    >
      <div className="sk-market-indexes">
        {indexes.length ? (
          indexes.map((index) => {
            const tone =
              index.day === null
                ? "unknown"
                : index.day > 0
                  ? "positive"
                  : index.day < 0
                    ? "negative"
                    : "flat";
            return (
              <article
                className="sk-market-index"
                key={index.symbol}
                tabIndex={0}
                aria-label={`${index.symbol}, ${index.name}`}
                title={`${index.symbol} · ${index.name}`}
              >
                <span className="sk-market-index-symbol">{index.symbol}</span>
                <span className="sk-market-index-name">{index.name}</span>
                <strong
                  className={`sk-market-index-move is-${tone}`}
                  aria-label={`${index.name} ${index.day === null ? "move unknown" : `moved ${signedMove(index.day)}`}`}
                >
                  {signedMove(index.day)}
                </strong>
              </article>
            );
          })
        ) : (
          <p className="sk-market-empty">No index data is available.</p>
        )}
      </div>
      <div className="sk-market-breadth" aria-label={summary}>
        <div className="sk-market-breadth-heading">
          <strong>Market breadth</strong>
          <span>{summary}</span>
        </div>
        <div className="sk-market-breadth-track" role="img" aria-label={summary}>
          <span className="sk-market-advancing" style={{ width: `${advancingShare}%` }} />
          <span className="sk-market-declining" style={{ width: `${decliningShare}%` }} />
        </div>
        <div className="sk-market-breadth-counts">
          <span>{breadth ? `${breadth.advancing} advancing` : "Advancing unknown"}</span>
          <span>{breadth ? `${breadth.declining} declining` : "Declining unknown"}</span>
          <span>{breadth ? `${breadth.unchanged} unchanged` : "Unchanged unknown"}</span>
        </div>
      </div>
      <p className={`sk-market-asof${stale ? " is-stale" : ""}`}>
        {stale && <span aria-hidden="true" />}{" "}
        {stale ? `as of ${asOf ?? "unknown"}` : `As of ${asOf ?? "unknown"}`}
      </p>
    </section>
  );
}
