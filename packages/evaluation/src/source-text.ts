// Ported from Kaka `packages/career/src/grounding.ts` (same owner): verbatim-quote lookup that
// tolerates whitespace, quote-style and case differences, and number lookup that accepts the
// forms a source actually writes (35, 1,200, 1.2, "three", "2 million", "1.5k").

export interface QuoteMatch {
  found: boolean;
  /** Character range in the original text when the quote was found contiguously. */
  start: number | null;
  end: number | null;
  /** True when only most four-word runs matched (a trimmed or joined quote). */
  approximate: boolean;
}

interface Normalized {
  text: string;
  /** For each character of `text`, its index in the original. */
  map: number[];
}

function normalize(original: string): Normalized {
  let text = '';
  const map: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < original.length; i++) {
    let char = original[i]!;
    if (/\s/.test(char)) {
      if (lastWasSpace) continue;
      char = ' ';
      lastWasSpace = true;
    } else {
      lastWasSpace = false;
      char = char.toLowerCase().replace(/[‘’`]/, "'").replace(/[“”]/, '"').replace(/[–—]/, '-');
    }
    text += char;
    map.push(i);
  }
  return { text, map };
}

const NOT_FOUND: QuoteMatch = { found: false, start: null, end: null, approximate: false };

/** A source document prepared once for many lookups. */
export class SourceText {
  readonly original: string;
  readonly #normalized: Normalized;

  constructor(original: string) {
    this.original = original;
    this.#normalized = normalize(original);
  }

  findQuote(quote: string): QuoteMatch {
    const needle = normalize(quote.replace(/^["'“‘]|["'”’]$/g, '')).text.trim();
    if (!needle) return NOT_FOUND;
    const { text, map } = this.#normalized;
    if (needle.length < 4) {
      // Short quotes ("Go", "AWS") only count as a whole word, never inside another word.
      const match = new RegExp(`(?<![a-z0-9])${escapeRegExp(needle)}(?![a-z0-9])`).exec(text);
      if (!match) return NOT_FOUND;
      return {
        found: true,
        start: map[match.index]!,
        end: map[match.index + needle.length - 1]! + 1,
        approximate: false,
      };
    }
    const index = text.indexOf(needle);
    if (index !== -1) {
      return {
        found: true,
        start: map[index]!,
        end: map[index + needle.length - 1]! + 1,
        approximate: false,
      };
    }
    // Models sometimes trim or join a phrase: accept it when nearly every four-word run appears.
    return shingleOverlap(needle, text) >= 0.8
      ? { ...NOT_FOUND, found: true, approximate: true }
      : NOT_FOUND;
  }

  /** Where the number appears in the source as written, or null. */
  findNumber(value: number): Span | null {
    const forms = numberForms(value);
    for (const form of forms) {
      // Not part of a longer number on either side: "12" must not match "12.5" or "1,200".
      const hit = this.#match(`(?<![\\d.,]|\\d[.,])${escapeRegExp(form)}(?![\\d]|[.,]\\d)`);
      if (hit) return hit;
    }
    const word = NUMBER_WORDS[value];
    if (word) {
      const hit = this.#match(`\\b${word}\\b`, 'i');
      if (hit) return hit;
    }
    for (const [scale, words] of SCALES) {
      const scaled = value / scale;
      if (value >= scale && Number.isInteger(scaled * 10)) {
        const n = escapeRegExp(String(scaled));
        const hit = this.#match(`(?<![\\d.,])${n}\\s*(?:${words})\\b`, 'i');
        if (hit) return hit;
      }
    }
    return null;
  }

  /** True when the number appears in the source as written. */
  containsNumber(value: number): boolean {
    return this.findNumber(value) !== null;
  }

  /** Where the source states the value as a percentage (35%, 35 percent, 35 pct), or null. */
  findPercentage(value: number): Span | null {
    for (const form of numberForms(value)) {
      const hit = this.#match(
        `(?<![\\d.,]|\\d[.,])${escapeRegExp(form)}\\s*(?:%|percent\\b|pct\\b|per cent\\b)`,
        'i',
      );
      if (hit) return hit;
    }
    return null;
  }

  containsPercentage(value: number): boolean {
    return this.findPercentage(value) !== null;
  }

  #match(pattern: string, flags = ''): Span | null {
    const m = new RegExp(pattern, flags).exec(this.original);
    return m ? { start: m.index, end: m.index + m[0].length } : null;
  }
}

export interface Span {
  start: number;
  end: number;
}

function numberForms(value: number): Set<string> {
  const forms = new Set([String(value), value.toLocaleString('en-US')]);
  if (Number.isInteger(value * 10)) forms.add(value.toFixed(1));
  return forms;
}

const NUMBER_WORDS: Record<number, string> = Object.fromEntries(
  [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
    'twenty',
  ].map((w, i) => [i, w]),
);

const SCALES: [number, string][] = [
  [1_000_000_000, 'billion|bn|b'],
  [1_000_000, 'million|mm|m'],
  [1_000, 'thousand|k'],
];

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shingleOverlap(needle: string, haystack: string): number {
  const words = needle.split(' ');
  if (words.length < 4) return 0;
  let hits = 0;
  let total = 0;
  for (let i = 0; i + 4 <= words.length; i++) {
    total++;
    if (haystack.includes(words.slice(i, i + 4).join(' '))) hits++;
  }
  return total === 0 ? 0 : hits / total;
}
