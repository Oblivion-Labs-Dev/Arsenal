// Deterministic grounding check, ported from Kaka `packages/career/src/grounding.ts` (same owner)
// and generalised: any model output against one or more source texts. Every quote, date,
// percentage and number in the output must appear in a source; a number that differs from the
// same measurement in a source is reported as contradicted. No model calls, no randomness.

import { findContradictions, normalizeUnit, type ContradictionOptions } from './contradictions.js';
import { dateSupports, findDates, type CalendarDate } from './dates.js';
import { SourceText, type Span } from './source-text.js';

export type ClaimKind = 'quote' | 'date' | 'percentage' | 'number';
export type ClaimStatus = 'supported' | 'approximate' | 'unsupported' | 'contradicted';
export type GroundingVerdict = 'grounded' | 'partial' | 'ungrounded' | 'no-claims';

export interface Evidence {
  /** Index into the `sources` array. */
  source: number;
  /** Character range in that source; null when a quote matched only approximately. */
  start: number | null;
  end: number | null;
  text: string | null;
}

export interface GroundingClaim {
  kind: ClaimKind;
  /** The claim as written in the output. */
  text: string;
  start: number;
  end: number;
  /** Quote text, numeric value, or every reading of a date. */
  value: string | number | CalendarDate[];
  status: ClaimStatus;
  evidence: Evidence | null;
  /** For a contradicted claim: the differing source statement of the same measurement. */
  conflict?: Evidence & { value: number };
}

export interface GroundingResult {
  verdict: GroundingVerdict;
  /** Share of claims supported (approximate counts), or null when there were no claims. */
  score: number | null;
  claims: GroundingClaim[];
  counts: {
    total: number;
    supported: number;
    approximate: number;
    unsupported: number;
    contradicted: number;
  };
}

export interface GroundingOptions {
  /** Quotes shorter than this many words are ignored (scare quotes, "AI"). Default 2. */
  minQuoteWords?: number;
  contradictions?: ContradictionOptions;
}

interface Metric extends Span {
  kind: 'percentage' | 'number';
  text: string;
  value: number;
  unit: string;
  label: string;
}

