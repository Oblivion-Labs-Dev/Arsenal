import { describe, expect, it } from 'vitest';
import { COUNT_UP_VIEW_MARGIN, intersectsWithMargin } from './count-up-view';

const phone = { width: 390, height: 844 };

describe('CountUp in-view margin', () => {
  it('treats a number 16px from the left edge of a phone as in view', () => {
    // First hero stat at 390px measured in the real app: left 16, width 14, top 590.
    const firstStat = { top: 590, left: 16, right: 30, bottom: 620 };
    expect(intersectsWithMargin(firstStat, phone, COUNT_UP_VIEW_MARGIN)).toBe(true);
  });

  it('still waits until a number is 40px above the bottom edge', () => {
    const belowFold = { top: 820, left: 120, right: 140, bottom: 850 };
    expect(intersectsWithMargin(belowFold, phone, COUNT_UP_VIEW_MARGIN)).toBe(false);
  });

  it('would fail with the old all-sides margin (guards the regression)', () => {
    const firstStat = { top: 590, left: 16, right: 30, bottom: 620 };
    expect(intersectsWithMargin(firstStat, phone, '-40px')).toBe(false);
  });
});
