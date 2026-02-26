import React, { useEffect, useMemo, useState } from 'react';
import { X, Lightbulb, Thermometer, Flame, Tv, Play, Pause, SkipForward, SkipBack, ChevronDown, Bot } from 'lucide-react';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode, getEffectiveRoomEntityIds, inferUnitKind } from '../utils';
import M3Slider from '../components/ui/M3Slider';

const GROUPED_OTHER_DOMAINS = new Set(['binary_sensor', 'sensor', 'number', 'select', 'update', 'input_number', 'switch']);

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

  const roomEntities = useMemo(() => roomEntityIds
    .map((id) => ({ id, entity: entities[id] }))
    .filter(({ entity }) => !!entity), [roomEntityIds, entities]);

  const lights = useMemo(() => roomEntities.filter(({ id }) => id.startsWith('light.')), [roomEntities]);
  const climateEntities = useMemo(() => roomEntities.filter(({ id }) => id.startsWith('climate.')), [roomEntities]);
  const mediaPlayers = useMemo(() => roomEntities.filter(({ id }) => id.startsWith('media_player.')), [roomEntities]);
  const vacuums = useMemo(() => roomEntities.filter(({ id }) => id.startsWith('vacuum.')), [roomEntities]);
  const tempOverview = useMemo(() => roomEntities.filter(({ id, entity }) => {
    if (id === settings?.tempEntityId || id === settings?.humidityEntityId) return true;
    const domain = id.split('.')[0];
    if (!['sensor', 'climate', 'weather'].includes(domain)) return false;
    const deviceClass = entity.attributes?.device_class;
    return ['temperature', 'humidity'].includes(deviceClass);
  }), [roomEntities, settings?.tempEntityId, settings?.humidityEntityId]);

  const activeClimateId = selectedClimateId && entities[selectedClimateId]
    ? selectedClimateId
    : (settings?.climateEntityId && entities[settings.climateEntityId] ? settings.climateEntityId : climateEntities[0]?.id || null);

  const activeClimate = activeClimateId ? entities[activeClimateId] : null;
  const climateModes = Array.isArray(activeClimate?.attributes?.hvac_modes) ? activeClimate.attributes.hvac_modes : [];
  const targetTemp = activeClimate?.attributes?.temperature;
  const sourceClimateTempUnit = activeClimate?.attributes?.temperature_unit
    || activeClimate?.attributes?.unit_of_measurement
    || haConfig?.unit_system?.temperature
    || haConfig?.temperature_unit
    || '°C';
  const displayTemperatureUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const displayCurrentClimateTemp = Number.isFinite(activeClimate?.attributes?.current_temperature)
    ? formatUnitValue(
      convertValueByKind(activeClimate.attributes.current_temperature, {
        kind: 'temperature',
        fromUnit: sourceClimateTempUnit,
        unitMode: effectiveUnitMode,
      }),
      { fallback: '--' },
    )
    : '--';
  const displayTargetTemp = Number.isFinite(targetTemp)
    ? formatUnitValue(
      convertValueByKind(targetTemp, {
        kind: 'temperature',
        fromUnit: sourceClimateTempUnit,
        unitMode: effectiveUnitMode,
      }),
      { fallback: '--' },
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
  const activeMedia = mediaPlayers.find(({ entity }) => entity.state === 'playing') || mediaPlayers[0] || null;
  const orderedMediaPlayers = useMemo(() => {
    if (!activeMedia) return mediaPlayers;
    return [
      activeMedia,
      ...mediaPlayers.filter(({ id }) => id !== activeMedia.id),
    ];
  }, [mediaPlayers, activeMedia]);
  const selectedVacuumId = settings?.vacuumEntityId && entities[settings.vacuumEntityId]
    ? settings.vacuumEntityId
    : (vacuums[0]?.id || null);
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

  const topEntityIds = useMemo(() => new Set([
    ...lights.map(({ id }) => id),
    ...climateEntities.map(({ id }) => id),
    ...mediaPlayers.map(({ id }) => id),
    ...vacuums.map(({ id }) => id),
    ...tempOverview.map(({ id }) => id),
  ]), [lights, climateEntities, mediaPlayers, vacuums, tempOverview]);

  const otherEntities = useMemo(
    () => roomEntities.filter(({ id }) => !topEntityIds.has(id)),
    [roomEntities, topEntityIds],
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
    if (showPopupLights && lights.length > 0) weight += Math.min(4, 1 + Math.ceil(lights.length / 4));
    if (showPopupVacuum && vacuums.length > 0) weight += 2;
    return weight;
  }, [showPopupClimate, climateEntities.length, showPopupTempOverview, tempOverview.length, showPopupLights, lights.length, showPopupVacuum, vacuums.length]);

  const rightColumnWeight = useMemo(() => {
    if (otherEntities.length === 0) return 1;
    return Math.max(1, categorizedOtherEntities.length);
  }, [otherEntities.length, categorizedOtherEntities.length]);

  const moveMediaToRight = showPopupMedia
    && mediaPlayers.length > 0
    && (leftColumnWeight - rightColumnWeight >= 2);

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
      return [{
        key: 'onoff',
        kind: 'onoff-pills',
        isOn,
        onOn: () => { if (!isOn) handleEntityAction(domain, 'turn_on', entityId); },
        onOff: () => { if (isOn) handleEntityAction(domain, 'turn_off', entityId); },
      }];
    }

    if (domain === 'lock') {
      return [{
        key: 'lock-toggle',
        label: state === 'locked' ? 'Unlock' : 'Lock',
        onClick: () => handleEntityAction('lock', state === 'locked' ? 'unlock' : 'lock', entityId),
      }];
    }

    if (domain === 'cover') {
      return [
        { key: 'open', label: 'Open', onClick: () => handleEntityAction('cover', 'open_cover', entityId) },
        { key: 'stop', label: 'Stop', onClick: () => handleEntityAction('cover', 'stop_cover', entityId) },
        { key: 'close', label: 'Close', onClick: () => handleEntityAction('cover', 'close_cover', entityId) },
      ];
    }

    if (domain === 'button' || domain === 'input_button') {
      return [{ key: 'press', label: 'Press', onClick: () => handleEntityAction(domain, 'press', entityId) }];
    }

    if (domain === 'automation') {
      return [{
        key: 'automation-onoff',
        kind: 'onoff-pills',
        isOn,
        onOn: () => { if (!isOn) handleEntityAction('automation', 'turn_on', entityId); },
        onOff: () => { if (isOn) handleEntityAction('automation', 'turn_off', entityId); },
      }];
    }

    if (domain === 'scene' || domain === 'script') {
      return [{ key: 'run', label: 'Run', onClick: () => handleEntityAction(domain, 'turn_on', entityId) }];
    }

    if (domain === 'vacuum') {
      const isCleaning = state === 'cleaning';
      return [
        { key: 'main', label: isCleaning ? 'Pause' : 'Start', onClick: () => handleEntityAction('vacuum', isCleaning ? 'pause' : 'start', entityId) },
        { key: 'dock', label: 'Dock', onClick: () => handleEntityAction('vacuum', 'return_to_base', entityId) },
      ];
    }

    if (domain === 'media_player') {
      const isPlaying = state === 'playing';
      return [{
        key: 'play-toggle',
        label: isPlaying ? 'Pause' : 'Play',
        onClick: () => handleEntityAction('media_player', isPlaying ? 'media_pause' : 'media_play', entityId),
      }];
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

  const mediaSection = showPopupMedia && mediaPlayers.length > 0 ? (
    <section className="popup-surface rounded-3xl p-4 space-y-3">
      <button
        type="button"
        onClick={() => toggleSectionCollapsed('media')}
        className="w-full flex items-center justify-between text-left"
      >
        <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] flex items-center gap-2">
          <Tv className="w-4 h-4 text-[var(--accent-color)]" />
          {t('room.popupMedia') || 'Media'}
        </h4>
        <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('media') ? '-rotate-90' : 'rotate-0'}`} />
      </button>

      {!isSectionCollapsed('media') && (
        <div className="space-y-2 max-h-[32vh] overflow-y-auto custom-scrollbar pr-1">
          <div className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] px-1">
            {t('room.mediaPlayersList') || 'Players'} ({mediaPlayers.length})
          </div>
          {orderedMediaPlayers.map(({ id, entity }) => {
            const cover = getEntityImageUrl?.(entity.attributes?.entity_picture || entity.attributes?.media_image_url);
            const isPlaying = entity.state === 'playing';
            return (
              <div key={id} className="relative rounded-xl px-3 py-2.5 bg-[var(--glass-bg)]/70 overflow-hidden">
                {cover && (
                  <>
                    <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 blur-lg scale-110 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-black/5 pointer-events-none" />
                  </>
                )}

                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-[var(--glass-bg)] flex items-center justify-center shrink-0">
                    {cover ? (
                      <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Tv className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 mr-2">
                    <span className="block text-xs font-bold text-[var(--text-primary)] truncate">{entity.attributes?.friendly_name || id}</span>
                    <span className="block text-[10px] text-[var(--text-secondary)] truncate">{entity.attributes?.media_title || entity.attributes?.media_artist || entity.attributes?.media_album_name || '—'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleMediaAction(id, 'media_previous_track')}
                      className="w-9 h-9 rounded-xl popup-surface popup-surface-hover flex items-center justify-center"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMediaAction(id, 'media_play_pause')}
                      className="w-10 h-10 rounded-xl popup-surface popup-surface-hover flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleMediaAction(id, 'media_next_track')}
                      className="w-9 h-9 rounded-xl popup-surface popup-surface-hover flex items-center justify-center"
                    >
                      <SkipForward className="w-4 h-4" />
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
        className="border w-full max-w-6xl max-h-[88vh] rounded-3xl md:rounded-[3rem] px-7 pt-7 pb-5 md:px-12 md:pt-10 md:pb-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 modal-close">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xl font-light mb-2 text-[var(--text-primary)] text-center uppercase tracking-widest italic">
          {areaName}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div className="space-y-4">
            {showPopupClimate && climateEntities.length > 0 && (
              <section className="popup-surface rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapsed('climate')}
                    className="flex items-center justify-between gap-2 text-left"
                  >
                    <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] flex items-center gap-2">
                      <Flame className="w-4 h-4 text-red-400" />
                      {t('room.popupClimate') || 'Climate'}
                    </h4>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('climate') ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                  {climateEntities.length > 1 && !isSectionCollapsed('climate') && (
                    <select
                      value={activeClimateId || ''}
                      onChange={(e) => setSelectedClimateId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl text-xs popup-surface text-[var(--text-secondary)]"
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
                  <div className="text-xs text-[var(--text-muted)] py-2">{t('room.noSensors') || 'No climate entity available'}</div>
                )}

                {!isSectionCollapsed('climate') && activeClimate && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{t('room.tempSensor') || 'Temperature sensor'}</div>
                      <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">{displayCurrentClimateTemp}{displayTemperatureUnit}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-2xl"
                        style={{
                          backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.12)' : isHeating ? 'rgba(249, 115, 22, 0.12)' : 'var(--glass-bg)',
                          color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : 'var(--text-secondary)',
                        }}
                      >
                        <Flame className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-bold truncate" title={activeClimateId || ''}>
                          {activeClimate.attributes?.friendly_name || activeClimateId}
                        </div>
                      </div>
                    </div>

                    {climateControlsAvailable && hasTargetTempControl && (
                      <div className="mt-1 flex items-center gap-3">
                        <button onClick={() => handleClimateStep(-0.5)} className="w-10 h-10 rounded-full popup-surface popup-surface-hover text-lg">−</button>
                        <div className="flex-1">
                          <M3Slider
                            min={climateMinTemp}
                            max={climateMaxTemp}
                            step={0.5}
                            value={targetTemp}
                            onChange={(event) => callService('climate', 'set_temperature', { entity_id: activeClimateId, temperature: Number(event.target.value) })}
                            colorClass={isHeating ? 'bg-orange-500' : 'bg-[var(--accent-color)]'}
                          />
                        </div>
                        <div className="min-w-[52px] text-right text-base font-bold text-[var(--text-primary)]">{displayTargetTemp}{displayTemperatureUnit}</div>
                        <button onClick={() => handleClimateStep(0.5)} className="w-10 h-10 rounded-full popup-surface popup-surface-hover text-lg">+</button>
                      </div>
                    )}

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div
                        className="px-3 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest"
                        style={{
                          backgroundColor: isCooling ? 'rgba(59, 130, 246, 0.15)' : isHeating ? 'rgba(249, 115, 22, 0.15)' : 'var(--glass-bg)',
                          color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : 'var(--text-secondary)',
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
                              className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold border transition-colors ${activeClimate.state === mode ? 'bg-[var(--glass-bg-hover)] border-[var(--glass-border)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!climateControlsAvailable && (
                      <div className="text-xs text-[var(--text-muted)] mt-1">
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
                  className="w-full flex items-center justify-between text-left mb-3"
                >
                  <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-[var(--accent-color)]" />
                    {t('room.popupTempOverview') || 'Temp overview'}
                  </h4>
                  <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('tempOverview') ? '-rotate-90' : 'rotate-0'}`} />
                </button>
                {!isSectionCollapsed('tempOverview') && (
                <div className="space-y-2 max-h-[28vh] overflow-y-auto custom-scrollbar pr-1">
                  {tempOverview.map(({ id, entity }) => {
                    const rawState = entity.state;
                    const unit = entity.attributes?.unit_of_measurement || '';
                    const isNumeric = /^\s*-?\d+(\.\d+)?\s*$/.test(rawState);
                    const kind = inferUnitKind(entity.attributes?.device_class, unit);
                    const converted = isNumeric && kind
                      ? convertValueByKind(parseFloat(rawState), { kind, fromUnit: unit, unitMode: effectiveUnitMode })
                      : (isNumeric ? parseFloat(rawState) : null);
                    const displayUnit = isNumeric && kind ? getDisplayUnitForKind(kind, effectiveUnitMode) : unit;
                    return (
                      <div key={id} className="rounded-xl px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-between">
                        <div className="min-w-0 mr-3" title={id}>
                          <div className="text-xs font-bold text-[var(--text-primary)] truncate">{entity.attributes?.friendly_name || id}</div>
                        </div>
                        <div className="text-xs font-bold text-[var(--text-secondary)]">
                          {isNumeric ? `${formatUnitValue(converted, { fallback: '--' })}${displayUnit}` : rawState}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </section>
            )}

            {showPopupLights && lights.length > 0 && (
              <section className="popup-surface rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapsed('lights')}
                    className="flex items-center justify-between gap-2 text-left"
                  >
                    <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      {t('room.popupLights') || 'Lights'}
                    </h4>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('lights') ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                  {lights.length > 0 && !isSectionCollapsed('lights') && (
                    <button
                      onClick={handleToggleAllLights}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest popup-surface popup-surface-hover text-[var(--text-secondary)]"
                    >
                      {lightsOn > 0 ? t('room.turnOffAll') : t('room.turnOnAll')}
                    </button>
                  )}
                </div>

                {!isSectionCollapsed('lights') && (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
                  {lights.map(({ id, entity }) => {
                    const brightness = entity.attributes?.brightness;
                    const brightnessPct = Number.isFinite(brightness) ? Math.round((brightness / 255) * 100) : (entity.state === 'on' ? 100 : 0);
                    const isOn = entity.state === 'on';
                    return (
                      <div key={id} className="px-1 py-2">
                        <div className="flex items-center justify-between gap-2 mb-2" title={id}>
                          <div className="min-w-0" title={id}>
                            <div className="text-xs font-bold text-[var(--text-primary)] truncate">{entity.attributes?.friendly_name || id}</div>
                          </div>
                          <button
                            onClick={() => handleToggleEntity(id, 'light')}
                            className={`w-10 h-5 rounded-full transition-colors relative ${isOn ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-bg-hover)]'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isOn ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </div>
                        <M3Slider
                          variant="thinLg"
                          min={0}
                          max={100}
                          step={1}
                          value={brightnessPct}
                          onChange={(event) => handleLightBrightness(id, Number(event.target.value))}
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
              <section className="popup-surface rounded-3xl p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapsed('vacuum')}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[var(--accent-color)]" />
                    {t('room.popupVacuum') || 'Vacuum'}
                  </h4>
                  <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed('vacuum') ? '-rotate-90' : 'rotate-0'}`} />
                </button>

                {!isSectionCollapsed('vacuum') && (
                  <div className="space-y-2 max-h-[28vh] overflow-y-auto custom-scrollbar pr-1">
                    {orderedVacuums.map(({ id, entity }) => {
                      const isCleaning = entity.state === 'cleaning';
                      const battery = entity.attributes?.battery_level;
                      const picture = getEntityImageUrl?.(entity.attributes?.entity_picture);
                      return (
                        <div key={id} className="relative rounded-xl px-3 py-2.5 bg-[var(--glass-bg)]/70 overflow-hidden">
                          {picture && (
                            <>
                              <img src={picture} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 blur-lg scale-110 pointer-events-none" />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-black/5 pointer-events-none" />
                            </>
                          )}

                          <div className="relative z-10 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-[var(--glass-bg)] flex items-center justify-center shrink-0">
                              {picture ? (
                                <img src={picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Bot className="w-5 h-5 text-[var(--text-secondary)]" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 mr-2">
                              <span className="block text-xs font-bold text-[var(--text-primary)] truncate">{entity.attributes?.friendly_name || id}</span>
                              <span className="block text-[10px] text-[var(--text-secondary)] truncate uppercase tracking-widest">
                                {entity.state}{Number.isFinite(battery) ? ` • ${battery}%` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEntityAction('vacuum', isCleaning ? 'pause' : 'start', id)}
                                className="w-10 h-10 rounded-xl popup-surface popup-surface-hover flex items-center justify-center"
                                aria-label={isCleaning ? (t('vacuum.pause') || 'Pause') : (t('vacuum.start') || 'Start')}
                              >
                                {isCleaning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleEntityAction('vacuum', 'return_to_base', id)}
                                className="px-2.5 h-10 rounded-xl popup-surface popup-surface-hover flex items-center justify-center text-[10px] font-bold uppercase tracking-widest"
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
                    className="w-full flex items-center justify-between mb-3 text-left"
                  >
                    <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)]">
                      {domain === 'other' ? (t('room.popupOtherGrouped') || 'Other entities') : domain.replace('_', ' ')}
                    </h4>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isSectionCollapsed(domain) ? '-rotate-90' : 'rotate-0'}`} />
                  </button>

                  {!isSectionCollapsed(domain) && (
                    <div className="space-y-1.5">
                    {items.map(({ id, entity }, index) => {
                      const actions = getOtherEntityActions(id, entity);
                      const hasOnOffPills = actions.some((action) => action.kind === 'onoff-pills');
                      return (
                        <div
                          key={id}
                          className={`px-2 py-2 flex items-center justify-between gap-3 ${index < items.length - 1 ? 'border-b border-[var(--glass-border)]/35' : ''}`}
                        >
                          <div className="min-w-0" title={id}>
                            <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{entity.attributes?.friendly_name || id}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {domain === 'other' && !hasOnOffPills && (
                              <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)]">
                                {entity.state}
                              </span>
                            )}
                            {actions.map((action) => (
                              action.kind === 'onoff-pills' ? (
                                <div key={action.key} className="shrink-0 flex items-center gap-1.5 whitespace-nowrap">
                                  <button
                                    onClick={action.onOn}
                                    className={`control-on px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${action.isOn ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
                                  >
                                    {t('common.on') || 'On'}
                                  </button>
                                  <button
                                    onClick={action.onOff}
                                    className={`control-off px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${!action.isOn ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
                                  >
                                    {t('common.off') || 'Off'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  key={action.key}
                                  onClick={action.onClick}
                                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)] hover:bg-[var(--accent-color)]/20 transition-colors"
                                >
                                  {action.label}
                                </button>
                              )
                            ))}
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
                <h4 className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2">
                  {t('room.popupOtherIncluded') || 'Other included entities'}
                </h4>
                <div className="text-xs text-[var(--text-muted)]">{t('room.noEntities')}</div>
              </section>
            )}
          </div>
        </div>

        <div className="pt-5 mt-4 border-t border-[var(--glass-border)]">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl popup-surface popup-surface-hover text-[var(--text-secondary)] font-bold uppercase tracking-widest transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
