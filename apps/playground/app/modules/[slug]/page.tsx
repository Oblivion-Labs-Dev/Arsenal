import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FEATURE_AREAS, getFeatureBySlug } from '@/lib/feature-catalog';

export function generateStaticParams() {
  return FEATURE_AREAS.map((feature) => ({ slug: feature.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  return feature ? { title: feature.title, description: feature.tagline } : { title: 'Not found' };
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();
  const index = FEATURE_AREAS.findIndex((f) => f.slug === slug);
  const next = FEATURE_AREAS[(index + 1) % FEATURE_AREAS.length];

  return (
    <div className="site-container">
      <nav aria-label="Breadcrumb" className="pt-8 text-sm text-arsenal-secondary">
        <Link href="/modules" className="transition-colors hover:text-arsenal-primary">
          Modules
        </Link>
        <span className="mx-2 text-arsenal-muted">/</span>
        <span>{feature.title}</span>
      </nav>

      <header className="mt-5 max-w-3xl">
        <h1 className="site-title">{feature.title}</h1>
        <p className="site-lede mt-4">{feature.description}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {feature.packages.map((pkg) => (
            <span
              key={pkg}
              className="rounded-md border border-arsenal-border bg-arsenal-surface px-3 py-1 font-mono text-xs text-arsenal-primary"
            >
              {pkg}
            </span>
          ))}
        </div>
      </header>

      <dl className="site-card mt-12 grid divide-y divide-arsenal-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {feature.metrics.map((metric) => (
          <div key={metric.label} className="p-6">
            <dt className="site-label">{metric.label}</dt>
            <dd className="mt-3 text-2xl font-medium text-arsenal-primary">
              {metric.value}
            </dd>
            <dd className="mt-1 text-sm text-arsenal-secondary">{metric.hint}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-16 grid gap-12 lg:grid-cols-[320px_1fr]">
        <section aria-label="How it works">
          <h2 className="text-xl font-semibold tracking-tight text-arsenal-primary">
            How it works
          </h2>
          <ol className="mt-6">
            {feature.playbook.map((step, i) => (
              <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                {i < feature.playbook.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-arsenal-border"
                  />
                ) : null}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arsenal-border bg-arsenal-surface font-mono text-xs text-arsenal-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm text-arsenal-secondary">{step}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Capabilities">
          <h2 className="text-xl font-semibold tracking-tight text-arsenal-primary">
            What you get
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {feature.capabilities.map((cap) => (
              <li key={cap.name} className="site-card p-5">
                <div className="font-semibold text-arsenal-primary">{cap.name}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-arsenal-secondary">
                  {cap.description}
                </p>
                <div className="mt-4 font-mono text-xs text-arsenal-secondary">{cap.package}</div>
                {cap.outputs ? (
                  <div className="mt-1 text-xs text-arsenal-secondary">Outputs: {cap.outputs}</div>
                ) : null}
              </li>
            ))}
          </ul>
          {feature.relatedLinks?.length ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {feature.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href.replace(/^\/features\//, '/modules/')}
                  className="rounded-lg border border-arsenal-border px-4 py-2 text-sm font-medium text-arsenal-primary transition-colors hover:border-arsenal-border-hover"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {next && next.slug !== feature.slug ? (
        <Link
          href={`/modules/${next.slug}`}
          className="site-card group mt-20 flex items-center justify-between gap-6 p-6"
        >
          <div>
            <div className="site-label">Next module</div>
            <div className="mt-2 text-lg font-semibold text-arsenal-primary">{next.title}</div>
            <div className="mt-1 text-sm text-arsenal-secondary">{next.tagline}</div>
          </div>
          <span className="font-mono text-xs text-arsenal-muted">Next module</span>
        </Link>
      ) : null}
    </div>
  );
}
