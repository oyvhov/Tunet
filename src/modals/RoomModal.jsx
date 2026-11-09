import React, { useEffect, useMemo, useState } from 'react';
import {
  Lightbulb,
  Thermometer,
  Flame,
  Tv,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  Bot,
} from 'lucide-react';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  getEffectiveRoomEntityIds,
  getUnavailableLabel,
  inferUnitKind,
  isUnavailableState,
} from '../utils';
import M3Slider from '../components/ui/M3Slider';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import { getClimateStatus } from '../utils/climateStatus';

const GROUPED_OTHER_DOMAINS = new Set([
  'binary_sensor',
  'sensor',
  'number',
  'select',
  'update',
  'input_number',
  'switch',
]);

const HVAC_MODE_KEYS = {
  heat: 'heat',
  cool: 'cool',
  dry: 'dry',
  fan_only: 'fanOnly',
  heat_cool: 'heatCool',
  auto: 'auto',
  off: 'off',
};

const translateOr = (t, key, fallback) => {
  const value = t(key);
  return value && value !== key ? value : fallback;
};

/**
 * RoomModal – Detailed view of a room / area.
 * Shows all entities grouped by domain with quick controls.
 */
export default function RoomModal({
  show,
  onClose,
  settings,
  entities,
  conn,
  callService,
  getEntityImageUrl,
  onOpenLock,
  t,
}) {
  const [selectedClimateId, setSelectedClimateId] = useState(settings?.climateEntityId || null);
  const [failedImageMap, setFailedImageMap] = useState({});
  const [confirmUnlockId, setConfirmUnlockId] = useState(null);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);

  const markImageFailed = (src) => {
    if (!src) return;
    setFailedImageMap((prev) => {
      if (prev[src]) return prev;
      return { ...prev, [src]: true };
    });
  };

  const isImageAvailable = (src) => Boolean(src) && !failedImageMap[src];

  const areaName = settings?.areaName || t('room.defaultName');
  const modalTitleId = `room-modal-title-${String(settings?.areaId || settings?.areaName || 'room').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const collapseStorageKey = useMemo(() => {
    const roomKey = String(settings?.areaName || settings?.areaId || 'default')
      .toLowerCase()
      .replace(/\s+/g, '_');
    return `tunet_room_collapsed_${roomKey}`;
  }, [settings?.areaId, settings?.areaName]);
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try {
      const raw = localStorage.getItem(collapseStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const roomEntityIds = useMemo(() => getEffectiveRoomEntityIds(settings), [settings]);

  const roomEntities = useMemo(
    () =>
      roomEntityIds.map((id) => ({ id, entity: entities[id] })).filter(({ entity }) => !!entity),
    [roomEntityIds, entities]
  );

  const lights = useMemo(
    () => roomEntities.filter(({ id }) => id.startsWith('light.')),
    [roomEntities]
  );
  const climateEntities = useMemo(
    () => roomEntities.filter(({ id }) => id.startsWith('climate.')),
    [roomEntities]
  );
  const mediaPlayers = useMemo(
    () => roomEntities.filter(({ id }) => id.startsWith('media_player.')),
    [roomEntities]
  );
  const vacuums = useMemo(
    () => roomEntities.filter(({ id }) => id.startsWith('vacuum.')),
    [roomEntities]
  );
  const tempOverview = useMemo(
    () =>
      roomEntities.filter(({ id, entity }) => {
        if (id === settings?.tempEntityId || id === settings?.humidityEntityId) return true;
        const domain = id.split('.')[0];
        if (!['sensor', 'climate', 'weather'].includes(domain)) return false;
        const deviceClass = entity.attributes?.device_class;
        return ['temperature', 'humidity'].includes(deviceClass);
      }),
    [roomEntities, settings?.tempEntityId, settings?.humidityEntityId]
  );

  const activeClimateId =
    selectedClimateId && entities[selectedClimateId]
      ? selectedClimateId
      : settings?.climateEntityId && entities[settings.climateEntityId]
        ? settings.climateEntityId
        : climateEntities[0]?.id || null;

  const activeClimate = activeClimateId ? entities[activeClimateId] : null;
  const climateModes = Array.isArray(activeClimate?.attributes?.hvac_modes)
    ? activeClimate.attributes.hvac_modes
    : [];
  const targetTemp = activeClimate?.attributes?.temperature;
  const sourceClimateTempUnit =
    activeClimate?.attributes?.temperature_unit ||
    activeClimate?.attributes?.unit_of_measurement ||
    haConfig?.unit_system?.temperature ||
    haConfig?.temperature_unit ||
    '°C';
  const displayTemperatureUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const displayCurrentClimateTemp = Number.isFinite(activeClimate?.attributes?.current_temperature)
    ? formatUnitValue(
        convertValueByKind(activeClimate.attributes.current_temperature, {
          kind: 'temperature',
          fromUnit: sourceClimateTempUnit,
          unitMode: effectiveUnitMode,
        }),
        { fallback: '--' }
      )
    : '--';
  const displayTargetTemp = Number.isFinite(targetTemp)
    ? formatUnitValue(
        convertValueByKind(targetTemp, {
          kind: 'temperature',
          fromUnit: sourceClimateTempUnit,
          unitMode: effectiveUnitMode,
        }),
        { fallback: '--' }
      )
    : '--';
  const hvacAction = activeClimate?.attributes?.hvac_action || activeClimate?.state || 'idle';
  const isCooling = hvacAction === 'cooling';
  const isHeating = hvacAction === 'heating';
  const climateMinTemp = activeClimate?.attributes?.min_temp ?? 16;
  const climateMaxTemp = activeClimate?.attributes?.max_temp ?? 30;
  const hasTargetTempControl = Number.isFinite(targetTemp);
  const hasHvacModeControl = climateModes.length > 0;
  const climateControlsAvailable = hasTargetTempControl || hasHvacModeControl;
  const climateToneClass = isCooling
    ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
    : isHeating
      ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
      : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]';
  const climateStatusLabel = activeClimate
    ? translateOr(t, getClimateStatus(activeClimate).translationKey, hvacAction)
    : '';
  const climateModeOptions = climateModes.map((mode) => ({
    value: mode,
    label: HVAC_MODE_KEYS[mode]
      ? translateOr(t, `climate.hvac.${HVAC_MODE_KEYS[mode]}`, mode)
      : mode,
  }));

  const lightsOn = lights.filter(({ entity }) => entity.state === 'on').length;
  const activeMedia =
    mediaPlayers.find(({ entity }) => entity.state === 'playing') || mediaPlayers[0] || null;
  const orderedMediaPlayers = useMemo(() => {
    if (!activeMedia) return mediaPlayers;
    return [activeMedia, ...mediaPlayers.filter(({ id }) => id !== activeMedia.id)];
  }, [mediaPlayers, activeMedia]);
  const selectedVacuumId =
    settings?.vacuumEntityId && entities[settings.vacuumEntityId]
      ? settings.vacuumEntityId
      : vacuums[0]?.id || null;
  const orderedVacuums = useMemo(() => {
    if (!selectedVacuumId) return vacuums;
    return [
      ...vacuums.filter(({ id }) => id === selectedVacuumId),
      ...vacuums.filter(({ id }) => id !== selectedVacuumId),
    ];
  }, [vacuums, selectedVacuumId]);

  const showPopupClimate = settings?.showPopupClimate !== false;
  const showPopupLights = settings?.showPopupLights !== false;
  const showPopupTempOverview = settings?.showPopupTempOverview !== false;
  const showPopupMedia = settings?.showPopupMedia !== false;
  const showPopupVacuum = settings?.showPopupVacuum !== false;

  const topEntityIds = useMemo(
    () =>
      new Set([
        ...lights.map(({ id }) => id),
        ...climateEntities.map(({ id }) => id),
        ...mediaPlayers.map(({ id }) => id),
        ...vacuums.map(({ id }) => id),
        ...tempOverview.map(({ id }) => id),
      ]),
    [lights, climateEntities, mediaPlayers, vacuums, tempOverview]
  );

  const otherEntities = useMemo(
    () => roomEntities.filter(({ id }) => !topEntityIds.has(id)),
    [roomEntities, topEntityIds]
  );

  const categorizedOtherEntities = useMemo(() => {
    const grouped = otherEntities.reduce((acc, item) => {
      const domain = item.id.split('.')[0];
      const groupKey = GROUPED_OTHER_DOMAINS.has(domain) ? 'other' : domain;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {});
    return Object.entries(grouped).sort((a, b) => {
      if (a[0] === 'other') return 1;
      if (b[0] === 'other') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [otherEntities]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(collapseStorageKey);
      if (!raw) {
        setCollapsedSections({});
        return;
      }
      const parsed = JSON.parse(raw);
      setCollapsedSections(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setCollapsedSections({});
    }
  }, [collapseStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(collapseStorageKey, JSON.stringify(collapsedSections));
    } catch {
      // ignore persistence errors
    }
  }, [collapseStorageKey, collapsedSections]);

  const leftColumnWeight = useMemo(() => {
    let weight = 0;
    if (showPopupClimate && climateEntities.length > 0) weight += 3;
    if (showPopupTempOverview && tempOverview.length > 0) weight += 2;
    if (showPopupLights && lights.length > 0)
      weight += Math.min(4, 1 + Math.ceil(lights.length / 4));
    if (showPopupVacuum && vacuums.length > 0) weight += 2;
    return weight;
  }, [
    showPopupClimate,
    climateEntities.length,
    showPopupTempOverview,
    tempOverview.length,
    showPopupLights,
    lights.length,
    showPopupVacuum,
    vacuums.length,
  ]);

  const rightColumnWeight = useMemo(() => {
    if (otherEntities.length === 0) return 1;
    return Math.max(1, categorizedOtherEntities.length);
  }, [otherEntities.length, categorizedOtherEntities.length]);

  const moveMediaToRight =
    showPopupMedia && mediaPlayers.length > 0 && leftColumnWeight - rightColumnWeight >= 2;

  useEffect(() => {
    if (!confirmUnlockId) return undefined;
    const timeout = setTimeout(() => setConfirmUnlockId(null), 3000);
    return () => clearTimeout(timeout);
  }, [confirmUnlockId]);

  if (!show) return null;

  const handleToggleEntity = (entityId, domain) => {
    if (!conn || !callService) return;
    const entity = entities[entityId];
    if (!entity) return;
    const isOn = entity.state === 'on';
    if (['light', 'switch', 'fan', 'cover', 'input_boolean'].includes(domain)) {
      callService(domain, isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
    }
  };

  const handleToggleAllLights = () => {
    if (!conn || !callService) return;
    const service = lightsOn > 0 ? 'turn_off' : 'turn_on';
    lights.forEach(({ id }) => {
      callService('light', service, { entity_id: id });
    });
  };

  const handleLightBrightness = (entityId, value) => {
    if (!conn || !callService) return;
    if (value <= 0) {
      callService('light', 'turn_off', { entity_id: entityId });
      return;
    }
    callService('light', 'turn_on', { entity_id: entityId, brightness_pct: value });
  };

  const handleClimateStep = (step) => {
    if (!conn || !callService || !activeClimateId || !hasTargetTempControl) return;
    const current = Number(targetTemp);
    const next = Math.max(climateMinTemp, Math.min(climateMaxTemp, current + step));
    callService('climate', 'set_temperature', {
      entity_id: activeClimateId,
      temperature: next,
    });
  };

  const handleSetClimateMode = (mode) => {
    if (!conn || !callService || !activeClimateId) return;
    callService('climate', 'set_hvac_mode', { entity_id: activeClimateId, hvac_mode: mode });
  };

  const handleMediaAction = (entityId, action) => {
    if (!conn || !callService || !entityId) return;
    callService('media_player', action, { entity_id: entityId });
  };

  const handleEntityAction = (domain, action, entityId) => {
    if (!conn || !callService || !entityId) return;
    callService(domain, action, { entity_id: entityId });
  };

  const getOtherEntityActions = (entityId, entity) => {
    const domain = entityId.split('.')[0];
    const state = entity?.state;
    const isOn = state === 'on';

    if (['switch', 'fan', 'input_boolean', 'light'].includes(domain)) {
      return [
        {
          key: 'onoff',
          kind: 'onoff-pills',
          isOn,
          onOn: () => {
            if (!isOn) handleEntityAction(domain, 'turn_on', entityId);
          },
          onOff: () => {
            if (isOn) handleEntityAction(domain, 'turn_off', entityId);
          },
        },
      ];
    }

    if (domain === 'lock') {
      const isUnavailable = isUnavailableState(state);
      const isLocked = state === 'locked';
      const isConfirming = confirmUnlockId === entityId;
      const codeFormat = entity?.attributes?.code_format;
      // This row has no code field, so a lock that needs one goes to the lock popup.
      const requiresCode =
        typeof codeFormat === 'string' && !!codeFormat.trim() && codeFormat !== 'none';
      return [
        {
          key: 'lock-toggle',
          disabled: isUnavailable,
          variant: isConfirming ? 'destructive' : 'secondary',
          label: isUnavailable
            ? getUnavailableLabel(state, t)
            : !isLocked
              ? translateOr(t, 'lock.action.lock', 'Lock')
              : isConfirming
                ? translateOr(t, 'lock.action.confirmUnlock', 'Confirm unlock')
                : translateOr(t, 'lock.action.unlock', 'Unlock'),
          onClick: () => {
            if (isUnavailable) return;
            if (requiresCode) {
              onOpenLock?.(entityId);
              return;
            }
            if (isLocked && !isConfirming) {
              setConfirmUnlockId(entityId);
              return;
            }
            setConfirmUnlockId(null);
            handleEntityAction('lock', isLocked ? 'unlock' : 'lock', entityId);
          },
        },
      ];
    }

    if (domain === 'cover') {
      return [
        {
          key: 'open',
          label: translateOr(t, 'cover.presetOpen', 'Open'),
          onClick: () => handleEntityAction('cover', 'open_cover', entityId),
        },
        {
          key: 'stop',
          label: translateOr(t, 'cover.stop', 'Stop'),
          onClick: () => handleEntityAction('cover', 'stop_cover', entityId),
        },
        {
          key: 'close',
          label: translateOr(t, 'cover.presetClosed', 'Close'),
          onClick: () => handleEntityAction('cover', 'close_cover', entityId),
        },
      ];
    }

    if (domain === 'button' || domain === 'input_button') {
      return [
        {
          key: 'press',
          label: translateOr(t, 'roomExplorer.press', 'Press'),
          onClick: () => handleEntityAction(domain, 'press', entityId),
        },
      ];
    }

    if (domain === 'automation') {
      return [
        {
          key: 'automation-onoff',
          kind: 'onoff-pills',
          isOn,
          onOn: () => {
            if (!isOn) handleEntityAction('automation', 'turn_on', entityId);
          },
          onOff: () => {
            if (isOn) handleEntityAction('automation', 'turn_off', entityId);
          },
        },
      ];
    }

    if (domain === 'scene' || domain === 'script') {
      return [
        {
          key: 'run',
          label: translateOr(t, 'roomExplorer.run', 'Run'),
          onClick: () => handleEntityAction(domain, 'turn_on', entityId),
        },
      ];
    }

    if (domain === 'vacuum') {
      const isCleaning = state === 'cleaning';
      return [
        {
          key: 'main',
          label: isCleaning
            ? translateOr(t, 'roomExplorer.vacuum.pause', 'Pause')
            : translateOr(t, 'roomExplorer.vacuum.start', 'Start'),
          onClick: () => handleEntityAction('vacuum', isCleaning ? 'pause' : 'start', entityId),
        },
        {
          key: 'dock',
          label: translateOr(t, 'roomExplorer.vacuum.dock', 'Dock'),
          onClick: () => handleEntityAction('vacuum', 'return_to_base', entityId),
        },
      ];
    }

    if (domain === 'media_player') {
      const isPlaying = state === 'playing';
      return [
        {
          key: 'play-toggle',
          label: isPlaying
            ? translateOr(t, 'media.pause', 'Pause')
            : translateOr(t, 'media.play', 'Play'),
          onClick: () =>
            handleEntityAction('media_player', isPlaying ? 'media_pause' : 'media_play', entityId),
        },
      ];
    }

    return [];
  };

  const isSectionCollapsed = (domain) => collapsedSections[domain] === true;
  const toggleSectionCollapsed = (domain) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [domain]: !prev[domain],
    }));
  };

  const formatEntityState = (entity, prefix) => {
    const state = entity?.state;
    if (state == null || state === '') return '';
    if (prefix) {
      const domainLabel = translateOr(t, `${prefix}.${state}`, null);
      if (domainLabel) return domainLabel;
    }
    const label = translateOr(t, `roomExplorer.state.${state}`, null);
    if (label) return label;
    const unit = entity.attributes?.unit_of_measurement;
    return unit ? `${state} ${unit}` : state;
  };

  const sectionLabelClass = 'modal-section-label flex items-center gap-2';

  const mediaSection =
    showPopupMedia && mediaPlayers.length > 0 ? (
      <section className="space-y-3 p-4">
        <button
          type="button"
          onClick={() => toggleSectionCollapsed('media')}
          className="flex w-full items-center justify-between text-left"
        >
          <h4 className={sectionLabelClass}>
            <Tv className="h-4 w-4 text-[var(--accent-color)]" />
            {t('room.popupMedia') || 'Media'}
          </h4>
          <ChevronDown
            className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('media') ? '-rotate-90' : 'rotate-0'}`}
          />
        </button>

        {!isSectionCollapsed('media') && (
          <div className="space-y-1">
            {orderedMediaPlayers.map(({ id, entity }) => {
              const cover = getEntityImageUrl?.(
                entity.attributes?.entity_picture || entity.attributes?.media_image_url
              );
              const coverAvailable = isImageAvailable(cover);
              const isPlaying = entity.state === 'playing';
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--glass-bg)]/40 px-3 py-2.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--glass-bg)]">
                    {coverAvailable ? (
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => markImageFailed(cover)}
                      />
                    ) : (
                      <Tv className="h-5 w-5 text-[var(--text-secondary)]" />
                    )}
                  </div>

                  <div className="mr-2 min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-[var(--text-primary)]">
                      {entity.attributes?.friendly_name || id}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-secondary)]">
                      {entity.attributes?.media_title ||
                        entity.attributes?.media_artist ||
                        entity.attributes?.media_album_name ||
                        '—'}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => handleMediaAction(id, 'media_previous_track')}
                      aria-label={translateOr(t, 'media.previous', 'Previous track')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      <SkipBack className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMediaAction(id, 'media_play_pause')}
                      aria-label={
                        isPlaying
                          ? translateOr(t, 'media.pause', 'Pause')
                          : translateOr(t, 'media.play', 'Play')
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleMediaAction(id, 'media_next_track')}
                      aria-label={translateOr(t, 'media.next', 'Next track')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    ) : null;

  return (
    <AccessibleModalShell
      open={show}
      onClose={onClose}
      titleId={modalTitleId}
      size="l"
      placement="top"
    >
      {() => (
        <>
          <ModalHeader title={areaName} closeLabel={t('common.close')} onClose={onClose} />

          <ModalBody className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <div className="popup-surface popup-surface-group overflow-hidden rounded-[var(--modal-surface-radius)]">
              {showPopupClimate && climateEntities.length > 0 && (
                <section className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapsed('climate')}
                      className="flex items-center justify-between gap-2 text-left"
                    >
                      <h4 className={sectionLabelClass}>
                        <Flame className="h-4 w-4 text-[var(--status-error-fg)]" />
                        {t('room.popupClimate') || 'Climate'}
                      </h4>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('climate') ? '-rotate-90' : 'rotate-0'}`}
                      />
                    </button>
                    {climateEntities.length > 1 && !isSectionCollapsed('climate') && (
                      <select
                        value={activeClimateId || ''}
                        onChange={(e) => setSelectedClimateId(e.target.value)}
                        className="popup-surface rounded-xl px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                      >
                        {climateEntities.map(({ id, entity }) => (
                          <option key={id} value={id}>
                            {entity.attributes?.friendly_name || id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!isSectionCollapsed('climate') && !activeClimate && (
                    <div className="py-2 text-xs text-[var(--text-muted)]">
                      {t('room.noSensors') || 'No climate entity available'}
                    </div>
                  )}

                  {!isSectionCollapsed('climate') && activeClimate && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className={`rounded-2xl p-2.5 ${climateToneClass}`}>
                          <Flame className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase"
                            title={activeClimateId || ''}
                          >
                            {activeClimate.attributes?.friendly_name || activeClimateId}
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                          {displayCurrentClimateTemp}
                          {displayTemperatureUnit}
                        </div>
                      </div>

                      {climateControlsAvailable && hasTargetTempControl && (
                        <div className="mt-1 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleClimateStep(-0.5)}
                            className="popup-surface popup-surface-hover h-10 w-10 rounded-full text-lg"
                          >
                            −
                          </button>
                          <div className="flex-1">
                            <M3Slider
                              ariaLabel={t('climate.target')}
                              min={climateMinTemp}
                              max={climateMaxTemp}
                              step={0.5}
                              value={targetTemp}
                              onChange={(event) =>
                                callService('climate', 'set_temperature', {
                                  entity_id: activeClimateId,
                                  temperature: Number(event.target.value),
                                })
                              }
                              colorClass={isHeating ? 'bg-orange-500' : 'bg-[var(--accent-color)]'}
                            />
                          </div>
                          <div className="min-w-[52px] text-right text-base font-bold text-[var(--text-primary)]">
                            {displayTargetTemp}
                            {displayTemperatureUnit}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClimateStep(0.5)}
                            className="popup-surface popup-surface-hover h-10 w-10 rounded-full text-lg"
                          >
                            +
                          </button>
                        </div>
                      )}

                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div
                          className={`rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] uppercase ${climateToneClass}`}
                        >
                          {climateStatusLabel}
                        </div>

                        {climateControlsAvailable && climateModes.length > 0 && (
                          <Segmented
                            className="justify-end"
                            ariaLabel={translateOr(t, 'climate.mode', 'Mode')}
                            value={activeClimate.state}
                            onChange={handleSetClimateMode}
                            options={climateModeOptions}
                          />
                        )}
                      </div>

                      {!climateControlsAvailable && (
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {translateOr(t, 'room.noClimateControl', 'Temperature sensor only')}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {showPopupTempOverview && tempOverview.length > 0 && (
                <section className="p-4">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapsed('tempOverview')}
                    className="mb-3 flex w-full items-center justify-between text-left"
                  >
                    <h4 className={sectionLabelClass}>
                      <Thermometer className="h-4 w-4 text-[var(--accent-color)]" />
                      {t('room.popupTempOverview') || 'Temp overview'}
                    </h4>
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('tempOverview') ? '-rotate-90' : 'rotate-0'}`}
                    />
                  </button>
                  {!isSectionCollapsed('tempOverview') && (
                    <div className="space-y-2">
                      {tempOverview.map(({ id, entity }) => {
                        const rawState = entity.state;
                        const unit = entity.attributes?.unit_of_measurement || '';
                        const isNumeric = /^\s*-?\d+(\.\d+)?\s*$/.test(rawState);
                        const kind = inferUnitKind(entity.attributes?.device_class, unit);
                        const converted =
                          isNumeric && kind
                            ? convertValueByKind(parseFloat(rawState), {
                                kind,
                                fromUnit: unit,
                                unitMode: effectiveUnitMode,
                              })
                            : isNumeric
                              ? parseFloat(rawState)
                              : null;
                        const displayUnit =
                          isNumeric && kind ? getDisplayUnitForKind(kind, effectiveUnitMode) : unit;
                        return (
                          <div key={id} className="flex items-center justify-between px-1 py-1.5">
                            <div className="mr-3 min-w-0" title={id}>
                              <div className="truncate text-xs text-[var(--text-secondary)]">
                                {entity.attributes?.friendly_name || id}
                              </div>
                            </div>
                            <div className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                              {isNumeric
                                ? `${formatUnitValue(converted, { fallback: '--' })}${displayUnit}`
                                : rawState}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {showPopupLights && lights.length > 0 && (
                <section className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapsed('lights')}
                      className="flex items-center justify-between gap-2 text-left"
                    >
                      <h4 className={sectionLabelClass}>
                        <Lightbulb className="h-4 w-4 text-amber-400" />
                        {t('room.popupLights') || 'Lights'}
                      </h4>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('lights') ? '-rotate-90' : 'rotate-0'}`}
                      />
                    </button>
                    {lights.length > 0 && !isSectionCollapsed('lights') && (
                      <Button size="sm" variant="secondary" onClick={handleToggleAllLights}>
                        {lightsOn > 0 ? t('room.turnOffAll') : t('room.turnOnAll')}
                      </Button>
                    )}
                  </div>

                  {!isSectionCollapsed('lights') && (
                    <div className="space-y-2">
                      {lights.map(({ id, entity }) => {
                        const brightness = entity.attributes?.brightness;
                        const brightnessPct = Number.isFinite(brightness)
                          ? Math.round((brightness / 255) * 100)
                          : entity.state === 'on'
                            ? 100
                            : 0;
                        const isOn = entity.state === 'on';
                        const isLightUnavailable = isUnavailableState(entity.state);
                        return (
                          <div key={id} className="px-1 py-2">
                            <div
                              className="mb-2 flex items-center justify-between gap-2"
                              title={id}
                            >
                              <div className="min-w-0" title={id}>
                                <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                                  {entity.attributes?.friendly_name || id}
                                </div>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isOn}
                                aria-label={entity.attributes?.friendly_name || id}
                                disabled={isLightUnavailable}
                                onClick={() => handleToggleEntity(id, 'light')}
                                className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <span
                                  className={`relative h-5 w-10 rounded-full transition-colors ${isOn ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-bg-hover)]'}`}
                                >
                                  <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isOn ? 'left-5' : 'left-0.5'}`}
                                  />
                                </span>
                              </button>
                            </div>
                            <M3Slider
                              ariaLabel={t('light.brightness')}
                              variant="thinLg"
                              min={0}
                              max={100}
                              step={1}
                              value={brightnessPct}
                              disabled={isLightUnavailable}
                              onChange={(event) =>
                                handleLightBrightness(id, Number(event.target.value))
                              }
                              colorClass="bg-amber-500"
                            />
                            <div className="mt-2 h-px bg-[var(--glass-border)]/35" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {showPopupVacuum && vacuums.length > 0 && (
                <section className="space-y-3 p-4">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapsed('vacuum')}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <h4 className={sectionLabelClass}>
                      <Bot className="h-4 w-4 text-[var(--accent-color)]" />
                      {t('room.popupVacuum') || 'Vacuum'}
                    </h4>
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('vacuum') ? '-rotate-90' : 'rotate-0'}`}
                    />
                  </button>

                  {!isSectionCollapsed('vacuum') && (
                    <div className="space-y-2">
                      {orderedVacuums.map(({ id, entity }) => {
                        const isCleaning = entity.state === 'cleaning';
                        const battery = entity.attributes?.battery_level;
                        const picture = getEntityImageUrl?.(entity.attributes?.entity_picture);
                        const pictureAvailable = isImageAvailable(picture);
                        return (
                          <div
                            key={id}
                            className="relative overflow-hidden rounded-xl bg-[var(--glass-bg)]/70 px-3 py-2.5"
                          >
                            {pictureAvailable && (
                              <>
                                <img
                                  src={picture}
                                  alt=""
                                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-lg"
                                  onError={() => markImageFailed(picture)}
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 to-black/5" />
                              </>
                            )}

                            <div className="relative z-10 flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--glass-bg)]">
                                {pictureAvailable ? (
                                  <img
                                    src={picture}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    onError={() => markImageFailed(picture)}
                                  />
                                ) : (
                                  <Bot className="h-5 w-5 text-[var(--text-secondary)]" />
                                )}
                              </div>

                              <div className="mr-2 min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-[var(--text-primary)]">
                                  {entity.attributes?.friendly_name || id}
                                </span>
                                <span className="block truncate text-[11px] tracking-[0.08em] text-[var(--text-secondary)] uppercase">
                                  {formatEntityState(entity, 'vacuum')}
                                  {Number.isFinite(battery) ? ` • ${battery}%` : ''}
                                </span>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    handleEntityAction('vacuum', isCleaning ? 'pause' : 'start', id)
                                  }
                                  className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl"
                                  aria-label={
                                    isCleaning
                                      ? t('vacuum.pause') || 'Pause'
                                      : t('vacuum.start') || 'Start'
                                  }
                                >
                                  {isCleaning ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleEntityAction('vacuum', 'return_to_base', id)}
                                  className="popup-surface popup-surface-hover flex h-10 items-center justify-center rounded-xl px-2.5 text-[11px] font-bold tracking-[0.08em] uppercase"
                                >
                                  {t('vacuum.home') || 'Home'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {!moveMediaToRight && mediaSection}
            </div>

            <div className="popup-surface popup-surface-group overflow-hidden rounded-[var(--modal-surface-radius)]">
              {moveMediaToRight && mediaSection}
              {otherEntities.length > 0 &&
                categorizedOtherEntities.map(([domain, items]) => (
                  <section key={domain} className="p-4">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapsed(domain)}
                      className="mb-3 flex w-full items-center justify-between text-left"
                    >
                      <h4 className="modal-section-label">
                        {domain === 'other'
                          ? t('room.popupOtherGrouped') || 'Other entities'
                          : translateOr(
                              t,
                              `roomExplorer.domain.${domain}`,
                              domain.replace('_', ' ')
                            )}
                      </h4>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed(domain) ? '-rotate-90' : 'rotate-0'}`}
                      />
                    </button>

                    {!isSectionCollapsed(domain) && (
                      <div className="space-y-1.5">
                        {items.map(({ id, entity }, index) => {
                          const actions = getOtherEntityActions(id, entity);
                          const hasOnOffPills = actions.some(
                            (action) => action.kind === 'onoff-pills'
                          );
                          return (
                            <div
                              key={id}
                              className={`flex items-center justify-between gap-3 px-2 py-2 ${index < items.length - 1 ? 'border-b border-[var(--glass-border)]/35' : ''}`}
                            >
                              <div className="min-w-0" title={id}>
                                <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                                  {entity.attributes?.friendly_name || id}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {domain === 'other' && !hasOnOffPills && (
                                  <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                                    {formatEntityState(entity)}
                                  </span>
                                )}
                                {actions.map((action) =>
                                  action.kind === 'onoff-pills' ? (
                                    <Segmented
                                      key={action.key}
                                      ariaLabel={entity.attributes?.friendly_name || id}
                                      value={action.isOn ? 'on' : 'off'}
                                      onChange={(value) =>
                                        value === 'on' ? action.onOn() : action.onOff()
                                      }
                                      options={[
                                        { value: 'on', label: t('common.on') || 'On' },
                                        { value: 'off', label: t('common.off') || 'Off' },
                                      ]}
                                    />
                                  ) : (
                                    <Button
                                      key={action.key}
                                      size="sm"
                                      variant={action.variant || 'secondary'}
                                      disabled={action.disabled}
                                      onClick={action.onClick}
                                    >
                                      {action.label}
                                    </Button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))}

              {otherEntities.length === 0 && (
                <section className="p-4">
                  <h4 className="modal-section-label">
                    {translateOr(t, 'room.popupOtherIncluded', 'Other included entities')}
                  </h4>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    {t('room.noEntities')}
                  </div>
                </section>
              )}
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
