import { describe, expect, it } from 'vitest';
import {
  createDefaultConditionRule,
  evaluateVisibilityConditionConfig,
  getKnownConditionStates,
  isConditionConfigured,
  retargetConditionEntity,
} from '../utils/conditionUtils';
import type { HassEntity } from '../types/ha';

const entity = (entityId: string, state: string) =>
  ({ entity_id: entityId, state, attributes: {} }) as unknown as HassEntity;

describe('createDefaultConditionRule', () => {
  it('defaults to the current state of the entity', () => {
    expect(createDefaultConditionRule(entity('climate.room', 'heat'))).toEqual({
      type: 'state',
      states: ['heat'],
      forSeconds: 0,
    });
  });

  it.each(['unavailable', 'unknown'])('falls back to on when the entity is %s', (state) => {
    expect(createDefaultConditionRule(entity('cover.a', state)).states).toEqual(['on']);
  });

  it('falls back to on without an entity', () => {
    expect(createDefaultConditionRule(null).states).toEqual(['on']);
  });
});

describe('getKnownConditionStates', () => {
  it('offers on and off for binary domains', () => {
    expect(getKnownConditionStates(entity('light.a', 'on'))).toEqual(['on', 'off']);
  });

  it('offers only the current state for other domains', () => {
    expect(getKnownConditionStates(entity('climate.a', 'heat'))).toEqual(['heat']);
  });

  it('leaves out unavailable states and missing entities', () => {
    expect(getKnownConditionStates(entity('climate.a', 'unavailable'))).toEqual([]);
    expect(getKnownConditionStates(null)).toEqual([]);
  });
});

describe('unfinished rules', () => {
  const blankAttribute = { type: 'attribute', attribute: '', value: '' };

  it('counts a condition with only an unfinished rule as not configured', () => {
    expect(isConditionConfigured({ rules: [blankAttribute] })).toBe(false);
    expect(isConditionConfigured({ rules: [{ type: 'numeric', value: '' }] })).toBe(false);
    expect(isConditionConfigured({ rules: [{ type: 'state', states: [] }] })).toBe(false);
  });

  it('counts a finished rule as configured', () => {
    expect(isConditionConfigured({ rules: [{ type: 'attribute', attribute: 'x' }] })).toBe(true);
    expect(isConditionConfigured({ rules: [{ type: 'numeric', value: 0 }] })).toBe(true);
    expect(isConditionConfigured({ rules: [{ type: 'state', states: ['on'] }] })).toBe(true);
  });

  it('does not hide the card for a blank attribute rule', () => {
    expect(
      evaluateVisibilityConditionConfig({
        condition: { rules: [blankAttribute] },
        entity: entity('light.a', 'on'),
      })
    ).toBe(true);
  });

  it('ignores the unfinished rule when another rule is finished', () => {
    expect(
      evaluateVisibilityConditionConfig({
        condition: { rules: [blankAttribute, { type: 'state', states: ['off'] }] },
        entity: entity('light.a', 'on'),
      })
    ).toBe(false);
  });
});

describe('retargetConditionEntity', () => {
  it('moves rules from the old entity to the new one', () => {
    const condition = {
      entityId: 'cover.old',
      rules: [
        { type: 'state', entityId: 'cover.old', states: ['open'] },
        { type: 'state', entityId: 'light.other', states: ['on'] },
      ],
    };

    expect(retargetConditionEntity(condition, 'cover.old', 'cover.new')).toEqual({
      entityId: 'cover.new',
      rules: [
        { type: 'state', entityId: 'cover.new', states: ['open'] },
        { type: 'state', entityId: 'light.other', states: ['on'] },
      ],
    });
  });

  it('returns the same object when nothing points at the old entity', () => {
    const condition = { rules: [{ type: 'state', entityId: 'light.other', states: ['on'] }] };
    expect(retargetConditionEntity(condition, 'cover.old', 'cover.new')).toBe(condition);
    expect(retargetConditionEntity(null, 'cover.old', 'cover.new')).toBeNull();
  });
});
