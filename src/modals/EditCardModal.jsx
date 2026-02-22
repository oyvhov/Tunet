import React from 'react';
import { X, Check, Plus, RefreshCw } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';
import ConditionBuilder from '../components/ui/ConditionBuilder';
import { getEntitiesForArea } from '../services/haClient';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { convertValueByKind, getDisplayUnitForKind, getEffectiveUnitMode } from '../utils';

function GraphLimitsSlider({ values, onChange, min = -15, max = 35 }) {
  const trackRef = React.useRef(null);
  const safeValues = Array.isArray(values) ? values : [0, 10, 20, 28];
  const normalized = [...safeValues].slice(0, 4).map((value, index) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : [0, 10, 20, 28][index];
  }).sort((a, b) => a - b);

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
          className="absolute left-2 right-2 top-7 h-3 rounded-full overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg)] cursor-pointer"
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
                className="absolute top-0 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide text-[var(--text-primary)] border"
                style={{
                  left,
                  backgroundColor: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)'
                }}
              >
                {value.toFixed(1)}°
              </div>

              <button
                type="button"
                aria-label={`Graph color limit ${index + 1}`}
                onPointerDown={(event) => startDrag(index, event)}
                className="absolute top-[1.25rem] -translate-x-1/2 w-[1.15rem] h-[1.15rem] rounded-full border-2 transition-transform active:scale-110"
                style={{
                  left,
                  backgroundColor: 'white',
                  borderColor: 'rgba(255,255,255,0.75)',
                  boxShadow: `0 0 0 4px ${thumbColors[index]}33, 0 4px 12px rgba(0,0,0,0.35)`,
                  zIndex: 30 + index,
                  touchAction: 'none'
                }}
              />
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-[var(--text-secondary)] opacity-70 px-1">
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
  const display = value ? getLabel(value) : (placeholder || t('dropdown.noneSelected'));

  return (
    <div ref={dropdownRef}>
      <label className="text-xs uppercase font-bold text-gray-500 ml-4">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full mt-2 px-5 py-3 rounded-2xl popup-surface popup-surface-hover flex items-center justify-between"
      >
        <span className="text-xs font-bold uppercase tracking-widest truncate text-[var(--text-secondary)]">
          {display}
        </span>
      </button>
      {open && (
        <div className="mt-2 rounded-2xl overflow-hidden border" style={{backgroundColor: 'var(--modal-bg)', borderColor: 'var(--glass-border)'}}>
          <div className="p-3 border-b" style={{borderColor: 'var(--glass-border)'}}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('form.search') || 'Search'}
              className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="mt-2 w-full px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {t('dropdown.noneSelected')}
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)]">{t('form.noResults') || 'No results'}</div>
            )}
            {filtered.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => { onChange(id); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${value === id ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                {getLabel(id)}
                <span className="block text-[10px] font-normal text-[var(--text-muted)] normal-case tracking-normal truncate">{id}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
    { key: 'updateButtonId', label: t('car.select.updateButton'), options: updateButtonOptions }
  ];

  const mappedSensors = sensorTypes.filter(st => editSettings[st.key]);
  const availableTypes = sensorTypes.filter(st => !editSettings[st.key]);

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
      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
        {t('car.mappingTitle')}: {t('car.mappingHint')}
      </div>

      {mappedSensors.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          {t('car.noSensorsMapped')}
        </div>
      )}

      {mappedSensors.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          {mappedSensors.map(st => {
            const entityId = editSettings[st.key];
            const entityName = entities[entityId]?.attributes?.friendly_name || entityId;
            return (
              <div key={st.key} className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 popup-surface rounded-xl">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-gray-500 tracking-wide">{st.label}:</span>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{entityName}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono truncate block mt-0.5">{entityId}</span>
                </div>
                <button
                  onClick={() => handleRemoveSensor(st.key)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 transition-colors flex-shrink-0"
                  title={t('tooltip.removeCard')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!showAddSensor && availableTypes.length > 0 && (
        <button
          onClick={() => setShowAddSensor(true)}
          className="w-full py-3.5 px-4 rounded-2xl popup-surface popup-surface-hover border border-[var(--glass-border)] text-[var(--text-primary)] font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('car.addSensor')}
        </button>
      )}

      {showAddSensor && (
        <div className="space-y-4 px-4 sm:px-5 py-4 popup-surface rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('car.addSensor')}</span>
            <button
              onClick={() => {
                setShowAddSensor(false);
                setSensorType('');
                setSensorEntity('');
              }}
              className="p-1.5 rounded-lg hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2 block">{t('car.sensorType') || 'Sensortype'}</label>
            <select
              value={sensorType}
              onChange={(e) => {
                setSensorType(e.target.value);
                setSensorEntity('');
              }}
              className="w-full px-4 py-3 rounded-xl popup-surface text-sm outline-none focus:border-[var(--glass-border)] transition-colors"
              style={{color: 'var(--text-primary)'}}
            >
              <option value="" style={{backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)'}}>{t('car.selectSensorType') || 'Vel sensortype...'}</option>
              {availableTypes.map(st => (
                <option key={st.key} value={st.key} style={{backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)'}}>{st.label}</option>
              ))}
            </select>
          </div>

          {sensorType && (() => {
            const selectedType = sensorTypes.find(st => st.key === sensorType);
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
              className="flex-1 py-3 px-4 rounded-xl popup-surface popup-surface-hover border border-[var(--glass-border)] disabled:bg-gray-700 disabled:text-gray-500 text-[var(--text-primary)] font-bold uppercase tracking-widest text-xs transition-colors"
            >
              {t('car.add')}
            </button>
            <button
              onClick={() => {
                setShowAddSensor(false);
                setSensorType('');
                setSensorEntity('');
              }}
              className="px-4 py-3 rounded-xl popup-surface popup-surface-hover text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {availableTypes.length === 0 && !showAddSensor && (
        <div className="text-center py-4 text-gray-500 text-xs">
          {t('car.allSensorsMapped')}
        </div>
      )}
    </div>
  );
}

function RoomSettingsSection({ conn, editSettings, editSettingsKey, saveCardSetting, entities, t }) {
  const [refreshing, setRefreshing] = React.useState(false);

  const roomEntityIds = Array.isArray(editSettings.entityIds) ? editSettings.entityIds : [];

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

  const toggleOptions = [
    { key: 'showLights', label: t('room.showLights'), defaultVal: true },
    { key: 'showTemp', label: t('room.showTemp'), defaultVal: true },
    { key: 'showMotion', label: t('room.showMotion'), defaultVal: true },
    { key: 'showHumidity', label: t('room.showHumidity'), defaultVal: false },
    { key: 'showClimate', label: t('room.showClimate'), defaultVal: false },
  ];

  const sensorOptions = [
    { key: 'tempEntityId', label: t('room.tempSensor'), filter: (id) => {
      const e = entities[id];
      return e && (e.attributes?.device_class === 'temperature' || id.includes('temperature') || id.includes('temp'));
    }},
    { key: 'motionEntityId', label: t('room.motionSensor'), filter: (id) => {
      const e = entities[id];
      return e && (e.attributes?.device_class === 'motion' || e.attributes?.device_class === 'occupancy');
    }},
    { key: 'humidityEntityId', label: t('room.humiditySensor'), filter: (id) => {
      const e = entities[id];
      return e && e.attributes?.device_class === 'humidity';
    }},
    { key: 'climateEntityId', label: t('room.climateSensor'), filter: (id) => id.startsWith('climate.') },
    { key: 'mainLightEntityId', label: t('room.mainLight'), filter: (id) => id.startsWith('light.') },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          {roomEntityIds.length} {t('room.entityCount')}
        </span>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !conn}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl popup-surface popup-surface-hover border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {t('room.refreshEntities')}
        </button>
      </div>

      <div className="popup-surface rounded-2xl p-4 space-y-4">
        {toggleOptions.map(opt => {
          const value = editSettings[opt.key] !== undefined ? editSettings[opt.key] : opt.defaultVal;
          return (
            <div key={opt.key} className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{opt.label}</span>
              <button
                onClick={() => saveCardSetting(editSettingsKey, opt.key, !value)}
                className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
          {t('room.tempSensor')} / {t('room.motionSensor')}
        </span>
        {sensorOptions.map(opt => {
          const matching = roomEntityIds.filter(opt.filter);
          if (matching.length === 0) return null;
          return (
            <div key={opt.key}>
              <label className="text-[10px] uppercase font-bold text-gray-500 ml-4 block mb-1">{opt.label}</label>
              <div className="popup-surface rounded-2xl p-3 max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                <button
                  type="button"
                  onClick={() => saveCardSetting(editSettingsKey, opt.key, null)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest ${!editSettings[opt.key] ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                >
                  Auto
                </button>
                {matching.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, opt.key, id)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${editSettings[opt.key] === id ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div className="text-xs font-bold truncate">{entities[id]?.attributes?.friendly_name || id}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">{id}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
  customNames,
  saveCustomName,
  customIcons,
  saveCustomIcon,
  saveCardSetting,
}) {
  const [mediaSearch, setMediaSearch] = React.useState('');
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  if (!isOpen) return null;

  const maxColSpan = gridColumns || 4;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const tempDisplayUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const graphLimitRange = effectiveUnitMode === 'imperial'
    ? { min: 5, max: 95 }
    : { min: -15, max: 35 };
  const isPerson = entityId?.startsWith('person.');
  const personDisplay = editSettings?.personDisplay || 'photo';

  const entityEntries = Object.entries(entities || {});
  const byDomain = (domain) => entityEntries.filter(([id]) => id.startsWith(`${domain}.`)).map(([id]) => id);
  const sortByName = (ids) => ids.sort((a, b) => (entities[a]?.attributes?.friendly_name || a).localeCompare(entities[b]?.attributes?.friendly_name || b));
  const batteryOptions = sortByName(entityEntries
    .filter(([id, entity]) => {
      if (!id.startsWith('sensor.') && !id.startsWith('input_number.')) return false;
      const deviceClass = entity?.attributes?.device_class;
      const unit = entity?.attributes?.unit_of_measurement;
      const lowerId = id.toLowerCase();
      return deviceClass === 'battery' || unit === '%' || lowerId.includes('battery') || lowerId.includes('soc');
    })
    .map(([id]) => id));

  const rangeOptions = sortByName(entityEntries
    .filter(([id, entity]) => {
      if (!id.startsWith('sensor.') && !id.startsWith('input_number.')) return false;
      const deviceClass = entity?.attributes?.device_class;
      const unit = entity?.attributes?.unit_of_measurement;
      const lowerId = id.toLowerCase();
      return deviceClass === 'distance' || unit === 'km' || unit === 'mi' || lowerId.includes('range');
    })
    .map(([id]) => id));

  const locationOptions = sortByName(byDomain('device_tracker'));

  const chargingOptions = sortByName(entityEntries
    .filter(([id, entity]) => {
      const lowerId = id.toLowerCase();
      const deviceClass = entity?.attributes?.device_class;
      return lowerId.includes('charging') || deviceClass === 'battery_charging';
    })
    .map(([id]) => id));

  const pluggedOptions = sortByName(entityEntries
    .filter(([id, entity]) => {
      const lowerId = id.toLowerCase();
      const deviceClass = entity?.attributes?.device_class;
      return lowerId.includes('plug') || lowerId.includes('plugged') || deviceClass === 'plug';
    })
    .map(([id]) => id));

  const climateOptions = sortByName(byDomain('climate'));
  const calendarOptions = sortByName(byDomain('calendar'));
  const todoOptions = sortByName(byDomain('todo'));
  const mediaPlayerOptions = sortByName(byDomain('media_player'));

  const lastUpdatedOptions = sortByName(entityEntries
    .filter(([id]) => id.startsWith('sensor.') && id.toLowerCase().includes('update'))
    .map(([id]) => id));

  const updateButtonOptions = sortByName(byDomain('button'));
  const visibilityCondition = editSettings?.visibilityCondition || null;
  const personBatteryOptions = batteryOptions; // Show all batteries always
  
  const allPersonCandidateSensors = sortByName(entityEntries
    .filter(([id]) => id.startsWith('sensor.') || id.startsWith('binary_sensor.') || id.startsWith('input_boolean.'))
    .map(([id]) => id));
  
  // Show all sensors always, filtering happens inside searchable select by user typing
  const personExtraSensorOptions = allPersonCandidateSensors;
  
  const personExtraSensors = Array.isArray(editSettings?.personExtraSensors)
    ? editSettings.personExtraSensors.filter((id) => typeof id === 'string')
    : [];
  const availablePersonExtraSensorOptions = personExtraSensorOptions.filter((id) => !personExtraSensors.includes(id));
  const personTrackerOptions = (() => {
    const trackers = sortByName(byDomain('device_tracker'));
    // Always show all trackers too, to be safe
    return trackers;
  })();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4" style={{
      backdropFilter: 'blur(20px)', 
      backgroundColor: 'rgba(0,0,0,0.3)'
    }} onClick={onClose}>
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
      <div className="border w-full max-w-lg rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl relative font-sans backdrop-blur-xl popup-anim flex flex-col max-h-[92vh] sm:max-h-[85vh] mt-3 sm:mt-0" style={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
        borderColor: 'var(--glass-border)', 
        color: 'var(--text-primary)'
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 md:top-7 md:right-7 modal-close z-10"><X className="w-4 h-4" /></button>
        <h3 className="text-2xl font-light mb-4 text-[var(--text-primary)] text-center uppercase tracking-widest italic shrink-0">{t('modal.editCard.title')}</h3>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {(canEditName || editSettingsKey) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {canEditName && (
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('form.name')}</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors" 
                    defaultValue={customNames[entityId] || (entities[entityId]?.attributes?.friendly_name || '')}
                    onBlur={(e) => saveCustomName(entityId, e.target.value)}
                    placeholder={t('form.defaultName')}
                  />
                </div>
              )}

              {editSettingsKey && (
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('form.heading')}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                    defaultValue={editSettings.heading || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'heading', e.target.value.trim() || null)}
                    placeholder={t('form.headingPlaceholder')}
                  />
                </div>
              )}
            </div>
          )}



          {canEditIcon && (
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('form.chooseIcon')}</label>
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
              <ConditionBuilder
                cardId={entityId}
                cardSettings={editSettings}
                condition={visibilityCondition}
                entities={entities}
                onChange={(nextCondition) => saveCardSetting(editSettingsKey, 'visibilityCondition', nextCondition)}
                t={t}
              />
            </div>
          )}

          {isEditWeatherTemp && editSettingsKey && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('weatherTemp.subtitle') || 'Subtitle'}</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                  defaultValue={editSettings.subtitle || ''}
                  onBlur={(e) => saveCardSetting(editSettingsKey, 'subtitle', e.target.value.trim() || null)}
                  placeholder={t('weatherTemp.subtitlePlaceholder') || 'e.g. Oslo, Home'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('weatherTemp.graphHistory') || 'Graph history'}</label>
                <div className="popup-surface rounded-2xl p-3 flex items-center gap-2 flex-wrap">
                  {[6, 12, 24, 48].map((hours) => {
                    const active = (editSettings.graphHistoryHours || 12) === hours;
                    return (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => saveCardSetting(editSettingsKey, 'graphHistoryHours', hours)}
                        className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${active ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                      >
                        {hours}h
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('weatherTemp.graphLimits') || 'Graph color limits'} ({tempDisplayUnit})</label>
                <GraphLimitsSlider
                  values={[
                    Number.isFinite(editSettings.graphLimit1) ? editSettings.graphLimit1 : 0,
                    Number.isFinite(editSettings.graphLimit2) ? editSettings.graphLimit2 : 10,
                    Number.isFinite(editSettings.graphLimit3) ? editSettings.graphLimit3 : 20,
                    Number.isFinite(editSettings.graphLimit4) ? editSettings.graphLimit4 : 28,
                  ].map((limit) => convertValueByKind(limit, {
                    kind: 'temperature',
                    fromUnit: '°C',
                    unitMode: effectiveUnitMode,
                  }))}
                  min={graphLimitRange.min}
                  max={graphLimitRange.max}
                  onChange={(next) => {
                    const canonicalLimits = next.map((limit) => convertValueByKind(limit, {
                      kind: 'temperature',
                      fromUnit: tempDisplayUnit,
                      unitMode: 'metric',
                    }));
                    saveCardSetting(editSettingsKey, 'graphLimit1', canonicalLimits[0]);
                    saveCardSetting(editSettingsKey, 'graphLimit2', canonicalLimits[1]);
                    saveCardSetting(editSettingsKey, 'graphLimit3', canonicalLimits[2]);
                    saveCardSetting(editSettingsKey, 'graphLimit4', canonicalLimits[3]);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-1 block">{t('weatherTemp.effects')}</label>
                <div className="popup-surface rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{t('weatherTemp.showEffects')}</span>
                  <button
                    onClick={() => saveCardSetting(editSettingsKey, 'showEffects', editSettings.showEffects === false ? true : false)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showEffects !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${editSettings.showEffects !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isEditCalendar && editSettingsKey && (
            <div className="space-y-3">
              <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('calendar.selectCalendars') || 'Select Calendars'}</label>
              <div className="popup-surface rounded-2xl p-4 max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                {calendarOptions.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">{t('calendar.noCalendarsFound') || 'No calendars found'}</p>
                )}
                {calendarOptions.map((id) => {
                  const selected = Array.isArray(editSettings.calendars) && editSettings.calendars.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(editSettings.calendars) ? editSettings.calendars : [];
                        const next = selected ? current.filter((x) => x !== id) : [...current, id];
                        saveCardSetting(editSettingsKey, 'calendars', next);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors border ${selected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)] text-[var(--text-primary)]' : 'border-transparent hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
                    >
                      <div className="text-sm font-bold truncate">{entities[id]?.attributes?.friendly_name || id}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{id}</div>
                    </button>
                  );
                })}
              </div>

              {/* Week View toggle */}
              <div className="popup-surface rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-[var(--text-primary)]">{t('calendar.largeCalendar') || 'Week View'}</label>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('calendar.largeCalendarHint') || 'Show Outlook-style week time-grid view'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'largeCalendar', !editSettings.largeCalendar)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.largeCalendar ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${editSettings.largeCalendar ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('editCard.columnWidth') || 'Column Width'}</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'colSpan', Math.max(1, (editSettings.colSpan || 1) - 1))}
                    className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold text-[var(--text-primary)]">{editSettings.colSpan || 1}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-1">{(editSettings.colSpan || 1) === 1 ? t('editCard.column') || 'column' : t('editCard.columns') || 'columns'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'colSpan', Math.min(maxColSpan, (editSettings.colSpan || 1) + 1))}
                    className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                  >+</button>
                </div>
              </div>
            </div>
          )}

          {isEditSpacer && editSettingsKey && (
            <div className="space-y-4">
              {(() => {
                const currentColSpan = typeof editSettings.colSpan === 'number' ? editSettings.colSpan : 1;
                const isFullWidth = editSettings.colSpan === 'full';
                const currentHeadingAlign = ['left', 'center', 'right'].includes(editSettings.headingAlign)
                  ? editSettings.headingAlign
                  : 'center';

                return (
                  <>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('spacer.variant') || 'Variant'}</label>
                <div className="flex gap-2">
                  {[
                    { key: 'spacer', label: t('spacer.spacer') || 'Spacer' },
                    { key: 'divider', label: t('spacer.divider') || 'Divider' },
                  ].map(v => (
                    <button
                      key={v.key}
                      onClick={() => {
                        saveCardSetting(editSettingsKey, 'variant', v.key);
                        if (v.key === 'divider') {
                          saveCardSetting(editSettingsKey, 'colSpan', 'full');
                          saveCardSetting(editSettingsKey, 'heightPx', 40);
                        }
                      }}
                      className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${(editSettings.variant || 'spacer') === v.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                      style={(editSettings.variant || 'spacer') === v.key ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{'Heading alignment'}</label>
                <div className="flex gap-2">
                  {[
                    { key: 'left', label: 'Venstre' },
                    { key: 'center', label: 'Midt' },
                    { key: 'right', label: 'Høgre' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => saveCardSetting(editSettingsKey, 'headingAlign', opt.key)}
                      className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${currentHeadingAlign === opt.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                      style={currentHeadingAlign === opt.key ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{'Column Width'}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'colSpan', 'full')}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${isFullWidth ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                    style={isFullWidth ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                  >
                    {'Full Width'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'colSpan', currentColSpan)}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${!isFullWidth ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                    style={!isFullWidth ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                  >
                    {'Custom'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'colSpan', Math.max(1, currentColSpan - 1))}
                    disabled={isFullWidth}
                    className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                  >&minus;</button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold text-[var(--text-primary)]">{isFullWidth ? '∞' : currentColSpan}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-1">{isFullWidth ? 'full width' : (currentColSpan === 1 ? 'column' : 'columns')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'colSpan', Math.min(4, currentColSpan + 1))}
                    disabled={isFullWidth}
                    className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                  >+</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{'Height'}</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'heightPx', Math.max(24, (editSettings.heightPx || 100) - 20))}
                    className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                  >&minus;</button>
                  <div className="flex-1 text-center">
                    <span className="text-lg font-bold text-[var(--text-primary)]">{editSettings.heightPx || 100}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-1">px</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'heightPx', Math.min(420, (editSettings.heightPx || 100) + 20))}
                    className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                  >+</button>
                </div>
              </div>

                  </>
                );
              })()}
            </div>
          )}

          {isEditCamera && editSettingsKey && (() => {
            const streamEngine = String(editSettings.cameraStreamEngine || 'auto').toLowerCase();
            const webrtcTemplate = editSettings.cameraWebrtcUrl || '';
            const recommendedWebrtc = '/api/webrtc?src={entity_object_id}';
            const refreshMode = editSettings.cameraRefreshMode || 'interval';
            const refreshInterval = editSettings.cameraRefreshInterval || 10;
            const motionSensorId = editSettings.cameraMotionSensor || '';
            const binarySensorOptions = sortByName(entityEntries
              .filter(([id, e]) => id.startsWith('binary_sensor.') && (
                e?.attributes?.device_class === 'motion' ||
                e?.attributes?.device_class === 'occupancy' ||
                id.toLowerCase().includes('motion')
              ))
              .map(([id]) => id));

            return (
              <div className="space-y-4">
                {/* Stream engine */}
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('camera.streamEngine') || 'Stream Engine'}</label>
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
                        onClick={() => saveCardSetting(editSettingsKey, 'cameraStreamEngine', opt.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${streamEngine === opt.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                        style={streamEngine === opt.key ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional WebRTC URL */}
                {(streamEngine === 'webrtc' || streamEngine === 'auto') && (
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('camera.webrtcUrlOptional') || 'WebRTC URL (optional)'}</label>
                    <input
                      type="text"
                      value={webrtcTemplate}
                      onChange={(e) => saveCardSetting(editSettingsKey, 'cameraWebrtcUrl', e.target.value)}
                      placeholder={recommendedWebrtc}
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                      style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => saveCardSetting(editSettingsKey, 'cameraWebrtcUrl', recommendedWebrtc)}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest popup-surface popup-surface-hover text-[var(--text-secondary)] border border-[var(--glass-border)]"
                      >
                        {t('camera.useRecommended') || 'Use Recommended'}
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] px-1">
                      {t('camera.webrtcHint') || 'Use {entity_object_id} or {entity_id}. Leave empty to skip WebRTC.'}
                    </p>
                  </div>
                )}

                {/* Refresh mode */}
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('camera.refreshMode') || 'Refresh Mode'}</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'interval', label: t('camera.refreshInterval') || 'Timer' },
                      { key: 'motion', label: t('camera.refreshMotion') || 'Motion' },
                    ].map(v => (
                      <button
                        key={v.key}
                        onClick={() => saveCardSetting(editSettingsKey, 'cameraRefreshMode', v.key)}
                        className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${refreshMode === v.key ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                        style={refreshMode === v.key ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interval seconds */}
                {refreshMode === 'interval' && (
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('camera.intervalSeconds') || 'Refresh every (seconds)'}</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => saveCardSetting(editSettingsKey, 'cameraRefreshInterval', Math.max(2, refreshInterval - 1))}
                        className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                      >−</button>
                      <div className="flex-1 text-center">
                        <span className="text-lg font-bold text-[var(--text-primary)]">{refreshInterval}</span>
                        <span className="text-xs text-[var(--text-muted)] ml-1">s</span>
                      </div>
                      <button type="button" onClick={() => saveCardSetting(editSettingsKey, 'cameraRefreshInterval', Math.min(60, refreshInterval + 1))}
                        className="w-10 h-10 rounded-xl popup-surface popup-surface-hover text-[var(--text-primary)] font-bold text-lg flex items-center justify-center border border-[var(--glass-border)]"
                      >+</button>
                    </div>
                  </div>
                )}

                {/* Motion sensor entity */}
                {refreshMode === 'motion' && (
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('camera.motionSensor') || 'Motion Sensor'}</label>
                    <div className="popup-surface rounded-2xl p-4 max-h-44 overflow-y-auto custom-scrollbar space-y-2">
                      {binarySensorOptions.length === 0 && (
                        <p className="text-xs text-[var(--text-muted)] text-center py-4">{t('camera.noMotionSensors') || 'No motion sensors found'}</p>
                      )}
                      {binarySensorOptions.map((id) => {
                        const selected = motionSensorId === id;
                        return (
                          <button key={id} type="button"
                            onClick={() => saveCardSetting(editSettingsKey, 'cameraMotionSensor', selected ? null : id)}
                            className={`w-full text-left px-3 py-2 rounded-xl transition-colors border ${selected ? 'text-[var(--text-primary)]' : 'border-transparent hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
                            style={selected ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                          >
                            <div className="text-sm font-bold truncate">{entities[id]?.attributes?.friendly_name || id}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">{id}</div>
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
              <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('todo.selectList') || 'Select Todo List'}</label>
              <div className="popup-surface rounded-2xl p-4 max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                {todoOptions.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">{t('todo.noListsFound') || 'No todo lists found'}</p>
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
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors border ${selected ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-transparent hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
                    >
                      <div className="text-sm font-bold truncate">{entities[id]?.attributes?.friendly_name || id}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{id}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isPerson && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('person.display')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'personDisplay', 'photo')}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${personDisplay === 'photo' ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                    style={personDisplay === 'photo' ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                  >
                    {t('person.display.photo')}
                  </button>
                  <button
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'personDisplay', 'icon')}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${personDisplay === 'icon' ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                    style={personDisplay === 'icon' ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' } : undefined}
                  >
                    {t('person.display.icon')}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 popup-surface rounded-2xl">
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showName') || 'Show Name'}</span>
                  <button
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showName', !(editSettings.showName !== false))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showName !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showName !== false ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 popup-surface rounded-2xl">
                  <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('person.showState') || 'Show State'}</span>
                  <button
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showState', !(editSettings.showState !== false))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showState !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showState !== false ? 'left-7' : 'left-1'}`} />
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
                    saveCardSetting(editSettingsKey, 'personExtraSensors', [...personExtraSensors, id]);
                  }}
                  placeholder={t('form.search') || 'Search'}
                  entities={entities}
                  t={t}
                />
                {personExtraSensors.length > 0 && (
                  <div className="popup-surface rounded-2xl p-3 flex flex-wrap gap-2">
                    {personExtraSensors.map((sensorId) => (
                      <div key={sensorId} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
                        <span className="text-[11px] font-bold truncate max-w-[180px]">{entities[sensorId]?.attributes?.friendly_name || sensorId}</span>
                        <button
                          onClick={() => saveCardSetting(editSettingsKey, 'personExtraSensors', personExtraSensors.filter((id) => id !== sensorId))}
                          className="p-1 rounded-full hover:bg-[var(--glass-bg-hover)] transition-colors"
                        >
                          <X className="w-3 h-3" />
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
              <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('androidtv.linkedSpeakers') || 'Linked Speakers'}</label>
              
              {/* Selected Players */}
              {Array.isArray(editSettings.linkedMediaPlayers) && editSettings.linkedMediaPlayers.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-2">
                    {editSettings.linkedMediaPlayers.map(id => (
                       <div key={id} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full popup-surface border border-[var(--glass-border)] text-[var(--text-primary)]">
                          <span className="text-xs font-bold">{entities[id]?.attributes?.friendly_name || id}</span>
                          <button 
                             onClick={() => {
                                 const current = editSettings.linkedMediaPlayers;
                                 saveCardSetting(editSettingsKey, 'linkedMediaPlayers', current.filter((x) => x !== id));
                             }}
                             className="p-1 hover:bg-white/10 rounded-full transition-colors"
                          >
                             <X className="w-3 h-3" />
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
                className="w-full px-3 py-2 rounded-xl popup-surface text-sm focus:border-[var(--glass-border)] outline-none mb-2 text-[var(--text-primary)]"
              />

              <div className="popup-surface rounded-2xl p-4 max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                {mediaPlayerOptions.filter(id => {
                  if (!mediaSearch) return true;
                  const name = entities[id]?.attributes?.friendly_name || id;
                  return name.toLowerCase().includes(mediaSearch.toLowerCase()) || id.toLowerCase().includes(mediaSearch.toLowerCase());
                }).length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">{t('media.noPlayersFound') || 'No players found'}</p>
                )}
                {mediaPlayerOptions
                  .filter(id => {
                    if (!mediaSearch) return true;
                    const name = entities[id]?.attributes?.friendly_name || id;
                    return name.toLowerCase().includes(mediaSearch.toLowerCase()) || id.toLowerCase().includes(mediaSearch.toLowerCase());
                  })
                  .map((id) => {
                  const selected = Array.isArray(editSettings.linkedMediaPlayers) && editSettings.linkedMediaPlayers.includes(id);
                  if (id === editSettings.mediaPlayerId) return null;
                  
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(editSettings.linkedMediaPlayers) ? editSettings.linkedMediaPlayers : [];
                        const next = selected ? current.filter((x) => x !== id) : [...current, id];
                        saveCardSetting(editSettingsKey, 'linkedMediaPlayers', next);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors border ${selected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)] text-[var(--text-primary)]' : 'border-transparent hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
                    >
                      <div className="text-sm font-bold truncate">{entities[id]?.attributes?.friendly_name || id}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{id}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isEditCar && editSettingsKey && (
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('car.imageUrl') || 'Car Image URL'}</label>
              <input
                type="text"
                className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                defaultValue={editSettings.imageUrl || ''}
                onBlur={(e) => saveCardSetting(editSettingsKey, 'imageUrl', e.target.value.trim() || null)}
                placeholder="/local/car.png"
              />
              <p className="text-[10px] text-gray-500 ml-1">{t('car.imageHint') || 'Place images in HA config/www/ folder, use /local/filename.png'}</p>
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
            <div className="p-4 popup-surface rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showStatus')}</span>
                <button 
                  onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showStatus', !(editSettings.showStatus !== false))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showStatus !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showLastChanged')}</span>
                <button 
                  onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showLastChanged', !(editSettings.showLastChanged !== false))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showLastChanged !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showLastChanged !== false ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          )}

          {isEditSensor && (() => {
             const entity = entities[entityId];
             const domain = entityId.split('.')[0];
             const canControl = ['input_boolean', 'switch', 'light', 'input_number', 'automation', 'script', 'scene'].includes(domain);
             
             const state = entity?.state;
             const isNumeric = typeof state === 'string' ? /^\s*-?\d+(\.\d+)?\s*$/.test(state) : !isNaN(parseFloat(state));
             const canGraph = isNumeric && domain !== 'input_number';

             return (
              <div className="p-4 popup-surface rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showName') || 'Show Name'}</span>
                      <button 
                        onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showName', !(editSettings.showName !== false))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showName !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showName !== false ? 'left-7' : 'left-1'}`} />
                      </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showStatus') || 'Show Status'}</span>
                      <button 
                        onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showStatus', !(editSettings.showStatus !== false))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showStatus !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`} />
                      </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showLastChanged') || 'Show Last Changed'}</span>
                    <button 
                      onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showLastChanged', !(editSettings.showLastChanged !== false))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showLastChanged !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showLastChanged !== false ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {canControl && (
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showControls')}</span>
                        <span className="text-[10px] text-gray-500">{t('form.controlsHint')}</span>
                        </div>
                        <button 
                        onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showControls', !editSettings.showControls)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showControls ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                        >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showControls ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                  )}

                  {canGraph && (
                    <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showGraph')}</span>
                        <span className="text-[10px] text-gray-500">{t('form.graphHint')}</span>
                    </div>
                    <button 
                        onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showGraph', !(editSettings.showGraph !== false))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showGraph !== false ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showGraph !== false ? 'left-7' : 'left-1'}`} />
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
                  <label className="text-sm font-bold text-[var(--text-primary)]">{t('fan.disableAnimation') || 'Disable Animation'}</label>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('fan.disableAnimationHint') || 'Stop the icon from spinning when the fan is on'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => saveCardSetting(editSettingsKey, 'disable_animation', !editSettings.disable_animation)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.disable_animation ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${editSettings.disable_animation ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          )}

          {isEditMedia && editSettingsKey && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('media.artworkMode') || 'Artwork Mode'}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'artworkMode', 'default')}
                    className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${!editSettings.artworkMode || editSettings.artworkMode === 'default' ? 'popup-surface text-[var(--text-primary)] border-[var(--glass-border)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)] border-transparent'}`}
                    style={!editSettings.artworkMode || editSettings.artworkMode === 'default' ? { backgroundColor: 'var(--glass-bg-hover)' } : undefined}
                  >
                    {t('media.artwork.default') || 'Default'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCardSetting(editSettingsKey, 'artworkMode', 'cover')}
                    className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${editSettings.artworkMode === 'cover' ? 'popup-surface text-[var(--text-primary)] border-[var(--glass-border)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)] border-transparent'}`}
                    style={editSettings.artworkMode === 'cover' ? { backgroundColor: 'var(--glass-bg-hover)' } : undefined}
                  >
                    {t('media.artwork.cover') || 'Cover'}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] ml-1">
                  {editSettings.artworkMode === 'cover' ? (t('media.artwork.coverHint') || 'Full card artwork cover') : (t('media.artwork.defaultHint') || 'Standard icon & background')}
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
              t={t}
            />
          )}

          {isEditNordpool && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('cost.currency') || 'Currency'}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                    defaultValue={editSettings.currency || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'currency', e.target.value.trim() || null)}
                    placeholder={t('cost.currencyPlaceholder') || 'Auto (from HA)'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-1 block">{t('nordpool.withSupport') || 'Electricity Support'}</label>
                <div className="popup-surface rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{t('nordpool.withSupport') || 'Show electricity support'}</span>
                  <button
                    onClick={() => saveCardSetting(editSettingsKey, 'showWithSupport', !editSettings.showWithSupport)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showWithSupport ? 'bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${editSettings.showWithSupport ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('addCard.nordpoolDecimals') || 'Decimals'}</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={editSettings.decimals ?? 2}
                    onChange={(e) => saveCardSetting(editSettingsKey, 'decimals', parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <div className="min-w-[48px] text-center text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] popup-surface px-3 py-2 rounded-xl">
                    {editSettings.decimals ?? 2}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isEditCost && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('energyCost.todayLabel') || 'Today label'}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                    defaultValue={editSettings.todayLabel || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'todayLabel', e.target.value.trim() || null)}
                    placeholder={t('energyCost.today')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('energyCost.monthLabel') || 'Month label'}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                    defaultValue={editSettings.monthLabel || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'monthLabel', e.target.value.trim() || null)}
                    placeholder={t('energyCost.thisMonth')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('cost.currency') || 'Currency'}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                    defaultValue={editSettings.currency || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'currency', e.target.value.trim() || null)}
                    placeholder={t('cost.currencyPlaceholder') || 'Auto (from HA)'}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-2 block">{t('energyCost.today') || 'Today'}</label>
                <div className="popup-surface rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                  {Object.keys(entities).filter(id => id.startsWith('sensor.') || id.startsWith('input_number.')).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">{t('addCard.noSensors') || 'No sensors found'}</p>
                  ) : (
                    Object.keys(entities).filter(id => id.startsWith('sensor.') || id.startsWith('input_number.'))
                      .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                      .map(sensorId => {
                        const isSelected = editSettings.todayId === sensorId;
                        return (
                          <div key={sensorId} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => {
                            saveCardSetting(editSettingsKey, 'todayId', isSelected ? null : sensorId);
                          }}>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]' : 'border-gray-500 bg-transparent'}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" /> }
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[var(--text-primary)]">{entities[sensorId].attributes?.friendly_name || sensorId}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{sensorId}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-2 block">{t('energyCost.thisMonth') || 'This Month'}</label>
                <div className="popup-surface rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                  {Object.keys(entities).filter(id => id.startsWith('sensor.') || id.startsWith('input_number.')).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">{t('addCard.noSensors') || 'No sensors found'}</p>
                  ) : (
                    Object.keys(entities).filter(id => id.startsWith('sensor.') || id.startsWith('input_number.'))
                      .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                      .map(sensorId => {
                        const isSelected = editSettings.monthId === sensorId;
                        return (
                          <div key={sensorId} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => {
                            saveCardSetting(editSettingsKey, 'monthId', isSelected ? null : sensorId);
                          }}>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]' : 'border-gray-500 bg-transparent'}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" /> }
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[var(--text-primary)]">{entities[sensorId].attributes?.friendly_name || sensorId}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{sensorId}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('cost.decimals') || 'Decimals (Today)'}</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={editSettings.decimals ?? 0}
                    onChange={(e) => saveCardSetting(editSettingsKey, 'decimals', parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <div className="min-w-[48px] text-center text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] popup-surface px-3 py-2 rounded-xl">
                    {editSettings.decimals ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-5 mt-5 border-t border-[var(--glass-border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl popup-surface popup-surface-hover text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
