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
  Shield,
  Sparkles,
  Thermometer,
  X,
  Zap,
} from '../icons';

import React, { useState, useEffect } from 'react';
import { isToggleEntity } from '../utils';
import { getAreas, getEntitiesForArea } from '../services/haClient';

const SELECTED_CONTAINER = 'bg-[var(--accent-bg)] border-[var(--accent-color)]';
const SELECTED_TEXT = 'text-[var(--accent-color)]';
const SELECTED_SUBTEXT = 'text-[var(--text-secondary)]';
const SELECTED_ICON =
  'bg-[var(--accent-bg)] border border-[var(--accent-color)] text-[var(--accent-color)]';
const PRIMARY_ADD_BUTTON =
  'w-full py-4 rounded-2xl border bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--accent-color)] font-bold uppercase tracking-widest transition-colors hover:opacity-90 flex items-center justify-center gap-2';

const TypeButton = ({ type, icon: Icon, label, isActive, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(type)}
    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-colors duration-150 ease-out focus-visible:outline-none ${isActive ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
  >
    <Icon className="h-4 w-4" /> {label}
  </button>
);

/** Room area picker — extracted outside AddCardContent so state persists across parent re-renders. */
function RoomSection({
  conn,
  searchTerm,
  selectedAreas,
  setSelectedAreas,
  selectedAreaEntitiesById,
  setSelectedAreaEntitiesById,
  t,
}) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntitiesByAreaId, setLoadingEntitiesByAreaId] = useState({});

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
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const fetchAreaEntities = async (areaId) => {
    if (!conn || !areaId) return;
    if (Array.isArray(selectedAreaEntitiesById?.[areaId])) return;

    setLoadingEntitiesByAreaId((prev) => ({ ...prev, [areaId]: true }));
    try {
      const result = await getEntitiesForArea(conn, areaId);
      setSelectedAreaEntitiesById((prev) => ({ ...prev, [areaId]: result }));
    } catch (err) {
      console.error('Failed to load area entities:', err);
    } finally {
      setLoadingEntitiesByAreaId((prev) => ({ ...prev, [areaId]: false }));
    }
  };

  const toggleAreaSelection = async (area) => {
    const isSelected = selectedAreas.some((item) => item.area_id === area.area_id);
    if (isSelected) {
      setSelectedAreas((prev) => prev.filter((item) => item.area_id !== area.area_id));
      return;
    }

    setSelectedAreas((prev) => [...prev, area]);
    await fetchAreaEntities(area.area_id);
  };

  const filteredAreas = areas.filter((a) => {
    if (!searchTerm) return true;
    return (a.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <p className="ml-4 text-xs font-bold text-gray-500 uppercase">{t('addCard.selectArea')}</p>
      {loading && (
        <p className="py-4 text-center text-sm text-gray-500">{t('addCard.loadingAreas')}</p>
      )}
      {!loading && filteredAreas.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-500 italic">{t('addCard.noAreas')}</p>
      )}
      <div className="space-y-3">
        {filteredAreas.map((area) => {
          const isSelected = selectedAreas.some((item) => item.area_id === area.area_id);
          const areaEntities = selectedAreaEntitiesById?.[area.area_id] || [];
          const loadingEntities = loadingEntitiesByAreaId?.[area.area_id] === true;
          return (
            <button
              type="button"
              key={area.area_id}
              onClick={() => {
                void toggleAreaSelection(area);
              }}
              className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="mr-4 flex flex-col overflow-hidden">
                <span
                  className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                >
                  {area.name || area.area_id}
                </span>
                <span
                  className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}
                >
                  {area.area_id}
                  {isSelected &&
                    !loadingEntities &&
                    ` — ${areaEntities.length} ${t('addCard.roomEntitiesFound')}`}
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
              >
                {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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
  const [selectedRoomAreas, setSelectedRoomAreas] = useState([]);
  const [selectedRoomEntitiesById, setSelectedRoomEntitiesById] = useState({});
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
        return (
          deviceClass === 'temperature' ||
          lowerId.includes('temperature') ||
          lowerId.includes('temp')
        );
      })
      .map((id) => ({ id, name: entities[id]?.attributes?.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setWeatherOptionsSnapshot(weatherSnapshot);
    setTempOptionsSnapshot(tempSnapshot);
  }, [addCardType, entities]);

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
  }, [addCardType, entities]);

  useEffect(() => {
    if (addCardType !== 'nordpool') return;
    const snapshot = Object.keys(entities)
      .filter((id) => id.startsWith('sensor.') && id.toLowerCase().includes('nordpool'))
      .map((id) => ({ id, name: entities[id]?.attributes?.friendly_name || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setNordpoolOptionsSnapshot(snapshot);
  }, [addCardType, entities]);

  useEffect(() => {
    if (addCardType === 'spacer') {
      setLocalSpacerVariant(selectedSpacerVariant || 'divider');
    }
  }, [addCardType, selectedSpacerVariant]);

  const getLabel = (key, fallback) => {
    const value = t ? t(key) : key;
    return value && value !== key ? value : fallback;
  };
  const betaSuffix = ` (${getLabel('addCard.betaLabel', 'beta')})`;

  /** Reusable entity list item button. */
  const EntityItem = ({ id, isSelected, onClick, badgeText, displayName }) => (
    <button
      type="button"
      key={id}
      onClick={onClick}
      className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
    >
      <div className="mr-4 flex flex-col overflow-hidden">
        <span
          className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
        >
          {displayName || entities[id]?.attributes?.friendly_name || id}
        </span>
        <span
          className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}
        >
          {id}
        </span>
      </div>
      {badgeText ? (
        <span className="rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[9px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
          {badgeText}
        </span>
      ) : (
        <div
          className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </div>
      )}
    </button>
  );

  /** Filter & sort entities by search term. */
  const filterAndSort = (ids) =>
    ids
      .filter((id) => {
        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();
        const name = entities[id]?.attributes?.friendly_name || id;
        return id.toLowerCase().includes(lowerTerm) || name.toLowerCase().includes(lowerTerm);
      })
      .sort((a, b) =>
        (entities[a]?.attributes?.friendly_name || a).localeCompare(
          entities[b]?.attributes?.friendly_name || b
        )
      );

  // --- Entity filter logic for the generic entity list ---
  const getFilteredEntityIds = () => {
    return Object.keys(entities).filter((id) => {
      if (addCardTargetPage === 'header')
        return id.startsWith('person.') && !(pagesConfig.header || []).includes(id);
      if (addCardTargetPage === 'settings') {
        return !(pagesConfig.settings || []).includes(id);
      }
      if (addCardType === 'vacuum')
        return id.startsWith('vacuum.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
      if (addCardType === 'fan')
        return id.startsWith('fan.') && !(pagesConfig[addCardTargetPage] || []).includes(id);
      if (addCardType === 'camera') return id.startsWith('camera.');
      if (addCardType === 'cover') return id.startsWith('cover.');
      if (addCardType === 'climate') return id.startsWith('climate.');
      if (addCardType === 'alarm') return id.startsWith('alarm_control_panel.');
      if (addCardType === 'androidtv')
        return id.startsWith('media_player.') || id.startsWith('remote.');
      if (addCardType === 'cost') return id.startsWith('sensor.') || id.startsWith('input_number.');
      if (addCardType === 'media') return id.startsWith('media_player.');
      if (addCardType === 'sensor') {
        return (
          (id.startsWith('sensor.') ||
            id.startsWith('script.') ||
            id.startsWith('scene.') ||
            id.startsWith('input_number.') ||
            id.startsWith('input_boolean.') ||
            id.startsWith('binary_sensor.') ||
            id.startsWith('switch.') ||
            id.startsWith('automation.')) &&
          !(pagesConfig[addCardTargetPage] || []).includes(id)
        );
      }
      if (addCardType === 'toggle')
        return isToggleEntity(id) && !(pagesConfig[addCardTargetPage] || []).includes(id);
      if (addCardType === 'entity')
        return (
          !id.startsWith('person.') &&
          !id.startsWith('update.') &&
          !(pagesConfig[addCardTargetPage] || []).includes(id)
        );
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
          <p className="mb-4 ml-4 text-xs font-bold text-gray-500 uppercase">
            {t('addCard.weatherRequired')}
          </p>
          <div className="space-y-3">
            {visibleWeather.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedWeatherId === id}
                onClick={() => setSelectedWeatherId((prev) => (prev === id ? null : id))}
              />
            ))}
            {weatherOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500 italic">
                {t('addCard.noWeatherSensors')}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-4 ml-4 text-xs font-bold text-gray-500 uppercase">
            {t('addCard.tempSensorOptional')}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelectedTempId(null)}
              className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${!selectedTempId ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="mr-4 flex flex-col overflow-hidden">
                <span
                  className={`truncate text-sm font-bold transition-colors ${!selectedTempId ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                >
                  {t('addCard.useWeatherTemp')}
                </span>
                <span
                  className={`truncate text-[11px] font-medium ${!selectedTempId ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}
                >
                  weather.temperature
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${!selectedTempId ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
              >
                {!selectedTempId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
            </button>
            {visibleTemps.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedTempId === id}
                onClick={() => setSelectedTempId((prev) => (prev === id ? null : id))}
              />
            ))}
            {tempOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500 italic">
                {t('addCard.noTempSensors')}
              </p>
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
          <p className="mb-4 ml-4 text-xs font-bold text-gray-500 uppercase">
            {t('addCard.mediaPlayerRequired')}
          </p>
          <div className="space-y-3">
            {visibleMediaPlayers.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedAndroidTVMediaId === id}
                onClick={() => setSelectedAndroidTVMediaId((prev) => (prev === id ? null : id))}
              />
            ))}
            {androidTVMediaOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500 italic">
                {t('addCard.noMediaPlayers')}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-4 ml-4 text-xs font-bold text-gray-500 uppercase">
            {t('addCard.remoteOptional')}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelectedAndroidTVRemoteId(null)}
              className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${!selectedAndroidTVRemoteId ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="mr-4 flex flex-col overflow-hidden">
                <span
                  className={`truncate text-sm font-bold transition-colors ${!selectedAndroidTVRemoteId ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                >
                  {t('addCard.noRemote')}
                </span>
                <span
                  className={`truncate text-[11px] font-medium ${!selectedAndroidTVRemoteId ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}
                >
                  {t('addCard.mediaControlOnly')}
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${!selectedAndroidTVRemoteId ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
              >
                {!selectedAndroidTVRemoteId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </div>
            </button>
            {visibleRemotes.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedAndroidTVRemoteId === id}
                onClick={() => setSelectedAndroidTVRemoteId((prev) => (prev === id ? null : id))}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSimpleAddSection = (Icon, description, buttonLabel) => (
    <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
      <div className="popup-surface rounded-full border border-[var(--glass-border)] p-4 text-[var(--text-primary)]">
        <Icon className="h-8 w-8" />
      </div>
      <p className="max-w-xs text-sm text-gray-400">{description}</p>
      <button
        onClick={() => onAddSelected()}
        className="rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] px-6 py-3 font-bold tracking-widest text-[var(--accent-color)] uppercase transition-colors hover:opacity-90"
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
        <p className="mb-1 ml-4 text-xs font-bold text-gray-500 uppercase">
          {t('calendar.selectCalendars') || 'Select Calendars'}
        </p>
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
                className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
              >
                <div className="mr-4 flex flex-col overflow-hidden">
                  <span
                    className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                  >
                    {name}
                  </span>
                  <span
                    className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}
                  >
                    {id}
                  </span>
                </div>
                <div
                  className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
                >
                  {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
              </button>
            );
          })}
          {calendarOptionsSnapshot.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500 italic">
              {t('calendar.noCalendarsFound') || 'No calendars found'}
            </p>
          )}
          {calendarOptionsSnapshot.length > 0 && visibleCalendars.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500 italic">
              {t('form.noResults') || 'No results'}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderSpacerSection = () => (
    <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
      <div className="popup-surface rounded-full border border-[var(--glass-border)] p-4 text-[var(--text-primary)]">
        <Minus className="h-8 w-8" />
      </div>
      <p className="max-w-xs text-sm text-gray-400">
        {t('addCard.spacerDescription') ||
          'Add a spacer or divider card. You can switch between spacer and divider in the edit settings.'}
      </p>
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase">
          {t('addCard.spacer.selectVariant') || 'Select variant'}
        </p>
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
              className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${localSpacerVariant === variant.key ? 'popup-surface border-[var(--glass-border)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
              style={
                localSpacerVariant === variant.key
                  ? {
                      backgroundColor: 'var(--accent-bg)',
                      borderColor: 'var(--accent-color)',
                      color: 'var(--accent-color)',
                    }
                  : undefined
              }
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => onAddSelected({ spacerVariant: localSpacerVariant })}
        className="rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] px-6 py-3 font-bold tracking-widest text-[var(--accent-color)] uppercase transition-colors hover:opacity-90"
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
          <p className="mb-4 ml-4 text-xs font-bold text-gray-500 uppercase">
            {t('addCard.nordpoolSensorRequired')}
          </p>
          <div className="space-y-3">
            {visibleNordpool.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedNordpoolId === id}
                onClick={() => setSelectedNordpoolId((prev) => (prev === id ? null : id))}
              />
            ))}
            {nordpoolOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500 italic">
                {t('addCard.noNordpoolSensors')}
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 ml-4 text-xs font-bold text-gray-500 uppercase">
            {t('addCard.decimals')}
          </p>
          <div className="flex gap-2 px-4">
            {[0, 1, 2, 3].map((dec) => (
              <button
                key={dec}
                onClick={() => setNordpoolDecimals(dec)}
                className={`rounded-lg px-4 py-2 font-bold transition-colors ${nordpoolDecimals === dec ? 'popup-surface border' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                style={
                  nordpoolDecimals === dec
                    ? {
                        backgroundColor: 'var(--accent-bg)',
                        borderColor: 'var(--accent-color)',
                        color: 'var(--accent-color)',
                      }
                    : undefined
                }
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
    const visibleIds = filterAndSort(filteredIds).slice(
      0,
      addCardTargetPage === 'settings' ? 100 : undefined
    );

    return (
      <div>
        {addCardType === 'cost' && (
          <div className="mb-5">
            <p className="mb-2 ml-4 text-xs font-bold text-gray-500 uppercase">
              {t('addCard.costPickTarget')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCostSelectionTarget('today')}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-colors ${costSelectionTarget === 'today' ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins className="h-4 w-4" /> {t('addCard.costToday')}
              </button>
              <button
                onClick={() => setCostSelectionTarget('month')}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-colors ${costSelectionTarget === 'month' ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins className="h-4 w-4" /> {t('addCard.costMonth')}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              <span
                className={`rounded-full border px-3 py-1 ${selectedCostTodayId ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}
              >
                {t('addCard.costToday')}:{' '}
                {selectedCostTodayId
                  ? entities[selectedCostTodayId]?.attributes?.friendly_name || selectedCostTodayId
                  : t('common.missing')}
              </span>
              <span
                className={`rounded-full border px-3 py-1 ${selectedCostMonthId ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-[var(--glass-border)] text-[var(--text-muted)]'}`}
              >
                {t('addCard.costMonth')}:{' '}
                {selectedCostMonthId
                  ? entities[selectedCostMonthId]?.attributes?.friendly_name || selectedCostMonthId
                  : t('common.missing')}
              </span>
            </div>
          </div>
        )}
        <p className="mb-4 ml-4 text-xs font-bold text-gray-500 uppercase">
          {getAddCardAvailableLabel()}
        </p>
        <div className="space-y-3">
          {visibleIds.map((id) => {
            const isSelected =
              addCardType === 'cost'
                ? selectedCostTodayId === id || selectedCostMonthId === id
                : selectedEntities.includes(id);
            const isSelectedToday = selectedCostTodayId === id;
            const isSelectedMonth = selectedCostMonthId === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => {
                  if (addCardType === 'cost') {
                    if (costSelectionTarget === 'today') {
                      setSelectedCostTodayId((prev) => (prev === id ? null : id));
                    } else {
                      setSelectedCostMonthId((prev) => (prev === id ? null : id));
                    }
                    return;
                  }
                  if (selectedEntities.includes(id))
                    setSelectedEntities((prev) => prev.filter((e) => e !== id));
                  else setSelectedEntities((prev) => [...prev, id]);
                }}
                className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
              >
                <div className="mr-4 flex flex-col overflow-hidden">
                  <span
                    className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                  >
                    {entities[id].attributes?.friendly_name || id}
                  </span>
                  <span
                    className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}
                  >
                    {id}
                  </span>
                </div>
                {addCardType === 'cost' ? (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {isSelectedToday && (
                      <span className="rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[9px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
                        {t('addCard.costToday')}
                      </span>
                    )}
                    {isSelectedMonth && (
                      <span className="rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[9px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
                        {t('addCard.costMonth')}
                      </span>
                    )}
                    {!isSelected && (
                      <div className="rounded-full bg-[var(--glass-bg)] p-2 text-gray-500 transition-colors group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]">
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-gray-500 group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </div>
                )}
              </button>
            );
          })}
          {filteredIds.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-500 italic">
              {getAddCardNoneLeftLabel()}
            </p>
          )}
        </div>
      </div>
    );
  };

  const usesEntityMultiSelect = [
    'sensor',
    'light',
    'vacuum',
    'fan',
    'camera',
    'climate',
    'cover',
    'alarm',
    'media',
    'toggle',
    'entity',
  ].includes(addCardType);
  const usesMultiSelectWithCalendar = usesEntityMultiSelect || addCardType === 'calendar';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-3xl border p-5 font-sans shadow-2xl backdrop-blur-xl md:rounded-[2.5rem] md:p-8 lg:max-w-4xl"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-4 right-4 md:top-6 md:right-6"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-5 text-center text-xl font-light tracking-widest text-[var(--text-primary)] uppercase italic">
          {t('modal.addCard.title')}
        </h3>

        <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
          {addCardTargetPage !== 'header' && (
            <div className="relative mb-4">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder={t('addCard.search')}
                className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2.5 pr-4 pl-11 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          {addCardTargetPage !== 'header' && addCardTargetPage !== 'settings' && (
            <div className="mb-5">
              <p className="mb-2 ml-4 text-xs font-bold text-gray-500 uppercase">
                {t('addCard.cardType')}
              </p>
              <div className="flex flex-wrap gap-2">
                <TypeButton
                  type="sensor"
                  icon={Sparkles}
                  label={t('addCard.type.sensor')}
                  isActive={addCardType === 'sensor'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="light"
                  icon={Lightbulb}
                  label={t('addCard.type.light')}
                  isActive={addCardType === 'light'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="vacuum"
                  icon={Bot}
                  label={t('addCard.type.vacuum')}
                  isActive={addCardType === 'vacuum'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="fan"
                  icon={Fan}
                  label={t('addCard.type.fan')}
                  isActive={addCardType === 'fan'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="camera"
                  icon={Camera}
                  label={`${getLabel('addCard.type.camera', 'Camera')}${betaSuffix}`}
                  isActive={addCardType === 'camera'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="climate"
                  icon={Thermometer}
                  label={t('addCard.type.climate')}
                  isActive={addCardType === 'climate'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="cover"
                  icon={ArrowUpDown}
                  label={getLabel('addCard.type.cover', 'Cover')}
                  isActive={addCardType === 'cover'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="alarm"
                  icon={Shield}
                  label={getLabel('addCard.type.alarm', 'Alarm')}
                  isActive={addCardType === 'alarm'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="car"
                  icon={Car}
                  label={t('addCard.type.car')}
                  isActive={addCardType === 'car'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="androidtv"
                  icon={Gamepad2}
                  label={t('addCard.type.androidtv')}
                  isActive={addCardType === 'androidtv'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="cost"
                  icon={Coins}
                  label={t('addCard.type.cost')}
                  isActive={addCardType === 'cost'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="media"
                  icon={Music}
                  label={t('addCard.type.media')}
                  isActive={addCardType === 'media'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="weather"
                  icon={CloudSun}
                  label={t('addCard.type.weather')}
                  isActive={addCardType === 'weather'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="calendar"
                  icon={Calendar}
                  label={getLabel('addCard.type.calendar', 'Calendar')}
                  isActive={addCardType === 'calendar'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="todo"
                  icon={ListChecks}
                  label={getLabel('addCard.type.todo', 'Todo')}
                  isActive={addCardType === 'todo'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="nordpool"
                  icon={Zap}
                  label={t('addCard.type.nordpool')}
                  isActive={addCardType === 'nordpool'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="room"
                  icon={Home}
                  label={`${getLabel('addCard.type.room', 'Room')}${betaSuffix}`}
                  isActive={addCardType === 'room'}
                  onSelect={setAddCardType}
                />
                <TypeButton
                  type="spacer"
                  icon={Minus}
                  label={getLabel('addCard.type.spacer', 'Spacer')}
                  isActive={addCardType === 'spacer'}
                  onSelect={setAddCardType}
                />
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
            {addCardType === 'weather' ? (
              renderWeatherSection()
            ) : addCardType === 'androidtv' ? (
              renderAndroidTVSection()
            ) : addCardType === 'calendar' ? (
              renderCalendarSection()
            ) : addCardType === 'todo' ? (
              renderSimpleAddSection(
                ListChecks,
                t('addCard.todoDescription') ||
                  'Add a to-do card. You can select which list to use after adding.',
                t('addCard.add')
              )
            ) : addCardType === 'spacer' ? (
              renderSpacerSection()
            ) : addCardType === 'car' ? (
              renderSimpleAddSection(Car, t('addCard.carDescription'), t('addCard.carCard'))
            ) : addCardType === 'nordpool' ? (
              renderNordpoolSection()
            ) : addCardType === 'room' ? (
              <RoomSection
                conn={conn}
                searchTerm={searchTerm}
                t={t}
                selectedAreas={selectedRoomAreas}
                setSelectedAreas={setSelectedRoomAreas}
                selectedAreaEntitiesById={selectedRoomEntitiesById}
                setSelectedAreaEntitiesById={setSelectedRoomEntitiesById}
              />
            ) : (
              renderGenericEntityList()
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--glass-border)] pt-6">
          {usesMultiSelectWithCalendar && selectedEntities.length > 0 && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="h-5 w-5" />{' '}
              {addCardType === 'media'
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
              <Plus className="h-5 w-5" /> {t('addCard.costCard')}
            </button>
          )}
          {addCardType === 'weather' && selectedWeatherId && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="h-5 w-5" /> {t('addCard.weatherCard')}
            </button>
          )}
          {addCardType === 'nordpool' && selectedNordpoolId && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="h-5 w-5" /> {t('addCard.nordpoolCard')}
            </button>
          )}
          {addCardType === 'androidtv' && selectedAndroidTVMediaId && (
            <button onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus className="h-5 w-5" /> {t('addCard.add')}
            </button>
          )}
          {addCardType === 'room' && selectedRoomAreas.length > 0 && (
            <button
              onClick={() => onAddRoom && onAddRoom(selectedRoomAreas, selectedRoomEntitiesById)}
              className={PRIMARY_ADD_BUTTON}
            >
              <Plus className="h-5 w-5" />{' '}
              {`${t('addCard.add')} ${selectedRoomAreas.length} ${t('addCard.cards')}`}
            </button>
          )}
          <button
            onClick={onClose}
            className="popup-surface popup-surface-hover w-full rounded-2xl py-3 font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

const FLICKER_PRONE_TYPES = new Set(['androidtv', 'weather', 'nordpool']);

function areAddCardPropsEqual(prev, next) {
  const freezeType =
    FLICKER_PRONE_TYPES.has(prev.addCardType) && FLICKER_PRONE_TYPES.has(next.addCardType);
  if (!freezeType) return false;

  return (
    prev.addCardType === next.addCardType &&
    prev.addCardTargetPage === next.addCardTargetPage &&
    prev.searchTerm === next.searchTerm &&
    prev.selectedWeatherId === next.selectedWeatherId &&
    prev.selectedTempId === next.selectedTempId &&
    prev.selectedAndroidTVMediaId === next.selectedAndroidTVMediaId &&
    prev.selectedAndroidTVRemoteId === next.selectedAndroidTVRemoteId &&
    prev.selectedNordpoolId === next.selectedNordpoolId &&
    prev.nordpoolDecimals === next.nordpoolDecimals &&
    prev.t === next.t
  );
}

export default React.memo(AddCardContent, areAddCardPropsEqual);
