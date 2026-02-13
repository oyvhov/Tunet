import React, { useMemo, useState } from 'react';
import { Home, Sun, ChevronUp, ChevronDown } from 'lucide-react';
import { getIconComponent } from '../iconMap';

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
  const areaName = customNames?.[cardId] || settings?.areaName || t('room.defaultName');
  const roomIconName = customIcons?.[cardId] || settings?.icon;
  const RoomIcon = roomIconName ? (getIconComponent(roomIconName) || Home) : Home;
  
  // -- Data Gathering -- //
  const roomEntityIds = useMemo(() => Array.isArray(settings?.entityIds) ? settings.entityIds : [], [settings?.entityIds]);
  
  // Find key entities
  const lightIds = useMemo(() => {
    // Main light override
    if (settings?.mainLightEntityId && entities[settings.mainLightEntityId]) {
      return [settings.mainLightEntityId];
    }
    // Fallback to all
    return roomEntityIds.filter(id => id.startsWith('light.'));
  }, [roomEntityIds, settings?.mainLightEntityId, entities]);
  
  const climateId = useMemo(() => settings?.climateEntityId || roomEntityIds.find(id => id.startsWith('climate.')), [roomEntityIds, settings]);
  const tempId = useMemo(() => settings?.tempEntityId || roomEntityIds.find(id => {
      const e = entities[id];
      return e && (e.attributes?.device_class === 'temperature' || id.includes('temperature') || id.includes('temp'));
  }), [roomEntityIds, entities, settings]);
  
  const motionId = useMemo(() => settings?.motionEntityId || roomEntityIds.find(id => {
     const e = entities[id];
     return e && (e.attributes?.device_class === 'motion' || e.attributes?.device_class === 'occupancy' || e.attributes?.device_class === 'presence');
  }), [roomEntityIds, entities, settings]);

  // States
  const lightCount = lightIds.length;
  // If specific light is selected, "lightsOnCount" is 1 or 0
  const lightsOnCount = lightIds.filter(id => entities[id]?.state === 'on').length;
  const anyLightOn = lightsOnCount > 0;
  
  const climateEntity = climateId ? entities[climateId] : null;
  const tempEntity = tempId ? entities[tempId] : null;
  const motionEntity = motionId ? entities[motionId] : null;
  
  const currentTemp = tempEntity ? parseFloat(tempEntity.state).toFixed(1) : (climateEntity?.attributes?.current_temperature || null);
  const targetTemp = climateEntity?.attributes?.temperature;
  const isOccupied = motionEntity?.state === 'on';

  // Toggle state for which control to show (if both exist)
  const isCapableOfLight = lightCount > 0;
  const isCapableOfClimate = !!climateId;
  const canSwitchControl = isCapableOfLight && isCapableOfClimate;

  // Initialize mode: only default to climate if we HAVE climate but NO lights
  const [controlMode, setControlMode] = useState(() => {
     if (isCapableOfClimate && !isCapableOfLight) return 'climate';
     return 'light';
  });

  // Optimistic UI state for dragging
  const [isNoteDragging, setIsNoteDragging] = useState(false);
  const [localBrightness, setLocalBrightness] = useState(0);

  const handleControlToggle = (e) => {
    e.stopPropagation();
    setControlMode(prev => prev === 'light' ? 'climate' : 'light');
  };

  // Compute average brightness for slider from props
  const avgBrightness = useMemo(() => {
    if (lightCount === 0) return 0;
    let total = 0;
    let on = 0;
    lightIds.forEach(id => {
       const e = entities[id];
       if (e?.state === 'on') {
         const b = e.attributes?.brightness;
         const val = (b !== undefined) ? (b / 255) * 100 : 100;
         total += val;
         on++;
       }
    });
    return on > 0 ? (total / on) : 0;
  }, [lightIds, entities, lightCount]);

  // Sync local state if not dragging
  if (!isNoteDragging && Math.abs(avgBrightness - localBrightness) > 1) {
     if (anyLightOn) {
         // Only sync if the prop value is different enough, to avoid jitter
         setLocalBrightness(avgBrightness);
     } else {
         setLocalBrightness(0);
     }
  }

  // Handlers
  const handleLightSliderChange = (e) => {
    e.stopPropagation();
    const val = parseInt(e.target.value);
    setLocalBrightness(val);
    
    // Throttle actual resizing? For now we just fire.
    // The "isNoteDragging" state prevents external updates from resetting the slider while we hold it.
    if (!conn) return;
    
    lightIds.forEach(id => {
       if (val === 0) {
         callService('light', 'turn_off', { entity_id: id });
       } else {
         callService('light', 'turn_on', { entity_id: id, brightness_pct: val });
       }
    });
  };

  const handleSlideStart = (e) => {
      e.stopPropagation();
      setIsNoteDragging(true);
  };
  
  const handleSlideEnd = (e) => {
      e.stopPropagation();
      setIsNoteDragging(false);
  };
  
  const handleClimateStep = (step) => {
    if (!climateId || !conn) return;
    const current = targetTemp || 20;
    const newTemp = current + step;
    callService('climate', 'set_temperature', { entity_id: climateId, temperature: newTemp });
  };


  // -- ANIMATION STATES --
  const lightActive = controlMode === 'light';

  // Render Helpers
  const renderSlider = () => (
    <div 
        className="h-full w-full relative group/slider flex justify-center"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
    >
        {/* Background track */}
        <div className="absolute inset-x-0 top-0 bottom-0 bg-[var(--glass-border)] rounded-full w-full" />
        
        {/* Fill bar */}
        <div 
            className={`absolute bottom-0 w-full rounded-b-[2rem] transition-all duration-75 ease-out ${localBrightness > 0 ? 'bg-amber-500' : 'bg-transparent'}`}
            style={{ height: `${localBrightness}%`, borderRadius: localBrightness > 95 ? '2rem' : '0 0 2rem 2rem' }}
        />
        
        {/* Input */}
        <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={localBrightness}
            onChange={handleLightSliderChange}
            onMouseDown={handleSlideStart}
            onTouchStart={handleSlideStart}
            onMouseUp={handleSlideEnd}
            onTouchEnd={handleSlideEnd}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20 touch-none"
            style={{ appearance: 'slider-vertical' }}
        />
        
        {/* Icon Overlay */}
        <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none z-10 transition-opacity duration-300">
            <Sun className={`w-6 h-6 ${localBrightness > 0 ? 'text-white' : 'text-[var(--text-muted)]'}`} />
        </div>
    </div>
  );

  const renderClimate = () => (
    <div className="h-full w-full flex flex-col justify-between items-center py-1 relative">
        <div className="absolute inset-0 bg-black/5" /> {/* Subtle backing */}
        <button 
            onClick={(e) => { e.stopPropagation(); handleClimateStep(0.5); }}
            className="w-full flex-1 flex items-center justify-center active:bg-black/10 transition-colors z-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
            <ChevronUp className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center z-10 py-1">
             <span className="text-lg font-bold text-[var(--text-primary)] leading-none tabular-nums">{targetTemp ? Math.round(targetTemp) : '--'}°</span>
        </div>
        
        <button 
            onClick={(e) => { e.stopPropagation(); handleClimateStep(-0.5); }}
            className="w-full flex-1 flex items-center justify-center active:bg-black/10 transition-colors z-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
            <ChevronDown className="w-5 h-5" />
        </button>
    </div>
  );

  return (
    <div
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
      className={`
        touch-feedback relative p-5 rounded-[2.5rem] flex items-stretch justify-between 
        transition-all duration-300 group overflow-hidden font-sans h-full select-none border 
        border-[var(--glass-border)] bg-[var(--glass-bg)]
        ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}
      `}
      style={cardStyle}
    >
      {controls}

      {/* LEFT COLUMN: Stats & Toggle */}
      <div className="flex flex-col justify-between flex-1 min-w-0 pr-4 text-[var(--text-primary)] z-10">
        <div className="flex justify-between items-start">
           {/* Room/Occupancy Icon */}
           <div 
              onClick={(e) => {
                 if (canSwitchControl) {
                    e.stopPropagation();
                    handleControlToggle(e);
                 }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 bg-[var(--glass-bg-hover)] shadow-sm relative ${canSwitchControl ? 'cursor-pointer active:scale-95 hover:bg-[var(--glass-border)]' : ''}`}
           >
              <RoomIcon className="w-6 h-6 text-[var(--text-secondary)]" />
           </div>
           
           {/* Occupancy Pill */}
           {isOccupied && (
             <div className="bg-green-500/15 border border-green-500/20 rounded-full px-2.5 py-1 flex items-center gap-2 backdrop-blur-md">
                 <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 leading-none py-0.5">
                    {t('binary.occupancy.occupied') || 'Occupied'}
                 </span>
             </div>
           )}
        </div>

        {/* Temp/State Display - Changes with mode */}
        <div className="flex flex-col gap-1 mt-2 pl-1 transition-all duration-500">
           {lightActive ? (
              // LIGHT MODE STATS
              <>
                <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-medium leading-none tabular-nums transition-colors duration-300">
                      {currentTemp ? currentTemp : '--'}
                   </span>
                   <span className="text-xl text-[var(--text-secondary)] font-medium leading-none">°</span>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-80 pl-1">
                   {anyLightOn ? t('common.on') : t('common.off')}
                </div>
              </>
           ) : (
              // CLIMATE MODE STATS
              <>
                 <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-medium leading-none tabular-nums transition-colors duration-300">
                      {currentTemp ? currentTemp : '--'}
                    </span>
                    <span className="text-xl text-[var(--text-secondary)] font-medium leading-none">°</span>
                 </div>
                 <div className="flex items-center gap-2 pl-1">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                         {currentTemp}°
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                         → {targetTemp ? targetTemp : '--'}°
                      </span>
                 </div>
              </>
           )}
           
           <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60 pl-1 mt-1 truncate">
             {areaName}
           </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Animated Controls */}
      <div className="w-14 pl-3 relative z-0">
         <div className="h-full w-full rounded-[2.5rem] overflow-hidden relative shadow-inner bg-black/5 border border-[var(--glass-border)] ring-1 ring-white/5">
            
            {/* Light Slider Container */}
            <div 
                className={`
                    absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
                    ${lightActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-full scale-90 pointer-events-none'}
                `}
            >
                {renderSlider()}
            </div>

            {/* Climate Control Container */}
            <div 
                className={`
                    absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${!lightActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-full scale-90 pointer-events-none'}
                `}
            >
                {renderClimate()}
            </div>

         </div>
      </div>
    </div>
  );
}
