import { REPORT_DIAGRAM_SPECS } from '../../../../packages/clayflow/src/examples/report-specs';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const REPORT_PERIODS: readonly { id: ReportPeriod; label: string; cadence: string }[] = [
  { id: 'daily', label: 'Daily', cadence: 'Today' },
  { id: 'weekly', label: 'Weekly', cadence: 'This week' },
  { id: 'monthly', label: 'Monthly', cadence: 'This month' },
  { id: 'yearly', label: 'Yearly', cadence: 'This year' },
];

export const SAMPLE_REPORTS = {
  daily: {
    eyebrow: 'Daily report · sample',
    title: 'A small pilot draws a bigger question',
    summary: 'A fictional team at Luma Labs is considering how a limited product pilot might fit into its everyday work.',
    context: 'The imagined story follows a product lead, a review meeting and the questions that remain before any wider rollout.',
    focus: 'Luma Labs · fictional company',
    story: REPORT_DIAGRAM_SPECS.daily.story,
    timeline: REPORT_DIAGRAM_SPECS.daily.timeline,
    themes: undefined,
  },
  weekly: {
    eyebrow: 'Weekly report · sample',
    title: 'A sourcing plan meets seasonal uncertainty',
    summary: 'In this made-up example, Terra Foods adjusts a sourcing plan while weighing how seasonal demand could change.',
    context: 'The connections show where a revised plan, supplier conversations and open questions might meet.',
    focus: 'Terra Foods · fictional company',
    story: REPORT_DIAGRAM_SPECS.weekly.story,
    timeline: REPORT_DIAGRAM_SPECS.weekly.timeline,
    themes: undefined,
  },
  monthly: {
    eyebrow: 'Monthly report · sample',
    title: 'A proposal brings local needs into view',
    summary: 'A fictional Nova Grid team discusses a storage proposal and how it could relate to the needs of a local community.',
    context: 'The sample connects a planning discussion to a community review, leaving the outcome deliberately unresolved.',
    focus: 'Nova Grid · fictional company',
    story: REPORT_DIAGRAM_SPECS.monthly.story,
    timeline: REPORT_DIAGRAM_SPECS.monthly.timeline,
    themes: undefined,
  },
  yearly: {
    eyebrow: 'Yearly report · sample',
    title: 'A year of questions about work and trust',
    summary: 'This fictional year follows teams bringing new tools into routines while people ask who benefits and what care requires.',
    context: 'Rather than tallying made-up results, this view groups a few imagined themes and shows how they might connect.',
    focus: 'Illustrative annual reading · fictional stories',
    story: REPORT_DIAGRAM_SPECS.yearly.story,
    timeline: REPORT_DIAGRAM_SPECS.yearly.timeline,
    themes: REPORT_DIAGRAM_SPECS.yearly.themes,
  },
} as const;
