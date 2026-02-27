const CONDITION_NUMERIC_OPERATORS = new Set(['>', '<', '>=', '<=', '==']);
const VISIBILITY_LOGIC_VALUES = new Set(['AND', 'OR']);

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
];

const ENTITY_ARRAY_SETTING_KEYS = ['entityIds', 'mediaIds', 'linkedMediaPlayers', 'calendars'];

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
  'media_player',
  'camera',
  'person',
  'automation',
  'input_boolean',
  'input_number',
  'lock',
  'button',
];

export function isConditionConfigured(condition) {
  const normalized = normalizeVisibilityConditionConfig(condition);
  return normalized.enabled && normalized.rules.length > 0;
}

export function normalizeVisibilityConditionConfig(condition) {
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
      logic: VISIBILITY_LOGIC_VALUES.has(condition.logic) ? condition.logic : 'AND',
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

function parseStates(states) {
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

function evaluateNumeric(operator, left, right) {
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

export function evaluateEntityCondition({ condition, entity, getAttribute }) {
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
    const compareValue = parseFloat(value);
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

  const referenceTimestampRaw =
    type === 'attribute' || (type === 'numeric' && attribute)
      ? entity.last_updated || entity.last_changed
      : entity.last_changed;
  if (!referenceTimestampRaw) return false;

  const referenceTimestamp = Date.parse(referenceTimestampRaw);
  if (!Number.isFinite(referenceTimestamp)) return false;

  return Date.now() - referenceTimestamp >= durationSeconds * 1000;
}

export function evaluateVisibilityConditionConfig({
  condition,
  entity,
  entities,
  getAttribute,
  fallbackEntityId,
}) {
  const normalized = normalizeVisibilityConditionConfig(condition);
  if (!normalized.enabled) return true;
  if (normalized.rules.length === 0) return true;
  const resolvedFallbackEntityId = fallbackEntityId || entity?.entity_id || null;

  const resolveRuleEntity = (rule) => {
    const explicitRuleEntityId =
      typeof rule?.entityId === 'string' && rule.entityId.trim() ? rule.entityId.trim() : null;
    const explicitConfigEntityId =
      typeof normalized.entityId === 'string' && normalized.entityId.trim()
        ? normalized.entityId.trim()
        : null;
    const targetEntityId =
      explicitRuleEntityId || explicitConfigEntityId || resolvedFallbackEntityId;

    if (targetEntityId && entities && entities[targetEntityId]) {
      return entities[targetEntityId];
    }

    if (entity && (!targetEntityId || entity.entity_id === targetEntityId)) {
      return entity;
    }

    return null;
  };

  const results = normalized.rules.map((rule) =>
    evaluateEntityCondition({
      condition: rule,
      entity: resolveRuleEntity(rule),
      getAttribute,
    })
  );
  if (results.length === 1) return results[0];

  if (normalized.logic === 'OR') {
    return results.some(Boolean);
  }

  return results.every(Boolean);
}

function toEntityIdFromDomainPrefix(cardId) {
  for (const domain of DOMAIN_PREFIXES) {
    const prefix = `${domain}_`;
    if (!cardId.startsWith(prefix)) continue;
    const suffix = cardId.slice(prefix.length);
    if (!suffix) return null;
    return `${domain}.${suffix}`;
  }
  return null;
}

function isLikelyEntityId(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes('.')) return false;
  return ENTITY_ID_PATTERN.test(trimmed);
}

function pickEntityLikeValue(value, entities) {
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

export function resolveConditionEntityId(cardId, cardSettings = {}, entities = {}) {
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
