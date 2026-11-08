/** Deep hues that keep white initials readable on both light and dark pages. */
export const AVATAR_HUES: readonly string[] = [
  '#475569', // slate
  '#0F766E', // teal
  '#1E40AF', // blue
  '#6B21A8', // purple
  '#9D174D', // rose
  '#854D0E', // bronze
  '#374151', // gray
  '#065F46', // emerald
];

/** Stable, non-negative 32-bit string hash (Java-style `31 * h + c`). */
export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** The same seed always maps to the same color. */
export function avatarColor(seed: string, palette: readonly string[] = AVATAR_HUES): string {
  if (palette.length === 0) throw new Error('avatarColor: palette must not be empty');
  return palette[hashString(seed) % palette.length]!;
}

/**
 * Up to `max` initials from a name or email. Leading symbols are skipped and an email uses its
 * local part. Returns "?" when nothing usable is left, so an unknown sender stays visibly unknown.
 */
export function initialsFor(name: string, max = 1): string {
  if (!Number.isInteger(max) || max < 1)
    throw new Error('initialsFor: max must be a positive integer');
  const at = name.indexOf('@');
  const base = at >= 0 ? name.slice(0, at) : name;
  const words = base
    .split(/[\s._-]+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, ''))
    .filter(Boolean);
  const letters = words.slice(0, max).map((w) => [...w][0]!.toUpperCase());
  return letters.length > 0 ? letters.join('') : '?';
}
