import { useState } from 'react';
import {
  evaluateVisibilityConditionConfig,
  normalizeVisibilityConditionConfig,
  resolveConditionEntityId,
} from '../../utils/conditionUtils';
import { Check, Plus, Search } from '../../icons';

const createDefaultRule = () => ({
  type: 'state',
  states: ['on'],
  forSeconds: 0,
});

const NUMERIC_OPERATORS = ['>', '<', '>=', '<=', '=='];

const TYPE_OPTIONS = [
  { id: 'state', tKey: 'visibility.type.state' },
  { id: 'not_state', tKey: 'visibility.type.notState' },
  { id: 'numeric', tKey: 'visibility.type.numeric' },
  { id: 'attribute', tKey: 'visibility.type.attribute' },
];

function getConditionWithDefaults(condition) {
  const normalized = normalizeVisibilityConditionConfig(condition);
  if (normalized.rules.length > 0) return normalized;
  return {
    entityId: null,
    logic: 'AND',
    enabled: true,
    rules: [createDefaultRule()],
  };
}

function getFriendlyEntityName(entityId, entities) {
  if (!entityId) return '';
  return entities?.[entityId]?.attributes?.friendly_name || entityId;
}

function buildRuleSummary(rule, targetLabel, t) {
  if (!rule?.type) return t('visibility.summary.custom') || 'Custom rule';

  const seconds = Number(rule.forSeconds);
  const durationSuffix =
    Number.isFinite(seconds) && seconds > 0
      ? ` ${t('visibility.summary.forSeconds') || 'for'} ${seconds}s`
      : '';

  if (rule.type === 'state') {
    const states = Array.isArray(rule.states) ? rule.states.join(', ') : '';
    if (!states) return `${targetLabel}${durationSuffix}`;
    return `${targetLabel} ${t('visibility.summary.stateIs') || 'state is'} ${states}${durationSuffix}`;
  }

  if (rule.type === 'not_state') {
    const states = Array.isArray(rule.states) ? rule.states.join(', ') : '';
    if (!states) return `${targetLabel}${durationSuffix}`;
    return `${targetLabel} ${t('visibility.summary.stateNot') || 'state is not'} ${states}${durationSuffix}`;
  }

  if (rule.type === 'numeric') {
    const left = rule.attribute
      ? `${targetLabel}.${rule.attribute}`
      : `${targetLabel} ${t('visibility.summary.stateValue') || 'state value'}`;
    return `${left} ${rule.operator || '>'} ${rule.value ?? ''}${durationSuffix}`.trim();
  }

  if (rule.type === 'attribute') {
    if (!rule.attribute) return `${targetLabel}${durationSuffix}`;
    if (rule.value === undefined || rule.value === null || rule.value === '') {
      return `${targetLabel}.${rule.attribute} ${t('visibility.summary.exists') || 'exists'}${durationSuffix}`;
    }
    return `${targetLabel}.${rule.attribute} = ${rule.value}${durationSuffix}`;
  }

  return t('visibility.summary.custom') || 'Custom rule';
}

function buildSummary(config, entityId, entities, t) {
  if (!config?.rules?.length) return t('visibility.summary.always') || 'Always visible';

  const targetLabel =
    getFriendlyEntityName(entityId, entities) ||
    t('visibility.currentCardEntity') ||
    'current card entity';
  const [firstRule, secondRule] = config.rules;
  if (!secondRule) {
    return buildRuleSummary(firstRule, targetLabel, t);
  }

  const joiner =
    config.logic === 'OR' ? t('visibility.logic.or') || 'OR' : t('visibility.logic.and') || 'AND';
  return `${buildRuleSummary(firstRule, targetLabel, t)} ${joiner} ${buildRuleSummary(secondRule, targetLabel, t)}`;
}

function buildRuleSummaryItems(config, defaultEntityId, entities, t) {
  if (!config?.rules?.length) return [];

  return config.rules.filter(Boolean).map((rule) => {
    const targetEntityId =
      typeof rule?.entityId === 'string' && rule.entityId.trim()
        ? rule.entityId.trim()
        : defaultEntityId;
    const targetLabel =
      getFriendlyEntityName(targetEntityId, entities) ||
      t('visibility.currentCardEntity') ||
      'current card entity';
    return buildRuleSummary(rule, targetLabel, t);
  });
}

