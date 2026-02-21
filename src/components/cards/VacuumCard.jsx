import { useEffect, useRef, useState } from 'react';
import { getIconComponent } from '../../icons';
import {
  AlertTriangle,
  Battery,
  Bot,
  Home,
  MapPin,
  Pause,
  Play
} from '../../icons';

const VacuumCard = ({
  vacuumId,
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
  isMobile,
  t
}) => {
  const cardRef = useRef(null);
  const [isNarrowSmallCard, setIsNarrowSmallCard] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const updateWidth = () => {
      setIsNarrowSmallCard(element.clientWidth < 230);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const entity = entities[vacuumId];
  if (!entity) {
    if (editMode) {
      return (
        <div key={vacuumId} {...dragProps} className="touch-feedback relative rounded-3xl overflow-hidden bg-[var(--card-bg)] border border-dashed border-red-500/50 flex flex-col items-center justify-center p-4 h-full" style={cardStyle}>
          {controls}
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2 opacity-80" />
          <p className="text-xs font-bold text-red-500 text-center uppercase tracking-widest">{t('common.missing')}</p>
          <p className="text-[10px] text-red-400/70 text-center mt-1 font-mono break-all line-clamp-2">{vacuumId}</p>
        </div>
      );
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[vacuumId] || {};
  const isSmall = settings.size === 'small';
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const battery = getA(vacuumId, "battery_level");
  const room = getA(vacuumId, "current_room") || getA(vacuumId, "room");
  const name = customNames[vacuumId] || getA(vacuumId, "friendly_name", t('vacuum.name'));
  const vacuumIconName = customIcons[vacuumId] || entity?.attributes?.icon;
  const Icon = vacuumIconName ? (getIconComponent(vacuumIconName) || Bot) : Bot;
  const statusText = (() => {
    if (state === "cleaning") return t('vacuum.cleaning');
    if (state === "returning") return t('vacuum.returning');
    if ((state === "charging" || state === "docked") && battery === 100) return t('vacuum.docked');
    if (state === "docked") return t('vacuum.charging');
    if (state === "idle") return t('vacuum.idle');
    return state || t('vacuum.unknown');
  })();

  const showRoom = !!room;
  const showBattery = typeof battery === 'number';

  if (isSmall) {
    return (
      <div ref={cardRef} key={vacuumId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} className={`touch-feedback ${isMobile ? 'p-3 pl-4 gap-2' : 'p-4 pl-5 gap-4'} rounded-3xl flex items-center justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={{...cardStyle, backgroundColor: state === "cleaning" ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.2)' : (state === "cleaning" ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)'), containerType: 'inline-size'}}>
        {controls}
        <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'} flex-1 min-w-0`}>
          <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all ${state === "cleaning" ? 'bg-[var(--accent-bg)] text-[var(--accent-color)] animate-pulse' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
            <Icon className="w-6 h-6 stroke-[1.5px]" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{name}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)] leading-none">{statusText}</span>
              {showBattery && !isNarrowSmallCard && <span className="text-xs text-[var(--text-secondary)]">{battery}%</span>}
            </div>
          </div>
        </div>
        <div className="vacuum-card-controls shrink-0">
          <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", state === "cleaning" ? "pause" : "start", { entity_id: vacuumId }); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-primary)] active:scale-95">
            {state === "cleaning" ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", "return_to_base", { entity_id: vacuumId }); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95">
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div key={vacuumId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} className={`touch-feedback ${isMobile ? 'p-5' : 'p-7'} rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`} style={{...cardStyle, backgroundColor: state === "cleaning" ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.2)' : (state === "cleaning" ? 'rgba(59, 130, 246, 0.3)' : 'var(--card-border)')}}>
      {controls}
      <div className="flex justify-between items-start font-sans">
         <div className={`rounded-2xl transition-all ${isMobile ? 'p-2.5' : 'p-3'} ${state === "cleaning" ? 'bg-[var(--accent-bg)] text-[var(--accent-color)] animate-pulse' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
         <div className="flex flex-col items-end gap-2">
           {showRoom && (
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><MapPin className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{room}</span></div>
           )}
           {showBattery && (
             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><Battery className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{battery}%</span></div>
           )}
         </div>
      </div>
      
      <div className="flex justify-between items-end">
         <div>
           <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{name}</p>
           <h3 className="text-2xl font-medium text-[var(--text-primary)] leading-none">{statusText}</h3>
         </div>
         <div className="flex gap-2">
           <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", state === "cleaning" ? "pause" : "start", { entity_id: vacuumId }); }} className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-primary)] active:scale-95`}>
             {state === "cleaning" ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
           </button>
           <button onClick={(e) => { e.stopPropagation(); if (!isUnavailable) callService("vacuum", "return_to_base", { entity_id: vacuumId }); }} className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95`}>
             <Home className="w-5 h-5" />
           </button>
         </div>
      </div>
    </div>
  );
};

export default VacuumCard;