const QUOTE = /"([^"\n]+)"|“([^”\n]+)”/g;
const PERCENT =
  /(?<![\w.:#]|\d[.,])(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(%|percent\b|pct\b|per cent\b)/gi;
// A number is a whole token: not inside an identifier, hash, version or time (v1.2, 74dda8e,
// 10:30), optionally followed by a scale word or an attached unit (200ms, 3x, 16GB).
const NUMBER =
  /(?<![\w.:#]|\d[.,])(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:\s*(billion|bn|million|thousand|k)\b|(ms|s|x|h|min|kb|mb|gb|tb)\b)?(?![\w]|[.,:]\d)/gi;
const SCALE: Record<string, number> = {
  billion: 1e9,
  bn: 1e9,
  million: 1e6,
  thousand: 1e3,
  k: 1e3,
};

const overlaps = (spans: Span[], s: Span) => spans.some((t) => s.start < t.end && s.end > t.start);

function sentenceWindow(text: string, start: number, end: number): [string, string] {
  const before =
    text
      .slice(0, start)
      .split(/[.!?\n](?:\s|$)/)
      .pop() ?? '';
  const after = text.slice(end).split(/[.!?\n](?:\s|$)/)[0] ?? '';
  const words = (s: string) => s.split(/\s+/).filter(Boolean);
  return [words(before).slice(-5).join(' '), words(after).slice(0, 3).join(' ')];
}

function isListMarker(text: string, start: number, end: number): boolean {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  return /^\s*$/.test(text.slice(lineStart, start)) && /^[.)]\s/.test(text.slice(end, end + 2));
}

/** Percentages and numbers in `text`, skipping spans already taken by quotes or dates. */
function scanMetrics(text: string, taken: Span[]): Metric[] {
  const metrics: Metric[] = [];
  const blocked = [...taken];
  for (const m of text.matchAll(PERCENT)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (overlaps(blocked, span)) continue;
    const [before, after] = sentenceWindow(text, span.start, span.end);
    metrics.push({
      kind: 'percentage',
      ...span,
      text: m[0],
      value: Number(m[1]!.replace(/,/g, '') + (m[2] ?? '')),
      unit: '%',
      label: `${before} ${after}`.trim(),
    });
    blocked.push(span);
  }
  for (const m of text.matchAll(NUMBER)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (overlaps(blocked, span) || isListMarker(text, span.start, span.end)) continue;
    const base = Number(m[1]!.replace(/,/g, '') + (m[2] ?? ''));
    const scale = m[3] ? SCALE[m[3].toLowerCase()]! : 1;
    const [before, after] = sentenceWindow(text, span.start, span.end);
    const nextWord = /^[a-z]+$/i.test(after.split(' ')[0] ?? '') ? after.split(' ')[0]! : '';
    metrics.push({
      kind: 'number',
      ...span,
      text: m[0],
      value: Math.round(base * scale * 1e6) / 1e6,
      unit: (m[4] ?? nextWord).toLowerCase(),
      label: `${before} ${after}`.trim(),
    });
  }
  return metrics.sort((a, b) => a.start - b.start);
}

interface PreparedSource {
  text: SourceText;
  dates: ReturnType<typeof findDates>;
  metrics: Metric[];
}

function prepare(source: string): PreparedSource {
  const dates = findDates(source);
  return { text: new SourceText(source), dates, metrics: scanMetrics(source, dates) };
}

function evidenceFrom(sources: PreparedSource[], index: number, span: Span): Evidence {
  return {
    source: index,
    start: span.start,
    end: span.end,
    text: sources[index]!.text.original.slice(span.start, span.end),
  };
}

/**
 * Checks every quote, date, percentage and number in `output` against `sources`.
 * "grounded": every claim supported; "ungrounded": none supported; "partial" otherwise;
 * "no-claims" when there is nothing checkable (score null, not 1: nothing was verified).
 */
export function evaluateGrounding(
  output: string,
  sources: string | string[],
  options: GroundingOptions = {},
): GroundingResult {
  const minQuoteWords = options.minQuoteWords ?? 2;
  const prepared = (Array.isArray(sources) ? sources : [sources]).map(prepare);
  const claims: GroundingClaim[] = [];
  const taken: Span[] = [];

  for (const m of output.matchAll(QUOTE)) {
    const quote = (m[1] ?? m[2])!.trim();
    if (quote.split(/\s+/).length < minQuoteWords) continue;
    const span = { start: m.index, end: m.index + m[0].length };
    taken.push(span);
    let claim: GroundingClaim = {
      kind: 'quote',
      text: m[0],
      ...span,
      value: quote,
      status: 'unsupported',
      evidence: null,
    };
    for (let i = 0; i < prepared.length; i++) {
      const hit = prepared[i]!.text.findQuote(quote);
      if (!hit.found) continue;
      const evidence =
        hit.start === null || hit.end === null
          ? { source: i, start: null, end: null, text: null }
          : evidenceFrom(prepared, i, { start: hit.start, end: hit.end });
      claim = { ...claim, status: hit.approximate ? 'approximate' : 'supported', evidence };
      if (!hit.approximate) break;
    }
    claims.push(claim);
  }

  for (const d of findDates(output)) {
    if (overlaps(taken, d)) continue;
    taken.push(d);
    let evidence: Evidence | null = null;
    search: for (let i = 0; i < prepared.length; i++) {
      for (const s of prepared[i]!.dates) {
        if (d.readings.some((r) => s.readings.some((sr) => dateSupports(sr, r)))) {
          evidence = evidenceFrom(prepared, i, s);
          break search;
        }
      }
    }
    claims.push({
      kind: 'date',
      text: d.text,
      start: d.start,
      end: d.end,
      value: d.readings,
      status: evidence ? 'supported' : 'unsupported',
      evidence,
    });
  }

  for (const metric of scanMetrics(output, taken)) {
    let evidence: Evidence | null = null;
    for (let i = 0; i < prepared.length && !evidence; i++) {
      const src = prepared[i]!.text;
      const hit =
        metric.kind === 'percentage'
          ? src.findPercentage(metric.value)
          : src.findNumber(metric.value);
      if (hit) evidence = evidenceFrom(prepared, i, hit);
    }
    const claim: GroundingClaim = {
      kind: metric.kind,
      text: metric.text,
      start: metric.start,
      end: metric.end,
      value: metric.value,
      status: evidence ? 'supported' : 'unsupported',
      evidence,
    };
    if (!evidence) {
      const conflict = findConflict(metric, prepared, options.contradictions);
      if (conflict) {
        claim.status = 'contradicted';
        claim.conflict = conflict;
      }
    }
    claims.push(claim);
  }

  claims.sort((a, b) => a.start - b.start);
  return summarize(claims);
}

function findConflict(
  metric: Metric,
  sources: PreparedSource[],
  options: ContradictionOptions | undefined,
): (Evidence & { value: number }) | null {
  let best: { similarity: number; source: number; m: Metric } | null = null;
  const claimed = {
    sourceId: 'output',
    label: metric.label,
    value: metric.value,
    unit: metric.unit,
    context: metric.text,
  };
  for (let i = 0; i < sources.length; i++) {
    for (const m of sources[i]!.metrics) {
      if (normalizeUnit(m.unit) !== normalizeUnit(metric.unit)) continue;
      const [hit] = findContradictions(
        [
          claimed,
          {
            sourceId: `source:${i}`,
            label: m.label,
            value: m.value,
            unit: m.unit,
            context: m.text,
          },
        ],
        options,
      );
      if (hit && (!best || hit.similarity > best.similarity)) {
        best = { similarity: hit.similarity, source: i, m };
      }
    }
  }
  return best ? { ...evidenceFrom(sources, best.source, best.m), value: best.m.value } : null;
}

function summarize(claims: GroundingClaim[]): GroundingResult {
  const count = (s: ClaimStatus) => claims.filter((c) => c.status === s).length;
  const approximate = count('approximate');
  const supported = count('supported') + approximate;
  const counts = {
    total: claims.length,
    supported,
    approximate,
    unsupported: count('unsupported'),
    contradicted: count('contradicted'),
  };
  if (claims.length === 0) return { verdict: 'no-claims', score: null, claims, counts };
  const verdict: GroundingVerdict =
    supported === claims.length ? 'grounded' : supported === 0 ? 'ungrounded' : 'partial';
  return { verdict, score: supported / claims.length, claims, counts };
}
