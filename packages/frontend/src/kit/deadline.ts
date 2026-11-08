/**
 * Explicit-deadline extraction from free text (from AdhocPluginAndExtention `extractors/deadline.ts`).
 * Only deadlines stated in the text are returned; nothing is invented. `dueAt` is filled only for
 * unambiguous relative phrases ("within 48 hours", "by tomorrow", "by EOD"); otherwise it is null.
 */

export interface DeadlineMatch {
  /** The phrase as written, e.g. "Friday at 5pm", "Oct 30", "48 hours". */
  phrase: string;
  /** Absolute time when it can be computed without guessing; null otherwise. */
  dueAt: Date | null;
}

const MONTH =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const DAY = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday';
const TIME = '(?:\\s+(?:at|by)\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|est|pst|cst|mst|utc)?)?';

const DEADLINE_PATTERNS: RegExp[] = [
  new RegExp(
    `\\b(?:by|before|until|due by|deadline is|no later than)\\s+((?:(?:${DAY})[,\\s]+)?(?:${MONTH})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*,\\s*\\d{4})?${TIME})`,
    'i',
  ),
  new RegExp(`\\b(?:by|before|until|due by|no later than)\\s+((?:${DAY})${TIME})`, 'i'),
  /\b(?:within|in)\s+(\d+\s+(?:business\s+)?(?:hours?|days?|weeks?))\b/i,
  /\b(?:by|before)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?:\s+(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/i,
  /\b(?:by|before)\s+(end of day|eod|tomorrow(?:\s+morning|\s+afternoon|\s+eod)?)\b/i,
];

// Guard against false positives like "by mail" or "before joining".
const FALSE_POSITIVE = /^(mail|phone|us|them|joining|starting|asking|replying|all|any)$/i;

const endOfDay = (d: Date): Date => {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
};

function resolveDueAt(phrase: string, now: Date): Date | null {
  const p = phrase.toLowerCase();
  const rel = /^(\d+)\s+(hours?|days?|weeks?)$/.exec(p);
  if (rel) {
    const n = Number(rel[1]);
    const unitMs = rel[2]!.startsWith('hour')
      ? 3_600_000
      : rel[2]!.startsWith('day')
        ? 86_400_000
        : 604_800_000;
    return new Date(now.getTime() + n * unitMs);
  }
  if (p === 'eod' || p === 'end of day') return endOfDay(now);
  if (p === 'tomorrow' || p === 'tomorrow eod') {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return endOfDay(t);
  }
  return null; // Weekdays, dates, business days, "tomorrow morning": not computed without a timezone/calendar.
}

export function extractDeadline(text: string, now: Date = new Date()): DeadlineMatch | null {
  if (!text) return null;
  for (const pattern of DEADLINE_PATTERNS) {
    const phrase = pattern.exec(text)?.[1]?.trim();
    if (phrase && !FALSE_POSITIVE.test(phrase)) return { phrase, dueAt: resolveDueAt(phrase, now) };
  }
  return null;
}
