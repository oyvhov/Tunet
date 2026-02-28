import React from 'react';
import { X, Check, Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';
import ConditionBuilder from '../components/ui/ConditionBuilder';
import { getEntitiesForArea } from '../services/haClient';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import {
  convertValueByKind,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  isConditionConfigured,
  normalizeVisibilityConditionConfig,
} from '../utils';

const MIN_POPUP_TRIGGER_COOLDOWN_SECONDS = 10;
const MAX_POPUP_TRIGGER_COOLDOWN_SECONDS = 3600;
const MIN_POPUP_TRIGGER_AUTO_CLOSE_SECONDS = 0;
const MAX_POPUP_TRIGGER_AUTO_CLOSE_SECONDS = 3600;

function normalizePopupTriggerCooldownSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_POPUP_TRIGGER_COOLDOWN_SECONDS;
  return Math.min(
    MAX_POPUP_TRIGGER_COOLDOWN_SECONDS,
    Math.max(MIN_POPUP_TRIGGER_COOLDOWN_SECONDS, Math.floor(parsed))
  );
}

function normalizePopupTriggerAutoCloseSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_POPUP_TRIGGER_AUTO_CLOSE_SECONDS;
  return Math.min(
    MAX_POPUP_TRIGGER_AUTO_CLOSE_SECONDS,
    Math.max(MIN_POPUP_TRIGGER_AUTO_CLOSE_SECONDS, Math.floor(parsed))
  );
}

