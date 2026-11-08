import { describe, expect, it } from 'vitest';
import { easeOutCubic, gaugeAngle, portfolioProfitLoss, positionSizePerThousand, riskReward } from './math.js';

describe('dashboard math', () => {
  it('clamps mood values to the semicircle', () => {
    expect(gaugeAngle(-1)).toBe(-90);
    expect(gaugeAngle(50)).toBe(0);
    expect(gaugeAngle(120)).toBe(90);
  });
  it('eases count-up progress and clamps its input', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
  it('calculates risk reward and rejects invalid plans', () => {
    expect(riskReward(100, 120, 90)).toBe(2);
    expect(riskReward(90, 100, 100)).toBeNull();
  });
  it('calculates profit loss and affordable position size', () => {
    expect(portfolioProfitLoss(1080, 1000)).toBe(80);
    expect(positionSizePerThousand(100, 90)).toBe(1);
    expect(positionSizePerThousand(90, 100)).toBeNull();
  });
});
