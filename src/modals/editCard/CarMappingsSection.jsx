import React from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';

export function SearchableSelect({ label, value, options, onChange, placeholder, entities, t }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (id) => entities[id]?.attributes?.friendly_name || id;
  const filtered = options.filter((id) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return id.toLowerCase().includes(q) || getLabel(id).toLowerCase().includes(q);
  });
  const display = value ? getLabel(value) : placeholder || t('dropdown.noneSelected');

  return (
    <div ref={dropdownRef}>
      <label className="ml-4 text-xs font-bold text-gray-500 uppercase">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="popup-surface popup-surface-hover mt-2 flex w-full items-center justify-between rounded-2xl px-5 py-3"
      >
        <span className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          {display}
        </span>
      </button>
      {open && (
        <div
          className="mt-2 overflow-hidden rounded-2xl border"
          style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="border-b p-3" style={{ borderColor: 'var(--glass-border)' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('form.search') || 'Search'}
              className="w-full rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
            />
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase hover:text-[var(--text-primary)]"
            >
              {t('dropdown.noneSelected')}
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">
                {t('form.noResults') || 'No results'}
              </div>
            )}
            {filtered.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={`w-full px-4 py-3 text-left text-xs font-bold tracking-widest uppercase transition-all ${value === id ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                {getLabel(id)}
                <span className="block truncate text-[10px] font-normal tracking-normal text-[var(--text-muted)] normal-case">
                  {id}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CarMappingsSection({
  t,
  editSettings,
  editSettingsKey,
  saveCardSetting,
  entities,
  anchorEntityId,
  anchorOptions,
  anchorRelatedEntityIds,
  onAutoMapFromAnchor,
  batteryOptions,
  rangeOptions,
  odometerOptions,
  locationOptions,
  latitudeOptions,
  longitudeOptions,
  chargingOptions,
  pluggedOptions,
  chargingPowerOptions,
  chargeRateOptions,
  timeToFullOptions,
  chargeEndTimeOptions,
  fuelLevelOptions,
  climateOptions,
  lockOptions,
  ignitionSwitchOptions,
  engineStatusOptions,
  lastUpdatedOptions,
  apiStatusOptions,
  chargeControlOptions,
  chargeLimitNumberOptions,
  chargeLimitSelectOptions,
  updateButtonOptions,
}) {
  const [showAddSensor, setShowAddSensor] = React.useState(false);
  const [sensorType, setSensorType] = React.useState('');
  const [sensorEntity, setSensorEntity] = React.useState('');
  const [autoMapping, setAutoMapping] = React.useState(false);
  const anchorRelatedSet = React.useMemo(
    () => new Set(Array.isArray(anchorRelatedEntityIds) ? anchorRelatedEntityIds : []),
    [anchorRelatedEntityIds]
  );

  const isEntityAllowedForType = React.useCallback((key, entityId) => {
    if (!entityId) return false;
    const domain = entityId.split('.')[0];

    if (key === 'locationId') return domain === 'device_tracker';
    if (key === 'latitudeId' || key === 'longitudeId') {
      return ['sensor', 'input_number'].includes(domain);
    }
    if (key === 'chargingId' || key === 'pluggedId' || key === 'engineStatusId') {
      return domain === 'binary_sensor';
    }
    if (key === 'chargingPowerId' || key === 'chargeRateId' || key === 'timeToFullId') {
      return ['sensor', 'input_number'].includes(domain);
    }
    if (key === 'chargeEndTimeId' || key === 'apiStatusId' || key === 'lastUpdatedId') {
      return ['sensor', 'binary_sensor', 'input_number'].includes(domain);
    }
    if (key === 'batteryId' || key === 'rangeId' || key === 'odometerId' || key === 'fuelLevelId') {
      return ['sensor', 'input_number'].includes(domain);
    }
    if (key === 'climateId') return domain === 'climate';
    if (key === 'lockId') return domain === 'lock';
    if (key === 'ignitionSwitchId') return domain === 'switch';
    if (key === 'chargeLimitNumberId') return domain === 'number';
    if (key === 'chargeLimitSelectId') return ['select', 'input_select'].includes(domain);
    if (key === 'chargeControlId') {
      return ['switch', 'button', 'input_button', 'script'].includes(domain);
    }
    if (key === 'updateButtonId') return domain === 'button';
    return true;
  }, []);

  const sensorTypes = [
    { key: 'batteryId', label: t('car.select.battery'), options: batteryOptions },
    { key: 'rangeId', label: t('car.select.range'), options: rangeOptions },
    { key: 'odometerId', label: t('car.odometer') || 'Odometer', options: odometerOptions },
    { key: 'fuelLevelId', label: t('car.fuel') || 'Fuel level', options: fuelLevelOptions },
    { key: 'locationId', label: t('car.select.location'), options: locationOptions },
    { key: 'latitudeId', label: t('map.latitude') || 'Latitude', options: latitudeOptions },
    { key: 'longitudeId', label: t('map.longitude') || 'Longitude', options: longitudeOptions },
    { key: 'chargingId', label: t('car.select.charging'), options: chargingOptions },
    { key: 'pluggedId', label: t('car.select.plugged'), options: pluggedOptions },
    {
      key: 'chargingPowerId',
      label: t('car.chargingPower') || 'Charging power',
      options: chargingPowerOptions,
    },
    {
      key: 'chargeRateId',
      label: t('car.chargeRate') || 'Charge rate',
      options: chargeRateOptions,
    },
    {
      key: 'timeToFullId',
      label: t('car.timeToFull') || 'Time to full',
      options: timeToFullOptions,
    },
    {
      key: 'chargeEndTimeId',
      label: t('car.chargeEndTime') || 'Charge end time',
      options: chargeEndTimeOptions,
    },
    {
      key: 'chargeControlId',
      label: t('car.chargeControl') || 'Charge control',
      options: chargeControlOptions,
    },
    {
      key: 'chargeLimitNumberId',
      label: t('car.chargeLimitNumber') || 'Charge limit number',
      options: chargeLimitNumberOptions,
    },
    {
      key: 'chargeLimitSelectId',
      label: t('car.chargeLimitSelect') || 'Charge limit select',
      options: chargeLimitSelectOptions,
    },
    { key: 'climateId', label: t('car.select.climate'), options: climateOptions },
    { key: 'lockId', label: t('car.lock') || 'Lock', options: lockOptions },
    {
      key: 'ignitionSwitchId',
      label: t('car.ignition') || 'Ignition switch',
      options: ignitionSwitchOptions,
    },
    {
      key: 'engineStatusId',
      label: t('car.engineStatus') || 'Engine status',
      options: engineStatusOptions,
    },
    { key: 'lastUpdatedId', label: t('car.select.lastUpdated'), options: lastUpdatedOptions },
    { key: 'apiStatusId', label: t('car.apiStatus') || 'API status', options: apiStatusOptions },
    { key: 'updateButtonId', label: t('car.select.updateButton'), options: updateButtonOptions },
  ];

  const mappedSensors = sensorTypes.filter((st) => editSettings[st.key]);
  const availableTypes = sensorTypes.filter((st) => !editSettings[st.key]);

  const handleAddSensor = () => {
    if (sensorType && sensorEntity) {
      saveCardSetting(editSettingsKey, sensorType, sensorEntity);
      setSensorType('');
      setSensorEntity('');
      setShowAddSensor(false);
    }
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
    <div className="space-y-3 sm:space-y-4">
      <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">
        {t('car.mappingTitle')}: {t('car.mappingHint')}
      </div>

      <div className="popup-surface space-y-2 rounded-2xl p-3">
        <div className="ml-1 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
          {t('car.anchorEntity') || 'Anchor entity'}
        </div>
        <select
          value={anchorEntityId || ''}
          onChange={(e) =>
            saveCardSetting(editSettingsKey, 'carAnchorEntityId', e.target.value || null)
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
          {t('car.anchorHint') ||
            'Pick one entity from your car integration, then auto-map the rest from related entities.'}
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
          : t('car.autoMapFromAnchor') || 'Auto-map from anchor'}
      </button>

      {mappedSensors.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500">{t('car.noSensorsMapped')}</div>
      )}

      {mappedSensors.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {mappedSensors.map((st) => {
            const entityId = editSettings[st.key];
            const entityName = entities[entityId]?.attributes?.friendly_name || entityId;
            return (
              <div
                key={st.key}
                className="popup-surface flex items-center justify-between rounded-xl px-3.5 py-2.5 sm:px-4"
              >
                <div className="mr-4 min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold tracking-wide text-gray-500">
                      {st.label}:
                    </span>
                    <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {entityName}
                    </span>
                  </div>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-gray-500">
                    {entityId}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveSensor(st.key)}
                  className="flex-shrink-0 rounded-lg bg-red-500/10 p-2 text-red-400 transition-colors"
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
          {t('car.addSensor')}
        </button>
      )}

      {showAddSensor && (
        <div className="popup-surface space-y-4 rounded-xl px-4 py-4 sm:px-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
              {t('car.addSensor')}
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
            <label className="mb-2 ml-4 block text-xs font-bold text-gray-500 uppercase">
              {t('car.sensorType') || 'Sensortype'}
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
              <option
                value=""
                style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
              >
                {t('car.selectSensorType') || 'Vel sensortype...'}
              </option>
              {availableTypes.map((st) => (
                <option
                  key={st.key}
                  value={st.key}
                  style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
                >
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {sensorType &&
            (() => {
              const selectedType = sensorTypes.find((st) => st.key === sensorType);
              if (!selectedType) return null;

              const scopedOptions = Array.from(anchorRelatedSet)
                .filter((id) => entities[id])
                .filter((id) => isEntityAllowedForType(selectedType.key, id))
                .sort((a, b) =>
                  (entities[a]?.attributes?.friendly_name || a).localeCompare(
                    entities[b]?.attributes?.friendly_name || b
                  )
                );

              const options = anchorEntityId ? scopedOptions : [];

              return (
                <div className="space-y-2">
                  {!anchorEntityId && (
                    <p className="ml-1 text-[10px] text-[var(--text-muted)]">
                      {t('car.anchorRequiredForList') ||
                        'Choose an anchor entity first to list entities from that integration.'}
                    </p>
                  )}
                  {anchorEntityId && options.length === 0 && (
                    <p className="ml-1 text-[10px] text-[var(--text-muted)]">
                      {t('car.noEntitiesForAnchorType') ||
                        'No matching entities found in the selected integration for this sensor type.'}
                    </p>
                  )}
                  <SearchableSelect
                    label={t('car.selectEntity')}
                    value={sensorEntity}
                    options={options}
                    onChange={(value) => setSensorEntity(value)}
                    placeholder={t('car.selectEntityPlaceholder')}
                    entities={entities}
                    t={t}
                  />
                </div>
              );
            })()}

          <div className="flex gap-2">
            <button
              onClick={handleAddSensor}
              disabled={!sensorType || !sensorEntity}
              className="popup-surface popup-surface-hover flex-1 rounded-xl border border-[var(--glass-border)] px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors disabled:bg-gray-700 disabled:text-gray-500"
            >
              {t('car.add')}
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
        <div className="py-4 text-center text-xs text-gray-500">{t('car.allSensorsMapped')}</div>
      )}
    </div>
  );
}