function GraphLimitsSlider({ values, onChange, min = -15, max = 35 }) {
  const trackRef = React.useRef(null);
  const safeValues = Array.isArray(values) ? values : [0, 10, 20, 28];
  const normalized = [...safeValues]
    .slice(0, 4)
    .map((value, index) => {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : [0, 10, 20, 28][index];
    })
    .sort((a, b) => a - b);

  while (normalized.length < 4) {
    normalized.push([0, 10, 20, 28][normalized.length]);
  }

  const toPercent = (value) => ((value - min) / (max - min)) * 100;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const toStep = (value) => Math.round(value * 2) / 2;

  const updateIndex = (index, value) => {
    const next = [...normalized];
    const prevLimit = index > 0 ? next[index - 1] + 0.5 : min;
    const nextLimit = index < next.length - 1 ? next[index + 1] - 0.5 : max;
    next[index] = toStep(clamp(value, prevLimit, nextLimit));
    onChange(next);
  };

  const valueFromClientX = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return min + ratio * (max - min);
  };

  const startDrag = (index, event) => {
    event.preventDefault();
    event.stopPropagation();

    const move = (moveEvent) => {
      const nextValue = valueFromClientX(moveEvent.clientX);
      if (nextValue === null) return;
      updateIndex(index, nextValue);
    };

    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };

    const startValue = valueFromClientX(event.clientX);
    if (startValue !== null) updateIndex(index, startValue);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const onTrackPointerDown = (event) => {
    const clickedValue = valueFromClientX(event.clientX);
    if (clickedValue === null) return;

    let nearestIndex = 0;
    let nearestDistance = Math.abs(normalized[0] - clickedValue);
    for (let index = 1; index < normalized.length; index++) {
      const distance = Math.abs(normalized[index] - clickedValue);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    startDrag(nearestIndex, event);
  };

  const segments = [
    { from: min, to: normalized[0], color: '#3b82f6' },
    { from: normalized[0], to: normalized[1], color: '#06b6d4' },
    { from: normalized[1], to: normalized[2], color: '#22c55e' },
    { from: normalized[2], to: normalized[3], color: '#eab308' },
    { from: normalized[3], to: max, color: '#ef4444' },
  ];

  return (
    <div className="popup-surface rounded-2xl p-5">
      <div className="relative h-16 px-2">
        <div
          ref={trackRef}
          className="absolute top-7 right-2 left-2 h-3 cursor-pointer overflow-hidden rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)]"
          onPointerDown={onTrackPointerDown}
        >
          {segments.map((segment, idx) => {
            const left = `${toPercent(segment.from)}%`;
            const width = `${Math.max(0, toPercent(segment.to) - toPercent(segment.from))}%`;
            return (
              <div
                key={`segment-${idx}`}
                className="absolute top-0 h-full"
                style={{ left, width, backgroundColor: segment.color }}
              />
            );
          })}
        </div>

        {normalized.map((value, index) => {
          const left = `calc(${toPercent(value)}% + 0.5rem)`;
          const thumbColors = ['#3b82f6', '#06b6d4', '#22c55e', '#eab308'];
          return (
            <React.Fragment key={`thumb-${index}`}>
              <div
                className="absolute top-0 -translate-x-1/2 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--text-primary)]"
                style={{
                  left,
                  backgroundColor: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                }}
              >
                {value.toFixed(1)}°
              </div>

              <button
                type="button"
                aria-label={`Graph color limit ${index + 1}`}
                onPointerDown={(event) => startDrag(index, event)}
                className="absolute top-[1.25rem] h-[1.15rem] w-[1.15rem] -translate-x-1/2 rounded-full border-2 transition-transform active:scale-110"
                style={{
                  left,
                  backgroundColor: 'white',
                  borderColor: 'rgba(255,255,255,0.75)',
                  boxShadow: `0 0 0 4px ${thumbColors[index]}33, 0 4px 12px rgba(0,0,0,0.35)`,
                  zIndex: 30 + index,
                  touchAction: 'none',
                }}
              />
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between px-1 text-[10px] tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
        <span>{min}°</span>
        <span>{max}°</span>
      </div>
    </div>
  );
}

function SearchableSelect({ label, value, options, onChange, placeholder, entities, t }) {
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

function CarMappingsSection({
  t,
  editSettings,
  editSettingsKey,
  saveCardSetting,
  entities,
  batteryOptions,
  rangeOptions,
  locationOptions,
  chargingOptions,
  pluggedOptions,
  climateOptions,
  lastUpdatedOptions,
  updateButtonOptions,
}) {
  const [showAddSensor, setShowAddSensor] = React.useState(false);
  const [sensorType, setSensorType] = React.useState('');
  const [sensorEntity, setSensorEntity] = React.useState('');

  const sensorTypes = [
    { key: 'batteryId', label: t('car.select.battery'), options: batteryOptions },
    { key: 'rangeId', label: t('car.select.range'), options: rangeOptions },
    { key: 'locationId', label: t('car.select.location'), options: locationOptions },
    { key: 'chargingId', label: t('car.select.charging'), options: chargingOptions },
    { key: 'pluggedId', label: t('car.select.plugged'), options: pluggedOptions },
    { key: 'climateId', label: t('car.select.climate'), options: climateOptions },
    { key: 'lastUpdatedId', label: t('car.select.lastUpdated'), options: lastUpdatedOptions },
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

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">
        {t('car.mappingTitle')}: {t('car.mappingHint')}
      </div>

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

              return (
                <SearchableSelect
                  label={t('car.selectEntity')}
                  value={sensorEntity}
                  options={selectedType.options}
                  onChange={(value) => setSensorEntity(value)}
                  placeholder={t('car.selectEntityPlaceholder')}
                  entities={entities}
                  t={t}
                />
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

function RoomSettingsSection({
  conn,
  editSettings,
  editSettingsKey,
  saveCardSetting,
  entities,
  t,
  pageOptions = [],
}) {
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [domainFilter, setDomainFilter] = React.useState('all');
  const [showEntityFilter, setShowEntityFilter] = React.useState(true);
  const [showCardFeatures, setShowCardFeatures] = React.useState(true);

  React.useEffect(() => {
    const keys = [
      'mainLightEntityId',
      'tempEntityId',
      'motionEntityId',
      'humidityEntityId',
      'climateEntityId',
    ];
    keys.forEach((key) => {
      if (editSettings[key] === '__none__') {
        saveCardSetting(editSettingsKey, key, null);
      }
    });
  }, [editSettings, editSettingsKey, saveCardSetting]);

  const roomEntityIds = React.useMemo(
    () => (Array.isArray(editSettings.entityIds) ? editSettings.entityIds : []),
    [editSettings.entityIds]
  );
  const excludedEntityIds = React.useMemo(
    () => (Array.isArray(editSettings.excludedEntityIds) ? editSettings.excludedEntityIds : []),
    [editSettings.excludedEntityIds]
  );
  const activeAreaEntityIds = React.useMemo(
    () => roomEntityIds.filter((id) => !excludedEntityIds.includes(id)),
    [roomEntityIds, excludedEntityIds]
  );

  const applySearchAndDomain = React.useCallback(
    (ids) =>
      ids.filter((id) => {
        if (domainFilter !== 'all' && !id.startsWith(`${domainFilter}.`)) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        const name = entities[id]?.attributes?.friendly_name || id;
        return id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      }),
    [domainFilter, query, entities]
  );

  const filteredAreaEntityIds = React.useMemo(
    () => applySearchAndDomain(roomEntityIds),
    [applySearchAndDomain, roomEntityIds]
  );

  const domainScopedEntityIds = React.useMemo(() => {
    if (domainFilter === 'all') return roomEntityIds;
    return roomEntityIds.filter((id) => id.startsWith(`${domainFilter}.`));
  }, [roomEntityIds, domainFilter]);

  const handleRefresh = async () => {
    if (!conn || !editSettings.areaId) return;
    setRefreshing(true);
    try {
      const newEntities = await getEntitiesForArea(conn, editSettings.areaId);
      saveCardSetting(editSettingsKey, 'entityIds', newEntities);
    } catch (err) {
      console.error('Failed to refresh room entities:', err);
    }
    setRefreshing(false);
  };

  const toggleEntityListMembership = (settingKey, entityId) => {
    const list = Array.isArray(editSettings[settingKey]) ? editSettings[settingKey] : [];
    const exists = list.includes(entityId);
    const next = exists ? list.filter((id) => id !== entityId) : [...list, entityId];
    saveCardSetting(editSettingsKey, settingKey, next);
  };

  const areAllDomainEntitiesExcluded =
    domainScopedEntityIds.length > 0 &&
    domainScopedEntityIds.every((id) => excludedEntityIds.includes(id));
  const hasExcludedDomainEntities = domainScopedEntityIds.some((id) =>
    excludedEntityIds.includes(id)
  );

  const handleExcludeAllEntities = () => {
    if (!domainScopedEntityIds.length || areAllDomainEntitiesExcluded) return;
    const confirmed = globalThis.confirm(
      t('room.excludeAllConfirm') || 'Are you sure you want to exclude all entities in this room?'
    );
    if (!confirmed) return;
    const mergedExcluded = Array.from(
      new Set([
        ...(Array.isArray(editSettings.excludedEntityIds) ? editSettings.excludedEntityIds : []),
        ...domainScopedEntityIds,
      ])
    );
    saveCardSetting(editSettingsKey, 'excludedEntityIds', mergedExcluded);
  };

  const handleIncludeAllEntities = () => {
    if (!domainScopedEntityIds.length || !hasExcludedDomainEntities) return;
    const domainEntitySet = new Set(domainScopedEntityIds);
    const currentExcluded = Array.isArray(editSettings.excludedEntityIds)
      ? editSettings.excludedEntityIds
      : [];
    const nextExcluded = currentExcluded.filter((id) => !domainEntitySet.has(id));
    saveCardSetting(editSettingsKey, 'excludedEntityIds', nextExcluded);
  };

  const cardToggleOptions = [
    { key: 'showLights', label: t('room.showLights'), defaultVal: true },
    { key: 'showTemp', label: t('room.showTemp'), defaultVal: true },
    { key: 'showMotion', label: t('room.showMotion'), defaultVal: true },
    { key: 'showLightChip', label: t('room.showLightChip') || 'Show light chip', defaultVal: true },
    { key: 'showMediaChip', label: t('room.showMediaChip') || 'Show media chip', defaultVal: true },
    {
      key: 'showActiveChip',
      label: t('room.showActiveChip') || 'Show active devices chip',
      defaultVal: true,
    },
    {
      key: 'showVacuumChip',
      label: t('room.showVacuumChip') || 'Show vacuum chip',
      defaultVal: true,
    },
    {
      key: 'showOccupiedIndicator',
      label: t('room.showOccupiedIndicator') || 'Show occupied indicator',
      defaultVal: true,
    },
    {
      key: 'showIconWatermark',
      label: t('room.showIconWatermark') || 'Show icon watermark',
      defaultVal: true,
    },
  ];

  const hasAutoCandidates = React.useMemo(
    () => ({
      mainLightEntityId: activeAreaEntityIds.some((id) => id.startsWith('light.')),
      tempEntityId: activeAreaEntityIds.some((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'temperature' ||
            id.includes('temperature') ||
            id.includes('temp'))
        );
      }),
      motionEntityId: activeAreaEntityIds.some((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'motion' ||
            e.attributes?.device_class === 'occupancy' ||
            e.attributes?.device_class === 'presence')
        );
      }),
      vacuumEntityId: activeAreaEntityIds.some((id) => id.startsWith('vacuum.')),
    }),
    [activeAreaEntityIds, entities]
  );

  const hasSource = React.useMemo(() => {
    const selected = {
      mainLightEntityId: editSettings.mainLightEntityId,
      tempEntityId: editSettings.tempEntityId,
      motionEntityId: editSettings.motionEntityId,
      vacuumEntityId: editSettings.vacuumEntityId,
    };
    return {
      mainLightEntityId: !!selected.mainLightEntityId || hasAutoCandidates.mainLightEntityId,
      tempEntityId: !!selected.tempEntityId || hasAutoCandidates.tempEntityId,
      motionEntityId: !!selected.motionEntityId || hasAutoCandidates.motionEntityId,
      vacuumEntityId: !!selected.vacuumEntityId || hasAutoCandidates.vacuumEntityId,
    };
  }, [editSettings, hasAutoCandidates]);

  const compactFeatureOptions = cardToggleOptions.filter((option) => {
    if (['showLights', 'showLightChip'].includes(option.key)) return hasSource.mainLightEntityId;
    if (option.key === 'showTemp') return hasSource.tempEntityId;
    if (['showMotion', 'showOccupiedIndicator'].includes(option.key))
      return hasSource.motionEntityId;
    if (option.key === 'showVacuumChip') return hasSource.vacuumEntityId;
    return true;
  });

  const domainLabelMap = {
    all: t('room.filterAll') || 'All',
    light: t('room.domain.light') || 'Lights',
    climate: t('room.domain.climate') || 'Climate',
    vacuum: t('room.domain.vacuum') || 'Vacuum',
    media_player: t('room.domain.mediaPlayer') || 'Media',
    sensor: t('room.domain.sensor') || 'Sensors',
    binary_sensor: t('room.domain.binarySensor') || 'Binary Sensors',
    switch: t('room.domain.switch') || 'Switches',
    fan: t('room.domain.fan') || 'Fans',
    cover: t('room.domain.cover') || 'Covers',
  };

  const entityActionLabels = {
    main: t('room.mainShort') || 'Main',
    climate: t('room.domain.climate') || 'Climate',
    vacuum: t('room.domain.vacuum') || 'Vacuum',
    temp: t('room.tempShort') || 'Temp',
    motion: t('room.motionShort') || 'Motion',
    humidity: t('room.humidityShort') || 'Humidity',
  };

  const navigateOnTap = editSettings.navigateOnTap === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
          <span>
            {roomEntityIds.length} {t('room.entityCount')}
          </span>
          <span className="opacity-50">•</span>
          <span>
            {activeAreaEntityIds.length} {t('room.filterActive') || 'active'}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !conn}
          className="popup-surface popup-surface-hover flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-1.5 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {t('room.refreshEntities')}
        </button>
      </div>

      <div className="popup-surface space-y-4 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setShowEntityFilter((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            {t('room.entityFilter') || 'Entity filter'}
          </div>
          <span className="text-[var(--text-secondary)] transition-transform">
            {showEntityFilter ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>
        </button>

        {showEntityFilter && (
          <>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('room.searchEntities') || 'Search entities'}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />

            <div className="flex flex-wrap gap-2">
              {[
                'all',
                'light',
                'climate',
                'vacuum',
                'media_player',
                'sensor',
                'binary_sensor',
                'switch',
                'fan',
                'cover',
              ].map((domain) => (
                <button
                  type="button"
                  key={domain}
                  onClick={() => setDomainFilter(domain)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${domainFilter === domain ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                >
                  {domainLabelMap[domain] || domain.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  {t('room.filterAreaEntities') || 'Area entities'}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleIncludeAllEntities}
                    disabled={!domainScopedEntityIds.length || !hasExcludedDomainEntities}
                    className="rounded-lg border border-green-400/40 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-green-300 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('room.includeAll') || 'Include all'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExcludeAllEntities}
                    disabled={!domainScopedEntityIds.length || areAllDomainEntitiesExcluded}
                    className="rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-red-300 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('room.excludeAll') || 'Exclude all'}
                  </button>
                </div>
              </div>
              <div className="custom-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
                {filteredAreaEntityIds.map((id) => {
                  const isExcluded = excludedEntityIds.includes(id);
                  const isLightEntity = id.startsWith('light.');
                  const isMainLight = editSettings.mainLightEntityId === id;
                  const entity = entities[id];
                  const deviceClass = entity?.attributes?.device_class;
                  const isClimateEntity = id.startsWith('climate.');
                  const isMainClimate = editSettings.climateEntityId === id;
                  const isVacuumEntity = id.startsWith('vacuum.');
                  const isMainVacuum = editSettings.vacuumEntityId === id;
                  const isTempEntity =
                    deviceClass === 'temperature' ||
                    id.includes('temperature') ||
                    id.includes('temp');
                  const isMainTemp = editSettings.tempEntityId === id;
                  const isMotionEntity =
                    deviceClass === 'motion' ||
                    deviceClass === 'occupancy' ||
                    deviceClass === 'presence';
                  const isMainMotion = editSettings.motionEntityId === id;
                  const isHumidityEntity = deviceClass === 'humidity';
                  const isMainHumidity = editSettings.humidityEntityId === id;
                  return (
                    <div
                      key={`area-${id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                          {entities[id]?.attributes?.friendly_name || id}
                        </div>
                        <div className="truncate text-[10px] text-[var(--text-muted)]">{id}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isLightEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'mainLightEntityId',
                                isMainLight ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainLight ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {entityActionLabels.main}
                          </button>
                        )}
                        {isClimateEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'climateEntityId',
                                isMainClimate ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainClimate ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {entityActionLabels.climate}
                          </button>
                        )}
                        {isVacuumEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'vacuumEntityId',
                                isMainVacuum ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainVacuum ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {entityActionLabels.vacuum}
                          </button>
                        )}
                        {isTempEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'tempEntityId',
                                isMainTemp ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainTemp ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {entityActionLabels.temp}
                          </button>
                        )}
                        {isMotionEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'motionEntityId',
                                isMainMotion ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainMotion ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {entityActionLabels.motion}
                          </button>
                        )}
                        {isHumidityEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'humidityEntityId',
                                isMainHumidity ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainHumidity ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {entityActionLabels.humidity}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleEntityListMembership('excludedEntityIds', id)}
                          className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isExcluded ? 'border-red-400/40 bg-red-500/15 text-red-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                        >
                          {isExcluded
                            ? t('room.excluded') || 'Excluded'
                            : t('room.exclude') || 'Exclude'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredAreaEntityIds.length === 0 && (
                  <div className="py-2 text-xs text-[var(--text-muted)]">
                    {t('form.noResults') || 'No results'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="popup-surface space-y-4 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setShowCardFeatures((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            {t('room.cardFeatures') || 'Card features'}
          </div>
          <span className="text-[var(--text-secondary)] transition-transform">
            {showCardFeatures ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>
        </button>
        {showCardFeatures && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {compactFeatureOptions.map((opt) => {
              const value =
                editSettings[opt.key] !== undefined ? editSettings[opt.key] : opt.defaultVal;
              return (
                <div
                  key={opt.key}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[var(--glass-bg)]/60 px-2.5 py-2"
                >
                  <span className="truncate pr-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                    {opt.label}
                  </span>
                  <button
                    onClick={() => saveCardSetting(editSettingsKey, opt.key, !value)}
                    className={`relative h-5 w-10 rounded-full transition-colors ${value ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="popup-surface space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
              {t('room.navigateOnTap') || 'Navigate on tap'}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              {t('room.navigateOnTapHint') ||
                'Open a dashboard page instead of the room popup when tapping this card.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => saveCardSetting(editSettingsKey, 'navigateOnTap', !navigateOnTap)}
            className={`relative h-6 w-12 rounded-full transition-colors ${navigateOnTap ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
          >
            <span
              className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${navigateOnTap ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {navigateOnTap && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {t('room.navigateToPage') || 'Target page'}
            </label>
            <select
              value={editSettings.navigateToPageId || ''}
              onChange={(e) =>
                saveCardSetting(editSettingsKey, 'navigateToPageId', e.target.value || null)
              }
              className="popup-surface w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <option
                value=""
                style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
              >
                {t('room.selectTargetPage') || 'Select page'}
              </option>
              {pageOptions.map((page) => (
                <option
                  key={page.id}
                  value={page.id}
                  style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
                >
                  {page.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditCardModal({
  isOpen,
  onClose,
  t,
  entityId,
  entities,
  canEditName,
  canEditIcon,
  canEditStatus,
  isEditSensor,
  isEditMedia,
  isEditCalendar,
  isEditTodo,
  isEditCost,
  isEditNordpool,
  isEditCar,
  isEditSpacer,
  isEditCamera,
  isEditRoom,
  isEditAndroidTV,
  isEditFan,
  editSettingsKey,
  editSettings,
  isEditWeatherTemp,
  gridColumns,
  conn,
  pagesConfig,
  pageSettings,
  customNames,
  saveCustomName,
  customIcons,
  saveCustomIcon,
  saveCardSetting,
}) {
  const [mediaSearch, setMediaSearch] = React.useState('');
  const [showVisibilityLogic, setShowVisibilityLogic] = React.useState(false);
  const [showPopupLogic, setShowPopupLogic] = React.useState(false);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  React.useEffect(() => {
    if (!isOpen) return;
    setShowVisibilityLogic(false);
    setShowPopupLogic(false);
  }, [isOpen, entityId]);

  const roomPageOptions = React.useMemo(() => {
    const pageIds = Array.isArray(pagesConfig?.pages) ? pagesConfig.pages : [];
    return pageIds.map((pageId) => {
      const configuredLabel = pageSettings?.[pageId]?.label;
      return { id: pageId, label: configuredLabel || pageId };
    });
  }, [pagesConfig, pageSettings]);

  if (!isOpen) return null;

  const maxColSpan = gridColumns || 4;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const tempDisplayUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const graphLimitRange =
    effectiveUnitMode === 'imperial' ? { min: 5, max: 95 } : { min: -15, max: 35 };
  const isPerson = entityId?.startsWith('person.');
  const personDisplay = editSettings?.personDisplay || 'photo';

  const entityEntries = Object.entries(entities || {});
  const byDomain = (domain) =>
    entityEntries.filter(([id]) => id.startsWith(`${domain}.`)).map(([id]) => id);
  const sortByName = (ids) =>
    ids.sort((a, b) =>
      (entities[a]?.attributes?.friendly_name || a).localeCompare(
        entities[b]?.attributes?.friendly_name || b
      )
    );
  const batteryOptions = sortByName(
    entityEntries
      .filter(([id, entity]) => {
        if (!id.startsWith('sensor.') && !id.startsWith('input_number.')) return false;
        const deviceClass = entity?.attributes?.device_class;
        const unit = entity?.attributes?.unit_of_measurement;
        const lowerId = id.toLowerCase();
        return (
          deviceClass === 'battery' ||
          unit === '%' ||
          lowerId.includes('battery') ||
          lowerId.includes('soc')
        );
      })
      .map(([id]) => id)
  );

  const rangeOptions = sortByName(
    entityEntries
      .filter(([id, entity]) => {
        if (!id.startsWith('sensor.') && !id.startsWith('input_number.')) return false;
        const deviceClass = entity?.attributes?.device_class;
        const unit = entity?.attributes?.unit_of_measurement;
        const lowerId = id.toLowerCase();
        return (
          deviceClass === 'distance' || unit === 'km' || unit === 'mi' || lowerId.includes('range')
        );
      })
      .map(([id]) => id)
  );

  const locationOptions = sortByName(byDomain('device_tracker'));

  const chargingOptions = sortByName(
    entityEntries
      .filter(([id, entity]) => {
        const lowerId = id.toLowerCase();
        const deviceClass = entity?.attributes?.device_class;
        return lowerId.includes('charging') || deviceClass === 'battery_charging';
      })
      .map(([id]) => id)
  );

  const pluggedOptions = sortByName(
    entityEntries
      .filter(([id, entity]) => {
        const lowerId = id.toLowerCase();
        const deviceClass = entity?.attributes?.device_class;
        return lowerId.includes('plug') || lowerId.includes('plugged') || deviceClass === 'plug';
      })
      .map(([id]) => id)
  );

  const climateOptions = sortByName(byDomain('climate'));
  const calendarOptions = sortByName(byDomain('calendar'));
  const todoOptions = sortByName(byDomain('todo'));
  const mediaPlayerOptions = sortByName(byDomain('media_player'));

  const lastUpdatedOptions = sortByName(
    entityEntries
      .filter(([id]) => id.startsWith('sensor.') && id.toLowerCase().includes('update'))
      .map(([id]) => id)
  );

  const updateButtonOptions = sortByName(byDomain('button'));
  const visibilityCondition = editSettings?.visibilityCondition || null;
  const normalizedVisibilityCondition = normalizeVisibilityConditionConfig(visibilityCondition);
  const visibilityEnabled =
    normalizedVisibilityCondition.enabled && normalizedVisibilityCondition.rules.length > 0;

  const toggleVisibilityCondition = () => {
    if (!editSettingsKey) return;
    const nextEnabled = !visibilityEnabled;
    const nextRules =
      normalizedVisibilityCondition.rules.length > 0
        ? normalizedVisibilityCondition.rules
        : [{ type: 'state', states: ['on'], forSeconds: 0 }];

    saveCardSetting(editSettingsKey, 'visibilityCondition', {
      ...normalizedVisibilityCondition,
      enabled: nextEnabled,
      rules: nextRules,
    });

    setShowVisibilityLogic(nextEnabled);
  };

  const popupTrigger =
    editSettings && typeof editSettings.popupTrigger === 'object' && editSettings.popupTrigger
      ? editSettings.popupTrigger
      : null;
  const popupTriggerEnabled = popupTrigger?.enabled === true;
  const popupTriggerCondition = popupTrigger?.condition || null;
  const popupTriggerCooldownSeconds = normalizePopupTriggerCooldownSeconds(
    popupTrigger?.cooldownSeconds
  );
  const popupTriggerAutoCloseSeconds = normalizePopupTriggerAutoCloseSeconds(
    popupTrigger?.autoCloseSeconds
  );

  const savePopupTrigger = (
    nextEnabled,
    nextCondition,
    nextCooldownSeconds = popupTriggerCooldownSeconds,
    nextAutoCloseSeconds = popupTriggerAutoCloseSeconds
  ) => {
    if (!editSettingsKey) return;

    const normalizedCondition = nextCondition || null;
    const hasCondition = isConditionConfigured(normalizedCondition);
    const normalizedEnabled = nextEnabled === true;
    const normalizedCooldownSeconds = normalizePopupTriggerCooldownSeconds(nextCooldownSeconds);
    const normalizedAutoCloseSeconds = normalizePopupTriggerAutoCloseSeconds(nextAutoCloseSeconds);

    if (!normalizedEnabled && !hasCondition) {
      saveCardSetting(editSettingsKey, 'popupTrigger', null);
      return;
    }

    saveCardSetting(editSettingsKey, 'popupTrigger', {
      enabled: normalizedEnabled,
      condition: normalizedCondition,
      cooldownSeconds: normalizedCooldownSeconds,
      autoCloseSeconds: normalizedAutoCloseSeconds,
    });
  };
  const personBatteryOptions = batteryOptions; // Show all batteries always

  const allPersonCandidateSensors = sortByName(
    entityEntries
      .filter(
        ([id]) =>
          id.startsWith('sensor.') ||
          id.startsWith('binary_sensor.') ||
          id.startsWith('input_boolean.')
      )
      .map(([id]) => id)
  );

  // Show all sensors always, filtering happens inside searchable select by user typing
  const personExtraSensorOptions = allPersonCandidateSensors;

  const personExtraSensors = Array.isArray(editSettings?.personExtraSensors)
    ? editSettings.personExtraSensors.filter((id) => typeof id === 'string')
    : [];
  const availablePersonExtraSensorOptions = personExtraSensorOptions.filter(
    (id) => !personExtraSensors.includes(id)
  );
  const personTrackerOptions = (() => {
    const trackers = sortByName(byDomain('device_tracker'));
    // Always show all trackers too, to be safe
    return trackers;
  })();

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
      style={{
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(0,0,0,0.3)',
      }}
      onClick={onClose}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
      <div
        className={`w-full border ${isEditRoom ? 'max-w-2xl' : 'max-w-lg'} popup-anim relative mt-3 flex max-h-[92vh] flex-col rounded-2xl p-4 font-sans shadow-2xl backdrop-blur-xl sm:mt-0 sm:max-h-[85vh] sm:rounded-3xl sm:p-6 md:rounded-[2.5rem] md:p-8`}
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-5 right-5 z-10 md:top-7 md:right-7"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-4 shrink-0 text-center text-2xl font-light tracking-widest text-[var(--text-primary)] uppercase italic">
          {t('modal.editCard.title')}
        </h3>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
          {(canEditName || editSettingsKey) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {canEditName && (
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                    {t('form.name')}
                  </label>
                  <input
                    type="text"
                    className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                    defaultValue={
                      customNames[entityId] || entities[entityId]?.attributes?.friendly_name || ''
                    }
                    onBlur={(e) => saveCustomName(entityId, e.target.value)}
                    placeholder={t('form.defaultName')}
                  />
                </div>
              )}

              {editSettingsKey && (
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                    {t('form.heading')}
                  </label>
                  <input
                    type="text"
                    className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                    defaultValue={editSettings.heading || ''}
                    onBlur={(e) =>
                      saveCardSetting(editSettingsKey, 'heading', e.target.value.trim() || null)
                    }
                    placeholder={t('form.headingPlaceholder')}
                  />
                </div>
              )}
            </div>
          )}

          {canEditIcon && (
            <div className="space-y-2">
              <label className="ml-4 text-xs font-bold text-gray-500 uppercase">
                {t('form.chooseIcon')}
              </label>
              <IconPicker
                value={customIcons[entityId] || null}
                onSelect={(iconName) => saveCustomIcon(entityId, iconName)}
                onClear={() => saveCustomIcon(entityId, null)}
                t={t}
                maxHeightClass="max-h-48"
              />
            </div>
          )}

          {editSettingsKey && (
            <div className="space-y-3">
              <div className="popup-surface rounded-2xl border border-[var(--glass-border)]/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!visibilityEnabled) return;
                      setShowVisibilityLogic((prev) => !prev);
                    }}
                    className={`flex-1 text-left ${visibilityEnabled ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
                          {t('visibility.title') || 'Conditional visibility'}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                          {t('visibility.description') ||
                            'Show this card only when the rule matches.'}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 transition-colors ${visibilityEnabled ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]/60'}`}
                      >
                        {showVisibilityLogic ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={toggleVisibilityCondition}
                    className={`relative h-6 w-12 rounded-full transition-colors ${visibilityEnabled ? 'bg-[var(--accent-color)]' : 'bg-gray-600'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${visibilityEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {visibilityEnabled && showVisibilityLogic && (
                  <div className="mt-3 border-t border-[var(--glass-border)]/40 pt-3">
                    <ConditionBuilder
                      cardId={entityId}
                      cardSettings={editSettings}
                      condition={visibilityCondition}
                      entities={entities}
                      onChange={(nextCondition) =>
                        saveCardSetting(editSettingsKey, 'visibilityCondition', nextCondition)
                      }
                      t={t}
                      showHeader={false}
                      showEnableToggle={false}
                      forceEnabled
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {editSettingsKey && (
            <div className="space-y-3">
              <div className="popup-surface rounded-2xl border border-[var(--glass-border)]/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!popupTriggerEnabled) return;
                      setShowPopupLogic((prev) => !prev);
                    }}
                    className={`flex-1 text-left ${popupTriggerEnabled ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
                          {t('popupTrigger.title') || 'Popup trigger'}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                          {t('popupTrigger.description') ||
                            'Open this card popup automatically when the rule transitions from false to true.'}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 transition-colors ${popupTriggerEnabled ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]/60'}`}
                      >
                        {showPopupLogic ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = !popupTriggerEnabled;
                      savePopupTrigger(
                        nextEnabled,
                        popupTriggerCondition,
                        popupTriggerCooldownSeconds,
                        popupTriggerAutoCloseSeconds
                      );
                      setShowPopupLogic(nextEnabled);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${popupTriggerEnabled ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
                  >
                    {popupTriggerEnabled
                      ? `✓ ${t('popupTrigger.enabled') || 'Enabled'}`
                      : t('popupTrigger.enable') || 'Enable'}
                  </button>
                </div>

                {popupTriggerEnabled && (
                  <div className="mt-3 space-y-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      {t('popupTrigger.cooldownSeconds') || 'Cooldown (seconds)'}
                    </label>
                    <input
                      type="number"
                      min={MIN_POPUP_TRIGGER_COOLDOWN_SECONDS}
                      max={MAX_POPUP_TRIGGER_COOLDOWN_SECONDS}
                      value={popupTriggerCooldownSeconds}
                      onChange={(e) =>
                        savePopupTrigger(
                          popupTriggerEnabled,
                          popupTriggerCondition,
                          e.target.value,
                          popupTriggerAutoCloseSeconds
                        )
                      }
                      className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {t('popupTrigger.cooldownHint') ||
                        'Minimum 10 seconds between automatic popup opens for this trigger.'}
                    </p>

                    <label className="pt-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      {t('popupTrigger.autoCloseSeconds') || 'Auto-close (seconds)'}
                    </label>
                    <input
                      type="number"
                      min={MIN_POPUP_TRIGGER_AUTO_CLOSE_SECONDS}
                      max={MAX_POPUP_TRIGGER_AUTO_CLOSE_SECONDS}
                      value={popupTriggerAutoCloseSeconds}
                      onChange={(e) =>
                        savePopupTrigger(
                          popupTriggerEnabled,
                          popupTriggerCondition,
                          popupTriggerCooldownSeconds,
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {t('popupTrigger.autoCloseHint') ||
                        'Optional: auto-close popup after X seconds when opened by trigger. Set 0 to disable.'}
                    </p>
                  </div>
                )}

                {popupTriggerEnabled && showPopupLogic && (
                  <div className="mt-3 border-t border-[var(--glass-border)]/40 pt-3">
                    <ConditionBuilder
                      cardId={entityId}
                      cardSettings={editSettings}
                      condition={popupTriggerCondition}
                      entities={entities}
                      onChange={(nextCondition) =>
                        savePopupTrigger(
                          true,
                          nextCondition,
                          popupTriggerCooldownSeconds,
                          popupTriggerAutoCloseSeconds
                        )
                      }
                      t={t}
                      showHeader={false}
                      showEnableToggle={false}
                      forceEnabled
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {isEditWeatherTemp && editSettingsKey && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                  {t('weatherTemp.subtitle') || 'Subtitle'}
                </label>
                <input
                  type="text"
                  className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                  defaultValue={editSettings.subtitle || ''}
                  onBlur={(e) =>
                    saveCardSetting(editSettingsKey, 'subtitle', e.target.value.trim() || null)
                  }
                  placeholder={t('weatherTemp.subtitlePlaceholder') || 'e.g. Oslo, Home'}
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                  {t('weatherTemp.graphHistory') || 'Graph history'}
                </label>
                <div className="popup-surface flex flex-wrap items-center gap-2 rounded-2xl p-3">
                  {[6, 12, 24, 48].map((hours) => {
                    const active = (editSettings.graphHistoryHours || 12) === hours;
                    return (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => saveCardSetting(editSettingsKey, 'graphHistoryHours', hours)}
                        className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${active ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                      >
                        {hours}h
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                  {t('weatherTemp.graphLimits') || 'Graph color limits'} ({tempDisplayUnit})
                </label>
                <GraphLimitsSlider
                  values={[
                    Number.isFinite(editSettings.graphLimit1) ? editSettings.graphLimit1 : 0,
                    Number.isFinite(editSettings.graphLimit2) ? editSettings.graphLimit2 : 10,
                    Number.isFinite(editSettings.graphLimit3) ? editSettings.graphLimit3 : 20,
                    Number.isFinite(editSettings.graphLimit4) ? editSettings.graphLimit4 : 28,
                  ].map((limit) =>
                    convertValueByKind(limit, {
                      kind: 'temperature',
                      fromUnit: '°C',
                      unitMode: effectiveUnitMode,
                    })
                  )}
                  min={graphLimitRange.min}
                  max={graphLimitRange.max}
                  onChange={(next) => {
                    const canonicalLimits = next.map((limit) =>
                      convertValueByKind(limit, {
                        kind: 'temperature',
                        fromUnit: tempDisplayUnit,
                        unitMode: 'metric',
                      })
                    );
                    saveCardSetting(editSettingsKey, 'graphLimit1', canonicalLimits[0]);
                    saveCardSetting(editSettingsKey, 'graphLimit2', canonicalLimits[1]);
                    saveCardSetting(editSettingsKey, 'graphLimit3', canonicalLimits[2]);
                    saveCardSetting(editSettingsKey, 'graphLimit4', canonicalLimits[3]);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="ml-4 block pb-1 text-xs font-bold text-gray-500 uppercase">
                  {t('weatherTemp.effects')}
                </label>
                <div className="popup-surface flex items-center justify-between rounded-2xl p-4">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {t('weatherTemp.showEffects')}
                  </span>
                  <button
                    onClick={() =>
                      saveCardSetting(
                        editSettingsKey,
                        'showEffects',
                        editSettings.showEffects === false ? true : false
                      )
                    }
                    className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showEffects !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-gray-600'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${editSettings.showEffects !== false ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isEditCalendar && editSettingsKey && (
            <div className="space-y-3">
              <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                {t('calendar.selectCalendars') || 'Select Calendars'}
              </label>
              <div className="popup-surface custom-scrollbar max-h-56 space-y-2 overflow-y-auto rounded-2xl p-4">
                {calendarOptions.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                    {t('calendar.noCalendarsFound') || 'No calendars found'}
                  </p>
                )}
                {calendarOptions.map((id) => {
                  const selected =
                    Array.isArray(editSettings.calendars) && editSettings.calendars.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(editSettings.calendars)
                          ? editSettings.calendars
                          : [];
                        const next = selected ? current.filter((x) => x !== id) : [...current, id];
                        saveCardSetting(editSettingsKey, 'calendars', next);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${selected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div className="truncate text-sm font-bold">
                        {entities[id]?.attributes?.friendly_name || id}
                      </div>
                      <div className="truncate text-[10px] text-[var(--text-muted)]">{id}</div>
                    </button>
                  );
                })}
              </div>

              {/* Week View toggle */}
              <div className="popup-surface rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-[var(--text-primary)]">
                      {t('calendar.largeCalendar') || 'Week View'}
                    </label>
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {t('calendar.largeCalendarHint') || 'Show Outlook-style week time-grid view'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveCardSetting(editSettingsKey, 'largeCalendar', !editSettings.largeCalendar)
                    }
                    className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.largeCalendar ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-gray-600'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${editSettings.largeCalendar ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                  {t('editCard.columnWidth') || 'Column Width'}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      saveCardSetting(
                        editSettingsKey,
                        'colSpan',
                        Math.max(1, (editSettings.colSpan || 1) - 1)
                      )
                    }
                    className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold text-[var(--text-primary)]">
                      {editSettings.colSpan || 1}
                    </span>
                    <span className="ml-1 text-xs text-[var(--text-muted)]">
                      {(editSettings.colSpan || 1) === 1
                        ? t('editCard.column') || 'column'
                        : t('editCard.columns') || 'columns'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveCardSetting(
                        editSettingsKey,
                        'colSpan',
                        Math.min(maxColSpan, (editSettings.colSpan || 1) + 1)
                      )
                    }
                    className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {isEditSpacer && editSettingsKey && (
            <div className="space-y-4">
              {(() => {
                const currentColSpan =
                  typeof editSettings.colSpan === 'number' ? editSettings.colSpan : 1;
                const isFullWidth = editSettings.colSpan === 'full';
                const currentHeadingAlign = ['left', 'center', 'right'].includes(
                  editSettings.headingAlign
                )
                  ? editSettings.headingAlign
                  : 'center';

                return (
                  <>
                    <div className="space-y-2">
                      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {t('spacer.variant') || 'Variant'}
                      </label>
                      <div className="flex gap-2">
                        {[
                          { key: 'spacer', label: t('spacer.spacer') || 'Spacer' },
                          { key: 'divider', label: t('spacer.divider') || 'Divider' },
                        ].map((v) => (
                          <button
                            key={v.key}
                            onClick={() => {
                              saveCardSetting(editSettingsKey, 'variant', v.key);
                              if (v.key === 'divider') {
                                saveCardSetting(editSettingsKey, 'colSpan', 'full');
                                saveCardSetting(editSettingsKey, 'heightPx', 40);
                              }
                            }}
                            className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${(editSettings.variant || 'spacer') === v.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                            style={
                              (editSettings.variant || 'spacer') === v.key
                                ? {
                                    backgroundColor: 'var(--glass-bg-hover)',
                                    borderColor: 'var(--glass-border)',
                                  }
                                : undefined
                            }
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {'Heading alignment'}
                      </label>
                      <div className="flex gap-2">
                        {[
                          { key: 'left', label: 'Venstre' },
                          { key: 'center', label: 'Midt' },
                          { key: 'right', label: 'Høgre' },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() =>
                              saveCardSetting(editSettingsKey, 'headingAlign', opt.key)
                            }
                            className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${currentHeadingAlign === opt.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                            style={
                              currentHeadingAlign === opt.key
                                ? {
                                    backgroundColor: 'var(--glass-bg-hover)',
                                    borderColor: 'var(--glass-border)',
                                  }
                                : undefined
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {'Column Width'}
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveCardSetting(editSettingsKey, 'colSpan', 'full')}
                          className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${isFullWidth ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                          style={
                            isFullWidth
                              ? {
                                  backgroundColor: 'var(--glass-bg-hover)',
                                  borderColor: 'var(--glass-border)',
                                }
                              : undefined
                          }
                        >
                          {'Full Width'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(editSettingsKey, 'colSpan', currentColSpan)
                          }
                          className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${!isFullWidth ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                          style={
                            !isFullWidth
                              ? {
                                  backgroundColor: 'var(--glass-bg-hover)',
                                  borderColor: 'var(--glass-border)',
                                }
                              : undefined
                          }
                        >
                          {'Custom'}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(
                              editSettingsKey,
                              'colSpan',
                              Math.max(1, currentColSpan - 1)
                            )
                          }
                          disabled={isFullWidth}
                          className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                        >
                          &minus;
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-lg font-bold text-[var(--text-primary)]">
                            {isFullWidth ? '∞' : currentColSpan}
                          </span>
                          <span className="ml-1 text-xs text-[var(--text-muted)]">
                            {isFullWidth
                              ? 'full width'
                              : currentColSpan === 1
                                ? 'column'
                                : 'columns'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(
                              editSettingsKey,
                              'colSpan',
                              Math.min(4, currentColSpan + 1)
                            )
                          }
                          disabled={isFullWidth}
                          className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {'Height'}
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(
                              editSettingsKey,
                              'heightPx',
                              Math.max(24, (editSettings.heightPx || 100) - 20)
                            )
                          }
                          className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                        >
                          &minus;
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-lg font-bold text-[var(--text-primary)]">
                            {editSettings.heightPx || 100}
                          </span>
                          <span className="ml-1 text-xs text-[var(--text-muted)]">px</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(
                              editSettingsKey,
                              'heightPx',
                              Math.min(420, (editSettings.heightPx || 100) + 20)
                            )
                          }
                          className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {isEditCamera &&
            editSettingsKey &&
            (() => {
              const streamEngine = String(editSettings.cameraStreamEngine || 'auto').toLowerCase();
              const webrtcTemplate = editSettings.cameraWebrtcUrl || '';
              const recommendedWebrtc = '/api/webrtc?src={entity_object_id}';
              const refreshMode = editSettings.cameraRefreshMode || 'interval';
              const refreshInterval = editSettings.cameraRefreshInterval || 10;
              const motionSensorId = editSettings.cameraMotionSensor || '';
              const binarySensorOptions = sortByName(
                entityEntries
                  .filter(
                    ([id, e]) =>
                      id.startsWith('binary_sensor.') &&
                      (e?.attributes?.device_class === 'motion' ||
                        e?.attributes?.device_class === 'occupancy' ||
                        id.toLowerCase().includes('motion'))
                  )
                  .map(([id]) => id)
              );

              return (
                <div className="space-y-4">
                  {/* Stream engine */}
                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                      {t('camera.streamEngine') || 'Stream Engine'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'auto', label: t('camera.streamEngineAuto') || 'Auto' },
                        { key: 'webrtc', label: t('camera.streamEngineWebrtc') || 'WebRTC' },
                        { key: 'ha', label: t('camera.streamEngineHa') || 'HA Stream' },
                        { key: 'snapshot', label: t('camera.streamEngineSnapshot') || 'Snapshot' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() =>
                            saveCardSetting(editSettingsKey, 'cameraStreamEngine', opt.key)
                          }
                          className={`rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${streamEngine === opt.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                          style={
                            streamEngine === opt.key
                              ? {
                                  backgroundColor: 'var(--glass-bg-hover)',
                                  borderColor: 'var(--glass-border)',
                                }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional WebRTC URL */}
                  {(streamEngine === 'webrtc' || streamEngine === 'auto') && (
                    <div className="space-y-2">
                      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {t('camera.webrtcUrlOptional') || 'WebRTC URL (optional)'}
                      </label>
                      <input
                        type="text"
                        value={webrtcTemplate}
                        onChange={(e) =>
                          saveCardSetting(editSettingsKey, 'cameraWebrtcUrl', e.target.value)
                        }
                        placeholder={recommendedWebrtc}
                        className="w-full rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none"
                        style={{
                          backgroundColor: 'var(--glass-bg)',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(editSettingsKey, 'cameraWebrtcUrl', recommendedWebrtc)
                          }
                          className="popup-surface popup-surface-hover rounded-xl border border-[var(--glass-border)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
                        >
                          {t('camera.useRecommended') || 'Use Recommended'}
                        </button>
                      </div>
                      <p className="px-1 text-[11px] text-[var(--text-muted)]">
                        {t('camera.webrtcHint') ||
                          'Use {entity_object_id} or {entity_id}. Leave empty to skip WebRTC.'}
                      </p>
                    </div>
                  )}

                  {/* Refresh mode */}
                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                      {t('camera.refreshMode') || 'Refresh Mode'}
                    </label>
                    <div className="flex gap-2">
                      {[
                        { key: 'interval', label: t('camera.refreshInterval') || 'Timer' },
                        { key: 'motion', label: t('camera.refreshMotion') || 'Motion' },
                      ].map((v) => (
                        <button
                          key={v.key}
                          onClick={() =>
                            saveCardSetting(editSettingsKey, 'cameraRefreshMode', v.key)
                          }
                          className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${refreshMode === v.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                          style={
                            refreshMode === v.key
                              ? {
                                  backgroundColor: 'var(--glass-bg-hover)',
                                  borderColor: 'var(--glass-border)',
                                }
                              : undefined
                          }
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interval seconds */}
                  {refreshMode === 'interval' && (
                    <div className="space-y-2">
                      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {t('camera.intervalSeconds') || 'Refresh every (seconds)'}
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(
                              editSettingsKey,
                              'cameraRefreshInterval',
                              Math.max(2, refreshInterval - 1)
                            )
                          }
                          className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                        >
                          −
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-lg font-bold text-[var(--text-primary)]">
                            {refreshInterval}
                          </span>
                          <span className="ml-1 text-xs text-[var(--text-muted)]">s</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            saveCardSetting(
                              editSettingsKey,
                              'cameraRefreshInterval',
                              Math.min(60, refreshInterval + 1)
                            )
                          }
                          className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--glass-border)] text-lg font-bold text-[var(--text-primary)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Motion sensor entity */}
                  {refreshMode === 'motion' && (
                    <div className="space-y-2">
                      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {t('camera.motionSensor') || 'Motion Sensor'}
                      </label>
                      <div className="popup-surface custom-scrollbar max-h-44 space-y-2 overflow-y-auto rounded-2xl p-4">
                        {binarySensorOptions.length === 0 && (
                          <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                            {t('camera.noMotionSensors') || 'No motion sensors found'}
                          </p>
                        )}
                        {binarySensorOptions.map((id) => {
                          const selected = motionSensorId === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() =>
                                saveCardSetting(
                                  editSettingsKey,
                                  'cameraMotionSensor',
                                  selected ? null : id
                                )
                              }
                              className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${selected ? 'text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                              style={
                                selected
                                  ? {
                                      backgroundColor: 'var(--glass-bg-hover)',
                                      borderColor: 'var(--glass-border)',
                                    }
                                  : undefined
                              }
                            >
                              <div className="truncate text-sm font-bold">
                                {entities[id]?.attributes?.friendly_name || id}
                              </div>
                              <div className="truncate text-[10px] text-[var(--text-muted)]">
                                {id}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {isEditTodo && editSettingsKey && (
            <div className="space-y-3">
              <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                {t('todo.selectList') || 'Select Todo List'}
              </label>
              <div className="popup-surface custom-scrollbar max-h-56 space-y-2 overflow-y-auto rounded-2xl p-4">
                {todoOptions.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                    {t('todo.noListsFound') || 'No todo lists found'}
                  </p>
                )}
                {todoOptions.map((id) => {
                  const selected = editSettings.todoEntityId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        saveCardSetting(editSettingsKey, 'todoEntityId', selected ? null : id);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${selected ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div className="truncate text-sm font-bold">
                        {entities[id]?.attributes?.friendly_name || id}
                      </div>
                      <div className="truncate text-[10px] text-[var(--text-muted)]">{id}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isPerson && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="ml-4 text-xs font-bold text-gray-500 uppercase">
                  {t('person.display')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      editSettingsKey && saveCardSetting(editSettingsKey, 'personDisplay', 'photo')
                    }
                    className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${personDisplay === 'photo' ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                    style={
                      personDisplay === 'photo'
                        ? {
                            backgroundColor: 'var(--glass-bg-hover)',
                            borderColor: 'var(--glass-border)',
                          }
                        : undefined
                    }
                  >
                    {t('person.display.photo')}
                  </button>
                  <button
                    onClick={() =>
                      editSettingsKey && saveCardSetting(editSettingsKey, 'personDisplay', 'icon')
                    }
                    className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${personDisplay === 'icon' ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                    style={
                      personDisplay === 'icon'
                        ? {
                            backgroundColor: 'var(--glass-bg-hover)',
                            borderColor: 'var(--glass-border)',
                          }
                        : undefined
                    }
                  >
                    {t('person.display.icon')}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="popup-surface flex items-center justify-between rounded-2xl p-4">
                  <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                    {t('form.showName') || 'Show Name'}
                  </span>
                  <button
                    onClick={() =>
                      editSettingsKey &&
                      saveCardSetting(
                        editSettingsKey,
                        'showName',
                        !(editSettings.showName !== false)
                      )
                    }
                    className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showName !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showName !== false ? 'left-7' : 'left-1'}`}
                    />
                  </button>
                </div>

                <div className="popup-surface flex items-center justify-between rounded-2xl p-4">
                  <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                    {t('person.showState') || 'Show State'}
                  </span>
                  <button
                    onClick={() =>
                      editSettingsKey &&
                      saveCardSetting(
                        editSettingsKey,
                        'showState',
                        !(editSettings.showState !== false)
                      )
                    }
                    className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showState !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showState !== false ? 'left-7' : 'left-1'}`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <SearchableSelect
                  label={t('person.phoneBattery')}
                  value={editSettings.phoneBatteryEntity || editSettings.batteryEntity || null}
                  options={personBatteryOptions}
                  onChange={(id) => {
                    saveCardSetting(editSettingsKey, 'phoneBatteryEntity', id);
                    saveCardSetting(editSettingsKey, 'batteryEntity', id);
                  }}
                  placeholder={t('dropdown.noneSelected')}
                  entities={entities}
                  t={t}
                />

                <SearchableSelect
                  label={t('person.watchBattery')}
                  value={editSettings.watchBatteryEntity || null}
                  options={personBatteryOptions}
                  onChange={(id) => saveCardSetting(editSettingsKey, 'watchBatteryEntity', id)}
                  placeholder={t('dropdown.noneSelected')}
                  entities={entities}
                  t={t}
                />

                <SearchableSelect
                  label={t('person.deviceTracker')}
                  value={editSettings.deviceTracker || null}
                  options={personTrackerOptions}
                  onChange={(id) => saveCardSetting(editSettingsKey, 'deviceTracker', id)}
                  placeholder={t('dropdown.noneSelected')}
                  entities={entities}
                  t={t}
                />
              </div>

              <div className="space-y-2">
                <SearchableSelect
                  label={t('person.addRelatedSensor')}
                  value={null}
                  options={availablePersonExtraSensorOptions}
                  onChange={(id) => {
                    if (!id) return;
                    saveCardSetting(editSettingsKey, 'personExtraSensors', [
                      ...personExtraSensors,
                      id,
                    ]);
                  }}
                  placeholder={t('form.search') || 'Search'}
                  entities={entities}
                  t={t}
                />
                {personExtraSensors.length > 0 && (
                  <div className="popup-surface flex flex-wrap gap-2 rounded-2xl p-3">
                    {personExtraSensors.map((sensorId) => (
                      <div
                        key={sensorId}
                        className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] py-1 pr-1 pl-3 text-[var(--text-primary)]"
                      >
                        <span className="max-w-[180px] truncate text-[11px] font-bold">
                          {entities[sensorId]?.attributes?.friendly_name || sensorId}
                        </span>
                        <button
                          onClick={() =>
                            saveCardSetting(
                              editSettingsKey,
                              'personExtraSensors',
                              personExtraSensors.filter((id) => id !== sensorId)
                            )
                          }
                          className="rounded-full p-1 transition-colors hover:bg-[var(--glass-bg-hover)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isEditAndroidTV && editSettingsKey && (
            <div className="space-y-3">
              <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                {t('androidtv.linkedSpeakers') || 'Linked Speakers'}
              </label>

              {/* Selected Players */}
              {Array.isArray(editSettings.linkedMediaPlayers) &&
                editSettings.linkedMediaPlayers.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {editSettings.linkedMediaPlayers.map((id) => (
                      <div
                        key={id}
                        className="popup-surface flex items-center gap-1 rounded-full border border-[var(--glass-border)] py-1 pr-1 pl-3 text-[var(--text-primary)]"
                      >
                        <span className="text-xs font-bold">
                          {entities[id]?.attributes?.friendly_name || id}
                        </span>
                        <button
                          onClick={() => {
                            const current = editSettings.linkedMediaPlayers;
                            saveCardSetting(
                              editSettingsKey,
                              'linkedMediaPlayers',
                              current.filter((x) => x !== id)
                            );
                          }}
                          className="rounded-full p-1 transition-colors hover:bg-white/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              <input
                type="text"
                placeholder={t('androidtv.searchPlayers')}
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="popup-surface mb-2 w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--glass-border)]"
              />

              <div className="popup-surface custom-scrollbar max-h-56 space-y-2 overflow-y-auto rounded-2xl p-4">
                {mediaPlayerOptions.filter((id) => {
                  if (!mediaSearch) return true;
                  const name = entities[id]?.attributes?.friendly_name || id;
                  return (
                    name.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                    id.toLowerCase().includes(mediaSearch.toLowerCase())
                  );
                }).length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                    {t('media.noPlayersFound') || 'No players found'}
                  </p>
                )}
                {mediaPlayerOptions
                  .filter((id) => {
                    if (!mediaSearch) return true;
                    const name = entities[id]?.attributes?.friendly_name || id;
                    return (
                      name.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                      id.toLowerCase().includes(mediaSearch.toLowerCase())
                    );
                  })
                  .map((id) => {
                    const selected =
                      Array.isArray(editSettings.linkedMediaPlayers) &&
                      editSettings.linkedMediaPlayers.includes(id);
                    if (id === editSettings.mediaPlayerId) return null;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const current = Array.isArray(editSettings.linkedMediaPlayers)
                            ? editSettings.linkedMediaPlayers
                            : [];
                          const next = selected
                            ? current.filter((x) => x !== id)
                            : [...current, id];
                          saveCardSetting(editSettingsKey, 'linkedMediaPlayers', next);
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${selected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                      >
                        <div className="truncate text-sm font-bold">
                          {entities[id]?.attributes?.friendly_name || id}
                        </div>
                        <div className="truncate text-[10px] text-[var(--text-muted)]">{id}</div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {isEditCar && editSettingsKey && (
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                {t('car.imageUrl') || 'Car Image URL'}
              </label>
              <input
                type="text"
                className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                defaultValue={editSettings.imageUrl || ''}
                onBlur={(e) =>
                  saveCardSetting(editSettingsKey, 'imageUrl', e.target.value.trim() || null)
                }
                placeholder="/local/car.png"
              />
              <p className="ml-1 text-[10px] text-gray-500">
                {t('car.imageHint') ||
                  'Place images in HA config/www/ folder, use /local/filename.png'}
              </p>
            </div>
          )}

          {isEditCar && editSettingsKey && (
            <CarMappingsSection
              t={t}
              editSettings={editSettings}
              editSettingsKey={editSettingsKey}
              saveCardSetting={saveCardSetting}
              entities={entities}
              batteryOptions={batteryOptions}
              rangeOptions={rangeOptions}
              locationOptions={locationOptions}
              chargingOptions={chargingOptions}
              pluggedOptions={pluggedOptions}
              climateOptions={climateOptions}
              lastUpdatedOptions={lastUpdatedOptions}
              updateButtonOptions={updateButtonOptions}
            />
          )}

          {canEditStatus && !isEditSensor && (
            <div className="popup-surface space-y-4 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                  {t('form.showStatus')}
                </span>
                <button
                  onClick={() =>
                    editSettingsKey &&
                    saveCardSetting(
                      editSettingsKey,
                      'showStatus',
                      !(editSettings.showStatus !== false)
                    )
                  }
                  className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showStatus !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                  {t('form.showLastChanged')}
                </span>
                <button
                  onClick={() =>
                    editSettingsKey &&
                    saveCardSetting(
                      editSettingsKey,
                      'showLastChanged',
                      !(editSettings.showLastChanged !== false)
                    )
                  }
                  className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showLastChanged !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                >
                  <div
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showLastChanged !== false ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>
            </div>
          )}

          {isEditSensor &&
            (() => {
              const entity = entities[entityId];
              const domain = entityId.split('.')[0];
              const canControl = [
                'input_boolean',
                'switch',
                'light',
                'input_number',
                'automation',
                'script',
                'scene',
              ].includes(domain);

              const state = entity?.state;
              const isNumeric =
                typeof state === 'string'
                  ? /^\s*-?\d+(\.\d+)?\s*$/.test(state)
                  : !isNaN(parseFloat(state));
              const canGraph = isNumeric && domain !== 'input_number';
              const variant = editSettings.sensorVariant || 'default';
              const needsMinMax = ['gauge', 'donut', 'bar'].includes(variant) && isNumeric;
              const numericEntityOptions = sortByName(
                entityEntries
                  .filter(([id]) => id.startsWith('sensor.') || id.startsWith('input_number.'))
                  .map(([id]) => id)
              );

              return (
                <div className="popup-surface space-y-4 rounded-2xl p-4">
                  {canGraph && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                        {t('sensor.variant') || 'Card style'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'default', label: t('sensor.variantDefault') || 'Default' },
                          { key: 'number', label: t('sensor.variantNumber') || 'Number' },
                          { key: 'gauge', label: t('sensor.variantGauge') || 'Gauge' },
                          { key: 'bar', label: t('sensor.variantBar') || 'Bar' },
                          { key: 'donut', label: t('sensor.variantDonut') || 'Donut' },
                        ].map((v) => (
                          <button
                            key={v.key}
                            onClick={() =>
                              editSettingsKey && saveCardSetting(editSettingsKey, 'sensorVariant', v.key)
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${
                              variant === v.key
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {needsMinMax && (
                    <div className="space-y-3 rounded-xl bg-[var(--glass-bg)] p-3">
                      <label className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                        {t('sensor.range') || 'Min / Max range'}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {t('sensor.minValue') || 'Min'}
                          </span>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              placeholder="0"
                              value={
                                editSettings.sensorMinType === 'entity'
                                  ? ''
                                  : (editSettings.sensorMin ?? '')
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                saveCardSetting(editSettingsKey, 'sensorMin', v === '' ? null : parseFloat(v));
                                saveCardSetting(editSettingsKey, 'sensorMinType', 'value');
                              }}
                              disabled={editSettings.sensorMinType === 'entity'}
                              className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                            />
                            <select
                              value={editSettings.sensorMinType || 'value'}
                              onChange={(e) => {
                                const ty = e.target.value;
                                saveCardSetting(editSettingsKey, 'sensorMinType', ty);
                                if (ty === 'value') saveCardSetting(editSettingsKey, 'sensorMinEntity', null);
                              }}
                              className="w-16 px-1 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-xs outline-none border-0"
                            >
                              <option value="value">#</option>
                              <option value="entity">{t('sensor.entity') || 'Entity'}</option>
                            </select>
                          </div>
                          {editSettings.sensorMinType === 'entity' && (
                            <select
                              value={editSettings.sensorMinEntity || ''}
                              onChange={(e) =>
                                saveCardSetting(editSettingsKey, 'sensorMinEntity', e.target.value || null)
                              }
                              className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-xs outline-none border-0"
                            >
                              <option value="">{t('sensor.selectEntity') || 'Select...'}</option>
                              {numericEntityOptions.map((id) => (
                                <option key={id} value={id}>
                                  {entities[id]?.attributes?.friendly_name || id}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {t('sensor.maxValue') || 'Max'}
                          </span>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              placeholder="100"
                              value={
                                editSettings.sensorMaxType === 'entity'
                                  ? ''
                                  : (editSettings.sensorMax ?? '')
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                saveCardSetting(editSettingsKey, 'sensorMax', v === '' ? null : parseFloat(v));
                                saveCardSetting(editSettingsKey, 'sensorMaxType', 'value');
                              }}
                              disabled={editSettings.sensorMaxType === 'entity'}
                              className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-sm outline-none border-0"
                            />
                            <select
                              value={editSettings.sensorMaxType || 'value'}
                              onChange={(e) => {
                                const ty = e.target.value;
                                saveCardSetting(editSettingsKey, 'sensorMaxType', ty);
                                if (ty === 'value') saveCardSetting(editSettingsKey, 'sensorMaxEntity', null);
                              }}
                              className="w-16 px-1 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-xs outline-none border-0"
                            >
                              <option value="value">#</option>
                              <option value="entity">{t('sensor.entity') || 'Entity'}</option>
                            </select>
                          </div>
                          {editSettings.sensorMaxType === 'entity' && (
                            <select
                              value={editSettings.sensorMaxEntity || ''}
                              onChange={(e) =>
                                saveCardSetting(editSettingsKey, 'sensorMaxEntity', e.target.value || null)
                              }
                              className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--modal-bg)] text-[var(--text-primary)] text-xs outline-none border-0"
                            >
                              <option value="">{t('sensor.selectEntity') || 'Select...'}</option>
                              {numericEntityOptions.map((id) => (
                                <option key={id} value={id}>
                                  {entities[id]?.attributes?.friendly_name || id}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--text-muted)]">
                          {t('sensor.valueDisplay') || 'Value display'}
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              saveCardSetting(editSettingsKey, 'sensorValueMode', 'actual')
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                              (editSettings.sensorValueMode || 'actual') === 'actual'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {t('sensor.valueActual') || 'Actual value'}
                          </button>
                          <button
                            onClick={() =>
                              saveCardSetting(editSettingsKey, 'sensorValueMode', 'percent')
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                              editSettings.sensorValueMode === 'percent'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {t('sensor.valuePercent') || '% of range'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                      {t('form.showName') || 'Show Name'}
                    </span>
                    <button
                      onClick={() =>
                        editSettingsKey &&
                        saveCardSetting(
                          editSettingsKey,
                          'showName',
                          !(editSettings.showName !== false)
                        )
                      }
                      className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showName !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showName !== false ? 'left-7' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                      {t('form.showStatus') || 'Show Status'}
                    </span>
                    <button
                      onClick={() =>
                        editSettingsKey &&
                        saveCardSetting(
                          editSettingsKey,
                          'showStatus',
                          !(editSettings.showStatus !== false)
                        )
                      }
                      className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showStatus !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                      {t('form.showLastChanged') || 'Show Last Changed'}
                    </span>
                    <button
                      onClick={() =>
                        editSettingsKey &&
                        saveCardSetting(
                          editSettingsKey,
                          'showLastChanged',
                          !(editSettings.showLastChanged !== false)
                        )
                      }
                      className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showLastChanged !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showLastChanged !== false ? 'left-7' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  {canControl && (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                          {t('form.showControls')}
                        </span>
                        <span className="text-[10px] text-gray-500">{t('form.controlsHint')}</span>
                      </div>
                      <button
                        onClick={() =>
                          editSettingsKey &&
                          saveCardSetting(
                            editSettingsKey,
                            'showControls',
                            !editSettings.showControls
                          )
                        }
                        className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showControls ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                      >
                        <div
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showControls ? 'left-7' : 'left-1'}`}
                        />
                      </button>
                    </div>
                  )}

                  {canGraph && (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                          {t('form.showGraph')}
                        </span>
                        <span className="text-[10px] text-gray-500">{t('form.graphHint')}</span>
                      </div>
                      <button
                        onClick={() =>
                          editSettingsKey &&
                          saveCardSetting(
                            editSettingsKey,
                            'showGraph',
                            !(editSettings.showGraph !== false)
                          )
                        }
                        className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showGraph !== false ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                      >
                        <div
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${editSettings.showGraph !== false ? 'left-7' : 'left-1'}`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

          {isEditFan && editSettingsKey && (
            <div className="popup-surface rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-[var(--text-primary)]">
                    {t('fan.disableAnimation') || 'Disable Animation'}
                  </label>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                    {t('fan.disableAnimationHint') ||
                      'Stop the icon from spinning when the fan is on'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    saveCardSetting(
                      editSettingsKey,
                      'disable_animation',
                      !editSettings.disable_animation
                    )
                  }
                  className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.disable_animation ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-gray-600'}`}
                >
                  <span
                    className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${editSettings.disable_animation ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>
          )}

          {isEditMedia && editSettingsKey && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                  {t('media.artworkMode') || 'Artwork Mode'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'artworkMode', 'default')}
                    className={`flex-1 rounded-xl border px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors ${!editSettings.artworkMode || editSettings.artworkMode === 'default' ? 'popup-surface border-[var(--glass-border)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                    style={
                      !editSettings.artworkMode || editSettings.artworkMode === 'default'
                        ? { backgroundColor: 'var(--glass-bg-hover)' }
                        : undefined
                    }
                  >
                    {t('media.artwork.default') || 'Default'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'artworkMode', 'cover')}
                    className={`flex-1 rounded-xl border px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors ${editSettings.artworkMode === 'cover' ? 'popup-surface border-[var(--glass-border)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                    style={
                      editSettings.artworkMode === 'cover'
                        ? { backgroundColor: 'var(--glass-bg-hover)' }
                        : undefined
                    }
                  >
                    {t('media.artwork.cover') || 'Cover'}
                  </button>
                </div>
                <p className="ml-1 text-[10px] text-[var(--text-muted)]">
                  {editSettings.artworkMode === 'cover'
                    ? t('media.artwork.coverHint') || 'Full card artwork cover'
                    : t('media.artwork.defaultHint') || 'Standard icon & background'}
                </p>
              </div>
            </div>
          )}

          {isEditRoom && editSettingsKey && (
            <RoomSettingsSection
              conn={conn}
              editSettings={editSettings}
              editSettingsKey={editSettingsKey}
              saveCardSetting={saveCardSetting}
              entities={entities}
              pageOptions={roomPageOptions}
              t={t}
            />
          )}

          {isEditNordpool && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                    {t('cost.currency') || 'Currency'}
                  </label>
                  <input
                    type="text"
                    className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                    defaultValue={editSettings.currency || ''}
                    onBlur={(e) =>
                      saveCardSetting(editSettingsKey, 'currency', e.target.value.trim() || null)
                    }
                    placeholder={t('cost.currencyPlaceholder') || 'Auto (from HA)'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-4 block pb-1 text-xs font-bold text-gray-500 uppercase">
                  {t('nordpool.withSupport') || 'Electricity Support'}
                </label>
                <div className="popup-surface flex items-center justify-between rounded-2xl p-4">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {t('nordpool.withSupport') || 'Show electricity support'}
                  </span>
                  <button
                    onClick={() =>
                      saveCardSetting(
                        editSettingsKey,
                        'showWithSupport',
                        !editSettings.showWithSupport
                      )
                    }
                    className={`relative h-6 w-12 rounded-full transition-colors ${editSettings.showWithSupport ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-gray-600'}`}
                  >
                    <span
                      className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${editSettings.showWithSupport ? 'translate-x-6' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-4 text-xs font-bold text-gray-500 uppercase">
                  {t('addCard.nordpoolDecimals') || 'Decimals'}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={editSettings.decimals ?? 2}
                    onChange={(e) =>
                      saveCardSetting(editSettingsKey, 'decimals', parseInt(e.target.value, 10))
                    }
                    className="flex-1"
                  />
                  <div className="popup-surface min-w-[48px] rounded-xl px-3 py-2 text-center text-sm font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                    {editSettings.decimals ?? 2}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isEditCost && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                    {t('energyCost.todayLabel') || 'Today label'}
                  </label>
                  <input
                    type="text"
                    className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                    defaultValue={editSettings.todayLabel || ''}
                    onBlur={(e) =>
                      saveCardSetting(editSettingsKey, 'todayLabel', e.target.value.trim() || null)
                    }
                    placeholder={t('energyCost.today')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                    {t('energyCost.monthLabel') || 'Month label'}
                  </label>
                  <input
                    type="text"
                    className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                    defaultValue={editSettings.monthLabel || ''}
                    onBlur={(e) =>
                      saveCardSetting(editSettingsKey, 'monthLabel', e.target.value.trim() || null)
                    }
                    placeholder={t('energyCost.thisMonth')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                    {t('cost.currency') || 'Currency'}
                  </label>
                  <input
                    type="text"
                    className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                    defaultValue={editSettings.currency || ''}
                    onBlur={(e) =>
                      saveCardSetting(editSettingsKey, 'currency', e.target.value.trim() || null)
                    }
                    placeholder={t('cost.currencyPlaceholder') || 'Auto (from HA)'}
                  />
                </div>
              </div>

              <div>
                <label className="ml-4 block pb-2 text-xs font-bold text-gray-500 uppercase">
                  {t('energyCost.today') || 'Today'}
                </label>
                <div className="popup-surface custom-scrollbar max-h-40 space-y-2 overflow-y-auto rounded-2xl p-4">
                  {Object.keys(entities).filter(
                    (id) => id.startsWith('sensor.') || id.startsWith('input_number.')
                  ).length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">
                      {t('addCard.noSensors') || 'No sensors found'}
                    </p>
                  ) : (
                    Object.keys(entities)
                      .filter((id) => id.startsWith('sensor.') || id.startsWith('input_number.'))
                      .sort((a, b) =>
                        (entities[a].attributes?.friendly_name || a).localeCompare(
                          entities[b].attributes?.friendly_name || b
                        )
                      )
                      .map((sensorId) => {
                        const isSelected = editSettings.todayId === sensorId;
                        return (
                          <div
                            key={sensorId}
                            className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5"
                            onClick={() => {
                              saveCardSetting(
                                editSettingsKey,
                                'todayId',
                                isSelected ? null : sensorId
                              );
                            }}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200 ${isSelected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'border-gray-500 bg-transparent'}`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {entities[sensorId].attributes?.friendly_name || sensorId}
                              </span>
                              <span className="font-mono text-[10px] text-gray-500">
                                {sensorId}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div>
                <label className="ml-4 block pb-2 text-xs font-bold text-gray-500 uppercase">
                  {t('energyCost.thisMonth') || 'This Month'}
                </label>
                <div className="popup-surface custom-scrollbar max-h-40 space-y-2 overflow-y-auto rounded-2xl p-4">
                  {Object.keys(entities).filter(
                    (id) => id.startsWith('sensor.') || id.startsWith('input_number.')
                  ).length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">
                      {t('addCard.noSensors') || 'No sensors found'}
                    </p>
                  ) : (
                    Object.keys(entities)
                      .filter((id) => id.startsWith('sensor.') || id.startsWith('input_number.'))
                      .sort((a, b) =>
                        (entities[a].attributes?.friendly_name || a).localeCompare(
                          entities[b].attributes?.friendly_name || b
                        )
                      )
                      .map((sensorId) => {
                        const isSelected = editSettings.monthId === sensorId;
                        return (
                          <div
                            key={sensorId}
                            className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5"
                            onClick={() => {
                              saveCardSetting(
                                editSettingsKey,
                                'monthId',
                                isSelected ? null : sensorId
                              );
                            }}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200 ${isSelected ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'border-gray-500 bg-transparent'}`}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {entities[sensorId].attributes?.friendly_name || sensorId}
                              </span>
                              <span className="font-mono text-[10px] text-gray-500">
                                {sensorId}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="ml-4 text-xs font-bold text-gray-500 uppercase">
                  {t('cost.decimals') || 'Decimals (Today)'}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={editSettings.decimals ?? 0}
                    onChange={(e) =>
                      saveCardSetting(editSettingsKey, 'decimals', parseInt(e.target.value, 10))
                    }
                    className="flex-1"
                  />
                  <div className="popup-surface min-w-[48px] rounded-xl px-3 py-2 text-center text-sm font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                    {editSettings.decimals ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end border-t border-[var(--glass-border)] pt-5">
          <button
            onClick={onClose}
            className="popup-surface popup-surface-hover rounded-2xl px-6 py-2.5 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
