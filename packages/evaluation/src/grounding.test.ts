import { describe, expect, it } from 'vitest';
import { evaluateGrounding } from './grounding.js';
import { findContradictions } from './contradictions.js';
import { findDates } from './dates.js';
import { SourceText } from './source-text.js';

const SOURCE = `Quarterly report, published 12 November 2026.
The platform team of 12 engineers cut p95 latency by 35% after the cache rewrite.
Revenue reached $2 million, up from 1,200 customers in 2024 to 3,400 customers.
The CTO said "we will not ship features that we cannot measure" at the offsite.`;

describe('evaluateGrounding', () => {
  it('marks fully grounded output as grounded with evidence spans', () => {
    const output = `On 2026-11-12 the report said p95 latency fell 35% with a small team.
It quoted the CTO: "we will not ship features that we cannot measure".
Customers grew to 3,400 and revenue hit $2,000,000.`;
    const result = evaluateGrounding(output, SOURCE);
    expect(result.verdict).toBe('grounded');
    expect(result.score).toBe(1);
    const kinds = result.claims.map((c) => c.kind);
    expect(kinds).toEqual(['date', 'percentage', 'quote', 'number', 'number']);
    for (const claim of result.claims) {
      expect(claim.evidence).not.toBeNull();
      const { start, end, text } = claim.evidence!;
      expect(SOURCE.slice(start!, end!)).toBe(text);
    }
    expect(result.claims.find((c) => c.kind === 'date')!.evidence!.text).toBe('12 November 2026');
  });

  it('reports partial grounding with the unsupported claims named', () => {
    const output = 'Latency fell 35% and the team shipped 48 releases in 2025.';
    const result = evaluateGrounding(output, SOURCE);
    expect(result.verdict).toBe('partial');
    expect(result.score).toBeCloseTo(1 / 3);
    const unsupported = result.claims.filter((c) => c.status === 'unsupported').map((c) => c.text);
    expect(unsupported).toEqual(['48', '2025']);
  });

  it('flags hallucinated output as ungrounded, including invented quotes', () => {
    const output = 'Churn dropped 80% in March 2023, and the CEO said "growth at all costs".';
    const result = evaluateGrounding(output, SOURCE);
    expect(result.verdict).toBe('ungrounded');
    expect(result.score).toBe(0);
    expect(result.counts).toMatchObject({ total: 3, supported: 0, unsupported: 3 });
  });

  it('reports a changed measurement as contradicted, with the source value', () => {
    const output = 'The cache rewrite cut p95 latency by 20%.';
    const result = evaluateGrounding(output, SOURCE);
    const [claim] = result.claims;
    expect(claim!.status).toBe('contradicted');
    expect(claim!.conflict).toMatchObject({ value: 35, text: '35%', source: 0 });
    expect(result.counts.contradicted).toBe(1);
    expect(result.verdict).toBe('ungrounded');
  });

  it('does not call an unrelated unsupported number a contradiction', () => {
    const result = evaluateGrounding('Uptime was 20% better on mobile.', SOURCE);
    expect(result.claims[0]!.status).toBe('unsupported');
  });

  it('searches every source and reports which one held the evidence', () => {
    const result = evaluateGrounding('Signups rose 14% and latency fell 35%.', [
      SOURCE,
      'Signups rose 14 percent in Q3.',
    ]);
    expect(result.verdict).toBe('grounded');
    expect(result.claims.map((c) => c.evidence!.source)).toEqual([1, 0]);
  });

  it('returns no-claims with a null score instead of a perfect score', () => {
    const result = evaluateGrounding('The team is doing well and morale is high.', SOURCE);
    expect(result).toMatchObject({ verdict: 'no-claims', score: null, claims: [] });
  });

  it('accepts approximate quotes that trim a word but never invented ones', () => {
    const output = 'He said "we will not ship features that we cannot measure ever".';
    const [claim] = evaluateGrounding(output, SOURCE).claims;
    expect(claim!.status).toBe('approximate');
    expect(claim!.evidence).toMatchObject({ source: 0, start: null });
  });

  it('a month-precise source does not support a day-precise claim', () => {
    const source = 'The launch happened in November 2026.';
    expect(evaluateGrounding('It launched in November 2026.', source).verdict).toBe('grounded');
    expect(evaluateGrounding('It launched on 3 November 2026.', source).verdict).toBe('ungrounded');
  });

  describe('false positives it must not raise', () => {
    it('ignores list markers, versions, hashes, ISO times and single-word scare quotes', () => {
      const output = `1. Upgrade to v1.2 on 2026-11-12T10:30:00Z.
2) Revert commit 74dda8e if the "fast" path regresses.`;
      const result = evaluateGrounding(output, SOURCE);
      expect(result.claims.map((c) => c.text)).toEqual(['2026-11-12']);
      expect(result.verdict).toBe('grounded');
    });

    it('does not treat a number inside a larger source number as support', () => {
      const result = evaluateGrounding('There were 200 customers.', SOURCE);
      expect(result.claims[0]!.status).toBe('unsupported');
    });

    it('does not let 12 match 12.5 or 1,200 match 200', () => {
      const src = new SourceText('Throughput was 12.5 req/s across 1,200 nodes.');
      expect(src.containsNumber(12)).toBe(false);
      expect(src.containsNumber(200)).toBe(false);
      expect(src.containsNumber(12.5)).toBe(true);
      expect(src.containsNumber(1200)).toBe(true);
    });
  });
});

describe('findDates', () => {
  it('reads the common formats and keeps both readings of an ambiguous numeric date', () => {
    const dates = findDates('Shipped Nov 3, 2025; reviewed 04/05/2026; planned since 2019.');
    expect(dates.map((d) => d.readings)).toEqual([
      [{ year: 2025, month: 11, day: 3 }],
      [
        { year: 2026, month: 5, day: 4 },
        { year: 2026, month: 4, day: 5 },
      ],
      [{ year: 2019 }],
    ]);
  });

  it('rejects impossible dates and bare four-digit counts', () => {
    expect(findDates('2026-02-30 and 2026-13-01')).toEqual([]);
    expect(findDates('We processed 2024 tickets.')).toEqual([]);
  });
});

describe('findContradictions', () => {
  it('needs the same unit and at least two shared label terms', () => {
    const base = { context: '', unit: '%' };
    const found = findContradictions([
      { ...base, sourceId: 'a', label: 'cut p95 latency', value: 35 },
      { ...base, sourceId: 'b', label: 'p95 latency improvement', value: 20 },
      { ...base, sourceId: 'c', label: 'latency', value: 10 },
      { ...base, sourceId: 'd', label: 'cut p95 latency', value: 35, unit: 'ms' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ a: { sourceId: 'a' }, b: { sourceId: 'b' } });
  });
});
