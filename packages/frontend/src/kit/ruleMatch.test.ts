import { describe, it, expect } from 'vitest';
import {
  findMatchingRules,
  matchCondition,
  matchRule,
  validateRule,
  type Rule,
} from './ruleMatch.js';

type Field = 'from' | 'subject';
const record: Record<Field, string> = { from: 'Jobs@Acme.com', subject: 'Interview invite' };
const get = (f: Field) => record[f];

const rule = (over: Partial<Rule<Field, string>> = {}): Rule<Field, string> => ({
  id: 'r1',
  name: 'r',
  enabled: true,
  priority: 1,
  groupMatch: 'all',
  groups: [
    { match: 'all', conditions: [{ field: 'subject', op: 'contains', value: 'interview' }] },
  ],
  actions: 'tag',
  ...over,
});

describe('matchCondition', () => {
  it('supports every op, case-insensitive by default', () => {
    expect(matchCondition(get, { field: 'from', op: 'ends_with', value: 'acme.com' })).toBe(true);
    expect(matchCondition(get, { field: 'from', op: 'starts_with', value: 'jobs' })).toBe(true);
    expect(matchCondition(get, { field: 'from', op: 'equals', value: 'jobs@acme.com' })).toBe(true);
    expect(matchCondition(get, { field: 'subject', op: 'not_contains', value: 'offer' })).toBe(
      true,
    );
    expect(matchCondition(get, { field: 'subject', op: 'regex', value: '^interview' })).toBe(true);
    expect(
      matchCondition(get, {
        field: 'from',
        op: 'equals',
        value: 'jobs@acme.com',
        caseSensitive: true,
      }),
    ).toBe(false);
  });

  it('an invalid regex never matches', () => {
    expect(matchCondition(get, { field: 'subject', op: 'regex', value: '(' })).toBe(false);
  });
});

describe('matchRule', () => {
  it('handles enabled, empty and any/all groups', () => {
    expect(matchRule(rule(), get)).toBe(true);
    expect(matchRule(rule({ enabled: false }), get)).toBe(false);
    expect(matchRule(rule({ groups: [] }), get)).toBe(false);
    expect(matchRule(rule({ groups: [{ match: 'all', conditions: [] }] }), get)).toBe(true);
    const anyRule = rule({
      groups: [
        {
          match: 'any',
          conditions: [
            { field: 'subject', op: 'contains', value: 'nope' },
            { field: 'from', op: 'contains', value: 'acme' },
          ],
        },
      ],
    });
    expect(matchRule(anyRule, get)).toBe(true);
  });
});

describe('findMatchingRules', () => {
  it('sorts by priority desc then id, skipping disabled rules', () => {
    const rules = [
      rule({ id: 'b', priority: 1 }),
      rule({ id: 'a', priority: 1 }),
      rule({ id: 'c', priority: 5 }),
      rule({ id: 'd', enabled: false, priority: 9 }),
    ];
    expect(findMatchingRules(rules, get).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('validateRule', () => {
  it('lists invalid regexes', () => {
    const r = rule({
      groups: [{ match: 'all', conditions: [{ field: 'subject', op: 'regex', value: '[' }] }],
    });
    expect(validateRule(r)).toEqual([
      expect.objectContaining({ groupIndex: 0, conditionIndex: 0 }),
    ]);
    expect(validateRule(rule())).toEqual([]);
  });
});
