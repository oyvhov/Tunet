import { useRef, useEffect, useCallback } from 'react';
import { getIconComponent } from '../../icons';
import { Fan } from '../../icons';

const SLIDER_DEBOUNCE_MS = 200;

const FanCard = ({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  customIcons,
  getA,
  callService,
  onOpen,
  t
}) => {
  const DefaultIcon = Fan;
  const fanIconName = customIcons[cardId] || entity?.attributes?.icon;
  const FanIcon = fanIconName ? (getIconComponent(fanIconName) || DefaultIcon) : DefaultIcon;
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state === 'on';
  
  // Fan percentage (0-100)
  const percentage = getA(entityId, "percentage") || 0;
  
  // Oscillating state
  const oscillating = getA(entityId, "oscillating");
  const isOscillating = oscillating === 'on' || oscillating === true;
  
  // Direction
  const direction = getA(entityId, "direction");
  
  // Preset modes
  const presetMode = getA(entityId, "preset_mode");
  const presetModes = (entity?.attributes?.preset_modes && Array.isArray(entity.attributes.preset_modes)) ? entity.attributes.preset_modes : [];
  const hasPresets = presetModes && presetModes.length > 0;
  
  const name = customNames[cardId] || getA(entityId, "friendly_name");

  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const isSmall = sizeSetting === 'small';

  // Debounced speed service call
  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleSpeedChange = useCallback((e) => {
    const val = parseInt(e.target.value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      callService("fan", "set_percentage", { entity_id: entityId, percentage: val });
    }, SLIDER_DEBOUNCE_MS);
  }, [cardId, callService]);

  const handleToggle = () => {
    if (isUnavailable) return;
    if (isOn) {
      callService("fan", "turn_off", { entity_id: entityId });
    } else {
      callService("fan", "turn_on", { entity_id: entityId });
    }
  };

  const handleOscillate = (e) => {
    e.stopPropagation();
    if (isUnavailable) return;
    callService("fan", "oscillate", { entity_id: entityId, oscillating: !isOscillating });
  };

  const handlePreset = (e, mode) => {
    e.stopPropagation();
    if (isUnavailable) return;
    if (mode === 'off') {
      callService("fan", "turn_off", { entity_id: entityId });
      return;
    }
    if (hasPresets) {
      callService("fan", "set_preset_mode", { entity_id: entityId, preset_mode: mode });
    } else {
      const percentMap = { 'low': 25, 'medium': 74, 'high': 100 };
      const percent = percentMap[mode.toLowerCase()];
      if (percent) callService("fan", "turn_on", { entity_id: entityId, percentage: percent });
    }
  };

  // Small card layout
  if (isSmall) {
    return (
      <div 
        key={cardId} 
        {...dragProps} 
        data-haptic={editMode ? undefined : 'card'} 
        onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} 
        className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} 
        style={cardStyle}
      >
        {controls}
        
        <button 
          onClick={handleToggle}
          className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 ${isOn ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'}`}
          disabled={isUnavailable}
          aria-label={`${name || t('common.fan')}: ${isOn ? t('common.off') : t('common.on')}`}
        >
          <FanIcon className={`w-6 h-6 stroke-[1.5px] ${isOn ? 'fill-cyan-400/20' : ''}`} />
        </button>

        <div className="flex-1 flex flex-col gap-3 min-w-0 justify-center h-full pt-1">
          <div className="flex justify-between items-baseline pr-1">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none">{String(name || t('common.fan'))}</p>
            <span className={`text-xs uppercase font-bold tracking-widest leading-none transition-colors ${isOn ? 'text-cyan-400' : 'text-[var(--text-secondary)] opacity-50'}`}>
              {isUnavailable ? '--' : (isOn ? `${percentage}%` : t('common.off'))}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center mt-1.5">
             <button key="off" onClick={(e) => handlePreset(e, 'off')} disabled={isUnavailable || !isOn} className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all ${!isOn ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-transparent hover:border-[var(--glass-border)]'}`}>off</button>
             {(presetModes.length > 0 ? presetModes.filter(m => m.toLowerCase() !== 'off') : ['low','medium','high']).map((mode) => {
               const pct = {'low':25,'medium':74,'high':100}[mode.toLowerCase()];
               const active = hasPresets ? (presetMode===mode) : (isOn && pct && ((pct===25 && percentage>0 && percentage<=25) || (pct===74 && percentage>25 && percentage<=74) || (pct===100 && percentage>74)));
               return <button key={mode} onClick={(e) => handlePreset(e, mode)} disabled={isUnavailable} className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all ${active ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-transparent hover:border-[var(--glass-border)]'}`}>{mode}</button>;
             })}
          </div>
        </div>
      </div>
    );
  }

  // Regular card layout
  return (
    <div 
      key={cardId} 
      {...dragProps} 
      data-haptic={editMode ? undefined : 'card'} 
      onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} 
      className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} 
      style={cardStyle}
    >
      {controls}
      
      <div className="flex justify-between items-start">
        <button 
          onClick={handleToggle}
          className={`p-3 rounded-2xl transition-all duration-500 ${isOn ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`} 
          disabled={isUnavailable}
        >
          <FanIcon className={`w-5 h-5 stroke-[1.5px] ${isOn ? 'fill-cyan-400/20' : ''}`} />
        </button>
        
        <div className="flex items-center gap-2">
          {/* Oscillate button if supported */}
          {oscillating !== undefined && (
            <button
              onClick={handleOscillate}
              className={`p-2 rounded-xl transition-all ${isOscillating ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`}
              disabled={isUnavailable}
              title={t('fan.oscillate')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
              </svg>
            </button>
          )}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isUnavailable ? 'bg-red-500/10 border-red-500/20 text-red-500' : (isOn ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]')}`}>
            <span className="text-xs tracking-widest uppercase font-bold">
              {isUnavailable ? t('status.unavailable') : (isOn ? (presetMode || `${percentage}%`) : t('common.off'))}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 font-sans">
        <p className="text-[var(--text-secondary)] text-[10px] tracking-[0.2em] uppercase mb-0.5 font-bold opacity-60 leading-none">
          {String(name || t('common.fan'))}
        </p>
        
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-4xl font-medium text-[var(--text-primary)] leading-none">
            {isUnavailable ? "--" : (isOn ? (percentage || "0") : "0")}
          </span>
          <span className="text-[var(--text-muted)] font-medium text-base ml-1">%</span>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center mt-3">
          <button key="off" onClick={(e) => handlePreset(e, 'off')} disabled={isUnavailable || !isOn} className={`px-3 py-2 text-xs uppercase tracking-wider rounded-lg transition-all ${!isOn ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-transparent hover:border-[var(--glass-border)]'}`}>off</button>
          {(presetModes.length > 0 ? presetModes.filter(m => m.toLowerCase() !== 'off') : ['low','medium','high']).map((mode) => {
            const pct = {'low':25,'medium':74,'high':100}[mode.toLowerCase()];
            const active = hasPresets ? (presetMode===mode) : (isOn && pct && ((pct===25 && percentage>0 && percentage<=25) || (pct===74 && percentage>25 && percentage<=74) || (pct===100 && percentage>74)));
            return <button key={mode} onClick={(e) => handlePreset(e, mode)} disabled={isUnavailable} className={`px-3 py-2 text-xs uppercase tracking-wider rounded-lg transition-all ${active ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-transparent hover:border-[var(--glass-border)]'}`}>{mode}</button>;
          })}
        </div>
      </div>
    </div>
  );
};

export default FanCard;
