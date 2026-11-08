/**
 * Small display formatters (CareerOS `markets/format.ts`, Sutra `timeUntil`).
 * Invalid input reads as an explicit placeholder, never as a guessed value.
 * Locale-aware absolute dates live in `@oblivion-labs-dev/arsenal-shared` (`formatDate`).
 */

/** "just now", "5 min ago", "3h ago", "yesterday", "4d ago"; "never" for empty, "unknown" for invalid. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const minutes = Math.round((now - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/** Time remaining until `iso`: "5 min", "3 h", "12 d", "4 mo". "unknown" for invalid, "now" when past. */
export function timeUntil(iso: string, now: number = Date.now()): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return 'unknown';
  const minutes = Math.round((target - now) / 60_000);
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days < 60 ? `${days} d` : `${Math.round(days / 30)} mo`;
}

/** "Mar 4" style short date; "—" for empty or invalid input. */
export function shortDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/** `plural(1, "item")` → "1 item", `plural(3, "child", "children")` → "3 children". */
export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

/** Host without `www.`; returns the input unchanged when it is not a URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
