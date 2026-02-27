import { useState, useRef, useEffect } from 'react';
import { getIconComponent } from '../../icons';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

/* -- Styles ---------------------------------------------------------- */
const CONTROL_STYLE =
  'bg-black/5 border border-[var(--glass-border)] ring-1 ring-white/5 shadow-inner';

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
      className={`relative h-full w-full overflow-hidden rounded-2xl ${isUnavailable ? 'cursor-not-allowed opacity-50' : 'cursor-ns-resize touch-none'} ${CONTROL_STYLE}`}
    >
      {/* The Blind (Fills from top) */}
      <div
        className="absolute top-0 right-0 left-0 flex flex-col justify-end transition-all duration-100 ease-out"
        style={{
          height: `${closedPct}%`,
          backgroundColor: accent.fill,
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex flex-col overflow-hidden">
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
        className="pointer-events-none absolute right-3 left-3 h-1.5 rounded-full bg-white/40 shadow-sm transition-all duration-100 ease-out"
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
      className={`relative h-full w-full overflow-hidden rounded-xl ${isUnavailable ? 'cursor-not-allowed opacity-50' : 'cursor-ew-resize touch-none'} ${CONTROL_STYLE}`}
    >
      {/* Fill from left */}
      <div
        className="absolute top-0 bottom-0 left-0 flex flex-row justify-end transition-all duration-100 ease-out"
        style={{
          width: `${closedPct}%`,
          backgroundColor: accent.fill,
        }}
      >
        {/* Vertical "curtain fold" lines */}
        <div className="pointer-events-none absolute inset-y-0 right-0 left-0 flex flex-row overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-black/5" />
          ))}
        </div>
      </div>

      {/* Vertical Handle (Outside, fixed to right edge of blind) */}
      <div
        className="pointer-events-none absolute top-1.5 bottom-1.5 w-1.5 rounded-full bg-white/40 shadow-sm transition-all duration-100 ease-out"
        style={{ left: `calc(${closedPct}% - ${closedPct * 0.06}px)` }}
      />
    </div>
  );
};

