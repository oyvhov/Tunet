import React from 'react';
import { X, Check, Plus } from 'lucide-react';
import M3Slider from '../components/M3Slider';
import IconPicker from '../components/IconPicker';

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
        <span className="text-[10px] text-[var(--text-muted)]">{options.length}</span>
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
                className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all ${value === id ? 'text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
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

export default function EditCardModal({ 
  isOpen, 
  onClose, 
  t, 
  entityId,
  entities,
  canEditName, 
  canEditIcon, 
  canEditStatus, 
  isEditLight, 
  isEditGenericType,
  isEditSensor,
  isEditCalendar,
  isEditCost,
  isEditCar,
  editSettingsKey,
  editSettings,
  customNames,
  saveCustomName,
  customIcons,
  saveCustomIcon,
  saveCardSetting,
  hiddenCards,
  toggleCardVisibility
}) {
  if (!isOpen) return null;

  const isHidden = hiddenCards.includes(entityId);
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

  const lastUpdatedOptions = sortByName(entityEntries
    .filter(([id]) => id.startsWith('sensor.') && id.toLowerCase().includes('update'))
    .map(([id]) => id));

  const updateButtonOptions = sortByName(byDomain('button'));

  return (
    <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-3 sm:p-4" style={{
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
      <div className="border w-full max-w-4xl rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl relative font-sans backdrop-blur-xl popup-anim flex flex-col max-h-[92vh] sm:max-h-[85vh] mt-3 sm:mt-0" style={{
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
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors" 
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
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
                    defaultValue={editSettings.heading || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'heading', e.target.value.trim() || null)}
                    placeholder={t('form.headingPlaceholder')}
                  />
                </div>
              )}
            </div>
          )}



          {canEditIcon && !isEditCar && (
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

          {isEditCalendar && editSettingsKey && (
            <div className="space-y-3">
              <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('calendar.selectCalendars') || 'Select Calendars'}</label>
              <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 max-h-56 overflow-y-auto custom-scrollbar space-y-2">
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
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors border ${selected ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'border-transparent hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'}`}
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
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${personDisplay === 'photo' ? 'bg-blue-500 text-white border-blue-500' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}
                  >
                    {t('person.display.photo')}
                  </button>
                  <button
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'personDisplay', 'icon')}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${personDisplay === 'icon' ? 'bg-blue-500 text-white border-blue-500' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}
                  >
                    {t('person.display.icon')}
                  </button>
                </div>
              </div>

               {/* Mobile App / Battery Sensor */}
               <div>
                 <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-2 block">{t('person.mobileAppBattery') || 'Mobile App Battery'}</label>
                 <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                    {Object.keys(entities).filter(id => id.startsWith('sensor.') && (id.includes('battery_level') || id.includes('battery'))).length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">{t('addCard.noSensors') || 'No sensors found'}</p>
                    ) : (
                        Object.keys(entities).filter(id => id.startsWith('sensor.') && (id.includes('battery_level') || id.includes('battery')))
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(sensorId => {
                          const isSelected = editSettings.batteryEntity === sensorId;
                          return (
                              <div key={sensorId} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => {
                                  saveCardSetting(editSettingsKey, 'batteryEntity', isSelected ? null : sensorId);
                              }}>
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500 bg-transparent'}`}>
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

               {/* Device Tracker */}
               <div>
                 <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-2 block">{t('person.deviceTracker') || 'Device Tracker (Map)'}</label>
                 <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                    {Object.keys(entities).filter(id => id.startsWith('device_tracker.')).length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">{t('addCard.noSensors') || 'No trackers found'}</p>
                    ) : (
                        Object.keys(entities).filter(id => id.startsWith('device_tracker.'))
                          .sort((a, b) => (entities[a].attributes?.friendly_name || a).localeCompare(entities[b].attributes?.friendly_name || b))
                          .map(trackerId => {
                          const isSelected = editSettings.deviceTracker === trackerId;
                          return (
                              <div key={trackerId} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => {
                                  saveCardSetting(editSettingsKey, 'deviceTracker', isSelected ? null : trackerId);
                              }}>
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500 bg-transparent'}`}>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-white" /> } 
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-sm font-medium text-[var(--text-primary)]">{entities[trackerId].attributes?.friendly_name || trackerId}</span>
                                      <span className="text-[10px] text-gray-500 font-mono">{trackerId}</span>
                                  </div>
                              </div>
                          );
                        })
                    )}
                 </div>
               </div>

               {/* Show History Toggle */}
               <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('person.showHistory') || 'Show History on Map'}</span>
                  <button 
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showHistory', !(editSettings.showHistory))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showHistory ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showHistory ? 'left-7' : 'left-1'}`} />
                  </button>
              </div>
            </div>
          )}

          {isEditCar && editSettingsKey && (() => {
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
                    {t('car.noSensorsMapped') || 'Ingen sensorar valde. Trykk "Legg til sensor" for å starte.'}
                  </div>
                )}

                {mappedSensors.length > 0 && (
                  <div className="space-y-2 sm:space-y-3">
                    {mappedSensors.map(st => {
                      const entityId = editSettings[st.key];
                      const entityName = entities[entityId]?.attributes?.friendly_name || entityId;
                      return (
                        <div key={st.key} className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl">
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
                    className="w-full py-3.5 px-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('car.addSensor') || 'Legg til sensor'}
                  </button>
                )}

                {showAddSensor && (
                  <div className="space-y-4 px-4 sm:px-5 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('car.addSensor') || 'Legg til sensor'}</span>
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
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-blue-500/50 transition-colors"
                        style={{backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
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
                          label={t('car.selectEntity') || 'Vel entitet'}
                          value={sensorEntity}
                          options={selectedType.options}
                          onChange={(value) => setSensorEntity(value)}
                          placeholder={t('car.selectEntityPlaceholder') || 'Søk og vel...'}
                          entities={entities}
                          t={t}
                        />
                      );
                    })()}

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddSensor}
                        disabled={!sensorType || !sensorEntity}
                        className="flex-1 py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold uppercase tracking-widest text-xs transition-colors"
                      >
                        {t('car.add') || 'Legg til'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddSensor(false);
                          setSensorType('');
                          setSensorEntity('');
                        }}
                        className="px-4 py-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs transition-colors"
                      >
                        {t('common.cancel') || 'Avbryt'}
                      </button>
                    </div>
                  </div>
                )}

                {availableTypes.length === 0 && !showAddSensor && (
                  <div className="text-center py-4 text-gray-500 text-xs">
                    {t('car.allSensorsMapped') || 'Alle sensortypar er valde'}
                  </div>
                )}
              </div>
            );
          })()}

          {canEditStatus && (
            <>
              <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showStatus')}</span>
                  <button 
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showStatus', !(editSettings.showStatus !== false))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showStatus !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`} />
                  </button>
              </div>

              <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showLastChanged')}</span>
                  <button 
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showLastChanged', !(editSettings.showLastChanged !== false))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showLastChanged !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showLastChanged !== false ? 'left-7' : 'left-1'}`} />
                  </button>
              </div>
            </>
          )}

          {isEditSensor && (
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
              <div className="flex flex-col">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Controls</span>
                <span className="text-[10px] text-gray-500">Enable +/- or Toggle</span>
              </div>
              <button 
                onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showControls', !editSettings.showControls)}
                className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showControls ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showControls ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          )}

          {isEditSensor && (
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
              <div className="flex flex-col">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">Graph</span>
                <span className="text-[10px] text-gray-500">Show history graph</span>
              </div>
              <button 
                onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showGraph', !(editSettings.showGraph !== false))}
                className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showGraph !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showGraph !== false ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          )}

          {isEditCost && (
            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-2 block">{t('energyCost.today') || 'Today'}</label>
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
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
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500 bg-transparent'}`}>
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
                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
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
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500 bg-transparent'}`}>
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
                  <div className="min-w-[48px] text-center text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--glass-bg)] px-3 py-2 rounded-xl border border-[var(--glass-border)]">
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
