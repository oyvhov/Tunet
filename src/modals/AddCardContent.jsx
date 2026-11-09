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
  Lock,
  Minus,
  Music,
  Speaker,
  Sprout,
  Plus,
  Search,
  Shield,
  Sparkles,
  Thermometer,
  Tv,
  Zap,
} from '../icons';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { isSonosMediaEntity, isToggleEntity } from '../utils';
import { getAreas, getEntitiesForArea } from '../services/haClient';
import AccessibleModalShell, { useModalShell } from '../components/ui/AccessibleModalShell';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { NO_PICK_TYPES } from '../hooks/useAddCard';
import { ModalBody, ModalFooter, ModalHeader } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';

const SELECTED_CONTAINER = 'bg-[var(--accent-bg)] border-[var(--accent-color)]';
const SELECTED_TEXT = 'text-[var(--accent-color)]';
const SELECTED_SUBTEXT = 'text-[var(--text-secondary)]';
const SELECTED_ICON =
  'bg-[var(--accent-bg)] border border-[var(--accent-color)] text-[var(--accent-color)]';
// One selected look (accent border + background). Focus only adds the global
// :focus-visible ring, so a chip that merely had focus never looks selected.
const CHIP_BASE =
  'flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ease-out';
const CHIP_IDLE =
  'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]';

