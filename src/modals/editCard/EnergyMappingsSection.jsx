import React from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { SearchableSelect } from './CarMappingsSection';

const MANUAL_FIELDS = [
  {
    key: 'hasBattery',
    labelKey: 'energy.hasBattery',
    fallbackLabel: 'Has battery',
    type: 'boolean',
  },
  {
    key: 'hasSolar',
    labelKey: 'energy.hasSolar',
    fallbackLabel: 'Has solar',
    type: 'boolean',
  },
  {
    key: 'injectionPrice',
    labelKey: 'energy.injectionPrice',
    fallbackLabel: 'Prix injection',
    placeholder: '0.00',
  },
  {
    key: 'electricityPrice',
    labelKey: 'energy.electricityPrice',
    fallbackLabel: 'Prix electricite',
    placeholder: '0.00',
  },
];

const ENTITY_FIELDS = [
  {
    key: 'solarProductionInstantId',
    labelKey: 'energy.solarProductionInstant',
    fallbackLabel: 'Production panneau solaire instantanne',
  },
  {
    key: 'gridInjectionInstantId',
    labelKey: 'energy.gridInjectionInstant',
    fallbackLabel: 'Injection sur le reseau instantanne',
  },
  {
    key: 'gridConsumptionInstantId',
    labelKey: 'energy.gridConsumptionInstant',
    fallbackLabel: 'Consommation du reseau instantanne',
  },
  {
    key: 'batteryInjectionInstantId',
    labelKey: 'energy.batteryInjectionInstant',
    fallbackLabel: 'Injection batterie instantanne',
  },
  {
    key: 'batteryConsumptionInstantId',
    labelKey: 'energy.batteryConsumptionInstant',
    fallbackLabel: 'Consommation batterie instantanne',
  },
  {
    key: 'batteryLevelId',
    labelKey: 'energy.batteryLevel',
    fallbackLabel: 'Niveau de charge batterie',
  },
  {
    key: 'homeConsumptionInstantId',
    labelKey: 'energy.homeConsumptionInstant',
    fallbackLabel: 'Consommation maison instantanne',
  },
  {
    key: 'solarProductionLifetimeId',
    labelKey: 'energy.solarProductionLifetime',
    fallbackLabel: 'Production panneau solaire lifetime',
  },
  {
    key: 'gridInjectionLifetimeId',
    labelKey: 'energy.gridInjectionLifetime',
    fallbackLabel: 'Injection sur le reseau lifetime',
  },
  {
    key: 'gridConsumptionLifetimeId',
    labelKey: 'energy.gridConsumptionLifetime',
    fallbackLabel: 'Consommation du reseau lifetime',
  },
  {
    key: 'batteryInjectionLifetimeId',
    labelKey: 'energy.batteryInjectionLifetime',
    fallbackLabel: 'Injection batterie lifetime',
  },
  {
    key: 'batteryConsumptionLifetimeId',
    labelKey: 'energy.batteryConsumptionLifetime',
    fallbackLabel: 'Consommation batterie lifetime',
  },
  {
    key: 'homeConsumptionLifetimeId',
    labelKey: 'energy.homeConsumptionLifetime',
    fallbackLabel: 'Consommation maison lifetime',
  },
];

const ALLOWED_DOMAINS = ['sensor', 'input_number', 'number', 'binary_sensor', 'weather'];

