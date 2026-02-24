import { useState, useRef, useEffect } from 'react';
import { getIconComponent } from '../../icons';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

/* -- Styles ---------------------------------------------------------- */
const CONTROL_STYLE = "bg-black/5 border border-[var(--glass-border)] ring-1 ring-white/5 shadow-inner";

/* -- Vertical Blind Slider ------------------------------------------- */
const BlindSlider = ({ position, onChange, onCommit, accent, isUnavailable }) => {
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const calcFromEvent = (clientY) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    let pct = 100 - (y / rect.height) * 100;
    pct = Math.max(0, Math.min(100, pct));
    return Math.round(pct / 5) * 5;
  };

  const handlePointerDown = (e) => {
    if (isUnavailable) return;
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const val = calcFromEvent(e.clientY);
    if (val !== null) onChange(val);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || isUnavailable) return;
    const val = calcFromEvent(e.clientY);
    if (val !== null) onChange(val);
  };

  const handlePointerUp = (e) => {
    if (isDragging.current) {
        isDragging.current = false;
        const val = calcFromEvent(e.clientY);
        if (val !== null) onCommit(val);
    }
  };

  const closedPct = 100 - (position ?? 0);
  const slatCount = 10;
  const visibleSlats = Math.round((closedPct / 100) * slatCount);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-full rounded-2xl overflow-hidden ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-ns-resize touch-none'} ${CONTROL_STYLE}`}
    >
      {/* The Blind (Fills from top) */}
      <div
        className="absolute top-0 left-0 right-0 transition-all duration-100 ease-out flex flex-col justify-end"
        style={{
          height: `${closedPct}%`,
          backgroundColor: accent.fill,
        }}
      >
        <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col pointer-events-none overflow-hidden">
           {Array.from({ length: slatCount }).map((_, i) => (
             <div 
               key={i} 
               className="flex-1 border-b border-black/5"
               style={{ opacity: i < visibleSlats ? 1 : 0 }}
             />
           ))}
        </div>
      </div>
      
      {/* Handle (Outside, fixed to bottom of blind) */}
      <div 
        className="absolute left-3 right-3 h-1.5 rounded-full bg-white/40 shadow-sm pointer-events-none transition-all duration-100 ease-out"
        style={{ top: `calc(${closedPct}% - ${closedPct * 0.06}px)` }}
      />
    </div>
  );
};

/* -- Horizontal Blind Slider (Small Card) --------------------------- */
const HorizontalBlindSlider = ({ position, onChange, onCommit, accent, isUnavailable }) => {
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const calcFromEvent = (clientX) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let pct = (x / rect.width) * 100; // Left=0, Right=100
    pct = Math.max(0, Math.min(100, pct));
    // Invert drag: Dragging Right adds to "Closed" (Width increases), so "Open" (Position) decreases.
    return Math.round((100 - pct) / 5) * 5;
  };

  const handlePointerDown = (e) => {
    if (isUnavailable) return;
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const val = calcFromEvent(e.clientX);
    if (val !== null) onChange(val);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || isUnavailable) return;
    const val = calcFromEvent(e.clientX);
    if (val !== null) onChange(val);
  };

  const handlePointerUp = (e) => {
    if (isDragging.current) {
        isDragging.current = false;
        const val = calcFromEvent(e.clientX);
        if (val !== null) onCommit(val);
    }
  };

  // Logic: "Curtain" style.
  // Position 0 (Closed) -> Full Width Fill (100%).
  // Position 100 (Open) -> 0 Width Fill (0%).
  const closedPct = 100 - (position ?? 0);
  
  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-full rounded-xl overflow-hidden ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-ew-resize touch-none'} ${CONTROL_STYLE}`}
    >
        {/* Fill from left */}
        <div 
            className="absolute left-0 top-0 bottom-0 transition-all duration-100 ease-out flex flex-row justify-end"
            style={{ 
                width: `${closedPct}%`,
                backgroundColor: accent.fill 
            }}
        >
            {/* Vertical "curtain fold" lines */}
            <div className="absolute inset-y-0 left-0 right-0 flex flex-row pointer-events-none overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div 
                        key={i}
                        className="flex-1 border-r border-black/5"
                    />
                ))}
            </div>
        </div>

        {/* Vertical Handle (Outside, fixed to right edge of blind) */}
        <div 
            className="absolute top-1.5 bottom-1.5 w-1.5 rounded-full bg-white/40 shadow-sm pointer-events-none transition-all duration-100 ease-out"
            style={{ left: `calc(${closedPct}% - ${closedPct * 0.06}px)` }}
        />
    </div>
  );
};

