import { describe, it, expect } from 'vitest';
import { extractDeadline } from './deadline.js';

const now = new Date(2026, 2, 10, 9, 0, 0); // local time

describe('extractDeadline', () => {
  it('finds explicit dates and weekdays without inventing a due time', () => {
    expect(extractDeadline('Please reply by Friday, Oct 30 at 5pm', now)).toEqual({
      phrase: 'Friday, Oct 30 at 5pm',
      dueAt: null,
    });
    expect(extractDeadline('submit before Monday at 9am', now)).toEqual({
      phrase: 'Monday at 9am',
      dueAt: null,
    });
    expect(extractDeadline('due by 3/14/2026', now)).toEqual({ phrase: '3/14/2026', dueAt: null });
  });

  it('computes dueAt for unambiguous relative phrases', () => {
    expect(extractDeadline('respond within 48 hours', now)?.dueAt?.getTime()).toBe(
      now.getTime() + 48 * 3_600_000,
    );
    expect(extractDeadline('in 2 weeks', now)?.dueAt?.getTime()).toBe(
      now.getTime() + 14 * 86_400_000,
    );
    const eod = extractDeadline('send it by EOD', now)?.dueAt;
    expect(eod?.getDate()).toBe(10);
    expect(eod?.getHours()).toBe(23);
    expect(extractDeadline('by tomorrow', now)?.dueAt?.getDate()).toBe(11);
  });

  it('leaves business days and part-of-day phrases without dueAt', () => {
    expect(extractDeadline('within 3 business days', now)).toEqual({
      phrase: '3 business days',
      dueAt: null,
    });
    expect(extractDeadline('by tomorrow morning', now)).toEqual({
      phrase: 'tomorrow morning',
      dueAt: null,
    });
  });

  it('returns null when there is no deadline', () => {
    expect(extractDeadline('', now)).toBeNull();
    expect(extractDeadline('send it by mail please', now)).toBeNull();
    expect(extractDeadline('thanks for applying', now)).toBeNull();
  });
});
