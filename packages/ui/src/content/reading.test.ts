import { describe, expect, it } from 'vitest';
import { absoluteUrl, formatPageTitle, scrollProgress } from './reading';

describe('scrollProgress', () => {
  it('returns a clamped fraction', () => {
    expect(scrollProgress(0, 2000, 1000)).toBe(0);
    expect(scrollProgress(500, 2000, 1000)).toBe(0.5);
    expect(scrollProgress(1500, 2000, 1000)).toBe(1);
    expect(scrollProgress(-50, 2000, 1000)).toBe(0);
  });
  it('is 0 when there is nothing to scroll', () => {
    expect(scrollProgress(0, 800, 1000)).toBe(0);
    expect(scrollProgress(0, Number.NaN, 1000)).toBe(0);
  });
});

describe('absoluteUrl', () => {
  it('joins with one slash', () => {
    expect(absoluteUrl('https://x.dev/', '/a')).toBe('https://x.dev/a');
    expect(absoluteUrl('https://x.dev', 'a')).toBe('https://x.dev/a');
  });
  it('passes absolute URLs through', () => {
    expect(absoluteUrl('https://x.dev', 'https://cdn.x/i.png')).toBe('https://cdn.x/i.png');
  });
});

describe('formatPageTitle', () => {
  it('appends the site name unless already present', () => {
    expect(formatPageTitle('Post', 'Site')).toBe('Post · Site');
    expect(formatPageTitle('Site home', 'Site')).toBe('Site home');
    expect(formatPageTitle('Post')).toBe('Post');
  });
});
