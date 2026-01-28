import React from 'react';
import { X, Check } from 'lucide-react';
import M3Slider from './M3Slider';
import IconPicker from './IconPicker';

const EditCardModal = ({ 
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
  editSettingsKey,
  editSettings,
  customNames,
  saveCustomName,
  customIcons,
  saveCustomIcon,
  saveCardSetting,
  hiddenCards,
  toggleCardVisibility
}) => {
  if (!isOpen) return null;

  const isHidden = hiddenCards.includes(entityId);
  const isPerson = entityId?.startsWith('person.');
  const personDisplay = editSettings?.personDisplay || 'photo';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{
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
      <div className="border w-full max-w-lg rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans backdrop-blur-xl popup-anim" style={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
        borderColor: 'var(--glass-border)', 
        color: 'var(--text-primary)'
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 md:top-7 md:right-7 modal-close"><X className="w-4 h-4" /></button>
        <h3 className="text-2xl font-light mb-6 text-[var(--text-primary)] text-center uppercase tracking-widest italic">{t('modal.editCard.title')}</h3>
        
        <div className="space-y-8">
          {canEditName && (
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('form.name')}</label>
              <input 
                type="text" 
                className="w-full px-5 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors" 
                defaultValue={customNames[entityId] || (entities[entityId]?.attributes?.friendly_name || '')}
                onBlur={(e) => saveCustomName(entityId, e.target.value)}
                placeholder={t('form.defaultName')}
              />
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

          {isPerson && (
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
          )}

          {(isEditLight || isEditGenericType) && (
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl">
              <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.smallVersion')}</span>
              <button
                onClick={() => editSettingsKey && saveCardSetting(editSettingsKey, 'size', (editSettings.size === 'small') ? 'large' : 'small')}
                className={`w-12 h-6 rounded-full transition-colors relative ${editSettings.size === 'small' ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editSettings.size === 'small' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          )}

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

          {isEditCalendar && (
            <div className="space-y-4">
               <label className="text-xs uppercase font-bold text-gray-500 ml-4 pb-2 block">{t('calendar.selectCalendars') || 'Select Calendars'}</label>
               <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-4 max-h-56 overflow-y-auto custom-scrollbar space-y-2">
                  {Object.keys(entities).filter(id => id.startsWith('calendar.')).length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">{t('calendar.noCalendarsFound') || 'No calendars found'}</p>
                  ) : (
                      Object.keys(entities).filter(id => id.startsWith('calendar.')).map(calId => {
                        const calendars = editSettings.calendars || [];
                        const isSelected = calendars.includes(calId);
                        return (
                            <div key={calId} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => {
                                const newCalendars = isSelected 
                                    ? calendars.filter(c => c !== calId) 
                                    : [...calendars, calId];
                                saveCardSetting(editSettingsKey, 'calendars', newCalendars);
                            }}>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-500 bg-transparent'}`}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" /> } 
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">{entities[calId].attributes?.friendly_name || calId}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{calId}</span>
                                </div>
                            </div>
                        );
                      })
                  )}
               </div>
            </div>
          )}

          {isEditCost && (
            <div className="space-y-4">
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
      </div>
    </div>
  );
};
export default EditCardModal;
