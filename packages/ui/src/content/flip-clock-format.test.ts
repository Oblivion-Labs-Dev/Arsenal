import { describe, expect, it } from 'vitest';
import { clockFace } from './flip-clock-format';

const at = new Date(Date.UTC(2026, 0, 2, 21, 4, 7));

describe('clockFace', () => {
  it('builds a 24-hour face with seconds', () => {
    const face = clockFace(at, { locale: 'en-GB', hour12: false, timeZone: 'UTC' });
    expect(face.chars.join('')).toBe('21:04:07');
    expect(face.period).toBe('');
    expect(face.shape).toBe('dd:dd:dd');
    expect(face.label).toBe('21:04:07');
  });
  it('builds a 12-hour face with a period and no seconds', () => {
    const face = clockFace(at, { locale: 'en-US', hour12: true, seconds: false, timeZone: 'UTC' });
    expect(face.chars.join('')).toBe('09:04');
    expect(face.period).toBe('PM');
    expect(face.shape).toBe('dd:dd');
    expect(face.label).toBe('09:04 PM');
  });
});
