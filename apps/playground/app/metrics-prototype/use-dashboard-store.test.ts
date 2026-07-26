import { describe, expect, it } from 'vitest';
import { dashboardReducer, initialDashboardState } from './use-dashboard-store';

describe('metrics dashboard state', () => {
  it('changes category and clears the stale chart selection', () => {
    const selected = dashboardReducer(initialDashboardState, {
      type: 'select',
      value: { chart: 'bar', id: 'mon-completed', label: 'Monday', value: '10 tasks' },
    });
    const filtered = dashboardReducer(selected, { type: 'set-category', value: 'health' });

    expect(filtered.category).toBe('health');
    expect(filtered.selection).toBeNull();
  });

  it('clamps energy input to the supported range', () => {
    const high = dashboardReducer(initialDashboardState, {
      type: 'set-energy',
      metric: 'mental',
      value: 240,
    });
    const low = dashboardReducer(high, { type: 'set-energy', metric: 'physical', value: -20 });

    expect(high.energy.mental).toBe(100);
    expect(low.energy.physical).toBe(0);
  });

  it('supports explicit 2D and low-graphics fallbacks', () => {
    const flat = dashboardReducer(initialDashboardState, { type: 'set-view', value: '2d' });
    const lowGraphics = dashboardReducer(flat, { type: 'set-quality', value: 'low' });

    expect(lowGraphics.view).toBe('2d');
    expect(lowGraphics.quality).toBe('low');
  });

  it('restores the entire dashboard to its initial state', () => {
    const changed = dashboardReducer(initialDashboardState, { type: 'set-range', value: 'month' });
    const withTables = dashboardReducer(changed, { type: 'toggle-tables' });

    expect(dashboardReducer(withTables, { type: 'reset' })).toEqual(initialDashboardState);
  });
});