/* -- Button Control Component ---------------------------------------- */
const ButtonControl = ({ onOpen, onClose, onStop, isUnavailable, horizontal = false }) => {
  if (horizontal) {
       return (
        <div className={`w-full h-full flex items-center justify-between p-1.5 gap-1.5 rounded-2xl ${CONTROL_STYLE}`}>
            <button 
                onClick={(e)=>{e.stopPropagation(); onOpen()}} 
                disabled={isUnavailable} 
                className="flex-1 h-full flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                <ChevronUp className="w-5 h-5" />
            </button>
            <button 
                onClick={(e)=>{e.stopPropagation(); onStop()}} 
                disabled={isUnavailable} 
                className="w-10 h-full flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                <div className="w-2 h-2 rounded-sm bg-current" />
            </button>
            <button 
                onClick={(e)=>{e.stopPropagation(); onClose()}} 
                disabled={isUnavailable} 
                className="flex-1 h-full flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
                <ChevronDown className="w-5 h-5" />
            </button>
        </div>
       );
  }

  return (
    <div className={`w-full h-full flex flex-col gap-1.5 p-1.5 rounded-[2rem] ${CONTROL_STYLE}`}>
      <button
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        disabled={isUnavailable}
        className="flex-1 w-full rounded-t-[1.6rem] rounded-b-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] flex items-center justify-center transition-all group"
      >
        <ChevronUp className="w-8 h-8 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
      </button>
      
      <button
        onClick={(e) => { e.stopPropagation(); onStop(); }}
        disabled={isUnavailable}
        className="h-12 w-full rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] flex items-center justify-center transition-all group"
      >
         <div className="w-3 h-3 rounded-sm bg-[var(--text-secondary)] group-hover:bg-[var(--text-primary)]" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        disabled={isUnavailable}
        className="flex-1 w-full rounded-b-[1.6rem] rounded-t-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] flex items-center justify-center transition-all group"
      >
        <ChevronDown className="w-8 h-8 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
      </button>
    </div>
  );
};

/* -- Small Card Variant ---------------------------------------------- */
const SmallCoverCard = (props) => {
  const { cardId, dragProps, controls, cardStyle, editMode, onOpen, localPos, position, isMoving, getStateLabel, accent, isUnavailable, handleToggleMode, Icon, mode, supportsPosition, handlePositionCommit, setLocalPos, handleOpenCover, handleCloseCover, handleStopCover, name } = props;

    return (
        <div
            key={cardId}
            {...dragProps}
            data-haptic={editMode ? undefined : 'card'}
            onClick={(e) => {
                e.stopPropagation();
                if (!editMode && onOpen) onOpen();
            }}
            className={`
                glass-texture touch-feedback p-4 pl-5 rounded-3xl flex items-center gap-4
                transition-all duration-500 border group relative overflow-hidden font-sans h-full
                ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}
                ${isUnavailable ? 'opacity-70' : ''}
            `}
            style={cardStyle}
        >
            {controls}
            
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div 
                    onClick={(e) => { e.stopPropagation(); handleToggleMode(); }}
                    className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                    style={{ 
                        backgroundColor: accent.bg,
                        color: accent.text
                    }}
                >
                    <Icon className={`w-6 h-6 stroke-[1.5px] ${isMoving ? 'animate-pulse' : ''}`} />
                </div>

                <div className="flex flex-col min-w-0">
                    <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{name}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-medium text-[var(--text-primary)] leading-none">
                            {typeof position === 'number' ? `${localPos}%` : getStateLabel()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls Right */}
            <div className="w-24 h-10 shrink-0" onClick={(e) => e.stopPropagation()}>
                {mode === 'slider' && supportsPosition ? (
                    <HorizontalBlindSlider
                        position={localPos} 
                        onChange={setLocalPos} 
                        onCommit={handlePositionCommit}
                        accent={accent}
                        isUnavailable={isUnavailable}
                    />
                ) : (
                    <ButtonControl 
                        onOpen={handleOpenCover}
                        onClose={handleCloseCover}
                        onStop={handleStopCover}
                        isUnavailable={isUnavailable}
                        accent={accent}
                        horizontal={true}
                    />
                )}
            </div>
        </div>
    );
};


