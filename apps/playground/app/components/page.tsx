import { ArsenalAppShell } from "@/components/arsenal-app-shell";
import { UiComponentShowcase } from "@/components/ui-component-showcase";

export const metadata = {
  title: "Components — Arsenal UI",
  description: "Live previews and copy-paste snippets for every @arsenal/ui component.",
};

export default function ComponentsPage() {
  return (
    <ArsenalAppShell
      title="UI Components"
      subtitle="Import @arsenal/ui into any repo — preview every component and copy the code."
    >
      <UiComponentShowcase />
    </ArsenalAppShell>
  );
}
