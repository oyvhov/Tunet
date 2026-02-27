import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Home, Thermometer, Lightbulb, Tv, Activity, Bot } from 'lucide-react';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { getIconComponent } from '../../icons';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveRoomEntityIds,
  getEffectiveUnitMode,
} from '../../utils';

/**
 * RoomCard – shows a summary of a Home Assistant area (room).
 * Redesigned with elegant glass styling and animated control switching.
 */
export default function RoomCard({
  cardId,
  settings,
  entities,
  conn,
  callService,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  onOpen,
  t,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);

  const areaName = customNames?.[cardId] || settings?.areaName || t('room.defaultName');
  const roomIconName = customIcons?.[cardId] || settings?.icon || settings?.areaIcon;
  const RoomIcon = roomIconName ? getIconComponent(roomIconName, Home) || Home : Home;
  const isMdiRoomIcon = typeof roomIconName === 'string' && roomIconName.startsWith('mdi:');
  const watermarkSize = isMdiRoomIcon ? '200px' : 208;
  const watermarkPositionClass = isMdiRoomIcon
    ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/4'
    : '-right-14 top-1/2 -translate-y-1/2';

  const showLights = settings?.showLights !== false;
  const showTemp = settings?.showTemp !== false;
  const showMotion = settings?.showMotion !== false;
  const showLightChip = settings?.showLightChip !== false;
  const showMediaChip = settings?.showMediaChip !== false;
  const showActiveChip = settings?.showActiveChip !== false;
  const showVacuumChip = settings?.showVacuumChip !== false;
  const showOccupiedIndicator = settings?.showOccupiedIndicator !== false;
  const showIconWatermark = settings?.showIconWatermark !== false;
  const cardRef = useRef(null);
  const chipContainerRef = useRef(null);
  const [isSpacious, setIsSpacious] = useState(false);
  const [forceCompactPills, setForceCompactPills] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const updateByWidth = (width) => {
      setIsSpacious((prev) => {
        if (prev) return width >= 372;
        return width >= 388;
      });
      setForceCompactPills(false);
    };

    updateByWidth(element.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? element.clientWidth;
      updateByWidth(width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const useLargePills = isSpacious && !forceCompactPills;

  const chipContainerClass = useLargePills
    ? 'mt-5 flex flex-wrap items-start justify-start gap-3.5 w-full max-w-none pb-1'
    : 'mt-5 flex flex-wrap items-start justify-start gap-3 max-w-[232px] pb-1';
  const chipClass = useLargePills
    ? 'flex items-center gap-2.5 px-4.5 py-2 rounded-full backdrop-blur-sm'
    : 'flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-sm';
  const chipTextClass = useLargePills
    ? 'text-[15px] tracking-wide font-bold uppercase'
    : 'text-[13px] tracking-wider font-bold uppercase';
  const chipIconClass = useLargePills ? 'w-[18px] h-[18px]' : 'w-[14px] h-[14px]';

  const roomEntityIds = useMemo(() => getEffectiveRoomEntityIds(settings), [settings]);

  const lightIds = useMemo(() => {
    return roomEntityIds.filter((id) => id.startsWith('light.'));
  }, [roomEntityIds]);

  const mediaPlayerIds = useMemo(
    () => roomEntityIds.filter((id) => id.startsWith('media_player.')),
    [roomEntityIds]
  );
  const vacuumIds = useMemo(
    () => roomEntityIds.filter((id) => id.startsWith('vacuum.')),
    [roomEntityIds]
  );

  const mainLightId = useMemo(() => {
    if (settings?.mainLightEntityId && entities[settings.mainLightEntityId])
      return settings.mainLightEntityId;
    return lightIds[0] || null;
  }, [settings?.mainLightEntityId, entities, lightIds]);

  const climateId = useMemo(
    () => settings?.climateEntityId || roomEntityIds.find((id) => id.startsWith('climate.')),
    [roomEntityIds, settings]
  );
  const tempId = useMemo(() => {
    return (
      settings?.tempEntityId ||
      roomEntityIds.find((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'temperature' ||
            id.includes('temperature') ||
            id.includes('temp'))
        );
      })
    );
  }, [roomEntityIds, entities, settings]);

  const motionId = useMemo(() => {
    return (
      settings?.motionEntityId ||
      roomEntityIds.find((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'motion' ||
            e.attributes?.device_class === 'occupancy' ||
            e.attributes?.device_class === 'presence')
        );
      })
    );
  }, [roomEntityIds, entities, settings]);

  const lightsOnCount = lightIds.filter((id) => entities[id]?.state === 'on').length;
  const mediaPlayingCount = mediaPlayerIds.filter((id) => entities[id]?.state === 'playing').length;
  const activeVacuum = useMemo(
    () =>
      vacuumIds.map((id) => entities[id]).find((entity) => entity && entity.state !== 'docked') ||
      null,
    [vacuumIds, entities]
  );
  const isMainLightOn = mainLightId ? entities[mainLightId]?.state === 'on' : false;

  const climateEntity = climateId ? entities[climateId] : null;
  const tempEntity = tempId ? entities[tempId] : null;
  const motionEntity = motionId ? entities[motionId] : null;
  const sourceTempUnit =
    tempEntity?.attributes?.unit_of_measurement ||
    climateEntity?.attributes?.temperature_unit ||
    climateEntity?.attributes?.unit_of_measurement ||
    haConfig?.unit_system?.temperature ||
    haConfig?.temperature_unit ||
    '°C';
  const displayTempUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const currentTemp = useMemo(() => {
    if (tempEntity) {
      const parsed = Number.parseFloat(tempEntity.state);
      if (Number.isFinite(parsed)) return parsed;
    }

    const climateTemp = climateEntity?.attributes?.current_temperature;
    if (Number.isFinite(climateTemp)) return climateTemp;

    return null;
  }, [tempEntity, climateEntity]);
  const [stableTemp, setStableTemp] = useState(currentTemp);

  useEffect(() => {
    if (currentTemp !== null) {
      setStableTemp(currentTemp);
    }
  }, [currentTemp]);

  const displayTemp = stableTemp ?? currentTemp;
  const displayTempValue = useMemo(() => {
    if (!Number.isFinite(displayTemp)) return null;
    const converted = convertValueByKind(displayTemp, {
      kind: 'temperature',
      fromUnit: sourceTempUnit,
      unitMode: effectiveUnitMode,
    });
    return formatUnitValue(converted, { fallback: '--' });
  }, [displayTemp, sourceTempUnit, effectiveUnitMode]);
  const isOccupied = motionEntity?.state === 'on';
  const occupancyPillLabel = useMemo(() => {
    const deviceClass = motionEntity?.attributes?.device_class;
    if (deviceClass === 'motion') return t('room.motionShort') || 'Motion';
    return t('binary.occupancy.occupied') || 'Occupancy';
  }, [motionEntity, t]);
  const hasMainLightToggle = !!mainLightId;
  const vacuumStatusLabel = useMemo(() => {
    if (!activeVacuum) return null;
    switch (activeVacuum.state) {
      case 'cleaning':
        return t('room.vacuumStatus.cleaning') || 'Cleaning';
      case 'returning':
      case 'returning_home':
        return t('room.vacuumStatus.goingHome') || 'Going home';
      case 'error':
        return t('room.vacuumStatus.error') || 'Error';
      case 'paused':
      case 'idle':
      case 'stopped':
        return t('room.vacuumStatus.stopped') || 'Stopped';
      default:
        return activeVacuum.state;
    }
  }, [activeVacuum, t]);
  const vacuumPillToneClass = useMemo(() => {
    switch (activeVacuum?.state) {
      case 'cleaning':
        return 'bg-emerald-500/14 text-emerald-300';
      case 'returning':
      case 'returning_home':
        return 'bg-sky-500/14 text-sky-300';
      case 'error':
        return 'bg-red-500/14 text-red-300';
      case 'paused':
      case 'idle':
      case 'stopped':
        return 'bg-amber-500/14 text-amber-300';
      default:
        return 'bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]';
    }
  }, [activeVacuum]);

  const activeDeviceCount = useMemo(() => {
    const toggleDomains = new Set(['switch', 'fan', 'cover', 'climate', 'media_player']);
    return roomEntityIds.filter((entityId) => {
      const entity = entities[entityId];
      if (!entity) return false;
      const domain = entityId.split('.')[0];
      if (!toggleDomains.has(domain)) return false;
      if (domain === 'media_player') return entity.state === 'playing';
      if (domain === 'climate')
        return entity.state && !['off', 'unavailable', 'unknown'].includes(entity.state);
      if (domain === 'cover') return ['opening', 'open'].includes(entity.state);
      return entity.state === 'on';
    }).length;
  }, [roomEntityIds, entities]);

  const visiblePillCount =
    (showMotion && showOccupiedIndicator && isOccupied ? 1 : 0) +
    (showTemp && Boolean(displayTempValue) ? 1 : 0) +
    (showLightChip && showLights && lightsOnCount > 0 ? 1 : 0) +
    (showMediaChip && mediaPlayingCount > 0 ? 1 : 0) +
    (showActiveChip && activeDeviceCount > 0 ? 1 : 0) +
    (showVacuumChip && Boolean(vacuumStatusLabel) ? 1 : 0);

  useEffect(() => {
    setForceCompactPills(false);
  }, [visiblePillCount]);

  useEffect(() => {
    if (!isSpacious || forceCompactPills) return;
    const container = chipContainerRef.current;
    if (!container) return;

    let cancelled = false;
    const frame = globalThis.requestAnimationFrame(() => {
      if (cancelled) return;
      const children = Array.from(container.children);
      if (children.length <= 1) return;
      const rowTops = [];
      children.forEach((child) => {
        const top = child.offsetTop;
        if (!rowTops.some((value) => Math.abs(value - top) <= 1)) {
          rowTops.push(top);
        }
      });
      const wrapsToSecondRow = rowTops.length > 1;
      if (wrapsToSecondRow) setForceCompactPills(true);
    });

    return () => {
      cancelled = true;
      globalThis.cancelAnimationFrame(frame);
    };
  }, [isSpacious, forceCompactPills, visiblePillCount]);

  const handleMainLightToggle = useCallback(
    (e) => {
      e.stopPropagation();
      if (!conn || !mainLightId) return;
      const isOn = entities[mainLightId]?.state === 'on';
      callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: mainLightId });
    },
    [conn, mainLightId, entities, callService]
  );

  return (
    <div
      ref={cardRef}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen?.();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-7 font-sans transition-all duration-500 select-none ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} `}
      style={cardStyle}
    >
      {controls}

      {showIconWatermark && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute z-0 text-[var(--text-primary)] opacity-[0.03] ${watermarkPositionClass}`}
        >
          <RoomIcon size={watermarkSize} className="stroke-[1.25px]" />
        </div>
      )}

      <div className="z-10 flex min-w-0 flex-1 flex-col justify-between text-[var(--text-primary)]">
        <div className="flex items-start justify-between gap-2">
          <div
            className={`flex min-w-0 flex-col items-start ${useLargePills ? 'w-full max-w-none' : 'max-w-[220px]'}`}
          >
            <button
              type="button"
              onClick={handleMainLightToggle}
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${isMainLightOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'} ${hasMainLightToggle ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
              aria-label={t('room.mainLight')}
              disabled={!hasMainLightToggle || !conn}
            >
              <RoomIcon
                className={`h-6 w-6 stroke-[1.5px] ${isMainLightOn ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110`}
              />
            </button>

            <div className="mt-2 flex w-full min-w-0 flex-col items-start text-left">
              <div className="w-full truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                {areaName}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {showMotion && showOccupiedIndicator && isOccupied && (
              <div className={`${chipClass} bg-green-500/14 text-green-300`}>
                <span className={chipTextClass}>{occupancyPillLabel}</span>
              </div>
            )}
          </div>
        </div>

        <div ref={chipContainerRef} className={chipContainerClass}>
          {showTemp && displayTempValue && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Thermometer className={`${chipIconClass} fill-current stroke-[1.75px]`} />
              <span className={chipTextClass}>
                {displayTempValue}
                {displayTempUnit}
              </span>
            </div>
          )}
          {showLightChip && showLights && lightsOnCount > 0 && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Lightbulb
                className={`${chipIconClass} fill-current stroke-[1.75px] ${lightsOnCount > 0 ? 'text-amber-400' : ''}`}
              />
              <span className={chipTextClass}>{lightsOnCount}</span>
            </div>
          )}
          {showMediaChip && mediaPlayingCount > 0 && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Tv
                className={`${chipIconClass} ${mediaPlayingCount > 0 ? 'text-[var(--accent-color)]' : ''}`}
              />
              <span className={chipTextClass}>{mediaPlayingCount}</span>
            </div>
          )}
          {showActiveChip && activeDeviceCount > 0 && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Activity className={chipIconClass} />
              <span className={chipTextClass}>{activeDeviceCount}</span>
            </div>
          )}
          {showVacuumChip && vacuumStatusLabel && (
            <div className={`${chipClass} ${vacuumPillToneClass}`}>
              <Bot className={chipIconClass} />
              <span className={chipTextClass}>{vacuumStatusLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
