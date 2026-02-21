import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, X } from '../icons';
import { getIconComponent } from '../icons';

/* -- Interactive Visual Blind ---------------------------------------- */
const InteractiveBlind = ({
  position,
  onPositionChange,
  accent,
  disabled,
  slatCount = 12,
}) => {
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

  const handlePointerDown = useCallback((e) => {
    if (disabled) return;
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = calcPositionFromEvent(e.clientY);
    if (pos !== null) onPositionChange(pos);
  }, [disabled, calcPositionFromEvent, onPositionChange]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current || disabled) return;
    const pos = calcPositionFromEvent(e.clientY);
    if (pos !== null) onPositionChange(pos);
  }, [disabled, calcPositionFromEvent, onPositionChange]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full rounded-2xl overflow-hidden border-2 select-none touch-none ${disabled ? 'opacity-50' : 'cursor-ns-resize'}`}
      style={{ borderColor: accent.border, backgroundColor: 'rgba(135,206,235,0.04)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Window cross-pane lines */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="flex-1 border-r" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
        <div className="flex-1" />
      </div>
      <div className="absolute inset-0 flex items-center pointer-events-none">
        <div className="w-full border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }} />
      </div>

      {/* Slats from top */}
      <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col pointer-events-none">
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
          className="absolute left-2 right-2 flex items-center justify-center pointer-events-none transition-all duration-300"
          style={{ top: `calc(${100 - (position ?? 0)}% - 10px)` }}
        >
          <div
            className="w-full h-[6px] rounded-full shadow-lg"
            style={{ backgroundColor: accent.text, opacity: 0.7, boxShadow: `0 0 12px ${accent.text}40` }}
          />
          {/* Grip dots */}
          <div className="absolute flex gap-1">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accent.text, opacity: 0.9 }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accent.text, opacity: 0.9 }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accent.text, opacity: 0.9 }} />
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

  const handlePointerDown = useCallback((e) => {
    if (disabled) return;
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const val = calcTiltFromEvent(e.clientX);
    if (val !== null) onTiltChange(val);
  }, [disabled, calcTiltFromEvent, onTiltChange]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current || disabled) return;
    const val = calcTiltFromEvent(e.clientX);
    if (val !== null) onTiltChange(val);
  }, [disabled, calcTiltFromEvent, onTiltChange]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-24 rounded-xl overflow-hidden border flex flex-col justify-center gap-1 px-3 py-2 select-none touch-none ${disabled ? 'opacity-50' : 'cursor-ew-resize'}`}
      style={{ borderColor: accent.border, backgroundColor: 'rgba(135,206,235,0.04)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="w-full h-2 rounded-sm transition-all duration-300"
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
  if (!show || !entityId || !entity) return null;

  const state = entity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOpen = state === 'open';
  const isClosed = state === 'closed';
  const isOpening = state === 'opening';
  const isClosing = state === 'closing';
  const isMoving = isOpening || isClosing;

  const position = entity.attributes?.current_position;
  const hasPosition = typeof position === 'number';
  const tiltPosition = entity.attributes?.current_tilt_position;
  const hasTilt = typeof tiltPosition === 'number';

  const supportedFeatures = entity.attributes?.supported_features ?? 0;
  const supportsPosition = (supportedFeatures & 4) !== 0;
  const supportsOpenClose = (supportedFeatures & 3) !== 0;
  const supportsStop = (supportedFeatures & 8) !== 0;
  const supportsTilt = (supportedFeatures & 128) !== 0;
  const supportsTiltPosition = (supportedFeatures & 256) !== 0;

  const deviceClass = entity.attributes?.device_class || 'cover';
  const name = entity.attributes?.friendly_name || entityId;

  const coverIconName = customIcons?.[entityId] || entity.attributes?.icon;
  const Icon = coverIconName ? (getIconComponent(coverIconName) || ArrowUpDown) : ArrowUpDown;

  const [localPosition, setLocalPosition] = useState(position ?? 0);
  const [localTilt, setLocalTilt] = useState(tiltPosition ?? 0);
  const commitTimerPos = useRef(null);
  const commitTimerTilt = useRef(null);

  useEffect(() => {
    if (typeof position === 'number') setLocalPosition(position);
  }, [position]);

  useEffect(() => {
    if (typeof tiltPosition === 'number') setLocalTilt(tiltPosition);
  }, [tiltPosition]);

  const translate = t || ((key) => key);

  const getAccent = () => {
    if (isUnavailable) return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', slat: 'rgba(239,68,68,0.25)', slatBorder: 'rgba(239,68,68,0.15)' };
    if (isMoving) return { color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', slat: 'rgba(59,130,246,0.3)', slatBorder: 'rgba(59,130,246,0.15)' };
    if (isOpen) return { color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', slat: 'rgba(16,185,129,0.25)', slatBorder: 'rgba(16,185,129,0.12)' };
    return { color: 'var(--text-secondary)', bg: 'var(--glass-bg)', border: 'var(--glass-border)', slat: 'rgba(148,163,184,0.35)', slatBorder: 'rgba(148,163,184,0.15)' };
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

  const handleSetPosition = useCallback((val) => {
    setLocalPosition(val);
    clearTimeout(commitTimerPos.current);
    commitTimerPos.current = setTimeout(() => {
      callService('cover', 'set_cover_position', { entity_id: entityId, position: val });
    }, 200);
  }, [callService, entityId]);

  const handleSetTilt = useCallback((val) => {
    setLocalTilt(val);
    clearTimeout(commitTimerTilt.current);
    commitTimerTilt.current = setTimeout(() => {
      callService('cover', 'set_cover_tilt_position', { entity_id: entityId, tilt_position: val });
    }, 200);
  }, [callService, entityId]);

  const presets = [
    { label: translate('cover.presetClosed'), value: 0 },
    { label: '25%', value: 25 },
    { label: '50%', value: 50 },
    { label: '75%', value: 75 },
    { label: translate('cover.presetOpen'), value: 100 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] overflow-hidden flex flex-col lg:grid lg:grid-cols-5 backdrop-blur-xl shadow-2xl popup-anim relative max-h-[90vh] md:h-auto md:min-h-[550px]"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="absolute top-6 right-6 md:top-10 md:right-10 z-50">
          <button onClick={onClose} className="modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LEFT PANEL: Visual blind & controls */}
        <div className="lg:col-span-3 relative p-4 md:p-10 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r shrink-0" style={{ borderColor: 'var(--glass-border)' }}>

          {/* Ambient Glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full opacity-5 blur-[100px] pointer-events-none transition-all duration-1000"
            style={{ backgroundColor: accent.color }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-4 mb-4 shrink-0">
            <div
              className="p-4 rounded-2xl transition-all duration-500"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              <Icon className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none truncate">
                {name}
              </h2>
              <div
                className="mt-2 px-3 py-1 rounded-full border inline-flex items-center gap-2"
                style={{ backgroundColor: accent.bg, borderColor: accent.border }}
              >
                {isMoving && (
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent.color }} />
                )}
                {!isMoving && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: isUnavailable ? '#ef4444' : isOpen ? '#34d399' : '#64748b',
                      boxShadow: isOpen ? '0 0 6px rgba(52,211,153,0.5)' : 'none'
                    }}
                  />
                )}
                <span className="text-[10px] uppercase font-bold italic tracking-widest" style={{ color: accent.color }}>
                  {getStateLabel()}
                </span>
                {hasPosition && (
                  <span className="text-[10px] uppercase font-bold italic tracking-widest pl-2 border-l text-[var(--text-muted)]" style={{ borderColor: 'var(--glass-border)' }}>
                    {localPosition}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Interactive visual blind */}
          <div className="relative z-10 flex-1 flex items-center justify-center my-2 md:my-4 min-h-[180px] md:min-h-[200px]">
            <div className="w-40 h-52 md:w-56 md:h-64 flex flex-col items-center">
              <div className="w-full flex-1">
                <InteractiveBlind
                  position={localPosition}
                  onPositionChange={supportsPosition ? handleSetPosition : undefined}
                  accent={{ ...accent, text: accent.color }}
                  disabled={isUnavailable || !supportsPosition}
                />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-50" style={{ color: accent.color }}>
                  {getDeviceTypeLabel()}
                </span>
                {supportsPosition && (
                  <span className="text-sm font-mono font-bold" style={{ color: accent.color }}>
                    {localPosition}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="relative z-10 w-full max-w-sm mx-auto shrink-0">
            <div className="flex p-1 bg-[var(--glass-bg)] rounded-xl border border-[var(--glass-border)] w-full">
              {supportsOpenClose && (
                <button
                  onClick={() => !isUnavailable && callService('cover', 'open_cover', { entity_id: entityId })}
                  disabled={isUnavailable}
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-xs font-bold uppercase tracking-wider
                    ${isOpen ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>{translate('cover.open')}</span>
                </button>
              )}
              {supportsStop && (
                <button
                  onClick={() => !isUnavailable && callService('cover', 'stop_cover', { entity_id: entityId })}
                  disabled={isUnavailable}
                  className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]"
                >
                  <div className="w-3 h-3 rounded-sm bg-current" />
                  <span>{translate('cover.stop')}</span>
                </button>
              )}
              {supportsOpenClose && (
                <button
                  onClick={() => !isUnavailable && callService('cover', 'close_cover', { entity_id: entityId })}
                  disabled={isUnavailable}
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-xs font-bold uppercase tracking-wider
                    ${isClosed ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>{translate('cover.closed')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Presets, Tilt, Info */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:pt-16 space-y-4 md:space-y-8 custom-scrollbar">

            {/* Position Presets */}
            {supportsPosition && (
              <div className="space-y-2 md:space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] px-1">
                  {translate('cover.presets')}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => !isUnavailable && handleSetPosition(preset.value)}
                      disabled={isUnavailable}
                      className={`py-2.5 rounded-xl text-center transition-all duration-200 text-[11px] font-bold uppercase tracking-wider border
                        ${localPosition === preset.value
                          ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)] shadow-sm'
                          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
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
              <div className="pt-4 md:pt-6 border-t border-[var(--glass-border)]">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                      {translate('cover.tilt')}
                    </label>
                    <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
                      {localTilt}%
                    </span>
                  </div>
                  <TiltVisual
                    tilt={localTilt}
                    onTiltChange={handleSetTilt}
                    accent={{ ...accent, text: accent.color }}
                    disabled={isUnavailable}
                  />
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { label: translate('cover.tiltClosed'), value: 0 },
                      { label: '50%', value: 50 },
                      { label: translate('cover.tiltOpen'), value: 100 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => !isUnavailable && handleSetTilt(preset.value)}
                        disabled={isUnavailable}
                        className={`py-2 rounded-xl text-center transition-all duration-200 text-[11px] font-bold uppercase tracking-wider border
                          ${localTilt === preset.value
                            ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)] shadow-sm'
                            : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
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
            <div className="pt-4 md:pt-6 border-t border-[var(--glass-border)]">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2 md:mb-4 pl-1">
                {translate('cover.info')}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('cover.state')}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{getStateLabel()}</span>
                </div>
                {hasPosition && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('cover.position')}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{position}%</span>
                  </div>
                )}
                {hasTilt && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('cover.tilt')}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{tiltPosition}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('cover.deviceType')}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{getDeviceTypeLabel()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
