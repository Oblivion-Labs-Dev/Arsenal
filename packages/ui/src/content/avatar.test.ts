import { describe, expect, it } from 'vitest';
import { AVATAR_HUES, avatarColor, hashString, initialsFor } from './avatar';

describe('hashString', () => {
  it('is stable and non-negative', () => {
    expect(hashString('')).toBe(0);
    expect(hashString('a')).toBe(97);
    expect(hashString('ab')).toBe(31 * 97 + 98);
    expect(hashString('a very long string that overflows 32 bits')).toBeGreaterThanOrEqual(0);
  });
});

describe('avatarColor', () => {
  it('is deterministic and from the palette', () => {
    expect(avatarColor('Ada')).toBe(avatarColor('Ada'));
    expect(AVATAR_HUES).toContain(avatarColor('Ada'));
    expect(avatarColor('a', ['#000', '#111'])).toBe('#111');
  });
  it('rejects an empty palette', () => {
    expect(() => avatarColor('x', [])).toThrow();
  });
});

describe('initialsFor', () => {
  it('takes initials from names and emails', () => {
    expect(initialsFor('ada lovelace')).toBe('A');
    expect(initialsFor('ada lovelace', 2)).toBe('AL');
    expect(initialsFor('grace.hopper@example.com', 2)).toBe('GH');
  });
  it('skips leading symbols', () => {
    expect(initialsFor('  #team rocket', 2)).toBe('TR');
  });
  it('returns ? when nothing is usable', () => {
    expect(initialsFor('')).toBe('?');
    expect(initialsFor('---')).toBe('?');
  });
  it('rejects a bad max', () => {
    expect(() => initialsFor('a', 0)).toThrow();
    expect(() => initialsFor('a', 1.5)).toThrow();
  });
});
