import {
  ArrowUpDown,
  Bot,
  Calendar,
  Camera,
  Car,
  Check,
  CloudSun,
  Coins,
  Fan,
  Gamepad2,
  Home,
  Lightbulb,
  ListChecks,
  Minus,
  Music,
  Plus,
  Search,
  Sparkles,
  Thermometer,
  X,
  Zap
} from '../icons';

import React, { useState, useEffect } from 'react';
import { isToggleEntity } from '../utils';
import { getAreas, getEntitiesForArea } from '../services/haClient';

const SELECTED_CONTAINER = 'bg-[var(--accent-bg)] border-[var(--accent-color)]';
const SELECTED_TEXT = 'text-[var(--accent-color)]';
const SELECTED_SUBTEXT = 'text-[var(--text-secondary)]';
const SELECTED_ICON = 'bg-[var(--accent-bg)] border border-[var(--accent-color)] text-[var(--accent-color)]';
const PRIMARY_ADD_BUTTON = 'w-full py-4 rounded-2xl border bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--accent-color)] font-bold uppercase tracking-widest transition-colors hover:opacity-90 flex items-center justify-center gap-2';

const TypeButton = ({ type, icon: Icon, label, isActive, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(type)}
    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors duration-150 ease-out font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border focus-visible:outline-none ${isActive ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
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
              className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="flex flex-col overflow-hidden mr-4">
                <span className={`text-sm font-bold transition-colors truncate ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                  {area.name || area.area_id}
                </span>
                <span className={`text-[11px] font-medium truncate ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>
                  {area.area_id}
                  {isSelected && !loadingEntities && ` — ${areaEntities.length} ${t('addCard.roomEntitiesFound')}`}
                </span>
              </div>
              <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}>
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
function AddCardContent({
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
  selectedSpacerVariant,
  setSelectedSpacerVariant,
  onAddSelected,
  onAddRoom,
  conn,
  getAddCardAvailableLabel,
  getAddCardNoneLeftLabel,
  t,
}) {
  const [selectedRoomArea, setSelectedRoomArea] = useState(null);
  const [selectedRoomEntities, setSelectedRoomEntities] = useState([]);
  const [localSpacerVariant, setLocalSpacerVariant] = useState(selectedSpacerVariant || 'divider');
  const [calendarOptionsSnapshot, setCalendarOptionsSnapshot] = useState([]);
  const [weatherOptionsSnapshot, setWeatherOptionsSnapshot] = useState([]);
  const [tempOptionsSnapshot, setTempOptionsSnapshot] = useState([]);
  const [androidTVMediaOptionsSnapshot, setAndroidTVMediaOptionsSnapshot] = useState([]);
  const [androidTVRemoteOptionsSnapshot, setAndroidTVRemoteOptionsSnapshot] = useState([]);
  const [nordpoolOptionsSnapshot, setNordpoolOptionsSnapshot] = useState([]);

  useEffect(() => {
    if (addCardType !== 'calendar') return;
    const snapshot = Object.keys(entities)
      .filter((id) => id.startsWith('calendar.'))
      .map((id) => ({
        id,
        name: entities[id]?.attributes?.friendly_name || id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCalendarOptionsSnapshot(snapshot);
  }, [addCardType, entities]);

  useEffect(() => {
    if (addCardType !== 'weather') return;
    const weatherSnapshot = Object.keys(entities)
      .filter((id) => id.startsWith('weather.'))
      .map((id) => ({ id, name: entities[id]?.attributes?.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const tempSnapshot = Object.keys(entities)
      .filter((id) => {
        if (!id.startsWith('sensor.')) return false;
        const deviceClass = entities[id]?.attributes?.device_class;
        const lowerId = id.toLowerCase();
        return deviceClass === 'temperature' || lowerId.includes('temperature') || lowerId.includes('temp');
      })
      .map((id) => ({ id, name: entities[id]?.attributes?.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setWeatherOptionsSnapshot(weatherSnapshot);
    setTempOptionsSnapshot(tempSnapshot);
  }, [addCardType]);

  useEffect(() => {
    if (addCardType !== 'androidtv') return;
    const mediaSnapshot = Object.keys(entities)
      .filter((id) => id.startsWith('media_player.'))
      .map((id) => ({ id, name: entities[id]?.attributes?.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const remoteSnapshot = Object.keys(entities)
      .filter((id) => id.startsWith('remote.'))
      .map((id) => ({ id, name: entities[id]?.attributes?.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setAndroidTVMediaOptionsSnapshot(mediaSnapshot);
    setAndroidTVRemoteOptionsSnapshot(remoteSnapshot);
  }, [addCardType]);

  useEffect(() => {
    if (addCardType !== 'nordpool') return;
    const snapshot = Object.keys(entities)
      .filter((id) => id.startsWith('sensor.') && id.toLowerCase().includes('nordpool'))
      .map((id) => ({ id, name: entities[id]?.attributes?.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setNordpoolOptionsSnapshot(snapshot);
  }, [addCardType]);

  useEffect(() => {
    if (addCardType === 'spacer') {
      setLocalSpacerVariant(selectedSpacerVariant || 'divider');
    }
  }, [addCardType, selectedSpacerVariant]);

  const getLabel = (key, fallback) => {
    const value = t ? t(key) : key;
    return value && value !== key ? value : fallback;
  };

  /** Reusable entity list item button. */
  const EntityItem = ({ id, isSelected, onClick, badgeText, displayName }) => (
    <button type="button" key={id} onClick={onClick} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}>
      <div className="flex flex-col overflow-hidden mr-4">
        <span className={`text-sm font-bold transition-colors truncate ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{displayName || entities[id]?.attributes?.friendly_name || id}</span>
        <span className={`text-[11px] font-medium truncate ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
      </div>
      {badgeText ? (
        <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-[var(--accent-bg)] text-[var(--accent-color)] border border-[var(--accent-color)]">{badgeText}</span>
      ) : (
        <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}>
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
      if (addCardType === 'fan') return id.startsWith('fan.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
      if (addCardType === 'camera') return id.startsWith('camera.');
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

  const renderWeatherSection = () => {
    const lowerSearch = searchTerm.toLowerCase();
    const visibleWeather = weatherOptionsSnapshot.filter(({ id, name }) => {
      if (!searchTerm) return true;
      return id.toLowerCase().includes(lowerSearch) || name.toLowerCase().includes(lowerSearch);
    });
    const visibleTemps = tempOptionsSnapshot.filter(({ id, name }) => {
      if (!searchTerm) return true;
      return id.toLowerCase().includes(lowerSearch) || name.toLowerCase().includes(lowerSearch);
    });

    return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.weatherRequired')}</p>
        <div className="space-y-3">
          {visibleWeather.map(({ id, name }) => (
            <EntityItem key={id} id={id} displayName={name} isSelected={selectedWeatherId === id} onClick={() => setSelectedWeatherId(prev => prev === id ? null : id)} />
          ))}
          {weatherOptionsSnapshot.length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noWeatherSensors')}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.tempSensorOptional')}</p>
        <div className="space-y-3">
          <button type="button" onClick={() => setSelectedTempId(null)} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${!selectedTempId ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}>
            <div className="flex flex-col overflow-hidden mr-4">
              <span className={`text-sm font-bold transition-colors truncate ${!selectedTempId ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{t('addCard.useWeatherTemp')}</span>
              <span className={`text-[11px] font-medium truncate ${!selectedTempId ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>weather.temperature</span>
            </div>
            <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${!selectedTempId ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}>
              {!selectedTempId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
          </button>
          {visibleTemps.map(({ id, name }) => (
            <EntityItem key={id} id={id} displayName={name} isSelected={selectedTempId === id} onClick={() => setSelectedTempId(prev => prev === id ? null : id)} />
          ))}
          {tempOptionsSnapshot.length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noTempSensors')}</p>
          )}
        </div>
      </div>
    </div>
  );
  };

  const renderAndroidTVSection = () => {
    const lowerSearch = searchTerm.toLowerCase();
    const visibleMediaPlayers = androidTVMediaOptionsSnapshot.filter(({ id, name }) => {
      if (!searchTerm) return true;
      return id.toLowerCase().includes(lowerSearch) || name.toLowerCase().includes(lowerSearch);
    });
    const visibleRemotes = androidTVRemoteOptionsSnapshot.filter(({ id, name }) => {
      if (!searchTerm) return true;
      return id.toLowerCase().includes(lowerSearch) || name.toLowerCase().includes(lowerSearch);
    });

    return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.mediaPlayerRequired')}</p>
        <div className="space-y-3">
          {visibleMediaPlayers.map(({ id, name }) => (
            <EntityItem key={id} id={id} displayName={name} isSelected={selectedAndroidTVMediaId === id} onClick={() => setSelectedAndroidTVMediaId(prev => prev === id ? null : id)} />
          ))}
          {androidTVMediaOptionsSnapshot.length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('addCard.noMediaPlayers')}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.remoteOptional')}</p>
        <div className="space-y-3">
          <button type="button" onClick={() => setSelectedAndroidTVRemoteId(null)} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${!selectedAndroidTVRemoteId ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}>
            <div className="flex flex-col overflow-hidden mr-4">
              <span className={`text-sm font-bold transition-colors truncate ${!selectedAndroidTVRemoteId ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{t('addCard.noRemote')}</span>
              <span className={`text-[11px] font-medium truncate ${!selectedAndroidTVRemoteId ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{t('addCard.mediaControlOnly')}</span>
            </div>
            <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${!selectedAndroidTVRemoteId ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}>
              {!selectedAndroidTVRemoteId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
          </button>
          {visibleRemotes.map(({ id, name }) => (
            <EntityItem key={id} id={id} displayName={name} isSelected={selectedAndroidTVRemoteId === id} onClick={() => setSelectedAndroidTVRemoteId(prev => prev === id ? null : id)} />
          ))}
        </div>
      </div>
    </div>
  );
  };

  const renderSimpleAddSection = (Icon, description, buttonLabel) => (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
      <div className="p-4 rounded-full popup-surface text-[var(--text-primary)] border border-[var(--glass-border)]">
        <Icon className="w-8 h-8" />
      </div>
      <p className="text-gray-400 max-w-xs text-sm">{description}</p>
      <button
        onClick={() => onAddSelected()}
        className="px-6 py-3 rounded-2xl border bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--accent-color)] font-bold uppercase tracking-widest transition-colors hover:opacity-90"
      >
        {buttonLabel}
      </button>
    </div>
  );

  const renderCalendarSection = () => {
    const lowerSearch = searchTerm.toLowerCase();
    const visibleCalendars = calendarOptionsSnapshot.filter(({ id, name }) => {
      if (!searchTerm) return true;
      return id.toLowerCase().includes(lowerSearch) || name.toLowerCase().includes(lowerSearch);
    });

    return (
      <div className="space-y-3">
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-1">{t('calendar.selectCalendars') || 'Select Calendars'}</p>
        <div className="space-y-3">
          {visibleCalendars.map(({ id, name }) => {
            const isSelected = selectedEntities.includes(id);
            return (
              <button
                type="button"
                key={id}
                onClick={() => {
                  if (isSelected) setSelectedEntities((prev) => prev.filter((x) => x !== id));
                  else setSelectedEntities((prev) => [...prev, id]);
                }}
                className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
              >
                <div className="flex flex-col overflow-hidden mr-4">
                  <span className={`text-sm font-bold transition-colors truncate ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{name}</span>
                  <span className={`text-[11px] font-medium truncate ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                </div>
                <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}>
                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
              </button>
            );
          })}
          {calendarOptionsSnapshot.length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('calendar.noCalendarsFound') || 'No calendars found'}</p>
          )}
          {calendarOptionsSnapshot.length > 0 && visibleCalendars.length === 0 && (
            <p className="text-gray-500 italic text-sm text-center py-4">{t('form.noResults') || 'No results'}</p>
          )}
        </div>
      </div>
    );
  };

  const renderSpacerSection = () => (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
      <div className="p-4 rounded-full popup-surface text-[var(--text-primary)] border border-[var(--glass-border)]">
        <Minus className="w-8 h-8" />
      </div>
      <p className="text-gray-400 max-w-xs text-sm">
        {t('addCard.spacerDescription') || 'Add a spacer or divider card. You can switch between spacer and divider in the edit settings.'}
      </p>
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs uppercase font-bold text-gray-500">{t('addCard.spacer.selectVariant') || 'Select variant'}</p>
        <div className="flex gap-2">
          {[
            { key: 'spacer', label: t('addCard.spacer.spacer') || 'Spacer' },
            { key: 'divider', label: t('addCard.spacer.divider') || 'Divider' },
          ].map((variant) => (
            <button
              key={variant.key}
              type="button"
              onClick={() => {
                setLocalSpacerVariant(variant.key);
                setSelectedSpacerVariant(variant.key);
              }}
              className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${localSpacerVariant === variant.key ? 'popup-surface text-[var(--text-primary)] border-[var(--glass-border)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
              style={localSpacerVariant === variant.key ? { backgroundColor: 'var(--accent-bg)', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : undefined}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => onAddSelected({ spacerVariant: localSpacerVariant })}
        className="px-6 py-3 rounded-2xl border bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--accent-color)] font-bold uppercase tracking-widest transition-colors hover:opacity-90"
      >
        {t('addCard.add')}
      </button>
    </div>
  );

  const renderNordpoolSection = () => {
    const lowerSearch = searchTerm.toLowerCase();
    const visibleNordpool = nordpoolOptionsSnapshot.filter(({ id, name }) => {
      if (!searchTerm) return true;
      return id.toLowerCase().includes(lowerSearch) || name.toLowerCase().includes(lowerSearch);
    });

    return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-4">{t('addCard.nordpoolSensorRequired')}</p>
        <div className="space-y-3">
          {visibleNordpool.map(({ id, name }) => (
            <EntityItem key={id} id={id} displayName={name} isSelected={selectedNordpoolId === id} onClick={() => setSelectedNordpoolId(prev => prev === id ? null : id)} />
          ))}
          {nordpoolOptionsSnapshot.length === 0 && (
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
              className={`px-4 py-2 rounded-lg transition-colors font-bold ${nordpoolDecimals === dec ? 'popup-surface border' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
              style={nordpoolDecimals === dec ? { backgroundColor: 'var(--accent-bg)', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : undefined}
            >
              {dec}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  };

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
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${costSelectionTarget === 'today' ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins className="w-4 h-4" /> {t('addCard.costToday')}
              </button>
              <button
                onClick={() => setCostSelectionTarget('month')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-bold uppercase tracking-widest text-[11px] whitespace-nowrap border ${costSelectionTarget === 'month' ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins className="w-4 h-4" /> {t('addCard.costMonth')}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              <span className={`px-3 py-1 rounded-full border ${selectedCostTodayId ? 'border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--accent-bg)]' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}>
                {t('addCard.costToday')}: {selectedCostTodayId ? (entities[selectedCostTodayId]?.attributes?.friendly_name || selectedCostTodayId) : t('common.missing')}
              </span>
              <span className={`px-3 py-1 rounded-full border ${selectedCostMonthId ? 'border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--accent-bg)]' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}>
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
                }} className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center justify-between group entity-item border ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}>
                <div className="flex flex-col overflow-hidden mr-4">
                    <span className={`text-sm font-bold transition-colors truncate ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>{entities[id].attributes?.friendly_name || id}</span>
                    <span className={`text-[11px] font-medium truncate ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>{id}</span>
                </div>
                {addCardType === 'cost' ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelectedToday && (
                        <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-[var(--accent-bg)] text-[var(--accent-color)] border border-[var(--accent-color)]">{t('addCard.costToday')}</span>
                    )}
                    {isSelectedMonth && (
                        <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-[var(--accent-bg)] text-[var(--accent-color)] border border-[var(--accent-color)]">{t('addCard.costMonth')}</span>
                    )}
                    {!isSelected && (
                        <div className="p-2 rounded-full transition-colors bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ) : (
                    <div className={`p-2 rounded-full transition-colors flex-shrink-0 ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}>
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

  const usesEntityMultiSelect = ['sensor', 'light', 'vacuum', 'fan', 'camera', 'climate', 'cover', 'media', 'toggle', 'entity'].includes(addCardType);
  const usesMultiSelectWithCalendar = usesEntityMultiSelect || addCardType === 'calendar';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16" style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} onClick={onClose}>
      <div className="border w-full max-w-xl lg:max-w-4xl max-h-[85vh] rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim" style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 modal-close"><X className="w-4 h-4" /></button>
        <h3 className="text-xl font-light mb-5 text-[var(--text-primary)] text-center uppercase tracking-widest italic">{t('modal.addCard.title')}</h3>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {(addCardTargetPage !== 'header') && (
            <div className="mb-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder={t('addCard.search')} className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl pl-11 pr-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--glass-border)] transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          )}
          
          {(addCardTargetPage !== 'header' && addCardTargetPage !== 'settings') && (
            <div className="mb-5">
              <p className="text-xs uppercase font-bold text-gray-500 ml-4 mb-2">{t('addCard.cardType')}</p>
              <div className="flex flex-wrap gap-2">
                <TypeButton type="sensor" icon={Sparkles} label={t('addCard.type.sensor')} isActive={addCardType === 'sensor'} onSelect={setAddCardType} />
                <TypeButton type="light" icon={Lightbulb} label={t('addCard.type.light')} isActive={addCardType === 'light'} onSelect={setAddCardType} />
                <TypeButton type="vacuum" icon={Bot} label={t('addCard.type.vacuum')} isActive={addCardType === 'vacuum'} onSelect={setAddCardType} />
                <TypeButton type="fan" icon={Fan} label={t('addCard.type.fan')} isActive={addCardType === 'fan'} onSelect={setAddCardType} />
                <TypeButton type="camera" icon={Camera} label={`${getLabel('addCard.type.camera', 'Camera')} (beta)`} isActive={addCardType === 'camera'} onSelect={setAddCardType} />
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
                <TypeButton type="spacer" icon={Minus} label={getLabel('addCard.type.spacer', 'Spacer')} isActive={addCardType === 'spacer'} onSelect={setAddCardType} />
              </div>
              {addCardType === 'sensor' && (
                <p className="mt-2 ml-4 text-[11px] text-[var(--text-secondary)] opacity-75">
                  {t('addCard.sensorIncludes') !== 'addCard.sensorIncludes'
                    ? t('addCard.sensorIncludes')
                    : 'Includes binary sensors, sensors, switches, automations, scripts and more.'}
                </p>
              )}
            </div>
          )}

          <div className="space-y-6">
            {addCardType === 'weather' ? renderWeatherSection()
              : addCardType === 'androidtv' ? renderAndroidTVSection()
              : addCardType === 'calendar' ? renderCalendarSection()
              : addCardType === 'todo' ? renderSimpleAddSection(ListChecks, t('addCard.todoDescription') || 'Add a to-do card. You can select which list to use after adding.', t('addCard.add'))
              : addCardType === 'spacer' ? renderSpacerSection()
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
          {usesMultiSelectWithCalendar && selectedEntities.length > 0 && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="w-5 h-5" /> {addCardType === 'media'
                ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.players')}`
                : addCardType === 'calendar'
                  ? `${t('addCard.add')} ${t('addCard.type.calendar') || 'Calendar'} ${t('addCard.cards')}`
                : addCardType === 'camera'
                  ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.cameraCard') || 'camera cards'}`
                  : `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.cards')}`}
            </button>
          )}
          {addCardType === 'cost' && selectedCostTodayId && selectedCostMonthId && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="w-5 h-5" /> {t('addCard.costCard')}
            </button>
          )}
          {addCardType === 'weather' && selectedWeatherId && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="w-5 h-5" /> {t('addCard.weatherCard')}
            </button>
          )}
          {addCardType === 'nordpool' && selectedNordpoolId && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="w-5 h-5" /> {t('addCard.nordpoolCard')}
            </button>
          )}
          {addCardType === 'androidtv' && selectedAndroidTVMediaId && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="w-5 h-5" /> {t('addCard.add')}
            </button>
          )}
          {addCardType === 'room' && selectedRoomArea && (
            <button 
              onClick={() => onAddRoom && onAddRoom(selectedRoomArea, selectedRoomEntities)} 
              className={PRIMARY_ADD_BUTTON}
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

const FLICKER_PRONE_TYPES = new Set(['androidtv', 'weather', 'nordpool']);

function areAddCardPropsEqual(prev, next) {
  const freezeType = FLICKER_PRONE_TYPES.has(prev.addCardType) && FLICKER_PRONE_TYPES.has(next.addCardType);
  if (!freezeType) return false;

  return (
    prev.addCardType === next.addCardType
    && prev.addCardTargetPage === next.addCardTargetPage
    && prev.searchTerm === next.searchTerm
    && prev.selectedWeatherId === next.selectedWeatherId
    && prev.selectedTempId === next.selectedTempId
    && prev.selectedAndroidTVMediaId === next.selectedAndroidTVMediaId
    && prev.selectedAndroidTVRemoteId === next.selectedAndroidTVRemoteId
    && prev.selectedNordpoolId === next.selectedNordpoolId
    && prev.nordpoolDecimals === next.nordpoolDecimals
    && prev.t === next.t
  );
}

export default React.memo(AddCardContent, areAddCardPropsEqual);
