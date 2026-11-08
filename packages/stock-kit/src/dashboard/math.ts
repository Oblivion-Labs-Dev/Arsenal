export function gaugeAngle(value: number): number {
  return -90 + Math.max(0, Math.min(100, value)) * 1.8;
}

export function riskReward(entry: number, target: number, stop: number): number | null {
  const risk = entry - stop;
  if (![entry, target, stop].every(Number.isFinite) || risk <= 0 || target <= entry) return null;
  return (target - entry) / risk;
}

export function portfolioProfitLoss(value: number, invested: number): number {
  return value - invested;
}

export function positionSizePerThousand(
  entry: number,
  stop: number,
  riskBudget = 10,
): number | null {
  const riskPerShare = entry - stop;
  if (![entry, stop, riskBudget].every(Number.isFinite) || riskPerShare <= 0 || riskBudget <= 0)
    return null;
  return Math.floor(riskBudget / riskPerShare);
}
