import {
  Activity,
  ArrowUpDown,
  Bot,
  Calendar,
  Car,
  Check,
  CloudSun,
  Coins,
  Gamepad2,
  Home,
  Lightbulb,
  ListChecks,
  Music,
  MapPin,
  Plus,
  Search,
  Thermometer,
  X,
  Zap
} from '../icons';

import React, { useState, useEffect } from 'react';
import { isToggleEntity } from '../utils';
import { getAreas, getEntitiesForArea } from '../services/haClient';

const TypeButton = ({ type, icon: Icon, label, isActive, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(type)}
    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors duration-150 ease-out font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border focus-visible:outline-none ${isActive ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
  >
    <Icon className="w-4 h-4" /> {label}
  </button>
);

/** Room area picker — extracted outside AddCardContent so state persists across parent re-renders. */
function RoomSection({ conn, searchTerm, selectedArea, setSelectedArea, setAreaEntities, areaEntities, t }) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntities, setLoadingEntities] = useState(false);

  useEffect(() => {
    if (!conn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await getAreas(conn);
        if (!cancelled) {
          setAreas(result.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        }
      } catch (err) {
        console.error('Failed to load areas:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conn]);

  useEffect(() => {
    if (!selectedArea || !conn) {
      setAreaEntities([]);
      return;
    }
    let cancelled = false;
    setLoadingEntities(true);
    (async () => {
      try {
        const result = await getEntitiesForArea(conn, selectedArea.area_id);
        if (!cancelled) setAreaEntities(result);
      } catch (err) {
        console.error('Failed to load area entities:', err);
      } finally {
        if (!cancelled) setLoadingEntities(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedArea, conn, setAreaEntities]);

  const filteredAreas = areas.filter(a => {
    if (!searchTerm) return true;
    return (a.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <p className="text-xs uppercase font-bold text-gray-500 ml-4">{t('addCard.selectArea')}</p>
      {loading && (
        <p className="text-gray-500 text-sm text-center py-4">{t('addCard.loadingAreas')}</p>
      )}
      {!loading && filteredAreas.length === 0 && (
        <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noAreas')}</p>
      )}
      <div className="space-y-3">
        {filteredAreas.map(area => {
          const isSelected = selectedArea?.area_id === area.area_id;
          return (
            <button
              type="button"
              key={area.area_id}
              onClick={() => setSelectedArea(isSelected ? null : area)}
              className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="flex flex-col overflow-hidden mr-4">
                <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                  {area.name || area.area_id}
                </span>
                <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>
                  {area.area_id}
                  {isSelected && !loadingEntities && ` — ${areaEntities.length} ${t('addCard.roomEntitiesFound')}`}
                </span>
              </div>
              <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Content for the "Add Card" modal.
 * Handles entity selection and card type picking for adding new dashboard cards.
 */
export default function AddCardContent({
  onClose,
  addCardTargetPage,
  addCardType,
  setAddCardType,
  searchTerm,
  setSearchTerm,
  entities,
  pagesConfig,
  selectedEntities,
  setSelectedEntities,
  selectedWeatherId,
  setSelectedWeatherId,
  selectedTempId,
  setSelectedTempId,
  selectedAndroidTVMediaId,
  setSelectedAndroidTVMediaId,
  selectedAndroidTVRemoteId,
  setSelectedAndroidTVRemoteId,
  selectedCostTodayId,
  setSelectedCostTodayId,
  selectedCostMonthId,
  setSelectedCostMonthId,
  costSelectionTarget,
  setCostSelectionTarget,
  selectedNordpoolId,
  setSelectedNordpoolId,
  nordpoolDecimals,
  setNordpoolDecimals,
  onAddSelected,
  onAddRoom,
  conn,
  getAddCardAvailableLabel,
  getAddCardNoneLeftLabel,
  t,
}) {
  const [selectedRoomArea, setSelectedRoomArea] = useState(null);
  const [selectedRoomEntities, setSelectedRoomEntities] = useState([]);

  const getLabel = (key, fallback) => {
    const value = t ? t(key) : key;
    return value && value !== key ? value : fallback;
  };

  /** Reusable entity list item button. */
  const EntityItem = ({ id, isSelected, onClick, badgeText }) => (
    <button type="button" key={id} onClick={onClick} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'popup-surface popup-surface-hover border-transparent'}`}>
      <div className="flex flex-col overflow-hidden mr-4">
        <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id]?.attributes?.friendly_name || id}</span>
        <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
      </div>
      {badgeText ? (
        <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400">{badgeText}</span>
      ) : (
        <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
          {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      )}
    </button>
  );

  /** Filter & sort entities by search term. */
  const filterAndSort = (ids) =>
    ids
      .filter(id => {
        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();
        const name = entities[id]?.attributes?.friendly_name || id;
        return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
      })
      .sort((a, b) => (entities[a]?.attributes?.friendly_name || a).localeCompare(entities[b]?.attributes?.friendly_name || b));

  // --- Entity filter logic for the generic entity list ---
  const getFilteredEntityIds = () => {
    return Object.keys(entities).filter(id => {
      if (addCardTargetPage === 'header') return id.startsWith('person.') && !(pagesConfig.header || []).includes(id);
      if (addCardTargetPage === 'settings') {
        return !(pagesConfig.settings || []).includes(id);
      }
      if (addCardType === 'vacuum') return id.startsWith('vacuum.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
      if (addCardType === 'personmap') return id.startsWith('person.');
      if (addCardType === 'cover') return id.startsWith('cover.');
      if (addCardType === 'climate') return id.startsWith('climate.');
      if (addCardType === 'androidtv') return id.startsWith('media_player.') || id.startsWith('remote.');
      if (addCardType === 'cost') return (id.startsWith('sensor.') || id.startsWith('input_number.'));
      if (addCardType === 'media') return id.startsWith('media_player.');
      if (addCardType === 'sensor') {
        return (id.startsWith('sensor.') || id.startsWith('script.') || id.startsWith('scene.') || id.startsWith('input_number.') || id.startsWith('input_boolean.') || id.startsWith('binary_sensor.') || id.startsWith('switch.') || id.startsWith('automation.')) && !(pagesConfig[addCardTargetPage] || []).includes(id);
      }
      if (addCardType === 'toggle') return isToggleEntity(id) && !(pagesConfig[addCardTargetPage] || []).includes(id);
      if (addCardType === 'entity') return !id.startsWith('person.') && !id.startsWith('update.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
      return id.startsWith('light.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
    });
  };

  // --- Render sections ---

  const renderWeatherSection = () => (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.weatherRequired')}</p>
        <div className="space-y-3">
          {filterAndSort(Object.keys(entities).filter(id => id.startsWith('weather.'))).map(id => (
            <EntityItem key={id} id={id} isSelected={selectedWeatherId === id} onClick={() => setSelectedWeatherId(prev => prev === id ? null : id)} />
          ))}
          {Object.keys(entities).filter(id => id.startsWith('weather.')).length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noWeatherSensors')}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.tempSensorOptional')}</p>
        <div className="space-y-3">
          <button type="button" onClick={() => setSelectedTempId(null)} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${!selectedTempId ? 'bg-blue-500/20 border-blue-500/50' : 'popup-surface popup-surface-hover border-transparent'}`}>
            <div className="flex flex-col overflow-hidden mr-4">
              <span className={`text-sm font-bold transition-colors truncate ${!selectedTempId ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{t('addCard.useWeatherTemp')}</span>
              <span className={`text-[11px] font-medium truncate ${!selectedTempId ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>weather.temperature</span>
            </div>
            <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${!selectedTempId ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
              {!selectedTempId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
          </button>
          {filterAndSort(Object.keys(entities).filter(id => {
            if (!id.startsWith('sensor.')) return false;
            const deviceClass = entities[id].attributes?.device_class;
            const lowerId = id.toLowerCase();
            return deviceClass === 'temperature' || lowerId.includes('temperature') || lowerId.includes('temp');
          })).map(id => (
            <EntityItem key={id} id={id} isSelected={selectedTempId === id} onClick={() => setSelectedTempId(prev => prev === id ? null : id)} />
          ))}
          {Object.keys(entities).filter(id => {
            if (!id.startsWith('sensor.')) return false;
            const deviceClass = entities[id].attributes?.device_class;
            const lowerId = id.toLowerCase();
            return deviceClass === 'temperature' || lowerId.includes('temperature') || lowerId.includes('temp');
          }).length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noTempSensors')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAndroidTVSection = () => (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.mediaPlayerRequired')}</p>
        <div className="space-y-3">
          {filterAndSort(Object.keys(entities).filter(id => id.startsWith('media_player.'))).map(id => (
            <EntityItem key={id} id={id} isSelected={selectedAndroidTVMediaId === id} onClick={() => setSelectedAndroidTVMediaId(prev => prev === id ? null : id)} />
          ))}
          {Object.keys(entities).filter(id => id.startsWith('media_player.')).length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noMediaPlayers')}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.remoteOptional')}</p>
        <div className="space-y-3">
          <button type="button" onClick={() => setSelectedAndroidTVRemoteId(null)} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${!selectedAndroidTVRemoteId ? 'bg-blue-500/20 border-blue-500/50' : 'popup-surface popup-surface-hover border-transparent'}`}>
            <div className="flex flex-col overflow-hidden mr-4">
              <span className={`text-sm font-bold transition-colors truncate ${!selectedAndroidTVRemoteId ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{t('addCard.noRemote')}</span>
              <span className={`text-[11px] font-medium truncate ${!selectedAndroidTVRemoteId ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{t('addCard.mediaControlOnly')}</span>
            </div>
            <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${!selectedAndroidTVRemoteId ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
              {!selectedAndroidTVRemoteId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
          </button>
          {filterAndSort(Object.keys(entities).filter(id => id.startsWith('remote.'))).map(id => (
            <EntityItem key={id} id={id} isSelected={selectedAndroidTVRemoteId === id} onClick={() => setSelectedAndroidTVRemoteId(prev => prev === id ? null : id)} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderSimpleAddSection = (Icon, description, buttonLabel) => (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
      <div className="p-4 rounded-full bg-blue-500/10 text-blue-400">
        <Icon className="w-8 h-8" />
      </div>
      <p className="text-gray-400 max-w-xs text-sm">{description}</p>
      <button
        onClick={() => onAddSelected()}
        className="px-6 py-3 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
      >
        {buttonLabel}
      </button>
    </div>
  );

  const renderNordpoolSection = () => (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.nordpoolSensorRequired')}</p>
        <div className="space-y-3">
          {filterAndSort(Object.keys(entities).filter(id => id.startsWith('sensor.') && id.toLowerCase().includes('nordpool'))).map(id => (
            <EntityItem key={id} id={id} isSelected={selectedNordpoolId === id} onClick={() => setSelectedNordpoolId(prev => prev === id ? null : id)} />
          ))}
          {Object.keys(entities).filter(id => id.startsWith('sensor.') && id.toLowerCase().includes('nordpool')).length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noNordpoolSensors')}</p>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">{t('addCard.decimals')}</p>
        <div className="flex gap-2 px-4">
          {[0, 1, 2, 3].map(dec => (
            <button
              key={dec}
              onClick={() => setNordpoolDecimals(dec)}
              className={`px-4 py-2 rounded-lg transition-colors font-bold ${nordpoolDecimals === dec ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
            >
              {dec}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGenericEntityList = () => {
    const filteredIds = getFilteredEntityIds();
    const visibleIds = filterAndSort(filteredIds).slice(0, addCardTargetPage === 'settings' ? 100 : undefined);

    return (
      <div>
        {addCardType === 'cost' && (
          <div className="mb-5">
            <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">{t('addCard.costPickTarget')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCostSelectionTarget('today')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${costSelectionTarget === 'today' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins className="w-4 h-4" /> {t('addCard.costToday')}
              </button>
              <button
                onClick={() => setCostSelectionTarget('month')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${costSelectionTarget === 'month' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins className="w-4 h-4" /> {t('addCard.costMonth')}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              <span className={`px-3 py-1 rounded-full border ${selectedCostTodayId ? 'border-emerald-500/30 text-emerald-400' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}>
                {t('addCard.costToday')}: {selectedCostTodayId ? (entities[selectedCostTodayId]?.attributes?.friendly_name || selectedCostTodayId) : t('common.missing')}
              </span>
              <span className={`px-3 py-1 rounded-full border ${selectedCostMonthId ? 'border-emerald-500/30 text-emerald-400' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}>
                {t('addCard.costMonth')}: {selectedCostMonthId ? (entities[selectedCostMonthId]?.attributes?.friendly_name || selectedCostMonthId) : t('common.missing')}
              </span>
            </div>
          </div>
        )}
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{getAddCardAvailableLabel()}</p>
        <div className="space-y-3">
          {visibleIds.map(id => {
            const isSelected = addCardType === 'cost'
              ? (selectedCostTodayId === id || selectedCostMonthId === id)
              : selectedEntities.includes(id);
            const isSelectedToday = selectedCostTodayId === id;
            const isSelectedMonth = selectedCostMonthId === id;
            return (
              <button type="button" key={id} onClick={() => {
                if (addCardType === 'cost') {
                  if (costSelectionTarget === 'today') {
                    setSelectedCostTodayId(prev => (prev === id ? null : id));
                  } else {
                    setSelectedCostMonthId(prev => (prev === id ? null : id));
                  }
                  return;
                }
                if (selectedEntities.includes(id)) setSelectedEntities(prev => prev.filter(e => e !== id));
                else setSelectedEntities(prev => [...prev, id]);
              }} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'popup-surface popup-surface-hover border-transparent'}`}>
                <div className="flex flex-col overflow-hidden mr-4">
                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                  <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                </div>
                {addCardType === 'cost' ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelectedToday && (
                      <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400">{t('addCard.costToday')}</span>
                    )}
                    {isSelectedMonth && (
                      <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400">{t('addCard.costMonth')}</span>
                    )}
                    {!isSelected && (
                      <div className="p-2 rounded-full transition-colors bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-green-500/20 group-hover:text-green-400'}`}>
                    {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                )}
              </button>
            );
          })}
          {filteredIds.length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{getAddCardNoneLeftLabel()}</p>
          )}
        </div>
      </div>
    );
  };

  const usesEntityMultiSelect = ['sensor', 'light', 'vacuum', 'personmap', 'climate', 'cover', 'media', 'toggle', 'entity'].includes(addCardType);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16" style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} onClick={onClose}>
      <div className="border w-full max-w-xl lg:max-w-4xl max-h-[85vh] rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim" style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 modal-close"><X className="w-4 h-4" /></button>
        <h3 className="text-xl font-light mb-5 text-[var(--text-primary)] text-center uppercase tracking-widest italic">{t('modal.addCard.title')}</h3>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {(addCardTargetPage !== 'header') && (
            <div className="mb-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder={t('addCard.search')} className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl pl-11 pr-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          )}
          
          {(addCardTargetPage !== 'header' && addCardTargetPage !== 'settings') && (
            <div className="mb-5">
              <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">{t('addCard.cardType')}</p>
              <div className="flex flex-wrap gap-2">
                <TypeButton type="sensor" icon={Activity} label={t('addCard.type.sensor')} isActive={addCardType === 'sensor'} onSelect={setAddCardType} />
                <TypeButton type="light" icon={Lightbulb} label={t('addCard.type.light')} isActive={addCardType === 'light'} onSelect={setAddCardType} />
                <TypeButton type="vacuum" icon={Bot} label={t('addCard.type.vacuum')} isActive={addCardType === 'vacuum'} onSelect={setAddCardType} />
                <TypeButton type="personmap" icon={MapPin} label={getLabel('addCard.type.personMap', 'Person Map')} isActive={addCardType === 'personmap'} onSelect={setAddCardType} />
                <TypeButton type="climate" icon={Thermometer} label={t('addCard.type.climate')} isActive={addCardType === 'climate'} onSelect={setAddCardType} />
                <TypeButton type="cover" icon={ArrowUpDown} label={getLabel('addCard.type.cover', 'Cover')} isActive={addCardType === 'cover'} onSelect={setAddCardType} />
                <TypeButton type="car" icon={Car} label={t('addCard.type.car')} isActive={addCardType === 'car'} onSelect={setAddCardType} />
                <TypeButton type="androidtv" icon={Gamepad2} label={t('addCard.type.androidtv')} isActive={addCardType === 'androidtv'} onSelect={setAddCardType} />
                <TypeButton type="cost" icon={Coins} label={t('addCard.type.cost')} isActive={addCardType === 'cost'} onSelect={setAddCardType} />
                <TypeButton type="media" icon={Music} label={t('addCard.type.media')} isActive={addCardType === 'media'} onSelect={setAddCardType} />
                <TypeButton type="weather" icon={CloudSun} label={t('addCard.type.weather')} isActive={addCardType === 'weather'} onSelect={setAddCardType} />
                <TypeButton type="calendar" icon={Calendar} label={getLabel('addCard.type.calendar', 'Calendar')} isActive={addCardType === 'calendar'} onSelect={setAddCardType} />
                <TypeButton type="todo" icon={ListChecks} label={getLabel('addCard.type.todo', 'Todo')} isActive={addCardType === 'todo'} onSelect={setAddCardType} />
                <TypeButton type="nordpool" icon={Zap} label={t('addCard.type.nordpool')} isActive={addCardType === 'nordpool'} onSelect={setAddCardType} />
                <TypeButton type="room" icon={Home} label={getLabel('addCard.type.room', 'Room')} isActive={addCardType === 'room'} onSelect={setAddCardType} />
              </div>
            </div>
          )}

          <div className="space-y-6">
            {addCardType === 'weather' ? renderWeatherSection()
              : addCardType === 'androidtv' ? renderAndroidTVSection()
              : addCardType === 'calendar' ? renderSimpleAddSection(Calendar, t('addCard.calendarDescription') || 'Add a calendar card. You can select calendars after adding the card.', t('addCard.add'))
              : addCardType === 'todo' ? renderSimpleAddSection(ListChecks, t('addCard.todoDescription') || 'Add a to-do card. You can select which list to use after adding.', t('addCard.add'))
              : addCardType === 'car' ? renderSimpleAddSection(Car, t('addCard.carDescription'), t('addCard.carCard'))
              : addCardType === 'nordpool' ? renderNordpoolSection()
              : addCardType === 'room' ? (
                <RoomSection 
                  conn={conn} 
                  searchTerm={searchTerm} 
                  t={t}
                  selectedArea={selectedRoomArea}
                  setSelectedArea={setSelectedRoomArea}
                  areaEntities={selectedRoomEntities}
                  setAreaEntities={setSelectedRoomEntities}
                />
              )
              : renderGenericEntityList()
            }
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-[var(--glass-border)] flex flex-col gap-3">
          {usesEntityMultiSelect && selectedEntities.length > 0 && (
            <button onClick={onAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> {addCardType === 'media'
                ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.players')}`
                : addCardType === 'personmap'
                    ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.personMapCard') || 'person maps'}`
                  : `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.cards')}`}
            </button>
          )}
          {addCardType === 'cost' && selectedCostTodayId && selectedCostMonthId && (
            <button onClick={onAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> {t('addCard.costCard')}
            </button>
          )}
          {addCardType === 'weather' && selectedWeatherId && (
            <button onClick={onAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> {t('addCard.weatherCard')}
            </button>
          )}
          {addCardType === 'nordpool' && selectedNordpoolId && (
            <button onClick={onAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> {t('addCard.nordpoolCard')}
            </button>
          )}
          {addCardType === 'androidtv' && selectedAndroidTVMediaId && (
            <button onClick={onAddSelected} className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" /> {t('addCard.add')}
            </button>
          )}
          {addCardType === 'room' && selectedRoomArea && (
            <button 
              onClick={() => onAddRoom && onAddRoom(selectedRoomArea, selectedRoomEntities)} 
              className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> {selectedRoomArea.name || t('room.defaultName') || 'Room'}
            </button>
          )}
          <button onClick={onClose} className="w-full py-3 rounded-2xl popup-surface popup-surface-hover text-[var(--text-secondary)] font-bold uppercase tracking-widest transition-colors">OK</button>
        </div>
      </div>
    </div>
  );
}
