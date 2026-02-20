import { useRef, useEffect, useCallback } from 'react';
import { getIconComponent } from '../../icons';
import { Lightbulb } from '../../icons';
import M3Slider from '../ui/M3Slider';

const SLIDER_DEBOUNCE_MS = 200;

const LightCard = ({
  cardId,
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
  optimisticLightBrightness,
  setOptimisticLightBrightness,
  t
}) => {
  const entity = entities[cardId];
  const DefaultIcon = Lightbulb;
  const lightIconName = customIcons[cardId] || entity?.attributes?.icon;
  const LightIcon = lightIconName ? (getIconComponent(lightIconName) || DefaultIcon) : DefaultIcon;
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state === "on";
  const br = getA(cardId, "brightness") || 0;
  const subEntities = getA(cardId, "entity_id", []);
  const activeCount = subEntities.filter(id => entities[id]?.state === 'on').length;
  const totalCount = subEntities.length;
  const name = customNames[cardId] || getA(cardId, "friendly_name");

  // Determine if light supports dimming
  const supportedColorModes = entity?.attributes?.supported_color_modes;
  const isDimmable = supportedColorModes 
    ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1 
    : (entity?.attributes?.supported_features & 1) === 1;

  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const isSmall = sizeSetting === 'small';

  // Debounced brightness service call
  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleBrightnessChange = useCallback((e) => {
    const val = parseInt(e.target.value);
    setOptimisticLightBrightness(prev => ({ ...prev, [cardId]: val }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      callService("light", "turn_on", { entity_id: cardId, brightness: val });
    }, SLIDER_DEBOUNCE_MS);
  }, [cardId, callService, setOptimisticLightBrightness]);

  if (isSmall) {
    return (
      <div key={cardId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={cardStyle}>
        {controls}
        
        <button 
          onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("light", isOn ? "turn_off" : "turn_on", { entity_id: cardId }); }} 
          className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'}`} 
          disabled={isUnavailable}
          aria-label={`${name || t('common.light')}: ${isOn ? t('common.off') : t('common.on')}`}
        >
          <LightIcon className={`w-6 h-6 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''}`} />
        </button>

        <div className="flex-1 flex flex-col gap-3 min-w-0 justify-center h-full pt-1">
          <div className="flex justify-between items-baseline pr-1">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none">{String(name || t('common.light'))}</p>
            <span className={`text-xs uppercase font-bold tracking-widest leading-none transition-colors ${isOn ? 'text-amber-400' : 'text-[var(--text-secondary)] opacity-50'}`}>{isOn ? (isDimmable ? `${Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100)}%` : t('common.on')) : t('common.off')}</span>
          </div>
          <div className="w-full h-6 flex items-center">
             {isDimmable && <M3Slider variant="thinLg" min={0} max={255} step={1} value={optimisticLightBrightness[cardId] ?? br} disabled={isUnavailable} onChange={handleBrightnessChange} colorClass="bg-amber-500" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={cardId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={cardStyle}>
      {controls}
      <div className="flex justify-between items-start"><button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("light", isOn ? "turn_off" : "turn_on", { entity_id: cardId }); }} className={`p-3 rounded-2xl transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`} disabled={isUnavailable}><LightIcon className={`w-5 h-5 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''}`} /></button><div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isUnavailable ? 'bg-red-500/10 border-red-500/20 text-red-500' : (isOn ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]')}`}><span className="text-xs tracking-widest uppercase font-bold">{isUnavailable ? t('status.unavailable') : (totalCount > 0 ? (activeCount > 0 ? `${activeCount}/${totalCount}` : t('common.off')) : (isOn ? t('common.on') : t('common.off')))}</span></div></div>
      <div className="mt-2 font-sans">
        <p className="text-[var(--text-secondary)] text-[10px] tracking-[0.2em] uppercase mb-0.5 font-bold opacity-60 leading-none">{String(name || t('common.light'))}</p>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-4xl font-medium text-[var(--text-primary)] leading-none">
            {isUnavailable ? "--" : (isOn ? (isDimmable ? Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100) : t('common.on')) : (isDimmable ? "0" : t('common.off')))}
          </span>
          {isDimmable && <span className="text-[var(--text-muted)] font-medium text-base ml-1">%</span>}
        </div>
        {isDimmable && <M3Slider min={0} max={255} step={1} value={optimisticLightBrightness[cardId] ?? br} disabled={isUnavailable} onChange={handleBrightnessChange} colorClass="bg-amber-500" />}
      </div>
    </div>
  );
};

export default LightCard;