const TypeButton = ({ type, icon: Icon, label, isActive, onSelect }) => (
  <button
    type="button"
    aria-pressed={isActive}
    onClick={() => onSelect(type)}
    className={`${CHIP_BASE} ${isActive ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : CHIP_IDLE}`}
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
      setSelectedAreas((prev) => prev.filter((item) => item.area_id !== areaId));
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
    <div className="space-y-3">
      <p className="modal-section-label">{t('addCard.selectArea')}</p>
      {loading && (
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">
          {t('addCard.loadingAreas')}
        </p>
      )}
      {!loading && filteredAreas.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">{t('addCard.noAreas')}</p>
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
              aria-pressed={isSelected}
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
                  className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
                >
                  {area.area_id}
                  {isSelected &&
                    !loadingEntities &&
                    ` — ${areaEntities.length} ${t('addCard.roomEntitiesFound')}`}
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-[var(--text-muted)] group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
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

/** Closes through the shell, so it asks before discarding picks just like the backdrop. */
function FooterCancelButton({ children }) {
  const shell = useModalShell();
  return (
    <Button variant="secondary" onClick={() => shell?.requestClose()}>
      {children}
    </Button>
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
  selectedAppleTVMediaId,
  setSelectedAppleTVMediaId,
  selectedAppleTVRemoteId,
  setSelectedAppleTVRemoteId,
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
  pendingAddCount = 0,
  onAddRoom,
  conn,
  getAddCardAvailableLabel,
  getAddCardNoneLeftLabel,
  t,
}) {
  const { confirm: confirmDiscard, dialog: discardDialog } = useConfirmDialog({
    cancel: t('common.cancel'),
    close: t('common.close'),
  });
  const [selectedRoomAreas, setSelectedRoomAreas] = useState([]);
  const [selectedRoomEntitiesById, setSelectedRoomEntitiesById] = useState({});
  const [localSpacerVariant, setLocalSpacerVariant] = useState(selectedSpacerVariant || 'divider');

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

  const lowerSearchTerm = searchTerm.toLowerCase();
  const entityIds = useMemo(() => Object.keys(entities), [entities]);
  const selectedEntitiesSet = useMemo(() => new Set(selectedEntities), [selectedEntities]);

  const getEntityName = useCallback(
    (id) => entities[id]?.attributes?.friendly_name || id,
    [entities]
  );

  const calendarOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'calendar') return [];
    return entityIds
      .filter((id) => id.startsWith('calendar.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const weatherOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'weather') return [];
    return entityIds
      .filter((id) => id.startsWith('weather.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const tempOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'weather') return [];
    return entityIds
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
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, entities, getEntityName]);

  const androidTVMediaOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'androidtv' && addCardType !== 'appletv') return [];
    return entityIds
      .filter((id) => id.startsWith('media_player.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const androidTVRemoteOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'androidtv' && addCardType !== 'appletv') return [];
    return entityIds
      .filter((id) => id.startsWith('remote.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const nordpoolOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'nordpool') return [];
    return entityIds
      .filter((id) => id.startsWith('sensor.') && id.toLowerCase().includes('nordpool'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const excludedOnPage = useMemo(
    () => new Set(pagesConfig[addCardTargetPage] || []),
    [pagesConfig, addCardTargetPage]
  );
  const excludedHeader = useMemo(() => new Set(pagesConfig.header || []), [pagesConfig]);
  const excludedSettings = useMemo(() => new Set(pagesConfig.settings || []), [pagesConfig]);

  /**
   * Reusable entity list item button.
   * @param {{ id: string, isSelected: boolean, onClick: (e?: any) => void, badgeText?: string, displayName?: string }} props
   */
  const EntityItem = ({ id, isSelected, onClick, badgeText, displayName }) => (
    <button
      type="button"
      key={id}
      aria-pressed={isSelected}
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
          className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
        >
          {id}
        </span>
      </div>
      {badgeText ? (
        <span className="rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[11px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
          {badgeText}
        </span>
      ) : (
        <div
          className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-[var(--text-muted)] group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </div>
      )}
    </button>
  );

  const filteredGenericEntityIds = useMemo(() => {
    return entityIds.filter((id) => {
      if (addCardTargetPage === 'header')
        return id.startsWith('person.') && !excludedHeader.has(id);
      if (addCardTargetPage === 'settings') return !excludedSettings.has(id);
      if (addCardType === 'lock') return id.startsWith('lock.') && !excludedOnPage.has(id);
      if (addCardType === 'vacuum') return id.startsWith('vacuum.') && !excludedOnPage.has(id);
      if (addCardType === 'mower') return id.startsWith('lawn_mower.') && !excludedOnPage.has(id);
      if (addCardType === 'fan') return id.startsWith('fan.') && !excludedOnPage.has(id);
      if (addCardType === 'camera') return id.startsWith('camera.');
      if (addCardType === 'cover') return id.startsWith('cover.');
      if (addCardType === 'climate') return id.startsWith('climate.');
      if (addCardType === 'alarm') return id.startsWith('alarm_control_panel.');
      if (addCardType === 'androidtv' || addCardType === 'appletv')
        return id.startsWith('media_player.') || id.startsWith('remote.');
      if (addCardType === 'cost') return id.startsWith('sensor.') || id.startsWith('input_number.');
      if (addCardType === 'media') return id.startsWith('media_player.');
      if (addCardType === 'sonos')
        return id.startsWith('media_player.') && isSonosMediaEntity(entities[id]);
      if (addCardType === 'sensor') {
        return (
          id.startsWith('sensor.') ||
          id.startsWith('script.') ||
          id.startsWith('scene.') ||
          id.startsWith('input_number.') ||
          id.startsWith('input_boolean.') ||
          id.startsWith('binary_sensor.') ||
          id.startsWith('switch.') ||
          id.startsWith('light.') ||
          id.startsWith('climate.') ||
          id.startsWith('button.') ||
          id.startsWith('input_button.') ||
          id.startsWith('automation.') ||
          id.startsWith('select.') ||
          id.startsWith('input_select.')
        );
      }
      if (addCardType === 'toggle') return isToggleEntity(id) && !excludedOnPage.has(id);
      if (addCardType === 'entity') {
        return !id.startsWith('person.') && !id.startsWith('update.') && !excludedOnPage.has(id);
      }
      return id.startsWith('light.') && !excludedOnPage.has(id);
    });
  }, [
    entityIds,
    addCardTargetPage,
    addCardType,
    excludedHeader,
    excludedOnPage,
    excludedSettings,
    entities,
  ]);

  const visibleGenericEntityIds = useMemo(() => {
    const sorted = filteredGenericEntityIds
      .filter((id) => {
        if (!lowerSearchTerm) return true;
        const name = getEntityName(id);
        return (
          id.toLowerCase().includes(lowerSearchTerm) || name.toLowerCase().includes(lowerSearchTerm)
        );
      })
      .sort((a, b) => getEntityName(a).localeCompare(getEntityName(b)));

    return addCardTargetPage === 'settings' ? sorted.slice(0, 100) : sorted;
  }, [filteredGenericEntityIds, lowerSearchTerm, addCardTargetPage, getEntityName]);

  const visibleWeatherOptions = useMemo(
    () =>
      weatherOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [weatherOptionsSnapshot, lowerSearchTerm]
  );

  const visibleTempOptions = useMemo(
    () =>
      tempOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [tempOptionsSnapshot, lowerSearchTerm]
  );

  const visibleAndroidTVMediaOptions = useMemo(
    () =>
      androidTVMediaOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [androidTVMediaOptionsSnapshot, lowerSearchTerm]
  );

  const visibleAndroidTVRemoteOptions = useMemo(
    () =>
      androidTVRemoteOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [androidTVRemoteOptionsSnapshot, lowerSearchTerm]
  );

  const visibleNordpoolOptions = useMemo(
    () =>
      nordpoolOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [nordpoolOptionsSnapshot, lowerSearchTerm]
  );

  // --- Render sections ---

  const renderWeatherSection = () => {
    return (
      <div className="space-y-8">
        <div>
          <p className="modal-section-label mb-3">{t('addCard.weatherRequired')}</p>
          <div className="space-y-3">
            {visibleWeatherOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedWeatherId === id}
                onClick={() => setSelectedWeatherId((prev) => (prev === id ? null : id))}
              />
            ))}
            {weatherOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                {t('addCard.noWeatherSensors')}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="modal-section-label mb-3">{t('addCard.tempSensorOptional')}</p>
          <div className="space-y-3">
            <button
              type="button"
              aria-pressed={!selectedTempId}
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
                  className={`truncate text-[11px] font-medium ${!selectedTempId ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
                >
                  weather.temperature
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${!selectedTempId ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-[var(--text-muted)] group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
              >
                {!selectedTempId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
            </button>
            {visibleTempOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedTempId === id}
                onClick={() => setSelectedTempId((prev) => (prev === id ? null : id))}
              />
            ))}
            {tempOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                {t('addCard.noTempSensors')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTVSection = (isAppleTV = false) => {
    const selectedMediaId = isAppleTV ? selectedAppleTVMediaId : selectedAndroidTVMediaId;
    const setSelectedMediaId = isAppleTV ? setSelectedAppleTVMediaId : setSelectedAndroidTVMediaId;
    const selectedRemoteId = isAppleTV ? selectedAppleTVRemoteId : selectedAndroidTVRemoteId;
    const setSelectedRemoteId = isAppleTV
      ? setSelectedAppleTVRemoteId
      : setSelectedAndroidTVRemoteId;

    return (
      <div className="space-y-8">
        <div>
          <p className="modal-section-label mb-3">{t('addCard.mediaPlayerRequired')}</p>
          <div className="space-y-3">
            {visibleAndroidTVMediaOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedMediaId === id}
                onClick={() => setSelectedMediaId((prev) => (prev === id ? null : id))}
              />
            ))}
            {androidTVMediaOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                {t('addCard.noMediaPlayers')}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="modal-section-label mb-3">{t('addCard.remoteOptional')}</p>
          <div className="space-y-3">
            <button
              type="button"
              aria-pressed={!selectedRemoteId}
              onClick={() => setSelectedRemoteId(null)}
              className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${!selectedRemoteId ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="mr-4 flex flex-col overflow-hidden">
                <span
                  className={`truncate text-sm font-bold transition-colors ${!selectedRemoteId ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                >
                  {t('addCard.noRemote')}
                </span>
                <span
                  className={`truncate text-[11px] font-medium ${!selectedRemoteId ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
                >
                  {t('addCard.mediaControlOnly')}
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${!selectedRemoteId ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-[var(--text-muted)] group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
              >
                {!selectedRemoteId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </div>
            </button>
            {visibleAndroidTVRemoteOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedRemoteId === id}
                onClick={() => setSelectedRemoteId((prev) => (prev === id ? null : id))}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSimpleAddSection = (Icon, description) => (
    <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
      <div className="popup-surface rounded-full border border-[var(--glass-border)] p-4 text-[var(--text-primary)]">
        <Icon className="h-8 w-8" />
      </div>
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  );

  const renderCalendarSection = () => {
    const visibleCalendars = calendarOptionsSnapshot.filter(
      ({ id, name }) =>
        !lowerSearchTerm ||
        id.toLowerCase().includes(lowerSearchTerm) ||
        name.toLowerCase().includes(lowerSearchTerm)
    );

    return (
      <div className="space-y-3">
        <p className="modal-section-label mb-1">
          {t('calendar.selectCalendars') || 'Select Calendars'}
        </p>
        <div className="space-y-3">
          {visibleCalendars.map(({ id, name }) => {
            const isSelected = selectedEntitiesSet.has(id);
            return (
              <button
                type="button"
                key={id}
                aria-pressed={isSelected}
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
                    className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
                  >
                    {id}
                  </span>
                </div>
                <div
                  className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-[var(--text-muted)] group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
                >
                  {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
              </button>
            );
          })}
          {calendarOptionsSnapshot.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">
              {t('calendar.noCalendarsFound') || 'No calendars found'}
            </p>
          )}
          {calendarOptionsSnapshot.length > 0 && visibleCalendars.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">
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
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">
        {t('addCard.spacerDescription') ||
          'Add a spacer or divider card. You can switch between spacer and divider in the edit settings.'}
      </p>
      <div className="w-full max-w-sm space-y-2">
        <p id="add-card-spacer-variant-label" className="modal-section-label">
          {t('addCard.spacer.selectVariant') || 'Select variant'}
        </p>
        <Segmented
          block
          ariaLabelledBy="add-card-spacer-variant-label"
          value={localSpacerVariant}
          onChange={(variant) => {
            setLocalSpacerVariant(variant);
            setSelectedSpacerVariant(variant);
          }}
          options={[
            { value: 'spacer', label: t('addCard.spacer.spacer') || 'Spacer' },
            { value: 'divider', label: t('addCard.spacer.divider') || 'Divider' },
          ]}
        />
      </div>
    </div>
  );

  const renderNordpoolSection = () => {
    return (
      <div className="space-y-8">
        <div>
          <p className="modal-section-label mb-3">{t('addCard.nordpoolSensorRequired')}</p>
          <div className="space-y-3">
            {visibleNordpoolOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedNordpoolId === id}
                onClick={() => setSelectedNordpoolId((prev) => (prev === id ? null : id))}
              />
            ))}
            {nordpoolOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                {t('addCard.noNordpoolSensors')}
              </p>
            )}
          </div>
        </div>
        <div>
          <p id="add-card-decimals-label" className="modal-section-label mb-2">
            {t('addCard.decimals')}
          </p>
          <Segmented
            ariaLabelledBy="add-card-decimals-label"
            value={nordpoolDecimals}
            onChange={setNordpoolDecimals}
            options={[0, 1, 2, 3].map((dec) => ({ value: dec, label: String(dec) }))}
          />
        </div>
      </div>
    );
  };

  const renderGenericEntityList = () => {
    return (
      <div>
        {addCardType === 'cost' && (
          <div className="mb-5">
            <p className="modal-section-label mb-2">{t('addCard.costPickTarget')}</p>
            <div className="flex flex-wrap gap-2">
              <TypeButton
                type="today"
                icon={Coins}
                label={t('addCard.costToday')}
                isActive={costSelectionTarget === 'today'}
                onSelect={setCostSelectionTarget}
              />
              <TypeButton
                type="month"
                icon={Coins}
                label={t('addCard.costMonth')}
                isActive={costSelectionTarget === 'month'}
                onSelect={setCostSelectionTarget}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
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
        <p className="modal-section-label mb-3">{getAddCardAvailableLabel()}</p>
        <div className="space-y-3">
          {visibleGenericEntityIds.map((id) => {
            const isSelected =
              addCardType === 'cost'
                ? selectedCostTodayId === id || selectedCostMonthId === id
                : selectedEntitiesSet.has(id);
            const isSelectedToday = selectedCostTodayId === id;
            const isSelectedMonth = selectedCostMonthId === id;
            return (
              <button
                type="button"
                key={id}
                aria-pressed={isSelected}
                onClick={() => {
                  if (addCardType === 'cost') {
                    if (costSelectionTarget === 'today') {
                      setSelectedCostTodayId((prev) => (prev === id ? null : id));
                      if (selectedCostTodayId !== id) setCostSelectionTarget('month');
                    } else {
                      setSelectedCostMonthId((prev) => (prev === id ? null : id));
                    }
                    return;
                  }
                  if (selectedEntitiesSet.has(id))
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
                    className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
                  >
                    {id}
                  </span>
                </div>
                {addCardType === 'cost' ? (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {isSelectedToday && (
                      <span className="rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[11px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
                        {t('addCard.costToday')}
                      </span>
                    )}
                    {isSelectedMonth && (
                      <span className="rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[11px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
                        {t('addCard.costMonth')}
                      </span>
                    )}
                    {!isSelected && (
                      <div className="rounded-full bg-[var(--glass-bg)] p-2 text-[var(--text-muted)] transition-colors group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]">
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'bg-[var(--glass-bg)] text-[var(--text-muted)] group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent-color)]'}`}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </div>
                )}
              </button>
            );
          })}
          {filteredGenericEntityIds.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">
              {getAddCardNoneLeftLabel()}
            </p>
          )}
        </div>
      </div>
    );
  };

  const addCount = selectedRoomAreas.length + pendingAddCount;
  // Todo, Car and Spacer have nothing to pick, so the button says what it will add.
  const noPickTypeName =
    addCount === 0 && NO_PICK_TYPES.has(addCardType) ? t(`addCard.type.${addCardType}`) : null;
  const addLabel = noPickTypeName
    ? `${t('addCard.add')} ${noPickTypeName}`
    : addCount > 1 || (addCount === 1 && NO_PICK_TYPES.has(addCardType))
      ? `${t('addCard.add')} ${addCount} ${t('addCard.cards')}`
      : t('addCard.add');
  const roomEntitiesLoading = selectedRoomAreas.some(
    (area) => !Array.isArray(selectedRoomEntitiesById[area.area_id])
  );
  const handleAdd = () => {
    const hasRooms = selectedRoomAreas.length > 0;
    if (hasRooms && pendingAddCount === 0) {
      if (onAddRoom) onAddRoom(selectedRoomAreas, selectedRoomEntitiesById);
      return;
    }
    onAddSelected({
      ...(addCardType === 'spacer' ? { spacerVariant: localSpacerVariant } : {}),
      ...(hasRooms
        ? { rooms: { areas: selectedRoomAreas, areaEntitiesById: selectedRoomEntitiesById } }
        : {}),
    });
  };

  // One half of a cost pair is not counted yet, but it is still a pick to lose.
  const canDiscardPicks = () =>
    (addCount === 0 && !selectedCostTodayId && !selectedCostMonthId) ||
    confirmDiscard({
      title: t('confirm.discardPicks.title'),
      message: t('confirm.discardPicks'),
      confirmLabel: t('common.discard'),
      destructive: true,
    });

  return (
    <AccessibleModalShell
      open
      onClose={onClose}
      beforeClose={canDiscardPicks}
      titleId="add-card-modal-title"
      size="l"
      placement="top"
    >
      {() => (
        <>
          <ModalHeader
            title={t('modal.addCard.title')}
            closeLabel={t('common.close') || 'Close'}
            onClose={onClose}
          />

          <ModalBody>
            {addCardTargetPage !== 'header' && (
              <div className="relative mb-4">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  data-autofocus
                  placeholder={t('addCard.search')}
                  className="w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2.5 pr-4 pl-11 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {addCardTargetPage !== 'header' && addCardTargetPage !== 'settings' && (
              <div className="mb-5">
                <p className="modal-section-label mb-2">{t('addCard.cardType')}</p>
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
                    type="lock"
                    icon={Lock}
                    label={getLabel('addCard.type.lock', 'Lock')}
                    isActive={addCardType === 'lock'}
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
                    type="mower"
                    icon={Sprout}
                    label={t('addCard.type.mower')}
                    isActive={addCardType === 'mower'}
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
                    type="appletv"
                    icon={Tv}
                    label={t('addCard.type.appletv')}
                    isActive={addCardType === 'appletv'}
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
                    type="sonos"
                    icon={Speaker}
                    label={t('addCard.type.sonos')}
                    isActive={addCardType === 'sonos'}
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
                    label={getLabel('addCard.type.room', 'Room')}
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
                renderTVSection(false)
              ) : addCardType === 'appletv' ? (
                renderTVSection(true)
              ) : addCardType === 'calendar' ? (
                renderCalendarSection()
              ) : addCardType === 'todo' ? (
                renderSimpleAddSection(
                  ListChecks,
                  t('addCard.todoDescription') ||
                    'Add a to-do card. You can select which list to use after adding.'
                )
              ) : addCardType === 'spacer' ? (
                renderSpacerSection()
              ) : addCardType === 'car' ? (
                renderSimpleAddSection(Car, t('addCard.carDescription'))
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
          </ModalBody>

          <ModalFooter>
            <FooterCancelButton>{t('common.cancel')}</FooterCancelButton>
            <Button
              variant="primary"
              icon={<Plus />}
              disabled={(addCount === 0 && !noPickTypeName) || roomEntitiesLoading}
              onClick={handleAdd}
              data-testid="add-card-submit"
            >
              {addLabel}
            </Button>
          </ModalFooter>

          {discardDialog}
        </>
      )}
    </AccessibleModalShell>
  );
}

const FLICKER_PRONE_TYPES = new Set(['androidtv', 'appletv', 'weather', 'nordpool']);

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
    prev.selectedAppleTVMediaId === next.selectedAppleTVMediaId &&
    prev.selectedAppleTVRemoteId === next.selectedAppleTVRemoteId &&
    prev.selectedNordpoolId === next.selectedNordpoolId &&
    prev.nordpoolDecimals === next.nordpoolDecimals &&
    prev.pendingAddCount === next.pendingAddCount &&
    prev.t === next.t
  );
}

export default React.memo(AddCardContent, areAddCardPropsEqual);
