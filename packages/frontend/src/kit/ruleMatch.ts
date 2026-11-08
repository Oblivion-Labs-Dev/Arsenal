/**
 * Generic user-rule matching: AND/OR groups of text conditions with priorities
 * (from AdhocPluginAndExtention `rule-engine/engine.ts`, email specifics removed).
 */

export type RuleOp = 'contains' | 'not_contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex';

export interface RuleCondition<F extends string = string> {
  field: F;
  op: RuleOp;
  value: string;
  caseSensitive?: boolean;
}

export interface RuleGroup<F extends string = string> {
  match: 'all' | 'any';
  conditions: RuleCondition<F>[];
}

export interface Rule<F extends string = string, A = unknown> {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  groupMatch: 'all' | 'any';
  groups: RuleGroup<F>[];
  actions: A;
}

export type FieldGetter<F extends string> = (field: F) => string;

/** An invalid regex never matches (see `validateRule` to surface it to the user). */
export function matchCondition<F extends string>(
  getField: FieldGetter<F>,
  c: RuleCondition<F>,
): boolean {
  const raw = getField(c.field);
  if (c.op === 'regex') {
    try {
      return new RegExp(c.value, c.caseSensitive ? '' : 'i').test(raw);
    } catch {
      return false;
    }
  }
  const haystack = c.caseSensitive ? raw : raw.toLowerCase();
  const needle = c.caseSensitive ? c.value : c.value.toLowerCase();
  switch (c.op) {
    case 'contains':
      return haystack.includes(needle);
    case 'not_contains':
      return !haystack.includes(needle);
    case 'equals':
      return haystack === needle;
    case 'starts_with':
      return haystack.startsWith(needle);
    case 'ends_with':
      return haystack.endsWith(needle);
  }
}

function matchGroup<F extends string>(getField: FieldGetter<F>, g: RuleGroup<F>): boolean {
  if (g.conditions.length === 0) return true;
  return g.match === 'all'
    ? g.conditions.every((c) => matchCondition(getField, c))
    : g.conditions.some((c) => matchCondition(getField, c));
}

/** Disabled rules and rules without groups never match; an empty group matches. */
export function matchRule<F extends string, A>(
  rule: Rule<F, A>,
  getField: FieldGetter<F>,
): boolean {
  if (!rule.enabled || rule.groups.length === 0) return false;
  return rule.groupMatch === 'all'
    ? rule.groups.every((g) => matchGroup(getField, g))
    : rule.groups.some((g) => matchGroup(getField, g));
}

/** Matching rules, highest priority first (ties broken by id for determinism). */
export function findMatchingRules<F extends string, A>(
  rules: readonly Rule<F, A>[],
  getField: FieldGetter<F>,
): Rule<F, A>[] {
  return [...rules]
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .filter((r) => matchRule(r, getField));
}

export interface RuleValidationError {
  groupIndex: number;
  conditionIndex: number;
  message: string;
}

/** Reports regex conditions that would never match because they do not compile. */
export function validateRule<F extends string, A>(rule: Rule<F, A>): RuleValidationError[] {
  const errors: RuleValidationError[] = [];
  rule.groups.forEach((g, groupIndex) =>
    g.conditions.forEach((c, conditionIndex) => {
      if (c.op !== 'regex') return;
      try {
        new RegExp(c.value);
      } catch (err) {
        errors.push({
          groupIndex,
          conditionIndex,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );
  return errors;
}
