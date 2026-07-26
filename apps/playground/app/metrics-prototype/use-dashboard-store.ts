'use client';

import { useReducer } from 'react';
import { defaultEnergy } from './analytics-data';
import { clamp } from './analytics-model';
import type {
  AnalyticsCategory,
  AnalyticsRange,
  DashboardQuality,
  DashboardSelection,
  DashboardState,
  DashboardTheme,
  DashboardView,
  EnergyMetric,
} from './analytics-types';

export type DashboardAction =
  | { type: 'set-range'; value: AnalyticsRange }
  | { type: 'set-category'; value: AnalyticsCategory }
  | { type: 'set-energy'; metric: EnergyMetric; value: number }
  | { type: 'select'; value: DashboardSelection }
  | { type: 'clear-selection' }
  | { type: 'set-view'; value: DashboardView }
  | { type: 'set-theme'; value: DashboardTheme }
  | { type: 'set-quality'; value: DashboardQuality }
  | { type: 'toggle-tables' }
  | { type: 'reset' };

export const initialDashboardState: DashboardState = {
  range: 'week',
  category: 'all',
  energy: { ...defaultEnergy },
  selection: null,
  view: '3d',
  theme: 'dark',
  quality: 'high',
  showTables: false,
};

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'set-range':
      return { ...state, range: action.value, selection: null };
    case 'set-category':
      return { ...state, category: action.value, selection: null };
    case 'set-energy':
      return {
        ...state,
        energy: { ...state.energy, [action.metric]: clamp(Math.round(action.value)) },
      };
    case 'select':
      return { ...state, selection: action.value };
    case 'clear-selection':
      return { ...state, selection: null };
    case 'set-view':
      return { ...state, view: action.value };
    case 'set-theme':
      return { ...state, theme: action.value };
    case 'set-quality':
      return { ...state, quality: action.value };
    case 'toggle-tables':
      return { ...state, showTables: !state.showTables };
    case 'reset':
      return { ...initialDashboardState, energy: { ...defaultEnergy } };
    default:
      return state;
  }
}

export const useDashboardStore = () => useReducer(dashboardReducer, initialDashboardState);
