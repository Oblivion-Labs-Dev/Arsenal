export interface QualityGateThreshold {
  metric: string;
  min?: number;
  max?: number;
}

export interface QualityGateSuite {
  typescript: boolean;
  eslint: boolean;
  prettier: boolean;
  unitTests: boolean;
  visualRegression: boolean;
  accessibility: boolean;
  lighthouse: QualityGateThreshold[];
  bundleSize: QualityGateThreshold[];
  deadCode: boolean;
  circularDependencies: boolean;
  unusedAssets: boolean;
  securityAudit: boolean;
  brokenLinks: boolean;
}

export const DEFAULT_QUALITY_GATES: QualityGateSuite = {
  typescript: true,
  eslint: true,
  prettier: true,
  unitTests: true,
  visualRegression: true,
  accessibility: true,
  lighthouse: [
    { metric: "performance", min: 85 },
    { metric: "accessibility", min: 95 },
    { metric: "best-practices", min: 90 },
    { metric: "seo", min: 90 },
  ],
  bundleSize: [{ metric: "first-load-js", max: 250 }],
  deadCode: true,
  circularDependencies: true,
  unusedAssets: true,
  securityAudit: true,
  brokenLinks: true,
};

export interface QualityCheckResult {
  gate: keyof QualityGateSuite | string;
  passed: boolean;
  message?: string;
}

export function evaluateQualityGates(
  results: QualityCheckResult[],
  suite: QualityGateSuite = DEFAULT_QUALITY_GATES,
): { passed: boolean; failures: QualityCheckResult[] } {
  const failures = results.filter((r) => !r.passed);
  const requiredGates = Object.entries(suite)
    .filter(([, value]) => value === true)
    .map(([key]) => key);

  for (const gate of requiredGates) {
    const found = results.find((r) => r.gate === gate);
    if (!found || !found.passed) {
      failures.push({ gate, passed: false, message: `${gate} check missing or failed` });
    }
  }

  return { passed: failures.length === 0, failures };
}
