import { describe, expect, it } from 'vitest';
import { acceptsFile, progressPercent } from './upload';

describe('acceptsFile', () => {
  const pdf = { name: 'CV.PDF', type: 'application/pdf' };
  const png = { name: 'a.png', type: 'image/png' };
  it('accepts anything with an empty list', () => {
    expect(acceptsFile(pdf, '')).toBe(true);
    expect(acceptsFile(pdf, ' , ')).toBe(true);
  });
  it('matches extensions case-insensitively', () => {
    expect(acceptsFile(pdf, '.pdf,.docx')).toBe(true);
    expect(acceptsFile(png, '.pdf,.docx')).toBe(false);
  });
  it('matches wildcard and exact MIME types', () => {
    expect(acceptsFile(png, 'image/*')).toBe(true);
    expect(acceptsFile(pdf, 'image/*')).toBe(false);
    expect(acceptsFile(pdf, 'application/pdf')).toBe(true);
  });
});

describe('progressPercent', () => {
  it('clamps and rounds', () => {
    expect(progressPercent(0.456)).toBe(46);
    expect(progressPercent(-1)).toBe(0);
    expect(progressPercent(2)).toBe(100);
  });
  it('treats non-finite as 0', () => {
    expect(progressPercent(Number.NaN)).toBe(0);
    expect(progressPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
