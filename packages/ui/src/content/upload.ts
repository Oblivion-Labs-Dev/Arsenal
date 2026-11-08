/**
 * Whether a file matches an `accept` list like ".pdf,.docx,image/*,text/plain".
 * Drag-and-drop skips the file input's own `accept` check, so drops are checked with this.
 * An empty list accepts everything.
 */
export function acceptsFile(file: { name: string; type: string }, accept: string): boolean {
  const rules = accept
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

/** Clamp a 0..1 progress fraction to a whole percent. Non-finite input is treated as 0. */
export function progressPercent(fraction: number): number {
  if (!Number.isFinite(fraction)) return 0;
  return Math.round(Math.min(1, Math.max(0, fraction)) * 100);
}
