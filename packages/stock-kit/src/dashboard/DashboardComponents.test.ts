import { describe, expect, it } from 'vitest';
import { validate } from '@arsenal/clayflow';
import { pipelineSpec } from './DashboardComponents.js';

describe('PipelineFlow research example', () => {
  it('validates with the five illustrative stages in order', () => {
    const result = validate(pipelineSpec);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram.topic).toBe('finance');
    expect(result.diagram.nodes.map((node) => node.label)).toEqual([
      'Market News',
      'Financial Data',
      'Analysis & AI',
      'Risk Check',
      'Stock Pick',
    ]);
    expect(result.diagram.animation?.steps).toHaveLength(5);
    expect(result.diagram.animation?.steps?.at(-1)?.states?.pick).toBe('success');
  });

  it('is marked illustrative and shows the risk gate as a condition with a recheck loop not taken', () => {
    const result = validate(pipelineSpec);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram.illustrative).toBe(true);
    const edge = (id: string) => result.diagram.edges.find((e) => e.id === id);
    expect(edge('risk-pick')?.kind).toBe('conditional');
    expect(edge('risk-pick')?.condition).toBeTruthy();
    expect(edge('recheck')).toMatchObject({ from: 'risk-check', to: 'analysis', kind: 'feedback' });
    expect(result.diagram.animation?.steps?.at(-1)?.branch).toEqual({
      from: 'risk-check',
      take: 'risk-pick',
    });
  });
});

describe('PipelineFlow art paths', () => {
  it('does not double the clayflow asset folder in node art URLs', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { PipelineFlow } = await import('./DashboardComponents.js');
    const html = renderToStaticMarkup(createElement(PipelineFlow));
    expect(html).toContain('/assets/clayflow/');
    expect(html).not.toContain('/assets/clayflow/assets/clayflow/');
  });
});
