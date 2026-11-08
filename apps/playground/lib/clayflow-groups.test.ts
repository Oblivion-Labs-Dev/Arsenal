import { validate } from '@arsenal/clayflow';
import { describe, expect, it } from 'vitest';
import { CLAYFLOW_GROUPS } from './clayflow-groups';

describe('ClayFlow tab groups on /components', () => {
  it('has unique group ids in a stable order', () => {
    expect(CLAYFLOW_GROUPS.map((g) => g.id)).toEqual([
      'nodes',
      'connectors',
      'flows',
      'transformations',
      'stock',
    ]);
  });

  it.each(CLAYFLOW_GROUPS.filter((g) => g.id !== 'stock').map((g) => [g.id, g] as const))(
    '%s has diagrams that all validate, with unique ids',
    (_id, group) => {
      expect(group.specs.length).toBeGreaterThan(0);
      const ids = group.specs.map((spec) => spec.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const spec of group.specs) {
        const result = validate(spec);
        expect(result.ok, `${spec.id} should validate`).toBe(true);
      }
    },
  );

  it('marks every sample diagram as illustrative', () => {
    for (const group of CLAYFLOW_GROUPS) {
      for (const spec of group.specs) expect(spec.illustrative, spec.id).toBe(true);
    }
  });

  it('links each group to a page that exists', () => {
    for (const group of CLAYFLOW_GROUPS)
      expect(group.href).toMatch(/^\/(clayflow\/showcase#|stock-intelligence$)/);
  });
});
