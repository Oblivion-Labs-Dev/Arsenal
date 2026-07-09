import { ArsenalAppShell } from "@/components/arsenal-app-shell";
import { FeatureAreaPage } from "@/components/feature-area-page";
import { FEATURE_AREAS, getFeatureBySlug } from "@/lib/feature-catalog";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return FEATURE_AREAS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) return { title: "Feature — Arsenal" };
  return {
    title: `${feature.title} — Arsenal`,
    description: feature.tagline,
  };
}

export default async function FeatureSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) notFound();

  return (
    <ArsenalAppShell title={feature.title} subtitle={feature.tagline}>
      <FeatureAreaPage feature={feature} />
    </ArsenalAppShell>
  );
}
