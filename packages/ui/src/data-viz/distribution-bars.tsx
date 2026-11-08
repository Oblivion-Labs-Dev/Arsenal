import { cn } from '../lib/cn';
import { ChartDataTable } from './chart-data-table';
import { distributionShares } from './chart-geometry';

export interface DistributionBucket {
  key: string;
  label: string;
  /** Count in the bucket. `null` is shown as unknown and draws no bar. */
  count: number | null;
}

export interface DistributionBarsProps {
  buckets: DistributionBucket[];
  /** Accessible name and table caption. */
  label: string;
  color?: string;
  className?: string;
}

/** Horizontal bars showing how a total splits across buckets, as label / bar / count rows. */
export function DistributionBars({
  buckets,
  label,
  color = 'var(--arsenal-accent)',
  className,
}: DistributionBarsProps) {
  const { total, shares } = distributionShares(buckets.map((b) => b.count));
  return (
    <figure className={cn('m-0', className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <div
        aria-hidden="true"
        className="grid items-center gap-x-3 gap-y-1.5 text-sm"
        style={{ gridTemplateColumns: 'minmax(0,max-content) 1fr max-content' }}
      >
        {buckets.map((bucket, i) => {
          const known = bucket.count !== null && Number.isFinite(bucket.count);
          return (
            <div key={bucket.key} className="contents">
              <span className="truncate text-[var(--arsenal-text-secondary)]">{bucket.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[var(--arsenal-elevated)]">
                <span
                  className="block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${(shares[i]!.share * 100).toFixed(2)}%`, background: color }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums text-[var(--arsenal-text-primary)]">
                {known ? bucket.count : 'unknown'}
              </span>
            </div>
          );
        })}
      </div>
      <ChartDataTable
        caption={`${label} (total ${total})`}
        columns={['Bucket', 'Count', 'Share']}
        rows={buckets.map((b, i) => [
          b.label,
          b.count,
          b.count === null ? null : `${Math.round(shares[i]!.share * 100)}%`,
        ])}
      />
    </figure>
  );
}
