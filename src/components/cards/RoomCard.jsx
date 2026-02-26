import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Home, Thermometer, Lightbulb, Tv, Activity } from 'lucide-react';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { getIconComponent } from '../../icons';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveRoomEntityIds, getEffectiveUnitMode } from '../../utils';

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
  const roomIconName = customIcons?.[cardId] || settings?.icon;
  const RoomIcon = roomIconName ? (getIconComponent(roomIconName) || Home) : Home;

  const showLights = settings?.showLights !== false;
  const showTemp = settings?.showTemp !== false;
  const showMotion = settings?.showMotion !== false;
  const showLightChip = settings?.showLightChip !== false;
  const showMediaChip = settings?.showMediaChip !== false;
  const showActiveChip = settings?.showActiveChip !== false;
  const showOccupiedIndicator = settings?.showOccupiedIndicator !== false;

  const roomEntityIds = useMemo(() => getEffectiveRoomEntityIds(settings), [settings]);

  const lightIds = useMemo(() => {
    return roomEntityIds.filter(id => id.startsWith('light.'));
  }, [roomEntityIds]);

  const mediaPlayerIds = useMemo(() => roomEntityIds.filter(id => id.startsWith('media_player.')), [roomEntityIds]);

  const mainLightId = useMemo(() => {
    if (settings?.mainLightEntityId && entities[settings.mainLightEntityId]) return settings.mainLightEntityId;
    return lightIds[0] || null;
  }, [settings?.mainLightEntityId, entities, lightIds]);

  const climateId = useMemo(() => settings?.climateEntityId || roomEntityIds.find(id => id.startsWith('climate.')), [roomEntityIds, settings]);
  const tempId = useMemo(() => {
    return settings?.tempEntityId || roomEntityIds.find(id => {
      const e = entities[id];
      return e && (e.attributes?.device_class === 'temperature' || id.includes('temperature') || id.includes('temp'));
    });
  }, [roomEntityIds, entities, settings]);
  
  const motionId = useMemo(() => {
     return settings?.motionEntityId || roomEntityIds.find(id => {
     const e = entities[id];
     return e && (e.attributes?.device_class === 'motion' || e.attributes?.device_class === 'occupancy' || e.attributes?.device_class === 'presence');
  });
  }, [roomEntityIds, entities, settings]);

  const lightsOnCount = lightIds.filter(id => entities[id]?.state === 'on').length;
  const mediaPlayingCount = mediaPlayerIds.filter((id) => entities[id]?.state === 'playing').length;
  const isMainLightOn = mainLightId ? entities[mainLightId]?.state === 'on' : false;
  
  const climateEntity = climateId ? entities[climateId] : null;
  const tempEntity = tempId ? entities[tempId] : null;
  const motionEntity = motionId ? entities[motionId] : null;
  const sourceTempUnit = tempEntity?.attributes?.unit_of_measurement
    || climateEntity?.attributes?.temperature_unit
    || climateEntity?.attributes?.unit_of_measurement
    || haConfig?.unit_system?.temperature
    || haConfig?.temperature_unit
    || '°C';
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

  const activeDeviceCount = useMemo(() => {
    const toggleDomains = new Set(['light', 'switch', 'fan', 'cover', 'climate', 'media_player']);
    return roomEntityIds.filter((entityId) => {
      const entity = entities[entityId];
      if (!entity) return false;
      const domain = entityId.split('.')[0];
      if (!toggleDomains.has(domain)) return false;
      if (domain === 'media_player') return entity.state === 'playing';
      if (domain === 'climate') return entity.state && !['off', 'unavailable', 'unknown'].includes(entity.state);
      if (domain === 'cover') return ['opening', 'open'].includes(entity.state);
      return entity.state === 'on';
    }).length;
  }, [roomEntityIds, entities]);

  const handleMainLightToggle = useCallback((e) => {
    e.stopPropagation();
    if (!conn || !mainLightId) return;
    const isOn = entities[mainLightId]?.state === 'on';
    callService('light', isOn ? 'turn_off' : 'turn_on', { entity_id: mainLightId });
  }, [conn, mainLightId, entities, callService]);

  return (
    <div
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
      className={`
        glass-texture touch-feedback relative p-7 rounded-[2.5rem] flex flex-col 
        transition-all duration-500 group overflow-hidden font-sans h-full select-none border 
        border-[var(--glass-border)] bg-[var(--glass-bg)]
        ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}
      `}
      style={cardStyle}
    >
      {controls}

      <div className="flex flex-col justify-between flex-1 min-w-0 text-[var(--text-primary)] z-10">
        <div className="flex justify-between items-start gap-2">
           <div className="flex flex-col items-start min-w-0 max-w-[220px]">
             <button
                type="button"
                onClick={handleMainLightToggle}
               className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 ${isMainLightOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'} ${hasMainLightToggle ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                aria-label={t('room.mainLight')}
                disabled={!hasMainLightToggle || !conn}
             >
               <RoomIcon className={`w-6 h-6 stroke-[1.5px] ${isMainLightOn ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110`} />
             </button>

             <div className="flex flex-col items-start text-left min-w-0 w-full mt-2">
               <div className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate w-full">
                 {areaName}
               </div>
             </div>
           </div>

           <div className="flex flex-col items-end gap-2">
             {showMotion && showOccupiedIndicator && isOccupied && (
               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-green-500/12 border-green-400/30 text-green-300">
                 <span className="text-xs tracking-widest font-bold uppercase">{occupancyPillLabel}</span>
               </div>
             )}
           </div>
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-start gap-2.5 max-w-[220px]">
          {showTemp && displayTempValue && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
              <Thermometer className="w-3 h-3 fill-current stroke-[1.75px]" />
              <span className="text-xs tracking-widest font-bold uppercase">{displayTempValue}{displayTempUnit}</span>
            </div>
          )}
          {showLightChip && showLights && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
              <Lightbulb className={`w-3 h-3 fill-current stroke-[1.75px] ${lightsOnCount > 0 ? 'text-amber-400' : ''}`} />
              <span className="text-xs tracking-widest font-bold uppercase">{lightsOnCount}</span>
            </div>
          )}
          {showMediaChip && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
              <Tv className={`w-3 h-3 ${mediaPlayingCount > 0 ? 'text-[var(--accent-color)]' : ''}`} />
              <span className="text-xs tracking-widest font-bold uppercase">{mediaPlayingCount}</span>
            </div>
          )}
          {showActiveChip && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
              <Activity className="w-3 h-3" />
              <span className="text-xs tracking-widest font-bold uppercase">{activeDeviceCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
