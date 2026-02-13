import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Lightbulb, Utensils, Sofa, LampDesk, Palette, Thermometer, Sun } from '../icons';
import M3Slider from '../components/M3Slider';
import { getIconComponent } from '../iconMap';

export default function LightModal({
  show,
  onClose,
  lightId,
  entities,
  callService,
  getA,
  optimisticLightBrightness,
  setOptimisticLightBrightness,
  customIcons,
  t
}) {
  if (!show || !lightId) return null;

  const entity = entities[lightId];
  const isUnavailable = entity?.state === 'unavailable' || entity?.state === 'unknown' || !entity;
  const isOn = entity?.state === 'on';

  // --- Feature Detection ---
  const colorModes = entity?.attributes?.supported_color_modes || [];
  const supportsColorTemp = colorModes.includes('color_temp') || colorModes.includes('color_temp_kelvin');
  const supportsColor = colorModes.some((mode) => ['hs', 'rgb', 'xy'].includes(mode));
  const showPills = supportsColorTemp || supportsColor;

  // --- Icon ---
  let DefaultIcon = Lightbulb;
  if (lightId.includes('kjokken') || lightId.includes('kitchen')) DefaultIcon = Utensils;
  else if (lightId.includes('stova') || lightId.includes('living')) DefaultIcon = Sofa;
  else if (lightId.includes('studio') || lightId.includes('office')) DefaultIcon = LampDesk;
  const lightIconName = customIcons[lightId] || entities[lightId]?.attributes?.icon;
  const LightIcon = lightIconName ? (getIconComponent(lightIconName) || DefaultIcon) : DefaultIcon;

  // --- Values & Ranges ---
  const minKelvin = entity?.attributes?.min_color_temp_kelvin
    || (entity?.attributes?.max_mireds ? Math.round(1000000 / entity.attributes.max_mireds) : 2000);
  const maxKelvin = entity?.attributes?.max_color_temp_kelvin
    || (entity?.attributes?.min_mireds ? Math.round(1000000 / entity.attributes.min_mireds) : 6500);
  
  // Current values from Entity
  const remoteKelvin = entity?.attributes?.color_temp_kelvin
    || (entity?.attributes?.color_temp ? Math.round(1000000 / entity.attributes.color_temp) : Math.round((minKelvin + maxKelvin) / 2));
  const remoteHue = entity?.attributes?.hs_color?.[0] ?? 0;

  // --- Local State for Optimistic UI ---
  const [activeTab, setActiveTab] = useState('brightness');
  const [localKelvin, setLocalKelvin] = useState(remoteKelvin);
  const [localHue, setLocalHue] = useState(remoteHue);
  const isDraggingRef = useRef(false);

  // Reset tab on open
  useEffect(() => {
    if (show) setActiveTab('brightness');
  }, [show]);

  // Sync remote -> local when NOT dragging
  useEffect(() => {
    if (!isDraggingRef.current && remoteKelvin) {
      setLocalKelvin(remoteKelvin);
    }
  }, [remoteKelvin]);

  useEffect(() => {
    if (!isDraggingRef.current && remoteHue !== undefined) {
      setLocalHue(remoteHue);
    }
  }, [remoteHue]);


  // --- Handlers ---
  const handleTempChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLocalKelvin(val);
    callService("light", "turn_on", { entity_id: lightId, color_temp_kelvin: val });
  };

  const handleHueChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLocalHue(val);
    callService("light", "turn_on", { entity_id: lightId, hs_color: [val, 100] });
  };

  // Determine glow color
  const getGlowColor = () => {
    if (!isOn) return 'transparent';
    if (activeTab === 'color' && supportsColor) {
      return `hsl(${localHue}, 100%, 50%)`;
    }
    if (activeTab === 'warmth' && supportsColorTemp) {
      if (localKelvin < 3000) return '#f59e0b'; // Warm/Orange
      if (localKelvin > 5000) return '#93c5fd'; // Cool/Blue
      return '#fbbf24'; // Neutral
    }
    return '#fbbf24'; // Default amber
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] overflow-hidden flex flex-col lg:grid lg:grid-cols-5 backdrop-blur-xl shadow-2xl popup-anim relative max-h-[90vh] md:h-auto md:min-h-[550px]"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Row (Mobile & Desktop) */}
        <div className="absolute top-6 right-6 md:top-10 md:right-10 z-50">
          <button onClick={onClose} className="modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LEFT PANEL: Visuals & Ambient (3 cols) */}
        <div className="lg:col-span-3 relative p-4 md:p-10 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r shrink-0" style={{borderColor: 'var(--glass-border)'}}>
             
             {/* Dynamic Ambient Glow - Subtler */}
             <div 
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full opacity-5 blur-[100px] pointer-events-none transition-all duration-1000"
               style={{ backgroundColor: getGlowColor() }} 
             />

             {/* Header */}
             <div className="relative z-10 flex items-center gap-4 mb-6 shrink-0">
               <div className={`p-4 rounded-2xl transition-all duration-500 ${isUnavailable ? 'bg-red-500/10 text-red-400' : (isOn ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]')}`}>
                 <LightIcon className="w-8 h-8" />
               </div>
               <div className="min-w-0">
                 <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none truncate">
                   {getA(lightId, "friendly_name", t('common.light'))}
                 </h2>
                 <div className={`mt-2 px-3 py-1 rounded-full border inline-flex items-center gap-2 ${isUnavailable ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
                   <div className={`w-1.5 h-1.5 rounded-full ${isUnavailable ? 'bg-red-400' : (isOn ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-slate-600')}`} />
                   <span className="text-[10px] uppercase font-bold italic tracking-widest">
                     {isUnavailable ? t('status.unavailable') : (isOn ? t('common.on') : t('common.off'))}
                   </span>
                   {isOn && (
                     <span className="text-[10px] uppercase font-bold italic tracking-widest pl-2 border-l border-[var(--glass-border)] text-[var(--text-muted)]">
                       {Math.round((((optimisticLightBrightness[lightId] ?? (getA(lightId, "brightness") || 0)) / 255) * 100))}%
                     </span>
                   )}
                 </div>
               </div>
             </div>

             {/* Centerpiece Icon - Toggle Button */}
             <div className="relative z-10 flex-1 flex items-center justify-center my-4 md:my-0 min-h-[100px] md:min-h-0">
                <button 
                  onClick={() => !isUnavailable && callService("light", "toggle", { entity_id: lightId })}
                  disabled={isUnavailable}
                  className={`relative w-24 h-24 md:w-36 md:h-36 rounded-full flex items-center justify-center transition-all duration-700
                    ${isUnavailable ? 'cursor-not-allowed bg-red-500/5 text-red-500' : 
                      (isOn ? 'cursor-pointer bg-[var(--glass-bg)] text-[var(--text-primary)] shadow-2xl active:scale-95' : 'cursor-pointer bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] active:scale-95')}
                    border border-[var(--glass-border)]
                  `}
                  style={{ 
                    // Dimmed glow behind icon (lower opacity on hex color or lower radius)
                    boxShadow: isOn ? `0 0 60px -10px ${getGlowColor()}15` : 'none', 
                  }}
                >
                  {isUnavailable ? <AlertTriangle className="w-8 h-8 md:w-10 md:h-10" /> : <LightIcon className="w-10 h-10 md:w-16 md:h-16 stroke-[1.5px]" />}
                  
                  {/* Subtle inner ring */}
                  {isOn && <div className="absolute inset-0 rounded-full border border-white/10 opacity-30" />}
                </button>
             </div>
             
             {/* Tabs / Mode Switcher - Sleek Segmented Control */}
             <div className="relative z-10 w-full max-w-sm mx-auto shrink-0">
               {showPills && (
                 <div className="flex p-1 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)] w-full">
                    <button 
                      onClick={() => setActiveTab('brightness')} 
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-xs font-bold uppercase tracking-wider
                        ${activeTab === 'brightness' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>{t('light.brightness')}</span>
                    </button>
                    {supportsColorTemp && (
                      <button 
                        onClick={() => setActiveTab('warmth')} 
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-xs font-bold uppercase tracking-wider
                          ${activeTab === 'warmth' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
                      >
                        <Thermometer className="w-3.5 h-3.5" />
                        <span>{t('light.warmth')}</span>
                      </button>
                    )}
                    {supportsColor && (
                      <button 
                        onClick={() => setActiveTab('color')} 
                        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-xs font-bold uppercase tracking-wider
                          ${activeTab === 'color' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>{t('light.color')}</span>
                      </button>
                    )}
                 </div>
               )}
             </div>
        </div>

        {/* RIGHT PANEL: Controls (2 cols) */}
        <div className="lg:col-span-2 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:pt-16 space-y-4 md:space-y-8 custom-scrollbar">
              
              {/* Dynamic Control Area - Simplified */}
              <div className="min-h-[100px] md:min-h-[140px] flex flex-col justify-center">
                   {/* Brightness Slider */}
                   {activeTab === 'brightness' && (
                     <div className="space-y-2 md:space-y-4">
                        <div className="flex justify-between items-end px-1">
                          <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{t('light.brightness')}</label>
                          <span className="text-lg font-medium text-[var(--text-primary)] font-mono">
                            {Math.round((((optimisticLightBrightness[lightId] ?? (getA(lightId, "brightness") || 0)) / 255) * 100))}%
                          </span>
                        </div>
                        <div className="h-10">
                             <M3Slider 
                                min={0} 
                                max={255} 
                                step={1} 
                                value={optimisticLightBrightness[lightId] ?? (getA(lightId, "brightness") || 0)} 
                                disabled={!isOn || isUnavailable} 
                                onChange={(e) => { 
                                  const val = parseInt(e.target.value); 
                                  setOptimisticLightBrightness(prev => ({ ...prev, [lightId]: val })); 
                                  callService("light", "turn_on", { entity_id: lightId, brightness: val }); 
                                }} 
                                colorClass="bg-amber-500"
                                variant="fat" // Keep fat for touch, but in smaller container
                              />
                        </div>
                     </div>
                   )}

                   {/* Warmth Slider - Re-styled */}
                   {activeTab === 'warmth' && (
                     <div className="space-y-2 md:space-y-4">
                        <div className="flex justify-between items-end px-1">
                           <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{t('light.colorTemperature')}</label>
                           <span className="text-lg font-medium text-[var(--text-primary)] font-mono">{localKelvin}K</span>
                        </div>
                        <div className="relative w-full h-10 touch-none rounded-xl overflow-hidden shadow-inner">
                            <input
                              type="range"
                              min={minKelvin}
                              max={maxKelvin}
                              step={50}
                              value={localKelvin}
                              disabled={!isOn || isUnavailable}
                              onPointerDown={() => isDraggingRef.current = true}
                              onPointerUp={() => isDraggingRef.current = false}
                              onChange={handleTempChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            {/* Gradient Background */}
                            <div 
                              className="absolute inset-0"
                              style={{ background: 'linear-gradient(90deg, #ffb14e 0%, #fffbe6 50%, #9cb8ff 100%)' }}
                            />
                            {/* Thumb Indicator */}
                            <div 
                              className="absolute top-0 bottom-0 w-1.5 bg-black/40 backdrop-blur-sm border-x border-[var(--glass-border)] pointer-events-none transition-transform duration-75"
                              style={{ 
                                left: `${((localKelvin - minKelvin) / (maxKelvin - minKelvin)) * 100}%`, 
                                transform: 'translateX(-50%)' // Fixed transform
                              }}
                            />
                        </div>
                     </div>
                   )}

                   {/* Color Slider - Re-styled */}
                   {activeTab === 'color' && (
                     <div className="space-y-2 md:space-y-4">
                        <div className="flex justify-between items-end px-1">
                           <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">{t('light.hue')}</label>
                           {/* Color Preview Dot */}
                           <div className="w-6 h-6 rounded-full border border-[var(--glass-border)] shadow-sm" style={{ backgroundColor: `hsl(${localHue}, 100%, 50%)` }} />
                        </div>
                        <div className="relative w-full h-10 touch-none rounded-xl overflow-hidden shadow-inner">
                            <input
                              type="range"
                              min={0}
                              max={360}
                              step={1}
                              value={localHue}
                              disabled={!isOn || isUnavailable}
                              onPointerDown={() => isDraggingRef.current = true}
                              onPointerUp={() => isDraggingRef.current = false}
                              onChange={handleHueChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            <div 
                              className="absolute inset-0"
                              style={{ background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 16%, #facc15 32%, #22c55e 48%, #06b6d4 64%, #6366f1 80%, #d946ef 100%)' }}
                            />
                             {/* Thumb Indicator */}
                            <div 
                              className="absolute top-0 bottom-0 w-1.5 bg-white/80 backdrop-blur-sm shadow-sm pointer-events-none transition-transform duration-75"
                              style={{ 
                                left: `${(localHue / 360) * 100}%`, 
                                transform: 'translateX(-50%)' // Center the thin line
                              }}
                            />
                        </div>
                     </div>
                   )}
              </div>

              {/* Sub Entities - Cleaner list */}
              {getA(lightId, "entity_id", []).length > 0 && (
                <div className="pt-4 md:pt-6 border-t border-[var(--glass-border)]">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2 md:mb-4 pl-1">
                    {t('light.roomLights')}
                  </h3>
                  <div className="space-y-2 md:space-y-3">
                    {getA(lightId, "entity_id", []).map(cid => {
                        const subEnt = entities[cid];
                        const subName = subEnt?.attributes?.friendly_name || cid.split('.')[1].replace(/_/g, ' ');
                        const subIsOn = subEnt?.state === 'on';
                        const subUnavail = subEnt?.state === 'unavailable';
                        const subBrightness = optimisticLightBrightness[cid] ?? (subEnt?.attributes?.brightness || 0);

                        return (
                          <div key={cid} className="flex items-end gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-end mb-1 px-1">
                                    <span className="text-xs font-bold text-[var(--text-secondary)] truncate opacity-90">{subName}</span>
                                </div>
                                <div className="h-8 w-full bg-[var(--glass-bg)] rounded-xl overflow-hidden relative border border-[var(--glass-border)]">
                                    {/* Mini Progress Bar for Brightness */}
                                    <div 
                                      className={`absolute top-0 left-0 h-full transition-all duration-300 ${subIsOn ? 'bg-amber-500 opacity-80' : 'bg-black/20 opacity-30'}`}
                                      style={{ width: `${(subBrightness / 255) * 100}%` }}
                                    />
                                    {/* Invisible Slider overlay */}
                                    <input 
                                      type="range"
                                      min="0"
                                      max="255"
                                      step="1"
                                      value={subBrightness}
                                      disabled={!subIsOn || subUnavail}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value); 
                                          setOptimisticLightBrightness(prev => ({ ...prev, [cid]: val })); 
                                          callService("light", "turn_on", { entity_id: cid, brightness: val }); 
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                </div>
                            </div>
                            
                            {/* Toggle Button - Aligned to bottom (items-end on parent) */}
                            <button 
                              onClick={() => callService("light", "toggle", { entity_id: cid })}
                              className={`w-12 h-8 rounded-xl flex items-center justify-center transition-all border ${subIsOn ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}
                            >
                               <div className={`w-2 h-2 rounded-full transition-all ${subIsOn ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-[var(--text-secondary)] opacity-50'}`} />
                            </button>
                          </div>
                        )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Actions Footer (Right Column) - Removed redundant toggle */}
        </div>
      </div>
    </div>
  );
}
