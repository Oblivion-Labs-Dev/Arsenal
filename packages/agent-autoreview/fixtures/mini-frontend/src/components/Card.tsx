export function Card({ title }: { title: string }) {
  return (
    <button data-testid="component-card" onClick={() => undefined}>
      {title}
    </button>
  );
}
