import { describe, it, expect } from 'vitest';
import { hostOf, plural, shortDate, timeAgo, timeUntil } from './relativeTime.js';

const NOW = Date.parse('2026-03-10T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const ahead = (ms: number) => new Date(NOW + ms).toISOString();
const MIN = 60_000;

describe('timeAgo', () => {
  it('formats each step', () => {
    expect(timeAgo(ago(10_000), NOW)).toBe('just now');
    expect(timeAgo(ago(5 * MIN), NOW)).toBe('5 min ago');
    expect(timeAgo(ago(3 * 60 * MIN), NOW)).toBe('3h ago');
    expect(timeAgo(ago(26 * 60 * MIN), NOW)).toBe('yesterday');
    expect(timeAgo(ago(4 * 24 * 60 * MIN), NOW)).toBe('4d ago');
  });
  it('never guesses for empty or invalid input', () => {
    expect(timeAgo(null, NOW)).toBe('never');
    expect(timeAgo('not a date', NOW)).toBe('unknown');
  });
});

describe('timeUntil', () => {
  it('formats each step', () => {
    expect(timeUntil(ahead(5 * MIN), NOW)).toBe('5 min');
    expect(timeUntil(ahead(3 * 60 * MIN), NOW)).toBe('3 h');
    expect(timeUntil(ahead(12 * 24 * 60 * MIN), NOW)).toBe('12 d');
    expect(timeUntil(ahead(120 * 24 * 60 * MIN), NOW)).toBe('4 mo');
    expect(timeUntil(ago(MIN), NOW)).toBe('now');
    expect(timeUntil('bad', NOW)).toBe('unknown');
  });
});

describe('small formatters', () => {
  it('shortDate', () => {
    expect(shortDate('2026-03-04T12:00:00Z', 'en-US')).toBe('Mar 4');
    expect(shortDate(null)).toBe('—');
    expect(shortDate('nope')).toBe('—');
  });
  it('plural', () => {
    expect(plural(1, 'item')).toBe('1 item');
    expect(plural(0, 'item')).toBe('0 items');
    expect(plural(3, 'child', 'children')).toBe('3 children');
  });
  it('hostOf', () => {
    expect(hostOf('https://www.example.com/a?b')).toBe('example.com');
    expect(hostOf('not a url')).toBe('not a url');
  });
});
