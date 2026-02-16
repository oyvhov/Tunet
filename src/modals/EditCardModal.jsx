import React from 'react';
import { X, Check, Plus, RefreshCw } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';
import { getEntitiesForArea } from '../services/haClient';

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
  isEditSensor,
  isEditCalendar,
  isEditTodo,
  isEditCost,
  isEditNordpool,
  isEditCar,
  isEditRoom,
  isEditAndroidTV,
  editSettingsKey,
  editSettings,
  isEditWeatherTemp,
  conn,
  customNames,
  saveCustomName,
  customIcons,
  saveCustomIcon,
  saveCardSetting,
}) {
  const [mediaSearch, setMediaSearch] = React.useState('');

  if (!isOpen) return null;

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

          {isEditWeatherTemp && editSettingsKey && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('weatherTemp.subtitle') || 'Subtitle'}</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
                  defaultValue={editSettings.subtitle || ''}
                  onBlur={(e) => saveCardSetting(editSettingsKey, 'subtitle', e.target.value.trim() || null)}
                  placeholder={t('weatherTemp.subtitlePlaceholder') || 'e.g. Oslo, Home'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-1 block">{t('weatherTemp.effects')}</label>
                <div className="popup-surface rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{t('weatherTemp.showEffects')}</span>
                  <button
                    onClick={() => saveCardSetting(editSettingsKey, 'showEffects', editSettings.showEffects === false ? true : false)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showEffects !== false ? 'bg-blue-500' : 'bg-gray-600'}`}
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
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${personDisplay === 'photo' ? 'bg-blue-500 text-white border-blue-500' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                  >
                    {t('person.display.photo')}
                  </button>
                  <button
                    onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'personDisplay', 'icon')}
                    className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${personDisplay === 'icon' ? 'bg-blue-500 text-white border-blue-500' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                  >
                    {t('person.display.icon')}
                  </button>
                </div>
              </div>

               {/* Mobile App / Battery Sensor */}
               <div>
                 <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-2 block">{t('person.mobileAppBattery') || 'Mobile App Battery'}</label>
                 <div className="popup-surface rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
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
                 <div className="popup-surface rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
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
               <div className="flex items-center justify-between p-4 popup-surface rounded-2xl">
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

          {isEditAndroidTV && editSettingsKey && (
            <div className="space-y-3">
              <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('androidtv.linkedSpeakers') || 'Linked Speakers'}</label>
              
              {/* Selected Players */}
              {Array.isArray(editSettings.linkedMediaPlayers) && editSettings.linkedMediaPlayers.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-2">
                    {editSettings.linkedMediaPlayers.map(id => (
                       <div key={id} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400">
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
                className="w-full px-3 py-2 rounded-xl popup-surface text-sm focus:border-blue-500/50 outline-none mb-2 text-[var(--text-primary)]"
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

          {isEditCar && editSettingsKey && (
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('car.imageUrl') || 'Car Image URL'}</label>
              <input
                type="text"
                className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
                defaultValue={editSettings.imageUrl || ''}
                onBlur={(e) => saveCardSetting(editSettingsKey, 'imageUrl', e.target.value.trim() || null)}
                placeholder="/local/car.png"
              />
              <p className="text-[10px] text-gray-500 ml-1">{t('car.imageHint') || 'Place images in HA config/www/ folder, use /local/filename.png'}</p>
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
                    className="w-full py-3.5 px-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
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
                        className="w-full px-4 py-3 rounded-xl popup-surface text-sm outline-none focus:border-blue-500/50 transition-colors"
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
                        className="flex-1 py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold uppercase tracking-widest text-xs transition-colors"
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
          })()}

          {canEditStatus && !isEditSensor && (
            <div className="p-4 popup-surface rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showStatus')}</span>
                <button 
                  onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showStatus', !(editSettings.showStatus !== false))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showStatus !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showLastChanged')}</span>
                <button 
                  onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showLastChanged', !(editSettings.showLastChanged !== false))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showLastChanged !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
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
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showName !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showName !== false ? 'left-7' : 'left-1'}`} />
                      </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showStatus') || 'Show Status'}</span>
                      <button 
                        onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showStatus', !(editSettings.showStatus !== false))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showStatus !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showStatus !== false ? 'left-7' : 'left-1'}`} />
                      </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.showLastChanged') || 'Show Last Changed'}</span>
                    <button 
                      onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'showLastChanged', !(editSettings.showLastChanged !== false))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showLastChanged !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
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
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showControls ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
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
                        className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showGraph !== false ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.showGraph !== false ? 'left-7' : 'left-1'}`} />
                    </button>
                    </div>
                  )}
              </div>
             );
          })()}

          {isEditRoom && editSettingsKey && (() => {
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
                {/* Refresh entities from HA */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    {roomEntityIds.length} {t('room.entityCount')}
                  </span>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || !conn}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    {t('room.refreshEntities')}
                  </button>
                </div>

                {/* Badge toggles */}
                <div className="popup-surface rounded-2xl p-4 space-y-4">
                  {toggleOptions.map(opt => {
                    const value = editSettings[opt.key] !== undefined ? editSettings[opt.key] : opt.defaultVal;
                    return (
                      <div key={opt.key} className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{opt.label}</span>
                        <button
                          onClick={() => saveCardSetting(editSettingsKey, opt.key, !value)}
                          className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Specific sensor overrides */}
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
                            className={`w-full text-left px-3 py-2 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest ${!editSettings[opt.key] ? 'text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                          >
                            Auto
                          </button>
                          {matching.map(id => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => saveCardSetting(editSettingsKey, opt.key, id)}
                              className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${editSettings[opt.key] === id ? 'text-blue-400' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
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
          })()}

          {isEditNordpool && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('cost.currency') || 'Currency'}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
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
                    className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.showWithSupport ? 'bg-blue-500' : 'bg-gray-600'}`}
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
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
                    defaultValue={editSettings.todayLabel || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'todayLabel', e.target.value.trim() || null)}
                    placeholder={t('energyCost.today')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('energyCost.monthLabel') || 'Month label'}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
                    defaultValue={editSettings.monthLabel || ''}
                    onBlur={(e) => saveCardSetting(editSettingsKey, 'monthLabel', e.target.value.trim() || null)}
                    placeholder={t('energyCost.thisMonth')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('cost.currency') || 'Currency'}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
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
