// Deterministic date mentions: ISO (2026-11-12), "12 November 2026", "Nov 12, 2026",
// "November 2026", numeric 12/11/2026 (both day/month readings kept), and a bare year only after a
// time word ("in 2024", "since 2019") so ordinary four-digit counts stay numbers.

export interface CalendarDate {
  year: number;
  /** 1-12, absent at year precision. */
  month?: number;
  /** Absent at month or year precision. */
  day?: number;
}

export interface DateMention {
  start: number;
  end: number;
  text: string;
  /** Every reading of the mention; numeric dates like 03/04/2026 have two. */
  readings: CalendarDate[];
}

const MONTH =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ORD = '(?:st|nd|rd|th)?';
const YEAR = '((?:19|20)\\d{2})';
const TIME_WORDS =
  'in|since|by|from|until|till|through|to|during|of|early|late|mid|year|before|after';

type Reader = (m: RegExpExecArray) => CalendarDate[];

const month = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
const n = (s: string | undefined) => (s === undefined ? undefined : Number(s));

/** Most specific first: an accepted span blocks overlapping, less specific readings. */
const PATTERNS: [RegExp, Reader][] = [
  [
    new RegExp(`(?<![\\d-])${YEAR}-(\\d{2})(?:-(\\d{2}))?(?![\\d])`, 'g'),
    (m) => [{ year: n(m[1])!, month: n(m[2]), day: n(m[3]) }],
  ],
  [
    new RegExp(`\\b(\\d{1,2})${ORD}\\s+(?:of\\s+)?${MONTH}\\.?,?\\s+${YEAR}\\b`, 'gi'),
    (m) => [{ year: n(m[3])!, month: month(m[2]!), day: n(m[1]) }],
  ],
  [
    new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})${ORD},?\\s+${YEAR}\\b`, 'gi'),
    (m) => [{ year: n(m[3])!, month: month(m[1]!), day: n(m[2]) }],
  ],
  [
    new RegExp(`\\b${MONTH}\\.?,?\\s+${YEAR}\\b`, 'gi'),
    (m) => [{ year: n(m[2])!, month: month(m[1]!) }],
  ],
  [
    new RegExp(`(?<![\\d/.])(\\d{1,2})[/.](\\d{1,2})[/.]${YEAR}(?![\\d/.])`, 'g'),
    (m) => {
      const [a, b, year] = [n(m[1])!, n(m[2])!, n(m[3])!];
      const readings = [
        { year, month: b, day: a },
        { year, month: a, day: b },
      ];
      return a === b ? readings.slice(0, 1) : readings;
    },
  ],
  [
    new RegExp(`(?<=\\b(?:${TIME_WORDS})\\s+(?:the\\s+)?)${YEAR}(?![\\d%]|[.,]\\d)`, 'gi'),
    (m) => [{ year: n(m[1])! }],
  ],
];

function valid(d: CalendarDate): boolean {
  if (d.month === undefined) return d.day === undefined;
  if (d.month < 1 || d.month > 12) return false;
  if (d.day === undefined) return true;
  const days = new Date(Date.UTC(d.year, d.month, 0)).getUTCDate();
  return d.day >= 1 && d.day <= days;
}

export function findDates(text: string): DateMention[] {
  const accepted: DateMention[] = [];
  for (const [re, read] of PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const start = m.index;
      const end = start + m[0].length;
      if (accepted.some((a) => start < a.end && end > a.start)) continue;
      const readings = read(m).filter(valid);
      if (readings.length) accepted.push({ start, end, text: m[0], readings });
    }
  }
  return accepted.sort((a, b) => a.start - b.start);
}

/**
 * A source date supports a claimed date when it agrees at the claim's precision and is at least
 * as precise: "2026" is supported by "2026-11-12", but "12 Nov 2026" is not supported by "Nov 2026".
 */
export function dateSupports(source: CalendarDate, claim: CalendarDate): boolean {
  if (source.year !== claim.year) return false;
  if (claim.month !== undefined && source.month !== claim.month) return false;
  if (claim.day !== undefined && source.day !== claim.day) return false;
  return true;
}

export function formatDate(d: CalendarDate): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  if (d.month === undefined) return String(d.year);
  return d.day === undefined
    ? `${d.year}-${pad(d.month)}`
    : `${d.year}-${pad(d.month)}-${pad(d.day)}`;
}