/* -- Button Control Component ---------------------------------------- */
const ButtonControl = ({ onOpen, onClose, onStop, isUnavailable, horizontal = false }) => {
  if (horizontal) {
    return (
      <div
        className={`flex h-full w-full items-center justify-between gap-1.5 rounded-2xl p-1.5 ${CONTROL_STYLE}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          disabled={isUnavailable}
          className="flex h-full flex-1 items-center justify-center rounded-xl bg-white/5 text-[var(--text-secondary)] transition-all hover:bg-white/10 hover:text-[var(--text-primary)] active:scale-95"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          disabled={isUnavailable}
          className="flex h-full w-10 items-center justify-center rounded-xl bg-white/5 text-[var(--text-secondary)] transition-all hover:bg-white/10 hover:text-[var(--text-primary)] active:scale-95"
        >
          <div className="h-2 w-2 rounded-sm bg-current" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          disabled={isUnavailable}
          className="flex h-full flex-1 items-center justify-center rounded-xl bg-white/5 text-[var(--text-secondary)] transition-all hover:bg-white/10 hover:text-[var(--text-primary)] active:scale-95"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full flex-col gap-1.5 rounded-[2rem] p-1.5 ${CONTROL_STYLE}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        disabled={isUnavailable}
        className="group flex w-full flex-1 items-center justify-center rounded-t-[1.6rem] rounded-b-xl bg-white/5 transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        <ChevronUp className="h-8 w-8 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onStop();
        }}
        disabled={isUnavailable}
        className="group flex h-12 w-full items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        <div className="h-3 w-3 rounded-sm bg-[var(--text-secondary)] group-hover:bg-[var(--text-primary)]" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        disabled={isUnavailable}
        className="group flex w-full flex-1 items-center justify-center rounded-t-xl rounded-b-[1.6rem] bg-white/5 transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        <ChevronDown className="h-8 w-8 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
      </button>
    </div>
  );
};

/* -- Small Card Variant ---------------------------------------------- */
const SmallCoverCard = (props) => {
  const {
    cardId,
    dragProps,
    controls,
    cardStyle,
    editMode,
    onOpen,
    localPos,
    position,
    isMoving,
    getStateLabel,
    accent,
    isUnavailable,
    handleToggleMode,
    Icon,
    mode,
    supportsPosition,
    handlePositionCommit,
    setLocalPos,
    handleOpenCover,
    handleCloseCover,
    handleStopCover,
    name,
  } = props;

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`glass-texture touch-feedback group relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''} `}
      style={cardStyle}
    >
      {controls}

      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleToggleMode();
          }}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
          style={{
            backgroundColor: accent.bg,
            color: accent.text,
          }}
        >
          <Icon className={`h-6 w-6 stroke-[1.5px] ${isMoving ? 'animate-pulse' : ''}`} />
        </div>

        <div className="flex min-w-0 flex-col">
          <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
            {name}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg leading-none font-medium text-[var(--text-primary)]">
              {typeof position === 'number' ? `${localPos}%` : getStateLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Controls Right */}
      <div className="h-10 w-24 shrink-0" onClick={(e) => e.stopPropagation()}>
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
  const Icon = coverIconName ? getIconComponent(coverIconName) || ArrowUpDown : ArrowUpDown;

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

    if (isUnavailable)
      return { text: '#ef4444', fill: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.1)' };
    return { text: defaultColor, fill: defaultFill, bg: 'var(--glass-bg)' };
  };
  const accent = getAccent();

  const handleOpenCover = () =>
    !isUnavailable &&
    activeEntityId &&
    callService('cover', 'open_cover', { entity_id: activeEntityId });
  const handleCloseCover = () =>
    !isUnavailable &&
    activeEntityId &&
    callService('cover', 'close_cover', { entity_id: activeEntityId });
  const handleStopCover = () =>
    !isUnavailable &&
    activeEntityId &&
    callService('cover', 'stop_cover', { entity_id: activeEntityId });

  const handlePositionCommit = (val) => {
    setLocalPos(val);
    if (!activeEntityId) return;
    callService('cover', 'set_cover_position', { entity_id: activeEntityId, position: val });
  };

  const handleToggleMode = (e) => {
    e.stopPropagation();
    setMode((prev) => (prev === 'slider' ? 'buttons' : 'slider'));
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
    cardId,
    dragProps,
    controls,
    cardStyle,
    editMode,
    onOpen,
    name,
    localPos,
    position,
    isMoving,
    isOpening,
    getStateLabel,
    accent,
    isUnavailable,
    handleToggleMode,
    Icon,
    mode,
    supportsPosition,
    handlePositionCommit,
    setLocalPos,
    handleOpenCover,
    handleCloseCover,
    handleStopCover,
    translate,
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
      className={`glass-texture touch-feedback group relative flex h-full items-stretch justify-between overflow-hidden rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-7 font-sans transition-all duration-500 select-none ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''} `}
      style={cardStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
    >
      {controls}

      {/* LEFT COLUMN: Info */}
      <div className="pointer-events-none z-10 flex min-w-0 flex-1 flex-col justify-between pr-2">
        {/* Top: Icon (Interactive for mode toggle) */}
        <div className="pointer-events-auto flex items-start">
          <div
            onClick={handleToggleMode}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] shadow-sm transition-all group-hover:scale-110 hover:bg-white/10 active:scale-90"
            style={{ color: accent.text }}
          >
            <Icon className={`h-6 w-6 stroke-[1.5px] ${isMoving ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* Bottom: Info */}
        <div className="flex flex-col gap-1 pl-1">
          <div className="flex items-baseline gap-1">
            {typeof position === 'number' ? (
              <>
                <span className="text-4xl leading-none font-thin text-[var(--text-primary)] tabular-nums">
                  {localPos}
                </span>
                <span className="text-xl leading-none font-light text-[var(--text-secondary)]">
                  %
                </span>
              </>
            ) : (
              <span className="text-3xl leading-none font-thin text-[var(--text-primary)] capitalize">
                {getStateLabel()}
              </span>
            )}
          </div>

          <div className="truncate text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase opacity-80">
            {name}
          </div>

          {isMoving && (
            <div className="mt-1 animate-pulse text-[10px] font-bold tracking-widest text-[var(--text-primary)] uppercase">
              {isOpening ? `${translate('cover.opening')}...` : `${translate('cover.closing')}...`}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Control */}
      <div className="relative z-0 flex w-14 flex-col pl-3" onClick={(e) => e.stopPropagation()}>
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
