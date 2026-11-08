import { UI_COMPONENT_CATALOG } from '@arsenal/ui/catalog';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComponentDetail } from '@/components/library/component-detail';
import { getCatalogEntry } from '@/lib/catalog';

export function generateStaticParams() {
  return UI_COMPONENT_CATALOG.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = getCatalogEntry(id);
  return entry ? { title: entry.name, description: entry.description } : { title: 'Not found' };
}

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getCatalogEntry(id);
  if (!entry) notFound();
  return <ComponentDetail entry={entry} />;
}
