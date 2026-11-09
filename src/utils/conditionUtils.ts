import type { HassEntities, HassEntity } from '../types/ha';

export type VisibilityConditionRule = {
  type?: string;
  entityId?: string | null;
  states?: unknown;
  attribute?: string | null;
  value?: unknown;
  operator?: string;
  forSeconds?: unknown;
  [key: string]: unknown;
};

export type VisibilityConditionInput = VisibilityConditionRule & {
  logic?: string;
  enabled?: boolean;
  rules?: (VisibilityConditionRule | null | undefined)[] | null;
};

export type NormalizedVisibilityCondition = {
  entityId: string | null;
  logic: string;
  enabled: boolean;
  rules: VisibilityConditionRule[];
};

export type GetEntityAttribute = (entityId: string, attribute: string) => unknown;

export type ConditionCardSettings = {
  visibilityCondition?: VisibilityConditionInput | null;
  [key: string]: unknown;
};

const CONDITION_NUMERIC_OPERATORS = new Set<unknown>(['>', '<', '>=', '<=', '==']);
const VISIBILITY_LOGIC_VALUES = new Set<unknown>(['AND', 'OR']);

const ENTITY_SETTING_KEYS = [
  'entityId',
  'entity',
  'sensorId',
  'todoEntityId',
  'todayId',
  'monthId',
  'batteryEntity',
  'deviceTracker',
  'calendarEntity',
  'climateEntity',
  'coverEntity',
  'alarmId',
  'cameraEntity',
  'weatherEntity',
  'weatherId',
  'tempEntity',
  'tempId',
  'remoteEntityId',
  'mediaEntityId',
  'batteryId',
  'rangeId',
  'odometerId',
  'locationId',
  'latitudeId',
  'longitudeId',
  'chargingId',
  'chargingStateId',
  'pluggedId',
  'chargingPowerId',
  'chargeRateId',
  'timeToFullId',
  'chargeEndTimeId',
  'chargeControlId',
  'chargeLimitNumberId',
  'chargeLimitSelectId',
  'climateId',
  'lockId',
  'ignitionSwitchId',
  'engineStatusId',
  'lastUpdatedId',
  'apiStatusId',
  'updateButtonId',
];

const ENTITY_ARRAY_SETTING_KEYS = [
  'entityIds',
  'mediaIds',
  'linkedMediaPlayers',
  'calendars',
  'chargeControlIds',
];

const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+(?:[a-z0-9_\-.]*)$/i;

const DOMAIN_PREFIXES = [
  'light',
  'switch',
  'sensor',
  'binary_sensor',
  'fan',
  'cover',
  'climate',
  'vacuum',
  'lawn_mower',
  'media_player',
  'camera',
  'person',
  'automation',
  'input_boolean',
  'input_number',
  'lock',
  'button',
];

const BINARY_STATE_DOMAINS = new Set([
  'light',
  'switch',
  'binary_sensor',
  'input_boolean',
  'fan',
  'automation',
  'script',
  'remote',
  'siren',
  'humidifier',
]);

function getUsableState(entity: HassEntity | null | undefined): string | null {
  const state = entity?.state;
  return state && state !== 'unavailable' && state !== 'unknown' ? state : null;
}

export function createDefaultConditionRule(entity?: HassEntity | null): VisibilityConditionRule {
  const current = getUsableState(entity);
  // A reading changes all the time, so requiring today's value would hide the card tomorrow.
  if (current !== null && !Number.isNaN(Number(current))) {
    return { type: 'not_state', states: ['unavailable'], forSeconds: 0 };
  }
  return { type: 'state', states: [current ?? 'on'], forSeconds: 0 };
}

export function getKnownConditionStates(entity?: HassEntity | null): string[] {
  if (!entity) return [];
  const current = getUsableState(entity);
  const binary = BINARY_STATE_DOMAINS.has(entity.entity_id.split('.')[0]) ? ['on', 'off'] : [];
  if (!current || binary.includes(current)) return binary;
  return [current, ...binary];
}

function isConditionRuleFinished(rule: VisibilityConditionRule): boolean {
  if (rule.type === 'attribute') {
    return typeof rule.attribute === 'string' && rule.attribute.trim() !== '';
  }
  if (rule.type === 'numeric') {
    return Number.isFinite(parseFloat(rule.value as string));
  }
  if (rule.type === 'state' || rule.type === 'not_state') {
    return parseStates(rule.states).length > 0;
  }
  return true;
}

export function isConditionConfigured(
  condition: VisibilityConditionInput | null | undefined
): boolean {
  const normalized = normalizeVisibilityConditionConfig(condition);
  return normalized.enabled && normalized.rules.some(isConditionRuleFinished);
}

export function retargetConditionEntity<T extends VisibilityConditionInput | null | undefined>(
  condition: T,
  previousEntityId: string,
  nextEntityId: string
): T {
  if (!condition || typeof condition !== 'object') return condition;
  const rules = Array.isArray(condition.rules) ? condition.rules : null;
  const hasRuleMatch = rules?.some((rule) => rule?.entityId === previousEntityId);
  if (condition.entityId !== previousEntityId && !hasRuleMatch) return condition;

  return {
    ...condition,
    ...(condition.entityId === previousEntityId ? { entityId: nextEntityId } : null),
    ...(rules
      ? {
          rules: rules.map((rule) =>
            rule?.entityId === previousEntityId ? { ...rule, entityId: nextEntityId } : rule
          ),
        }
      : null),
  };
}

