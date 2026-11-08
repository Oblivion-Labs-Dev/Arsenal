import type { Metadata } from 'next';
import { ComponentLibrary } from '@/components/library/component-library';

export const metadata: Metadata = {
  title: 'Components',
  description: 'Every Arsenal UI component, live. Find one, see it move, copy it.',
};

export default function ComponentsPage() {
  return <ComponentLibrary />;
}