function buildLiveStatusItems(config, defaultEntityId, entities, t) {
  if (!config?.rules?.length) return [];

  return config.rules
    .filter(Boolean)
    .map((rule, index) => {
      const targetEntityId =
        typeof rule?.entityId === 'string' && rule.entityId.trim()
          ? rule.entityId.trim()
          : defaultEntityId;

      if (!targetEntityId) return null;

      const entity = entities?.[targetEntityId];
      const label = getFriendlyEntityName(targetEntityId, entities) || targetEntityId;
      const state = entity?.state ?? (t('common.unknown') || 'unknown');
      return { key: `${targetEntityId}-${index}`, text: `${label}: ${state}` };
    })
    .filter(Boolean);
}

export default function ConditionBuilder({
  cardId,
  cardSettings,
  condition,
  entities,
  onChange,
  t,
  showHeader = true,
  showEnableToggle = true,
  forceEnabled = false,
}) {
  const [entitySearch, setEntitySearch] = useState('');
  const [activeEntityPickerRule, setActiveEntityPickerRule] = useState(null);
  const [stateInputByRule, setStateInputByRule] = useState({});

  const entityIds = Object.keys(entities || {}).sort((a, b) => {
    const nameA = getFriendlyEntityName(a, entities).toLowerCase();
    const nameB = getFriendlyEntityName(b, entities).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const defaultEntityId = resolveConditionEntityId(cardId, cardSettings, entities);
  const effectiveConfig = getConditionWithDefaults(condition);
  const selectedEntityId =
    defaultEntityId || (effectiveConfig.entityId && effectiveConfig.entityId.trim()) || null;
  const selectedEntity = selectedEntityId ? entities?.[selectedEntityId] : null;
  const normalizedCondition = normalizeVisibilityConditionConfig(condition);
  const isEnabled =
    forceEnabled || (normalizedCondition.enabled && normalizedCondition.rules.length > 0);

  const isVisibleNow = isEnabled
    ? evaluateVisibilityConditionConfig({
        condition: effectiveConfig,
        entity: selectedEntity,
        entities,
        fallbackEntityId: defaultEntityId,
      })
    : true;

  const ruleSummaryItems = isEnabled
    ? buildRuleSummaryItems(effectiveConfig, defaultEntityId, entities, t)
    : [];

  const liveStatusItems = isEnabled
    ? buildLiveStatusItems(effectiveConfig, defaultEntityId, entities, t)
    : [];

  const saveConfig = (nextConfig) => {
    const safeRules = (nextConfig.rules || []).filter((rule) => rule?.type).slice(0, 2);
    if (safeRules.length === 0) {
      onChange(null);
      return;
    }
    const normalizedRules = safeRules.map((rule) => ({
      ...rule,
      entityId:
        typeof rule.entityId === 'string' && rule.entityId.trim()
          ? rule.entityId.trim()
          : defaultEntityId,
    }));

    onChange({
      ...nextConfig,
      logic: nextConfig.logic === 'OR' ? 'OR' : 'AND',
      enabled: nextConfig.enabled !== false,
      rules: normalizedRules,
    });
  };

  const setType = (index, type) => {
    const nextRules = [...effectiveConfig.rules];
    const current = nextRules[index] || createDefaultRule();
    if (type === 'state') {
      nextRules[index] = { ...current, type, states: ['on'] };
      saveConfig({ ...effectiveConfig, rules: nextRules });
      return;
    }
    if (type === 'not_state') {
      nextRules[index] = { ...current, type, states: ['off'] };
      saveConfig({ ...effectiveConfig, rules: nextRules });
      return;
    }
    if (type === 'numeric') {
      nextRules[index] = { ...current, type, operator: '>', value: 0 };
      saveConfig({ ...effectiveConfig, rules: nextRules });
      return;
    }
    if (type === 'attribute') {
      nextRules[index] = { ...current, type, attribute: '', value: '' };
      saveConfig({ ...effectiveConfig, rules: nextRules });
      return;
    }
    nextRules[index] = { ...current, type };
    saveConfig({ ...effectiveConfig, rules: nextRules });
  };

  const updateRule = (index, partial) => {
    const nextRules = [...effectiveConfig.rules];
    nextRules[index] = { ...(nextRules[index] || createDefaultRule()), ...partial };
    saveConfig({ ...effectiveConfig, rules: nextRules });
  };

  const addSecondRule = () => {
    if (effectiveConfig.rules.length >= 2) return;
    saveConfig({ ...effectiveConfig, rules: [...effectiveConfig.rules, createDefaultRule()] });
  };

  const removeSecondRule = () => {
    if (effectiveConfig.rules.length <= 1) return;
    saveConfig({ ...effectiveConfig, rules: [effectiveConfig.rules[0]] });
  };

  const setEnabled = (enabled) => {
    saveConfig({ ...effectiveConfig, enabled });
  };

  const filteredEntityIds = entityIds.filter((id) => {
    if (!entitySearch.trim()) return true;
    const query = entitySearch.toLowerCase();
    const name = getFriendlyEntityName(id, entities).toLowerCase();
    return id.toLowerCase().includes(query) || name.includes(query);
  });

  const getRuleEntityId = (ruleIndex) => {
    const rule = effectiveConfig.rules[ruleIndex];
    if (rule?.entityId && String(rule.entityId).trim()) return String(rule.entityId).trim();
    return defaultEntityId || null;
  };

  const renderRuleEntityPicker = (ruleIndex) => {
    const selectedRuleEntityId = getRuleEntityId(ruleIndex);
    const pickerOpen = activeEntityPickerRule === ruleIndex;

    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => {
            setActiveEntityPickerRule((prev) => (prev === ruleIndex ? null : ruleIndex));
            setEntitySearch('');
          }}
          className="group entity-item popup-surface popup-surface-hover flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-1.5 text-left transition-colors"
        >
          <div className="mr-4 flex flex-col overflow-hidden">
            <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
              {t('visibility.targetEntity') || 'Entity'} {ruleIndex + 1}
            </span>
            <span className="truncate text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              {getFriendlyEntityName(selectedRuleEntityId, entities) ||
                t('visibility.noEntity') ||
                'No entity'}
            </span>
          </div>
          <div className="flex-shrink-0 rounded-full bg-[var(--glass-bg)] p-1 text-gray-500 transition-colors group-hover:bg-green-500/20 group-hover:text-green-400">
            {pickerOpen ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </div>
        </button>

        {pickerOpen && (
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder={t('form.search') || 'Search...'}
                className="popup-surface w-full rounded-xl border border-transparent py-1.5 pr-3 pl-9 text-xs text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
              />
            </div>

            <div className="custom-scrollbar max-h-36 space-y-1 overflow-y-auto pr-1">
              {filteredEntityIds.map((id) => {
                const isSelected = selectedRuleEntityId === id;
                return (
                  <button
                    key={`rule-${ruleIndex}-${id}`}
                    type="button"
                    onClick={() => updateRule(ruleIndex, { entityId: id })}
                    className={`group entity-item flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition-colors ${isSelected ? 'border-[var(--accent-color)] bg-[var(--accent-bg)]' : 'popup-surface popup-surface-hover border-transparent'}`}
                  >
                    <div className="mr-3 flex flex-col overflow-hidden">
                      <span
                        className={`truncate text-[11px] font-bold transition-colors ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                      >
                        {getFriendlyEntityName(id, entities)}
                      </span>
                      <span
                        className={`truncate text-[10px] font-medium ${isSelected ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}
                      >
                        {id}
                      </span>
                    </div>
                    <div
                      className={`flex-shrink-0 rounded-full p-1 transition-colors ${isSelected ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const addStateValue = (index) => {
    const currentInput = (stateInputByRule[index] || '').trim();
    if (!currentInput) return;
    const existing = Array.isArray(effectiveConfig.rules[index]?.states)
      ? effectiveConfig.rules[index].states
      : [];
    if (!existing.includes(currentInput)) {
      updateRule(index, { states: [...existing, currentInput] });
    }
    setStateInputByRule((prev) => ({ ...prev, [index]: '' }));
  };

  const removeStateValue = (index, stateToRemove) => {
    const existing = Array.isArray(effectiveConfig.rules[index]?.states)
      ? effectiveConfig.rules[index].states
      : [];
    updateRule(index, { states: existing.filter((state) => state !== stateToRemove) });
  };

  const renderRuleEditor = (rule, index) => {
    const selectedStates = Array.isArray(rule.states) ? rule.states : [];

    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-12 items-center gap-1.5">
          <span className="col-span-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('visibility.ruleLabel') || 'Rule'} {index + 1}
          </span>

          <select
            value={rule.type || 'state'}
            onChange={(e) => setType(index, e.target.value)}
            className="popup-surface col-span-4 rounded-xl border border-transparent px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }}
          >
            {TYPE_OPTIONS.map((option) => (
              <option
                key={option.id}
                value={option.id}
                style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
              >
                {t(option.tKey) || option.id}
              </option>
            ))}
          </select>

          <div className="col-span-4 pr-1 text-right text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('visibility.secondsLabel') || 'I (Sekund)'}
          </div>

          <input
            type="number"
            min="0"
            value={Number.isFinite(Number(rule.forSeconds)) ? Number(rule.forSeconds) : 0}
            onChange={(e) =>
              updateRule(index, { forSeconds: Math.max(0, Number(e.target.value || 0)) })
            }
            className="popup-surface col-span-2 w-full rounded-xl border border-transparent px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            title={t('visibility.forSeconds') || 'for sec'}
          />
        </div>

        {(rule.type === 'state' || rule.type === 'not_state') && (
          <div className="space-y-1.5 pl-0.5">
            <div className="flex min-h-[18px] flex-wrap gap-1">
              {selectedStates.map((state) => (
                <button
                  key={`${index}-${state}`}
                  type="button"
                  onClick={() => removeStateValue(index, state)}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-color)] hover:bg-[var(--accent-bg)]"
                >
                  <span className="text-[var(--accent-color)]">×</span>
                  <span>{state}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={stateInputByRule[index] || ''}
                onChange={(e) =>
                  setStateInputByRule((prev) => ({ ...prev, [index]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addStateValue(index);
                  }
                }}
                placeholder={t('visibility.statesPlaceholder') || 'on, playing, home'}
                className="popup-surface flex-1 rounded-xl border border-transparent px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
              />
              <button
                type="button"
                onClick={() => addStateValue(index)}
                className="rounded bg-[var(--glass-bg)] px-2 py-1 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase hover:text-[var(--text-primary)]"
              >
                {t('addCard.add') || 'Add'}
              </button>
            </div>
          </div>
        )}

        {rule.type === 'numeric' && (
          <div className="flex items-center gap-1.5 pl-0.5">
            <select
              value={rule.operator || '>'}
              onChange={(e) => updateRule(index, { operator: e.target.value })}
              className="popup-surface rounded-xl border border-transparent px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            >
              {NUMERIC_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={rule.value ?? ''}
              onChange={(e) => updateRule(index, { value: e.target.value })}
              placeholder="0"
              className="popup-surface w-20 rounded-xl border border-transparent px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            />
            <input
              type="text"
              value={rule.attribute || ''}
              onChange={(e) => updateRule(index, { attribute: e.target.value })}
              placeholder={
                t('visibility.numericAttrPlaceholder') || 'Optional attribute, e.g. temperature'
              }
              className="popup-surface flex-1 rounded-xl border border-transparent px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            />
          </div>
        )}

        {rule.type === 'attribute' && (
          <div className="flex items-center gap-1.5 pl-0.5">
            <input
              type="text"
              value={rule.attribute || ''}
              onChange={(e) => updateRule(index, { attribute: e.target.value })}
              placeholder={t('visibility.attributeName') || 'Attribute name'}
              className="popup-surface flex-1 rounded-xl border border-transparent px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            />
            <input
              type="text"
              value={rule.value ?? ''}
              onChange={(e) => updateRule(index, { value: e.target.value })}
              placeholder={t('visibility.attributeValueOptional') || 'Optional value'}
              className="popup-surface flex-1 rounded-xl border border-transparent px-2.5 py-1.5 text-xs text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
              {t('visibility.title') || 'Conditional visibility'}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              {t('visibility.description') || 'Show this card only when the rule matches.'}
            </p>
          </div>
          {showEnableToggle && (
            <button
              type="button"
              onClick={() => setEnabled(!isEnabled)}
              className={`relative h-6 w-12 rounded-full transition-colors ${isEnabled ? 'bg-[var(--accent-color)]' : 'bg-gray-600'}`}
            >
              <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          )}
        </div>
      )}

      {isEnabled && (
        <>
          {renderRuleEntityPicker(0)}

          <div className="space-y-2">
            {renderRuleEditor(effectiveConfig.rules[0], 0)}

            {effectiveConfig.rules.length > 1 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2 py-0.5">
                  <select
                    value={effectiveConfig.logic || 'AND'}
                    onChange={(e) =>
                      saveConfig({
                        ...effectiveConfig,
                        logic: e.target.value === 'OR' ? 'OR' : 'AND',
                      })
                    }
                    className="rounded border border-[var(--glass-border)] bg-[var(--modal-bg)] px-2 py-1 text-[11px] font-bold text-[var(--text-primary)] outline-none"
                  >
                    <option value="AND">{t('visibility.logic.and') || 'AND'}</option>
                    <option value="OR">{t('visibility.logic.or') || 'OR'}</option>
                  </select>
                </div>

                {renderRuleEntityPicker(1)}
              </div>
            )}

            {effectiveConfig.rules.length > 1 && renderRuleEditor(effectiveConfig.rules[1], 1)}

            <div className="flex items-center gap-2">
              {effectiveConfig.rules.length < 2 && (
                <button
                  type="button"
                  onClick={addSecondRule}
                  className="ml-auto rounded bg-[var(--accent-bg)] px-2 py-1 text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase hover:bg-[var(--accent-bg)]"
                >
                  {t('visibility.addRule') || 'Add rule'}
                </button>
              )}

              {effectiveConfig.rules.length > 1 && (
                <button
                  type="button"
                  onClick={removeSecondRule}
                  className="ml-auto rounded bg-[var(--glass-bg)] px-2 py-1 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase hover:text-[var(--text-primary)]"
                >
                  {t('visibility.removeRule') || 'Remove rule'}
                </button>
              )}
            </div>
          </div>

          <div className="popup-surface rounded-xl border border-[var(--glass-border)] px-2.5 py-2">
            <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
              {t('visibility.summary') || 'Summary'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {ruleSummaryItems.length === 0 && (
                <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                  {buildSummary(effectiveConfig, selectedEntityId, entities, t)}
                </span>
              )}

              {ruleSummaryItems.map((item, index) => (
                <div key={`rule-summary-${index}`} className="contents">
                  <span className="rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[10px] leading-snug font-semibold text-[var(--accent-color)]">
                    {item}
                  </span>
                  {index < ruleSummaryItems.length - 1 && (
                    <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                      {(effectiveConfig.logic || 'AND') === 'OR'
                        ? t('visibility.logic.or') || 'OR'
                        : t('visibility.logic.and') || 'AND'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {liveStatusItems.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {liveStatusItems.map((item) => (
                  <span
                    key={item.key}
                    className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)]"
                  >
                    {item.text}
                  </span>
                ))}
              </div>
            )}
            <p
              className={`mt-1.5 text-xs font-bold ${isVisibleNow ? 'text-emerald-400' : 'text-amber-400'}`}
            >
              {isVisibleNow
                ? t('visibility.visibleNow') || 'Visible now'
                : t('visibility.hiddenNow') || 'Hidden now'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