export function normalizeVisibilityConditionConfig(
  condition: VisibilityConditionInput | null | undefined
): NormalizedVisibilityCondition {
  if (!condition || typeof condition !== 'object') {
    return { entityId: null, logic: 'AND', enabled: false, rules: [] };
  }

  if (Array.isArray(condition.rules)) {
    const rules = condition.rules
      .filter(
        (rule) =>
          !!(rule && typeof rule === 'object' && typeof rule.type === 'string' && rule.type.trim())
      )
      .slice(0, 2)
      .map((rule) => ({ ...rule }));
    const enabled = condition.enabled !== false;

    return {
      entityId: typeof condition.entityId === 'string' ? condition.entityId : null,
      // has() doesn't narrow; a hit means logic is 'AND' or 'OR'
      logic: VISIBILITY_LOGIC_VALUES.has(condition.logic) ? (condition.logic as string) : 'AND',
      enabled,
      rules,
    };
  }

  if (typeof condition.type === 'string' && condition.type.trim()) {
    return {
      entityId: typeof condition.entityId === 'string' ? condition.entityId : null,
      logic: 'AND',
      enabled: condition.enabled !== false,
      rules: [{ ...condition }],
    };
  }

  return { entityId: null, logic: 'AND', enabled: false, rules: [] };
}

function parseStates(states: unknown): string[] {
  if (Array.isArray(states)) {
    return states.map((state) => String(state).trim()).filter(Boolean);
  }

  if (typeof states === 'string') {
    return states
      .split(',')
      .map((state) => state.trim())
      .filter(Boolean);
  }

  return [];
}

function evaluateNumeric(operator: string | undefined, left: number, right: number): boolean {
  switch (operator) {
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    case '==':
      return left === right;
    default:
      return false;
  }
}

