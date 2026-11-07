import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, ModalSection, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import { getIconComponent } from '../icons';

/* -- Interactive Visual Blind ---------------------------------------- */
const InteractiveBlind = ({
  position,
  onPositionChange,
  accent,
  disabled,
  slatCount = 12,
  translate,
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

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled || !onPositionChange) return;
      const current = Number.isFinite(position) ? position : 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        onPositionChange(Math.min(100, current + 5));
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onPositionChange(Math.max(0, current - 5));
      }
      if (e.key === 'Home') {
        e.preventDefault();
        onPositionChange(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        onPositionChange(100);
      }
    },
    [disabled, onPositionChange, position]
  );

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full touch-none overflow-hidden rounded-2xl border-2 select-none ${disabled ? 'opacity-50' : 'cursor-ns-resize'}`}
      style={{
        borderColor: accent.border,
        backgroundColor: 'color-mix(in srgb, var(--accent-color) 4%, transparent)',
      }}
      role="slider"
      aria-label={translate?.('cover.aria.position') || 'Cover position'}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={position ?? 0}
      aria-valuetext={`${position ?? 0}%`}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
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
              boxShadow: `0 0 12px color-mix(in srgb, ${accent.text} 25%, transparent)`,
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
const TiltVisual = ({ tilt, onTiltChange, accent, disabled, translate }) => {
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

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled || !onTiltChange) return;
      const current = Number.isFinite(tilt) ? tilt : 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        onTiltChange(Math.min(100, current + 5));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        onTiltChange(Math.max(0, current - 5));
      }
      if (e.key === 'Home') {
        e.preventDefault();
        onTiltChange(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        onTiltChange(100);
      }
    },
    [disabled, onTiltChange, tilt]
  );

  return (
    <div
      ref={containerRef}
      className={`relative flex h-24 w-full touch-none flex-col justify-center gap-1 overflow-hidden rounded-xl border px-3 py-2 select-none ${disabled ? 'opacity-50' : 'cursor-ew-resize'}`}
      style={{
        borderColor: accent.border,
        backgroundColor: 'color-mix(in srgb, var(--accent-color) 4%, transparent)',
      }}
      role="slider"
      aria-label={translate?.('cover.aria.tilt') || 'Cover tilt'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={tilt ?? 0}
      aria-valuetext={`${tilt ?? 0}%`}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
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
  const modalTitleId = `cover-modal-title-${activeEntityId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

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
    const tone = (color, bg, border) => ({
      color,
      bg,
      border,
      slat: `color-mix(in srgb, ${color} 30%, transparent)`,
      slatBorder: `color-mix(in srgb, ${color} 15%, transparent)`,
    });
    if (isUnavailable)
      return tone('var(--status-error-fg)', 'var(--status-error-bg)', 'var(--status-error-border)');
    if (isMoving)
      return tone(
        'var(--accent-color)',
        'var(--accent-bg)',
        'color-mix(in srgb, var(--accent-color) 25%, transparent)'
      );
    if (isOpen)
      return tone(
        'var(--status-success-fg)',
        'var(--status-success-bg)',
        'color-mix(in srgb, var(--status-success-fg) 25%, transparent)'
      );
    return {
      color: 'var(--text-secondary)',
      bg: 'var(--glass-bg)',
      border: 'var(--glass-border)',
      slat: 'color-mix(in srgb, var(--text-muted) 35%, transparent)',
      slatBorder: 'color-mix(in srgb, var(--text-muted) 15%, transparent)',
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
    <AccessibleModalShell
      open={show && !!activeEntityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      size="l"
    >
      {() => (
        <>
          <ModalHeader
            title={name}
            closeLabel={translate('common.close')}
            onClose={onClose}
            icon={<Icon />}
            iconStyle={{ backgroundColor: accent.bg, color: accent.color }}
            status={
              <StatusChip
                tone={isUnavailable ? 'error' : isMoving ? 'accent' : isOpen ? 'on' : 'neutral'}
                label={getStateLabel()}
                detail={hasPosition ? `${localPosition}%` : null}
              />
            }
          />

          <ModalBody className="grid items-start gap-6 lg:grid-cols-5">
            <div className="popup-surface relative flex flex-col justify-between gap-6 overflow-hidden rounded-[var(--modal-surface-radius)] p-4 sm:p-6 lg:col-span-3">
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-[100px] transition-all duration-1000"
                style={{ backgroundColor: accent.color }}
              />

              <div className="relative z-10 flex min-h-[180px] flex-1 items-center justify-center md:min-h-[200px]">
                <div className="flex h-52 w-40 flex-col items-center md:h-64 md:w-56">
                  <div className="w-full flex-1">
                    <InteractiveBlind
                      position={localPosition}
                      onPositionChange={supportsPosition ? handleSetPosition : undefined}
                      accent={{ ...accent, text: accent.color }}
                      disabled={isUnavailable || !supportsPosition}
                      translate={translate}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="modal-section-label">{getDeviceTypeLabel()}</span>
                    {supportsPosition && (
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: accent.color }}
                      >
                        {localPosition}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(supportsOpenClose || supportsStop) && (
                <div className="relative z-10 mx-auto flex w-full max-w-sm gap-2">
                  {supportsOpenClose && (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() =>
                        !isUnavailable &&
                        callService('cover', 'open_cover', { entity_id: activeEntityId })
                      }
                      disabled={isUnavailable}
                      icon={<ChevronUp className="h-4 w-4" />}
                    >
                      {translate('cover.presetOpen')}
                    </Button>
                  )}
                  {supportsStop && (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() =>
                        !isUnavailable &&
                        callService('cover', 'stop_cover', { entity_id: activeEntityId })
                      }
                      disabled={isUnavailable}
                      icon={<span className="h-3 w-3 rounded-sm bg-current" aria-hidden="true" />}
                    >
                      {translate('cover.stop')}
                    </Button>
                  )}
                  {supportsOpenClose && (
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() =>
                        !isUnavailable &&
                        callService('cover', 'close_cover', { entity_id: activeEntityId })
                      }
                      disabled={isUnavailable}
                      icon={<ChevronDown className="h-4 w-4" />}
                    >
                      {translate('cover.presetClosed')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 lg:col-span-2">
              {supportsPosition && (
                <ModalSection label={translate('cover.position')}>
                  <Segmented
                    block
                    ariaLabel={translate('cover.position')}
                    value={localPosition}
                    onChange={(value) => !isUnavailable && handleSetPosition(value)}
                    options={presets.map((preset) => ({ ...preset, disabled: isUnavailable }))}
                  />
                </ModalSection>
              )}

              {(supportsTilt || supportsTiltPosition) && (
                <ModalSection
                  label={translate('cover.tilt')}
                  action={
                    <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      {localTilt}%
                    </span>
                  }
                  className={supportsPosition ? 'border-t border-[var(--glass-border)] pt-6' : ''}
                >
                  <TiltVisual
                    tilt={localTilt}
                    onTiltChange={handleSetTilt}
                    accent={{ ...accent, text: accent.color }}
                    disabled={isUnavailable}
                    translate={translate}
                  />
                  <Segmented
                    block
                    ariaLabel={translate('cover.tilt')}
                    value={localTilt}
                    onChange={(value) => !isUnavailable && handleSetTilt(value)}
                    options={[
                      { label: translate('cover.tiltClosed'), value: 0 },
                      { label: '50%', value: 50 },
                      { label: translate('cover.tiltOpen'), value: 100 },
                    ].map((preset) => ({ ...preset, disabled: isUnavailable }))}
                  />
                </ModalSection>
              )}

              <ModalSection
                label={translate('cover.info')}
                className={
                  supportsPosition || supportsTilt || supportsTiltPosition
                    ? 'border-t border-[var(--glass-border)] pt-6'
                    : ''
                }
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {translate('cover.state')}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {getStateLabel()}
                    </span>
                  </div>
                  {hasPosition && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {translate('cover.position')}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                        {position}%
                      </span>
                    </div>
                  )}
                  {hasTilt && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {translate('cover.tilt')}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                        {tiltPosition}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {translate('cover.deviceType')}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {getDeviceTypeLabel()}
                    </span>
                  </div>
                </div>
              </ModalSection>
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
