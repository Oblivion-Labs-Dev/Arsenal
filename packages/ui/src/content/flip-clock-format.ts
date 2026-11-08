export interface ClockFace {
  /** Characters to draw: digits and separators, e.g. ["0","9",":","4","1",":","0","7"]. */
  readonly chars: readonly string[];
  /** Locale day period ("AM"/"PM") or "" on 24-hour clocks. */
  readonly period: string;
  /** Layout shape (digits become "d"); a change means the cells must be rebuilt. */
  readonly shape: string;
  /** Accessible label, e.g. "09:41:07 AM". */
  readonly label: string;
}

export interface ClockOptions {
  readonly hour12?: boolean;
  /** Show seconds. Default true. */
  readonly seconds?: boolean;
  readonly locale?: string;
  readonly timeZone?: string;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(options: ClockOptions): Intl.DateTimeFormat {
  const key = JSON.stringify([options.locale, options.hour12, options.seconds, options.timeZone]);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(options.locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: options.seconds === false ? undefined : '2-digit',
      hour12: options.hour12,
      timeZone: options.timeZone,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** The clock face for one instant. Formatters are cached: building one per tick is costly on TVs. */
export function clockFace(now: Date, options: ClockOptions = {}): ClockFace {
  const parts = formatterFor(options).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const chars = [...get('hour'), ':', ...get('minute')];
  if (options.seconds !== false) chars.push(':', ...get('second'));
  const period = get('dayPeriod');
  return {
    chars,
    period,
    shape: chars.map((c) => (/\d/.test(c) ? 'd' : c)).join(''),
    label: chars.join('') + (period ? ` ${period}` : ''),
  };
}
