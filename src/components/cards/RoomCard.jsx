import React, { useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef, memo } from 'react';
import {
  Home,
  Thermometer,
  Lightbulb,
  Tv,
  Activity,
  Bot,
  ArrowUpDown,
  DoorOpen,
} from 'lucide-react';
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
const RoomCard = memo(/** @param {any} props */ function RoomCard({
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
  isMobile,
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
  const showCoverChip = settings?.showCoverChip !== false;
  const showDoorChip = settings?.showDoorChip !== false;
  const showOccupiedIndicator = settings?.showOccupiedIndicator !== false;
  const showIconWatermark = settings?.showIconWatermark !== false;
  const cardRef = useRef(null);
  const chipContainerRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [isSpacious, setIsSpacious] = useState(false);
  const [iconOnlyStatusPills, setIconOnlyStatusPills] = useState(false);
  const [iconOnlyAllPills, setIconOnlyAllPills] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const updateByWidth = (width) => {
      setCardWidth(width);
      setIsSpacious((prev) => {
        if (prev) return width >= 372;
        return width >= 388;
      });
      setIconOnlyStatusPills(false);
      setIconOnlyAllPills(false);
    };

    updateByWidth(element.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? element.clientWidth;
      updateByWidth(width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const useCompactPills = !isSpacious || iconOnlyStatusPills || iconOnlyAllPills;
  const showIconOnlyOccupancy = isMobile || iconOnlyStatusPills || iconOnlyAllPills;

  const chipContainerClass = useCompactPills
    ? `flex max-w-[232px] flex-wrap items-start justify-start pb-1 ${isMobile ? 'mt-4 gap-2.5' : 'mt-5 gap-3'}`
    : `flex w-full max-w-none flex-wrap items-start justify-start pb-1 ${isMobile ? 'mt-4 gap-3' : 'mt-5 gap-3.5'}`;
  const chipClass = useCompactPills
    ? `flex items-center rounded-full backdrop-blur-sm ${isMobile ? 'gap-1.5 px-3 py-1.5' : 'gap-2 px-3.5 py-1.5'}`
    : `flex items-center rounded-full backdrop-blur-sm ${isMobile ? 'gap-2 px-3.5 py-1.5' : 'gap-2.5 px-4.5 py-2'}`;
  const statusIconOnlyChipClass = useCompactPills
    ? `justify-center ${isMobile ? 'min-w-[40px] min-h-[30px]' : 'min-w-[56px] min-h-[32px]'}`
    : `justify-center ${isMobile ? 'min-w-[48px] min-h-[34px]' : 'min-w-[68px] min-h-[40px]'}`;
  const chipTextClass = useCompactPills
    ? `${isMobile ? 'text-[11px]' : 'text-[13px]'} tracking-wider font-bold uppercase`
    : `${isMobile ? 'text-[12px]' : 'text-[15px]'} tracking-wide font-bold uppercase`;
  const chipIconClass = useCompactPills
    ? isMobile
      ? 'w-[13px] h-[13px]'
      : 'w-[14px] h-[14px]'
    : isMobile
      ? 'w-[15px] h-[15px]'
      : 'w-[18px] h-[18px]';

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
  const coverIds = useMemo(
    () => roomEntityIds.filter((id) => id.startsWith('cover.')),
    [roomEntityIds]
  );

  const doorWindowId = useMemo(() => {
    return (
      settings?.doorEntityId ||
      roomEntityIds.find((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'door' ||
            e.attributes?.device_class === 'window' ||
            e.attributes?.device_class === 'garage_door')
        );
      })
    );
  }, [roomEntityIds, entities, settings]);

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
  const activeCover = useMemo(
    () =>
      coverIds
        .map((id) => entities[id])
        .find((entity) => entity && !['closed', 'unavailable', 'unknown'].includes(entity.state)) ||
      null,
    [coverIds, entities]
  );
  const doorWindowEntity = doorWindowId ? entities[doorWindowId] : null;
  const isDoorOpen = doorWindowEntity?.state === 'on';
  const isMainLightOn = mainLightId ? entities[mainLightId]?.state === 'on' : false;

  const climateEntity = climateId ? entities[climateId] : null;
  const tempEntity = tempId ? entities[tempId] : null;
  const motionEntity = motionId ? entities[motionId] : null;
  const sourceTempUnit =
    tempEntity?.attributes?.unit_of_measurement ||
    climateEntity?.attributes?.temperature_unit ||
    climateEntity?.attributes?.unit_of_measurement ||
    /** @type {any} */ (haConfig?.unit_system)?.temperature ||
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
    if (deviceClass === 'motion') return t('room.motionShort');
    return t('binary.occupancy.occupied');
  }, [motionEntity, t]);
  const hasMainLightToggle = !!mainLightId;
  const vacuumStatusLabel = useMemo(() => {
    if (!activeVacuum) return null;
    switch (activeVacuum.state) {
      case 'cleaning':
        return t('room.vacuumStatus.cleaning');
      case 'returning':
      case 'returning_home':
        return t('room.vacuumStatus.goingHome');
      case 'error':
        return t('room.vacuumStatus.error');
      case 'paused':
      case 'idle':
      case 'stopped':
        return t('room.vacuumStatus.stopped');
      default:
        return activeVacuum.state;
    }
  }, [activeVacuum, t]);
  const vacuumPillToneClass = useMemo(() => {
    switch (activeVacuum?.state) {
      case 'cleaning':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]';
      case 'returning':
      case 'returning_home':
        return 'bg-sky-500/14 text-sky-300';
      case 'error':
        return 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]';
      case 'paused':
      case 'idle':
      case 'stopped':
        return 'bg-amber-500/14 text-amber-300';
      default:
        return 'bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]';
    }
  }, [activeVacuum]);

  const coverStatusLabel = useMemo(() => {
    if (!activeCover) return null;
    switch (activeCover.state) {
      case 'open':
        return t('room.coverStatus.open') || 'Open';
      case 'opening':
        return t('room.coverStatus.opening') || 'Opening';
      case 'closing':
        return t('room.coverStatus.closing') || 'Closing';
      default:
        return activeCover.state;
    }
  }, [activeCover, t]);

  const doorPillLabel = useMemo(() => {
    if (!isDoorOpen || !doorWindowEntity) return null;
    return t('room.doorStatus.open') || 'Open';
  }, [isDoorOpen, doorWindowEntity, t]);
  const coverPillToneClass = useMemo(() => {
    switch (activeCover?.state) {
      case 'open':
        return 'bg-sky-500/14 text-sky-300';
      case 'opening':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]';
      case 'closing':
        return 'bg-amber-500/14 text-amber-300';
      default:
        return 'bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]';
    }
  }, [activeCover]);

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
    (showVacuumChip && Boolean(vacuumStatusLabel) ? 1 : 0) +
    (showCoverChip && Boolean(coverStatusLabel) ? 1 : 0) +
    (showDoorChip && Boolean(doorPillLabel) ? 1 : 0);

  useEffect(() => {
    setIconOnlyStatusPills(false);
    setIconOnlyAllPills(false);
  }, [visiblePillCount]);

  useLayoutEffect(() => {
    const container = chipContainerRef.current;
    if (!container) return;
    const children = Array.from(container.children);
    if (children.length <= 2) return;
    const rowTops = [];
    children.forEach((child) => {
      const top = child.offsetTop;
      if (!rowTops.some((value) => Math.abs(value - top) <= 1)) {
        rowTops.push(top);
      }
    });
    if (rowTops.length > 2) {
      if (!iconOnlyStatusPills) {
        setIconOnlyStatusPills(true);
        return;
      }
      if (!iconOnlyAllPills) {
        setIconOnlyAllPills(true);
      }
    }
  }, [
    iconOnlyStatusPills,
    iconOnlyAllPills,
    visiblePillCount,
    cardWidth,
    isSpacious,
    showCoverChip,
    showDoorChip,
  ]);

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
      className={`glass-texture touch-feedback group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] font-sans transition-all duration-500 select-none ${isMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} `}
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
            className={`flex min-w-0 flex-1 flex-col items-start ${useCompactPills && !isMobile ? 'max-w-[220px]' : 'w-full max-w-none'}`}
          >
            <button
              type="button"
              onClick={handleMainLightToggle}
              className={`flex flex-shrink-0 items-center justify-center transition-all duration-500 ${isMainLightOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'} ${isMobile ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'} ${hasMainLightToggle ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
              aria-label={t('room.mainLight')}
              disabled={!hasMainLightToggle || !conn}
            >
              <RoomIcon
                className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} stroke-[1.5px] ${isMainLightOn ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110`}
              />
            </button>

            <div className="mt-2 flex w-full min-w-0 flex-col items-start text-left">
              <div className={`${isMobile ? 'text-[11px]' : 'text-xs'} w-full truncate font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60`}>
                {areaName}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {showMotion && showOccupiedIndicator && isOccupied && (
              <div
                className={`${chipClass} bg-[var(--status-success-bg)] text-[var(--status-success-fg)] ${showIconOnlyOccupancy ? statusIconOnlyChipClass : ''}`}
                title={occupancyPillLabel}
                aria-label={occupancyPillLabel}
              >
                <Activity className={chipIconClass} />
                {!showIconOnlyOccupancy && <span className={chipTextClass}>{occupancyPillLabel}</span>}
              </div>
            )}
          </div>
        </div>

        <div ref={chipContainerRef} className={chipContainerClass}>
          {showTemp && displayTempValue && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Thermometer className={`${chipIconClass} fill-current stroke-[1.75px]`} />
              {!iconOnlyAllPills && (
                <span className={chipTextClass}>
                  {displayTempValue}
                  {displayTempUnit}
                </span>
              )}
            </div>
          )}
          {showLightChip && showLights && lightsOnCount > 0 && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Lightbulb
                className={`${chipIconClass} fill-current stroke-[1.75px] ${lightsOnCount > 0 ? 'text-amber-400' : ''}`}
              />
              {!iconOnlyAllPills && <span className={chipTextClass}>{lightsOnCount}</span>}
            </div>
          )}
          {showMediaChip && mediaPlayingCount > 0 && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Tv
                className={`${chipIconClass} ${mediaPlayingCount > 0 ? 'text-[var(--accent-color)]' : ''}`}
              />
              {!iconOnlyAllPills && <span className={chipTextClass}>{mediaPlayingCount}</span>}
            </div>
          )}
          {showActiveChip && activeDeviceCount > 0 && (
            <div className={`${chipClass} bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]`}>
              <Activity className={chipIconClass} />
              {!iconOnlyAllPills && <span className={chipTextClass}>{activeDeviceCount}</span>}
            </div>
          )}
          {showVacuumChip && vacuumStatusLabel && (
            <div className={`${chipClass} ${vacuumPillToneClass}`}>
              <Bot className={chipIconClass} />
              {!iconOnlyAllPills && <span className={chipTextClass}>{vacuumStatusLabel}</span>}
            </div>
          )}
          {showCoverChip && coverStatusLabel && (
            <div
              className={`${chipClass} ${coverPillToneClass} ${iconOnlyStatusPills && !iconOnlyAllPills ? statusIconOnlyChipClass : ''}`}
            >
              <ArrowUpDown className={chipIconClass} />
              {!iconOnlyStatusPills && <span className={chipTextClass}>{coverStatusLabel}</span>}
            </div>
          )}
          {showDoorChip && doorPillLabel && (
            <div
              className={`${chipClass} bg-orange-500/14 text-orange-300 ${iconOnlyStatusPills && !iconOnlyAllPills ? statusIconOnlyChipClass : ''}`}
            >
              <DoorOpen className={chipIconClass} />
              {!iconOnlyStatusPills && <span className={chipTextClass}>{doorPillLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default RoomCard;
