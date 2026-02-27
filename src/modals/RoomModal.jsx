import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
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
  inferUnitKind,
} from '../utils';
import M3Slider from '../components/ui/M3Slider';

const GROUPED_OTHER_DOMAINS = new Set([
  'binary_sensor',
  'sensor',
  'number',
  'select',
  'update',
  'input_number',
  'switch',
]);

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
  t,
}) {
  const [selectedClimateId, setSelectedClimateId] = useState(settings?.climateEntityId || null);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);

  const areaName = settings?.areaName || t('room.defaultName');
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
      return [
        {
          key: 'lock-toggle',
          label: state === 'locked' ? 'Unlock' : 'Lock',
          onClick: () =>
            handleEntityAction('lock', state === 'locked' ? 'unlock' : 'lock', entityId),
        },
      ];
    }

    if (domain === 'cover') {
      return [
        {
          key: 'open',
          label: 'Open',
          onClick: () => handleEntityAction('cover', 'open_cover', entityId),
        },
        {
          key: 'stop',
          label: 'Stop',
          onClick: () => handleEntityAction('cover', 'stop_cover', entityId),
        },
        {
          key: 'close',
          label: 'Close',
          onClick: () => handleEntityAction('cover', 'close_cover', entityId),
        },
      ];
    }

    if (domain === 'button' || domain === 'input_button') {
      return [
        {
          key: 'press',
          label: 'Press',
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
          label: 'Run',
          onClick: () => handleEntityAction(domain, 'turn_on', entityId),
        },
      ];
    }

    if (domain === 'vacuum') {
      const isCleaning = state === 'cleaning';
      return [
        {
          key: 'main',
          label: isCleaning ? 'Pause' : 'Start',
          onClick: () => handleEntityAction('vacuum', isCleaning ? 'pause' : 'start', entityId),
        },
        {
          key: 'dock',
          label: 'Dock',
          onClick: () => handleEntityAction('vacuum', 'return_to_base', entityId),
        },
      ];
    }

    if (domain === 'media_player') {
      const isPlaying = state === 'playing';
      return [
        {
          key: 'play-toggle',
          label: isPlaying ? 'Pause' : 'Play',
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

  const mediaSection =
    showPopupMedia && mediaPlayers.length > 0 ? (
      <section className="popup-surface space-y-3 rounded-3xl p-4">
        <button
          type="button"
          onClick={() => toggleSectionCollapsed('media')}
          className="flex w-full items-center justify-between text-left"
        >
          <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            <Tv className="h-4 w-4 text-[var(--accent-color)]" />
            {t('room.popupMedia') || 'Media'}
          </h4>
          <ChevronDown
            className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('media') ? '-rotate-90' : 'rotate-0'}`}
          />
        </button>

        {!isSectionCollapsed('media') && (
          <div className="custom-scrollbar max-h-[32vh] space-y-2 overflow-y-auto pr-1">
            <div className="px-1 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {t('room.mediaPlayersList') || 'Players'} ({mediaPlayers.length})
            </div>
            {orderedMediaPlayers.map(({ id, entity }) => {
              const cover = getEntityImageUrl?.(
                entity.attributes?.entity_picture || entity.attributes?.media_image_url
              );
              const isPlaying = entity.state === 'playing';
              return (
                <div
                  key={id}
                  className="relative overflow-hidden rounded-xl bg-[var(--glass-bg)]/70 px-3 py-2.5"
                >
                  {cover && (
                    <>
                      <img
                        src={cover}
                        alt=""
                        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-lg"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 to-black/5" />
                    </>
                  )}

                  <div className="relative z-10 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--glass-bg)]">
                      {cover ? (
                        <img src={cover} alt="Cover" className="h-full w-full object-cover" />
                      ) : (
                        <Tv className="h-5 w-5 text-[var(--text-secondary)]" />
                      )}
                    </div>

                    <div className="mr-2 min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[var(--text-primary)]">
                        {entity.attributes?.friendly_name || id}
                      </span>
                      <span className="block truncate text-[10px] text-[var(--text-secondary)]">
                        {entity.attributes?.media_title ||
                          entity.attributes?.media_artist ||
                          entity.attributes?.media_album_name ||
                          '—'}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleMediaAction(id, 'media_previous_track')}
                        className="popup-surface popup-surface-hover flex h-9 w-9 items-center justify-center rounded-xl"
                      >
                        <SkipBack className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMediaAction(id, 'media_play_pause')}
                        className="popup-surface popup-surface-hover flex h-10 w-10 items-center justify-center rounded-xl"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleMediaAction(id, 'media_next_track')}
                        className="popup-surface popup-surface-hover flex h-9 w-9 items-center justify-center rounded-xl"
                      >
                        <SkipForward className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative flex max-h-[88vh] w-full max-w-6xl flex-col rounded-3xl border px-7 pt-7 pb-5 font-sans shadow-2xl backdrop-blur-xl md:rounded-[3rem] md:px-12 md:pt-10 md:pb-8"
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

        <h3 className="mb-2 text-center text-xl font-light tracking-widest text-[var(--text-primary)] uppercase italic">
          {areaName}
        </h3>

        <div className="custom-scrollbar grid flex-1 grid-cols-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
          <div className="space-y-4">
            {showPopupClimate && climateEntities.length > 0 && (
              <section className="popup-surface space-y-3 rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapsed('climate')}
                    className="flex items-center justify-between gap-2 text-left"
                  >
                    <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                      <Flame className="h-4 w-4 text-red-400" />
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
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                        {t('room.tempSensor') || 'Temperature sensor'}
                      </div>
                      <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                        {displayCurrentClimateTemp}
                        {displayTemperatureUnit}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="rounded-2xl p-2.5"
                        style={{
                          backgroundColor: isCooling
                            ? 'rgba(59, 130, 246, 0.12)'
                            : isHeating
                              ? 'rgba(249, 115, 22, 0.12)'
                              : 'var(--glass-bg)',
                          color: isCooling
                            ? '#60a5fa'
                            : isHeating
                              ? '#fb923c'
                              : 'var(--text-secondary)',
                        }}
                      >
                        <Flame className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="truncate text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase"
                          title={activeClimateId || ''}
                        >
                          {activeClimate.attributes?.friendly_name || activeClimateId}
                        </div>
                      </div>
                    </div>

                    {climateControlsAvailable && hasTargetTempControl && (
                      <div className="mt-1 flex items-center gap-3">
                        <button
                          onClick={() => handleClimateStep(-0.5)}
                          className="popup-surface popup-surface-hover h-10 w-10 rounded-full text-lg"
                        >
                          −
                        </button>
                        <div className="flex-1">
                          <M3Slider
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
                          onClick={() => handleClimateStep(0.5)}
                          className="popup-surface popup-surface-hover h-10 w-10 rounded-full text-lg"
                        >
                          +
                        </button>
                      </div>
                    )}

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div
                        className="rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase"
                        style={{
                          backgroundColor: isCooling
                            ? 'rgba(59, 130, 246, 0.15)'
                            : isHeating
                              ? 'rgba(249, 115, 22, 0.15)'
                              : 'var(--glass-bg)',
                          color: isCooling
                            ? '#60a5fa'
                            : isHeating
                              ? '#fb923c'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {hvacAction}
                      </div>

                      {climateControlsAvailable && climateModes.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {climateModes.map((mode) => (
                            <button
                              key={mode}
                              onClick={() => handleSetClimateMode(mode)}
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${activeClimate.state === mode ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!climateControlsAvailable && (
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {t('room.noClimateControl') || 'Temperature sensor only'}
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {showPopupTempOverview && tempOverview.length > 0 && (
              <section className="popup-surface rounded-3xl p-4">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapsed('tempOverview')}
                  className="mb-3 flex w-full items-center justify-between text-left"
                >
                  <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                    <Thermometer className="h-4 w-4 text-[var(--accent-color)]" />
                    {t('room.popupTempOverview') || 'Temp overview'}
                  </h4>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('tempOverview') ? '-rotate-90' : 'rotate-0'}`}
                  />
                </button>
                {!isSectionCollapsed('tempOverview') && (
                  <div className="custom-scrollbar max-h-[28vh] space-y-2 overflow-y-auto pr-1">
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
                        <div
                          key={id}
                          className="flex items-center justify-between rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
                        >
                          <div className="mr-3 min-w-0" title={id}>
                            <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                              {entity.attributes?.friendly_name || id}
                            </div>
                          </div>
                          <div className="text-xs font-bold text-[var(--text-secondary)]">
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
              <section className="popup-surface space-y-3 rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapsed('lights')}
                    className="flex items-center justify-between gap-2 text-left"
                  >
                    <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      {t('room.popupLights') || 'Lights'}
                    </h4>
                    <ChevronDown
                      className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('lights') ? '-rotate-90' : 'rotate-0'}`}
                    />
                  </button>
                  {lights.length > 0 && !isSectionCollapsed('lights') && (
                    <button
                      onClick={handleToggleAllLights}
                      className="popup-surface popup-surface-hover rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
                    >
                      {lightsOn > 0 ? t('room.turnOffAll') : t('room.turnOnAll')}
                    </button>
                  )}
                </div>

                {!isSectionCollapsed('lights') && (
                  <div className="custom-scrollbar max-h-[30vh] space-y-2 overflow-y-auto pr-1">
                    {lights.map(({ id, entity }) => {
                      const brightness = entity.attributes?.brightness;
                      const brightnessPct = Number.isFinite(brightness)
                        ? Math.round((brightness / 255) * 100)
                        : entity.state === 'on'
                          ? 100
                          : 0;
                      const isOn = entity.state === 'on';
                      return (
                        <div key={id} className="px-1 py-2">
                          <div className="mb-2 flex items-center justify-between gap-2" title={id}>
                            <div className="min-w-0" title={id}>
                              <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                                {entity.attributes?.friendly_name || id}
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleEntity(id, 'light')}
                              className={`relative h-5 w-10 rounded-full transition-colors ${isOn ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-bg-hover)]'}`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isOn ? 'left-5' : 'left-0.5'}`}
                              />
                            </button>
                          </div>
                          <M3Slider
                            variant="thinLg"
                            min={0}
                            max={100}
                            step={1}
                            value={brightnessPct}
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
              <section className="popup-surface space-y-3 rounded-3xl p-4">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapsed('vacuum')}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                    <Bot className="h-4 w-4 text-[var(--accent-color)]" />
                    {t('room.popupVacuum') || 'Vacuum'}
                  </h4>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('vacuum') ? '-rotate-90' : 'rotate-0'}`}
                  />
                </button>

                {!isSectionCollapsed('vacuum') && (
                  <div className="custom-scrollbar max-h-[28vh] space-y-2 overflow-y-auto pr-1">
                    {orderedVacuums.map(({ id, entity }) => {
                      const isCleaning = entity.state === 'cleaning';
                      const battery = entity.attributes?.battery_level;
                      const picture = getEntityImageUrl?.(entity.attributes?.entity_picture);
                      return (
                        <div
                          key={id}
                          className="relative overflow-hidden rounded-xl bg-[var(--glass-bg)]/70 px-3 py-2.5"
                        >
                          {picture && (
                            <>
                              <img
                                src={picture}
                                alt=""
                                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-lg"
                              />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 to-black/5" />
                            </>
                          )}

                          <div className="relative z-10 flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--glass-bg)]">
                              {picture ? (
                                <img src={picture} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Bot className="h-5 w-5 text-[var(--text-secondary)]" />
                              )}
                            </div>

                            <div className="mr-2 min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-[var(--text-primary)]">
                                {entity.attributes?.friendly_name || id}
                              </span>
                              <span className="block truncate text-[10px] tracking-widest text-[var(--text-secondary)] uppercase">
                                {entity.state}
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
                                className="popup-surface popup-surface-hover flex h-10 items-center justify-center rounded-xl px-2.5 text-[10px] font-bold tracking-widest uppercase"
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

          <div className="space-y-4">
            {moveMediaToRight && mediaSection}
            {otherEntities.length > 0 && (
              <div className="space-y-4">
                {categorizedOtherEntities.map(([domain, items]) => (
                  <section key={domain} className="popup-surface rounded-3xl p-4">
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapsed(domain)}
                      className="mb-3 flex w-full items-center justify-between text-left"
                    >
                      <h4 className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                        {domain === 'other'
                          ? t('room.popupOtherGrouped') || 'Other entities'
                          : domain.replace('_', ' ')}
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
                                  <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                                    {entity.state}
                                  </span>
                                )}
                                {actions.map((action) =>
                                  action.kind === 'onoff-pills' ? (
                                    <div
                                      key={action.key}
                                      className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
                                    >
                                      <button
                                        onClick={action.onOn}
                                        className={`control-on rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all ${action.isOn ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                                      >
                                        {t('common.on') || 'On'}
                                      </button>
                                      <button
                                        onClick={action.onOff}
                                        className={`control-off rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all ${!action.isOn ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                                      >
                                        {t('common.off') || 'Off'}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      key={action.key}
                                      onClick={action.onClick}
                                      className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] px-2.5 py-1 text-[10px] font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors hover:bg-[var(--accent-color)]/20"
                                    >
                                      {action.label}
                                    </button>
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
              </div>
            )}

            {otherEntities.length === 0 && (
              <section className="popup-surface rounded-3xl p-4">
                <h4 className="mb-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                  {t('room.popupOtherIncluded') || 'Other included entities'}
                </h4>
                <div className="text-xs text-[var(--text-muted)]">{t('room.noEntities')}</div>
              </section>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--glass-border)] pt-5">
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
