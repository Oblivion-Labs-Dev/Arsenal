import { ArsenalAppShell } from '@/components/arsenal-app-shell';
import { UiComponentShowcase } from '@/components/ui-component-showcase';

export const metadata = {
  title: 'Component Gallery - Arsenal UI',
  description:
    'Interactive Arsenal UI gallery with live components, playground controls, blueprints, and curated collections.',
};

export default function ComponentsPage() {
  return (
    <ArsenalAppShell
      title="Component Gallery"
      subtitle="Explore live components, visual prop controls, full-page blueprints, and curated interface collections."
    >
      <UiComponentShowcase />
    </ArsenalAppShell>
  );
}