export default function EnergyMappingsSection({
  t,
  editSettings,
  editSettingsKey,
  saveCardSetting,
  entities,
  anchorEntityId,
  anchorOptions,
  anchorRelatedEntityIds,
  onAutoMapFromAnchor,
}) {
  const [showAddSensor, setShowAddSensor] = React.useState(false);
  const [sensorType, setSensorType] = React.useState('');
  const [sensorEntity, setSensorEntity] = React.useState('');
  const [autoMapping, setAutoMapping] = React.useState(false);
  const anchorRelatedSet = React.useMemo(
    () => new Set(Array.isArray(anchorRelatedEntityIds) ? anchorRelatedEntityIds : []),
    [anchorRelatedEntityIds]
  );

  const entityOptions = React.useMemo(() => {
    const source = anchorRelatedSet.size > 0 ? Array.from(anchorRelatedSet) : Object.keys(entities);
    return source
      .filter((id) => entities[id])
      .filter((id) => ALLOWED_DOMAINS.includes(id.split('.')[0]))
      .sort((a, b) =>
        (entities[a]?.attributes?.friendly_name || a).localeCompare(
          entities[b]?.attributes?.friendly_name || b
        )
      );
  }, [anchorRelatedSet, entities]);

  const mappedSensors = ENTITY_FIELDS.filter((field) => editSettings[field.key]);
  const availableTypes = ENTITY_FIELDS.filter((field) => !editSettings[field.key]);

  const handleAddSensor = () => {
    if (!sensorType || !sensorEntity) return;
    saveCardSetting(editSettingsKey, sensorType, sensorEntity);
    setSensorType('');
    setSensorEntity('');
    setShowAddSensor(false);
  };

  const handleRemoveSensor = (key) => {
    saveCardSetting(editSettingsKey, key, null);
  };

  const handleAutoMapFromAnchor = async () => {
    if (typeof onAutoMapFromAnchor !== 'function') return;
    setAutoMapping(true);
    try {
      await onAutoMapFromAnchor(anchorEntityId);
    } finally {
      setAutoMapping(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
        {t('energy.mappingTitle') || 'Energy mappings'}
      </div>

      <div className="popup-surface space-y-4 rounded-2xl p-4">
        <div className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {t('energy.manualValues') || 'Manual values'}
        </div>
        {MANUAL_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <label className="ml-1 text-xs font-bold text-[var(--text-muted)] uppercase">
              {t(field.labelKey) || field.fallbackLabel}
            </label>
            {field.type === 'boolean' ? (
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={editSettings[field.key] ?? false}
                  onChange={(e) => saveCardSetting(editSettingsKey, field.key, e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--glass-border)] bg-[var(--card-bg)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-opacity-50"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  {t('common.enabled') || 'Enabled'}
                </span>
              </label>
            ) : (
              <input
                type="number"
                step="0.001"
                inputMode="decimal"
                className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                defaultValue={editSettings[field.key] ?? ''}
                onBlur={(e) => {
                  const rawValue = e.target.value.trim();
                  saveCardSetting(editSettingsKey, field.key, rawValue === '' ? null : rawValue);
                }}
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
          {t('energy.entityMappings') || 'Entity mappings'}
        </div>

        <div className="popup-surface space-y-2 rounded-2xl p-3">
          <div className="ml-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {t('energy.anchorEntity') || 'Anchor entity'}
          </div>
          <select
            value={anchorEntityId || ''}
            onChange={(e) =>
              saveCardSetting(editSettingsKey, 'energyAnchorEntityId', e.target.value || null)
            }
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <option value="">{t('dropdown.noneSelected')}</option>
            {anchorOptions.map((id) => (
              <option key={id} value={id}>
                {entities[id]?.attributes?.friendly_name || id}
              </option>
            ))}
          </select>
          <p className="ml-1 text-[10px] text-[var(--text-muted)]">
            {t('energy.anchorHint') ||
              'Pick one entity from your energy integration, then auto-map the rest from related entities.'}
          </p>
        </div>

        <button
          onClick={handleAutoMapFromAnchor}
          disabled={autoMapping}
          className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {autoMapping
            ? t('profiles.autoSyncSyncing') || 'Syncing'
            : t('energy.autoMapFromAnchor') || 'Auto-map from anchor'}
        </button>

        {mappedSensors.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">
            {t('energy.noSensorsMapped') || 'No energy sensors mapped yet'}
          </div>
        )}

        {mappedSensors.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {mappedSensors.map((field) => {
              const entityId = editSettings[field.key];
              const entityName = entities[entityId]?.attributes?.friendly_name || entityId;
              return (
                <div
                  key={field.key}
                  className="popup-surface flex items-center justify-between rounded-xl px-3.5 py-2.5 sm:px-4"
                >
                  <div className="mr-4 min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold tracking-wide text-[var(--text-muted)]">
                        {t(field.labelKey) || field.fallbackLabel}:
                      </span>
                      <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {entityName}
                      </span>
                    </div>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--text-muted)]">
                      {entityId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveSensor(field.key)}
                    className="flex-shrink-0 rounded-lg bg-[var(--status-error-bg)] p-2 text-[var(--status-error-fg)] transition-colors"
                    title={t('tooltip.removeCard')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!showAddSensor && availableTypes.length > 0 && (
          <button
            onClick={() => setShowAddSensor(true)}
            className="popup-surface popup-surface-hover flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3.5 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('energy.addSensor') || 'Add sensor'}
          </button>
        )}

        {showAddSensor && (
          <div className="popup-surface space-y-4 rounded-xl px-4 py-4 sm:px-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
                {t('energy.addSensor') || 'Add sensor'}
              </span>
              <button
                onClick={() => {
                  setShowAddSensor(false);
                  setSensorType('');
                  setSensorEntity('');
                }}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-2 ml-4 block text-xs font-bold text-[var(--text-muted)] uppercase">
                {t('energy.sensorType') || 'Sensor type'}
              </label>
              <select
                value={sensorType}
                onChange={(e) => {
                  setSensorType(e.target.value);
                  setSensorEntity('');
                }}
                className="popup-surface w-full rounded-xl px-4 py-3 text-sm transition-colors outline-none focus:border-[var(--glass-border)]"
                style={{ color: 'var(--text-primary)' }}
              >
                <option value="" style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}>
                  {t('energy.selectSensorType') || 'Choose sensor type...'}
                </option>
                {availableTypes.map((field) => (
                  <option
                    key={field.key}
                    value={field.key}
                    style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
                  >
                    {t(field.labelKey) || field.fallbackLabel}
                  </option>
                ))}
              </select>
            </div>

            {sensorType && (
              <div className="space-y-2">
                {!anchorEntityId && (
                  <p className="ml-1 text-[10px] text-[var(--text-muted)]">
                    {t('energy.anchorRequiredForList') ||
                      'Choose an anchor entity first to list entities from that integration.'}
                  </p>
                )}
                {anchorEntityId && entityOptions.length === 0 && (
                  <p className="ml-1 text-[10px] text-[var(--text-muted)]">
                    {t('energy.noEntitiesForAnchorType') ||
                      'No matching entities found in the selected integration for this sensor type.'}
                  </p>
                )}
                <SearchableSelect
                  label={t('energy.selectEntity') || 'Select entity'}
                  value={sensorEntity}
                  options={anchorEntityId ? entityOptions : []}
                  onChange={(value) => setSensorEntity(value)}
                  placeholder={t('energy.selectEntityPlaceholder') || t('dropdown.noneSelected')}
                  entities={entities}
                  t={t}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddSensor}
                disabled={!sensorType || !sensorEntity}
                className="popup-surface popup-surface-hover flex-1 rounded-xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors disabled:bg-[var(--glass-bg)] disabled:text-[var(--text-muted)]"
              >
                {t('car.add') || 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddSensor(false);
                  setSensorType('');
                  setSensorEntity('');
                }}
                className="popup-surface popup-surface-hover rounded-xl px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {availableTypes.length === 0 && !showAddSensor && (
          <div className="py-4 text-center text-xs text-[var(--text-muted)]">
            {t('energy.allSensorsMapped') || 'All energy sensors mapped'}
          </div>
        )}
      </div>
    </div>
  );
}