const CoverCard = ({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  onOpen,
  callService,
  settings,
  t,
}) => {
  const activeEntityId = entityId || '';
  const activeEntity = entity || { state: 'unknown', attributes: {} };

  const isSmall = settings?.size === 'small';
  const state = activeEntity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOpening = state === 'opening';
  const isClosing = state === 'closing';
  const isMoving = isOpening || isClosing;
  
  // Features
  const supportedFeatures = activeEntity.attributes?.supported_features ?? 0;
  const supportsPosition = (supportedFeatures & 4) !== 0;

  const name = customNames[cardId] || activeEntity.attributes?.friendly_name || activeEntityId;
  const coverIconName = customIcons[cardId] || activeEntity?.attributes?.icon;
  const Icon = coverIconName ? (getIconComponent(coverIconName) || ArrowUpDown) : ArrowUpDown;

  // View Mode: 'slider' or 'buttons'
  const [mode, setMode] = useState(supportsPosition ? 'slider' : 'buttons');

  const translate = t || ((key) => key);

  // Position Logic
  const position = activeEntity.attributes?.current_position;
  const [localPos, setLocalPos] = useState(position ?? 0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current && typeof position === 'number') {
      setLocalPos(position);
    }
  }, [position]);

  // Colors
  const getAccent = () => {
    const defaultColor = 'var(--text-primary)'; 
    const defaultFill = 'rgba(160, 160, 160, 0.35)'; // Semi-transparent glass fill
    
    if (isUnavailable) return { text: '#ef4444', fill: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.1)' };
    return { text: defaultColor, fill: defaultFill, bg: 'var(--glass-bg)' };
  };
  const accent = getAccent();

    const handleOpenCover = () => !isUnavailable && activeEntityId && callService('cover', 'open_cover', { entity_id: activeEntityId });
    const handleCloseCover = () => !isUnavailable && activeEntityId && callService('cover', 'close_cover', { entity_id: activeEntityId });
    const handleStopCover = () => !isUnavailable && activeEntityId && callService('cover', 'stop_cover', { entity_id: activeEntityId });
  
  const handlePositionCommit = (val) => {
      setLocalPos(val);
      if (!activeEntityId) return;
      callService('cover', 'set_cover_position', { entity_id: activeEntityId, position: val });
  };

  const handleToggleMode = (e) => {
      e.stopPropagation();
      setMode(prev => prev === 'slider' ? 'buttons' : 'slider');
  };

  const getStateLabel = () => {
    if (isUnavailable) return translate('status.unavailable');
    if (isOpening) return translate('cover.opening');
    if (isClosing) return translate('cover.closing');
    if (state === 'open') return translate('cover.open');
    if (state === 'closed') return translate('cover.closed');
    return state;
  };

  const commonProps = {
      cardId, dragProps, controls, cardStyle, editMode, onOpen, 
      name, localPos, position, isMoving, isOpening, getStateLabel, accent, isUnavailable,
      handleToggleMode, Icon, mode, supportsPosition, handlePositionCommit, setLocalPos,
      handleOpenCover, handleCloseCover, handleStopCover, translate
  };

  if (!entity || !activeEntityId) return null;

  if (isSmall) {
      return <SmallCoverCard {...commonProps} />;
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`
        glass-texture touch-feedback relative p-7 rounded-[2.5rem] flex items-stretch justify-between 
        transition-all duration-500 group overflow-hidden font-sans h-full select-none border 
        border-[var(--glass-border)] bg-[var(--glass-bg)]
        ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}
        ${isUnavailable ? 'opacity-70' : ''}
      `}
      style={cardStyle}
      onClick={(e) => {
         e.stopPropagation();
         if (!editMode && onOpen) onOpen();
      }}
    >
      {controls}

      {/* LEFT COLUMN: Info */}
      <div className="flex flex-col justify-between flex-1 min-w-0 pr-2 z-10 pointer-events-none">
        {/* Top: Icon (Interactive for mode toggle) */}
        <div className="flex items-start pointer-events-auto">
              <div 
                onClick={handleToggleMode}
                className="p-3 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 cursor-pointer active:scale-90"
                style={{ backgroundColor: accent.bg, color: accent.text }}
              >
              <Icon className={`w-5 h-5 stroke-[1.5px] ${isMoving ? 'animate-pulse' : ''}`} />
           </div>
        </div>

        {/* Bottom: Info */}
        <div className="flex flex-col gap-1 pl-1">
           <div className="flex items-baseline gap-1">
              {typeof position === 'number' ? (
                <>
                  <span className="text-4xl font-thin leading-none tabular-nums text-[var(--text-primary)]">
                    {localPos}
                  </span>
                  <span className="text-xl text-[var(--text-secondary)] font-light leading-none">%</span>
                </>
              ) : (
                 <span className="text-3xl font-thin leading-none text-[var(--text-primary)] capitalize">
                    {getStateLabel()}
                 </span>
              )}
           </div>
           
           <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-80 truncate">
              {name}
           </div>
           
           {isMoving && (
             <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] animate-pulse mt-1">
               {isOpening ? `${translate('cover.opening')}...` : `${translate('cover.closing')}...`}
             </div>
           )}
        </div>
      </div>

      {/* RIGHT COLUMN: Control */}
      <div className="w-14 pl-3 relative z-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
         {mode === 'slider' && supportsPosition ? (
            <BlindSlider 
               position={localPos} 
               onChange={setLocalPos} 
               onCommit={handlePositionCommit}
               accent={accent}
               isUnavailable={isUnavailable}
            />
         ) : (
            <ButtonControl 
               onOpen={handleOpenCover} 
               onClose={handleCloseCover} 
               onStop={handleStopCover}
               isUnavailable={isUnavailable}
            />
         )}
      </div>
    </div>
  );
};

export default CoverCard;