export function evaluateEntityCondition({
  condition,
  entity,
  getAttribute,
}: {
  condition: VisibilityConditionInput | null | undefined;
  entity?: HassEntity | null;
  getAttribute?: GetEntityAttribute | null;
}): boolean {
  const normalized = normalizeVisibilityConditionConfig(condition);
  const activeRule = normalized.rules[0];
  if (!activeRule) return true;
  if (!entity) return false;

  const { type, states, attribute, value, operator, forSeconds } = activeRule;
  let matchesBase = true;

  if (type === 'state') {
    const expectedStates = parseStates(states);
    matchesBase = expectedStates.length === 0 ? true : expectedStates.includes(entity.state);
  } else if (type === 'not_state') {
    const expectedStates = parseStates(states);
    matchesBase = expectedStates.length === 0 ? true : !expectedStates.includes(entity.state);
  } else if (type === 'numeric') {
    const sourceValue = attribute
      ? getAttribute
        ? getAttribute(entity.entity_id, attribute)
        : entity.attributes?.[attribute]
      : entity.state;
    const numericValue = parseFloat(sourceValue);
    // parseFloat coerces non-string input itself; the cast only satisfies its string signature
    const compareValue = parseFloat(value as string);
    const usedOperator = CONDITION_NUMERIC_OPERATORS.has(operator) ? operator : '>';
    matchesBase = !(Number.isNaN(numericValue) || Number.isNaN(compareValue))
      ? evaluateNumeric(usedOperator, numericValue, compareValue)
      : false;
  } else if (type === 'attribute') {
    const attrName = typeof attribute === 'string' ? attribute.trim() : '';
    if (!attrName) {
      matchesBase = false;
    } else {
      const attrValue = getAttribute
        ? getAttribute(entity.entity_id, attrName)
        : entity.attributes?.[attrName];
      if (value === undefined || value === null || value === '') {
        matchesBase =
          attrValue !== undefined && attrValue !== null && String(attrValue).trim() !== '';
      } else {
        matchesBase = String(attrValue) === String(value);
      }
    }
  }

  if (!matchesBase) return false;

  const durationSeconds = Number(forSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return true;

  const referenceTimestamp = getRuleReferenceTime(activeRule, entity);
  if (referenceTimestamp === null) return false;

  return Date.now() - referenceTimestamp >= durationSeconds * 1000;
}

function getRuleReferenceTime(rule: VisibilityConditionRule, entity: HassEntity): number | null {
  const raw =
    rule.type === 'attribute' || (rule.type === 'numeric' && rule.attribute)
      ? entity.last_updated || entity.last_changed
      : entity.last_changed;
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : null;
}

function resolveRuleEntity(
  rule: VisibilityConditionRule,
  normalized: NormalizedVisibilityCondition,
  entity: HassEntity | null | undefined,
  entities: HassEntities | null | undefined,
  fallbackEntityId: string | null
): HassEntity | null {
  const explicitRuleEntityId =
    typeof rule?.entityId === 'string' && rule.entityId.trim() ? rule.entityId.trim() : null;
  const explicitConfigEntityId =
    typeof normalized.entityId === 'string' && normalized.entityId.trim()
      ? normalized.entityId.trim()
      : null;
  const targetEntityId = explicitRuleEntityId || explicitConfigEntityId || fallbackEntityId;

  if (targetEntityId && entities && entities[targetEntityId]) {
    return entities[targetEntityId];
  }

  if (entity && (!targetEntityId || entity.entity_id === targetEntityId)) {
    return entity;
  }

  return null;
}

/** When the next rule that must hold "for N seconds" comes due, or null if none is waiting. */
export function getNextConditionDeadline({
  condition,
  entities,
  fallbackEntityId,
  now,
}: {
  condition: VisibilityConditionInput | null | undefined;
  entities: HassEntities | null | undefined;
  fallbackEntityId?: string | null;
  now: number;
}): number | null {
  const normalized = normalizeVisibilityConditionConfig(condition);
  if (!normalized.enabled) return null;

  const deadlines = normalized.rules.filter(isConditionRuleFinished).flatMap((rule) => {
    const seconds = Number(rule.forSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return [];
    const entity = resolveRuleEntity(rule, normalized, null, entities, fallbackEntityId ?? null);
    const reference = entity ? getRuleReferenceTime(rule, entity) : null;
    if (reference === null) return [];
    const deadline = reference + seconds * 1000;
    return deadline > now ? [deadline] : [];
  });

  return deadlines.length > 0 ? Math.min(...deadlines) : null;
}

/**
 * @param {Object} params
 * @param {Object} params.condition
 * @param {Object} [params.entity]
 * @param {Object} [params.entities]
 * @param {Function} [params.getAttribute]
 * @param {string} [params.fallbackEntityId]
 */
export function evaluateVisibilityConditionConfig({
  condition,
  entity,
  entities,
  getAttribute,
  fallbackEntityId,
}: {
  condition: VisibilityConditionInput | null | undefined;
  entity?: HassEntity | null;
  entities?: HassEntities | null;
  getAttribute?: GetEntityAttribute | null;
  fallbackEntityId?: string | null;
}): boolean {
  const normalized = normalizeVisibilityConditionConfig(condition);
  if (!normalized.enabled) return true;
  const finishedRules = normalized.rules.filter(isConditionRuleFinished);
  if (finishedRules.length === 0) return true;
  const resolvedFallbackEntityId = fallbackEntityId || entity?.entity_id || null;

  const results = finishedRules.map((rule) =>
    evaluateEntityCondition({
      condition: rule,
      entity: resolveRuleEntity(rule, normalized, entity, entities, resolvedFallbackEntityId),
      getAttribute,
    })
  );
  if (results.length === 1) return results[0];

  if (normalized.logic === 'OR') {
    return results.some(Boolean);
  }

  return results.every(Boolean);
}

function toEntityIdFromDomainPrefix(cardId: string): string | null {
  for (const domain of DOMAIN_PREFIXES) {
    const prefix = `${domain}_`;
    if (!cardId.startsWith(prefix)) continue;
    const suffix = cardId.slice(prefix.length);
    if (!suffix) return null;
    return `${domain}.${suffix}`;
  }
  return null;
}

function isLikelyEntityId(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes('.')) return false;
  return ENTITY_ID_PATTERN.test(trimmed);
}

function pickEntityLikeValue(
  value: unknown,
  entities: HassEntities | null | undefined
): string | null {
  if (typeof value === 'string') {
    const candidate = value.trim();
    if (!candidate || !isLikelyEntityId(candidate)) return null;
    if (entities && Object.keys(entities).length > 0 && !entities[candidate]) return null;
    return candidate;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickEntityLikeValue(item, entities);
      if (found) return found;
    }
  }

  return null;
}

export function resolveConditionEntityId(
  cardId: string | null | undefined,
  cardSettings: ConditionCardSettings | null | undefined = {},
  entities: HassEntities = {}
): string | null {
  const condition = cardSettings?.visibilityCondition;
  if (typeof condition?.entityId === 'string' && condition.entityId.trim()) {
    return condition.entityId.trim();
  }

  for (const key of ENTITY_SETTING_KEYS) {
    const candidate = cardSettings?.[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const key of ENTITY_ARRAY_SETTING_KEYS) {
    const list = cardSettings?.[key];
    if (!Array.isArray(list)) continue;
    const first = list.find((item) => typeof item === 'string' && item.trim());
    if (first) return first.trim();
  }

  if (cardSettings && typeof cardSettings === 'object') {
    for (const value of Object.values(cardSettings)) {
      const fromSetting = pickEntityLikeValue(value, entities);
      if (fromSetting) return fromSetting;
    }
  }

  if (typeof cardId === 'string' && cardId.includes('.')) {
    return cardId;
  }

  if (typeof cardId === 'string') {
    const converted = toEntityIdFromDomainPrefix(cardId);
    if (converted && (entities[converted] || !Object.keys(entities).length)) return converted;
  }

  return null;
}
