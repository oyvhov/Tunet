import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, X } from '../icons';
import { getIconComponent } from '../icons';

/* -- Interactive Visual Blind ---------------------------------------- */
const InteractiveBlind = ({ position, onPositionChange, accent, disabled, slatCount = 12 }) => {
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const closedAmount = 100 - (position ?? 0);
  const visibleSlats = Math.round((closedAmount / 100) * slatCount);

  const calcPositionFromEvent = useCallback((clientY) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const pct = Math.round(Math.max(0, Math.min(100, 100 - (y / rect.height) * 100)));
    return pct;
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      isDragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = calcPositionFromEvent(e.clientY);
      if (pos !== null) onPositionChange(pos);
    },
    [disabled, calcPositionFromEvent, onPositionChange]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging.current || disabled) return;
      const pos = calcPositionFromEvent(e.clientY);
      if (pos !== null) onPositionChange(pos);
    },
    [disabled, calcPositionFromEvent, onPositionChange]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full touch-none overflow-hidden rounded-2xl border-2 select-none ${disabled ? 'opacity-50' : 'cursor-ns-resize'}`}
      style={{ borderColor: accent.border, backgroundColor: 'rgba(135,206,235,0.04)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Window cross-pane lines */}
      <div className="pointer-events-none absolute inset-0 flex">
        <div className="flex-1 border-r" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
        <div className="flex-1" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="w-full border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
      </div>

      {/* Slats from top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex flex-col">
        {Array.from({ length: slatCount }).map((_, i) => (
          <div
            key={i}
            className="w-full transition-all duration-300 ease-out"
            style={{
              height: `${100 / slatCount}%`,
              opacity: i < visibleSlats ? 1 : 0,
              transform: i < visibleSlats ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'top',
              backgroundColor: accent.slat,
              borderBottom: i < visibleSlats ? `1px solid ${accent.slatBorder}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Draggable rail handle */}
      {!disabled && (
        <div
          className="pointer-events-none absolute right-2 left-2 flex items-center justify-center transition-all duration-300"
          style={{ top: `calc(${100 - (position ?? 0)}% - 10px)` }}
        >
          <div
            className="h-[6px] w-full rounded-full shadow-lg"
            style={{
              backgroundColor: accent.text,
              opacity: 0.7,
              boxShadow: `0 0 12px ${accent.text}40`,
            }}
          />
          {/* Grip dots */}
          <div className="absolute flex gap-1">
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: accent.text, opacity: 0.9 }}
            />
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: accent.text, opacity: 0.9 }}
            />
            <div
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: accent.text, opacity: 0.9 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* -- Tilt Visual ----------------------------------------------------- */
const TiltVisual = ({ tilt, onTiltChange, accent, disabled }) => {
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const slatAngle = ((tilt ?? 0) / 100) * 80 - 40;

  const calcTiltFromEvent = useCallback((clientX) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.round(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      if (disabled) return;
      isDragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      const val = calcTiltFromEvent(e.clientX);
      if (val !== null) onTiltChange(val);
    },
    [disabled, calcTiltFromEvent, onTiltChange]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging.current || disabled) return;
      const val = calcTiltFromEvent(e.clientX);
      if (val !== null) onTiltChange(val);
    },
    [disabled, calcTiltFromEvent, onTiltChange]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex h-24 w-full touch-none flex-col justify-center gap-1 overflow-hidden rounded-xl border px-3 py-2 select-none ${disabled ? 'opacity-50' : 'cursor-ew-resize'}`}
      style={{ borderColor: accent.border, backgroundColor: 'rgba(135,206,235,0.04)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-2 w-full rounded-sm transition-all duration-300"
          style={{
            backgroundColor: accent.slat,
            transform: `perspective(80px) rotateX(${slatAngle}deg)`,
            borderBottom: `1px solid ${accent.slatBorder}`,
          }}
        />
      ))}
    </div>
  );
};

export default function CoverModal({
  show,
  onClose,
  entityId,
  entity,
  callService,
  customIcons,
  t,
}) {
  const activeEntityId = entityId || '';
  const activeEntity = entity || { state: 'unknown', attributes: {} };

  const state = activeEntity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOpen = state === 'open';
  const isClosed = state === 'closed';
  const isOpening = state === 'opening';
  const isClosing = state === 'closing';
  const isMoving = isOpening || isClosing;

  const position = activeEntity.attributes?.current_position;
  const hasPosition = typeof position === 'number';
  const tiltPosition = activeEntity.attributes?.current_tilt_position;
  const hasTilt = typeof tiltPosition === 'number';

  const supportedFeatures = activeEntity.attributes?.supported_features ?? 0;
  const supportsPosition = (supportedFeatures & 4) !== 0;
  const supportsOpenClose = (supportedFeatures & 3) !== 0;
  const supportsStop = (supportedFeatures & 8) !== 0;
  const supportsTilt = (supportedFeatures & 128) !== 0;
  const supportsTiltPosition = (supportedFeatures & 256) !== 0;

  const deviceClass = activeEntity.attributes?.device_class || 'cover';
  const name = activeEntity.attributes?.friendly_name || activeEntityId;

  const coverIconName = customIcons?.[activeEntityId] || activeEntity.attributes?.icon;
  const Icon = coverIconName ? getIconComponent(coverIconName) || ArrowUpDown : ArrowUpDown;

  const [localPosition, setLocalPosition] = useState(position ?? 0);
  const [localTilt, setLocalTilt] = useState(tiltPosition ?? 0);
  const commitTimerPos = useRef(null);
  const commitTimerTilt = useRef(null);

  useEffect(() => {
    if (!show) return;
    if (typeof position === 'number') setLocalPosition(position);
  }, [position, show]);

  useEffect(() => {
    if (!show) return;
    if (typeof tiltPosition === 'number') setLocalTilt(tiltPosition);
  }, [tiltPosition, show]);

  const translate = t || ((key) => key);

  const getAccent = () => {
    if (isUnavailable)
      return {
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
        border: 'rgba(239,68,68,0.2)',
        slat: 'rgba(239,68,68,0.25)',
        slatBorder: 'rgba(239,68,68,0.15)',
      };
    if (isMoving)
      return {
        color: '#60a5fa',
        bg: 'rgba(59,130,246,0.1)',
        border: 'rgba(59,130,246,0.2)',
        slat: 'rgba(59,130,246,0.3)',
        slatBorder: 'rgba(59,130,246,0.15)',
      };
    if (isOpen)
      return {
        color: '#34d399',
        bg: 'rgba(16,185,129,0.1)',
        border: 'rgba(16,185,129,0.2)',
        slat: 'rgba(16,185,129,0.25)',
        slatBorder: 'rgba(16,185,129,0.12)',
      };
    return {
      color: 'var(--text-secondary)',
      bg: 'var(--glass-bg)',
      border: 'var(--glass-border)',
      slat: 'rgba(148,163,184,0.35)',
      slatBorder: 'rgba(148,163,184,0.15)',
    };
  };
  const accent = getAccent();

  const getStateLabel = () => {
    if (isUnavailable) return translate('status.unavailable');
    if (isOpening) return translate('cover.opening');
    if (isClosing) return translate('cover.closing');
    if (isOpen) return translate('cover.open');
    if (isClosed) return translate('cover.closed');
    return state;
  };

  const getDeviceTypeLabel = () => {
    const key = `cover.deviceClass.${deviceClass}`;
    const result = translate(key);
    return result !== key ? result : translate('cover.title');
  };

  const handleSetPosition = useCallback(
    (val) => {
      if (!show || !activeEntityId || !entity) return;
      setLocalPosition(val);
      clearTimeout(commitTimerPos.current);
      commitTimerPos.current = setTimeout(() => {
        callService('cover', 'set_cover_position', { entity_id: activeEntityId, position: val });
      }, 200);
    },
    [callService, activeEntityId, show, entity]
  );

  const handleSetTilt = useCallback(
    (val) => {
      if (!show || !activeEntityId || !entity) return;
      setLocalTilt(val);
      clearTimeout(commitTimerTilt.current);
      commitTimerTilt.current = setTimeout(() => {
        callService('cover', 'set_cover_tilt_position', {
          entity_id: activeEntityId,
          tilt_position: val,
        });
      }, 200);
    },
    [callService, activeEntityId, show, entity]
  );

  const presets = [
    { label: translate('cover.presetClosed'), value: 0 },
    { label: '25%', value: 25 },
    { label: '50%', value: 50 },
    { label: '75%', value: 75 },
    { label: translate('cover.presetOpen'), value: 100 },
  ];

  if (!show || !activeEntityId || !entity) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl md:h-auto md:min-h-[550px] md:rounded-[3rem] lg:grid lg:grid-cols-5"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="absolute top-6 right-6 z-50 md:top-10 md:right-10">
          <button onClick={onClose} className="modal-close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* LEFT PANEL: Visual blind & controls */}
        <div
          className="relative flex shrink-0 flex-col justify-between overflow-hidden border-b p-4 md:p-10 lg:col-span-3 lg:border-r lg:border-b-0"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          {/* Ambient Glow */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-[100px] transition-all duration-1000"
            style={{ backgroundColor: accent.color }}
          />

          {/* Header */}
          <div className="relative z-10 mb-4 flex shrink-0 items-center gap-4">
            <div
              className="rounded-2xl p-4 transition-all duration-500"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
                {name}
              </h2>
              <div
                className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1"
                style={{ backgroundColor: accent.bg, borderColor: accent.border }}
              >
                {isMoving && (
                  <div
                    className="h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ backgroundColor: accent.color }}
                  />
                )}
                {!isMoving && (
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: isUnavailable ? '#ef4444' : isOpen ? '#34d399' : '#64748b',
                      boxShadow: isOpen ? '0 0 6px rgba(52,211,153,0.5)' : 'none',
                    }}
                  />
                )}
                <span
                  className="text-[10px] font-bold tracking-widest uppercase italic"
                  style={{ color: accent.color }}
                >
                  {getStateLabel()}
                </span>
                {hasPosition && (
                  <span
                    className="border-l pl-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase italic"
                    style={{ borderColor: 'var(--glass-border)' }}
                  >
                    {localPosition}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Interactive visual blind */}
          <div className="relative z-10 my-2 flex min-h-[180px] flex-1 items-center justify-center md:my-4 md:min-h-[200px]">
            <div className="flex h-52 w-40 flex-col items-center md:h-64 md:w-56">
              <div className="w-full flex-1">
                <InteractiveBlind
                  position={localPosition}
                  onPositionChange={supportsPosition ? handleSetPosition : undefined}
                  accent={{ ...accent, text: accent.color }}
                  disabled={isUnavailable || !supportsPosition}
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="text-[10px] font-bold tracking-widest uppercase opacity-50"
                  style={{ color: accent.color }}
                >
                  {getDeviceTypeLabel()}
                </span>
                {supportsPosition && (
                  <span className="font-mono text-sm font-bold" style={{ color: accent.color }}>
                    {localPosition}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="relative z-10 mx-auto w-full max-w-sm shrink-0">
            <div className="flex w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-1">
              {supportsOpenClose && (
                <button
                  onClick={() =>
                    !isUnavailable &&
                    callService('cover', 'open_cover', { entity_id: activeEntityId })
                  }
                  disabled={isUnavailable}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${isOpen ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>{translate('cover.open')}</span>
                </button>
              )}
              {supportsStop && (
                <button
                  onClick={() =>
                    !isUnavailable &&
                    callService('cover', 'stop_cover', { entity_id: activeEntityId })
                  }
                  disabled={isUnavailable}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-all duration-300 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <div className="h-3 w-3 rounded-sm bg-current" />
                  <span>{translate('cover.stop')}</span>
                </button>
              )}
              {supportsOpenClose && (
                <button
                  onClick={() =>
                    !isUnavailable &&
                    callService('cover', 'close_cover', { entity_id: activeEntityId })
                  }
                  disabled={isUnavailable}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-300 ${isClosed ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>{translate('cover.closed')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Presets, Tilt, Info */}
        <div className="flex h-full flex-col lg:col-span-2">
          <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 md:space-y-8 md:p-8 lg:pt-16">
            {/* Position Presets */}
            {supportsPosition && (
              <div className="space-y-2 md:space-y-3">
                <label className="px-1 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                  {translate('cover.presets')}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => !isUnavailable && handleSetPosition(preset.value)}
                      disabled={isUnavailable}
                      className={`rounded-xl border py-2.5 text-center text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                        localPosition === preset.value
                          ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm'
                          : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tilt Control */}
            {(supportsTilt || supportsTiltPosition) && (
              <div className="border-t border-[var(--glass-border)] pt-4 md:pt-6">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-end justify-between px-1">
                    <label className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                      {translate('cover.tilt')}
                    </label>
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                      {localTilt}%
                    </span>
                  </div>
                  <TiltVisual
                    tilt={localTilt}
                    onTiltChange={handleSetTilt}
                    accent={{ ...accent, text: accent.color }}
                    disabled={isUnavailable}
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { label: translate('cover.tiltClosed'), value: 0 },
                      { label: '50%', value: 50 },
                      { label: translate('cover.tiltOpen'), value: 100 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => !isUnavailable && handleSetTilt(preset.value)}
                        disabled={isUnavailable}
                        className={`rounded-xl border py-2 text-center text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                          localTilt === preset.value
                            ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm'
                            : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Entity Info */}
            <div className="border-t border-[var(--glass-border)] pt-4 md:pt-6">
              <h3 className="mb-2 pl-1 text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase md:mb-4">
                {translate('cover.info')}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-[var(--text-secondary)] opacity-70">
                    {translate('cover.state')}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {getStateLabel()}
                  </span>
                </div>
                {hasPosition && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[var(--text-secondary)] opacity-70">
                      {translate('cover.position')}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {position}%
                    </span>
                  </div>
                )}
                {hasTilt && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[var(--text-secondary)] opacity-70">
                      {translate('cover.tilt')}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {tiltPosition}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-[var(--text-secondary)] opacity-70">
                    {translate('cover.deviceType')}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {getDeviceTypeLabel()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
