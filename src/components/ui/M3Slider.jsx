import { useState, useEffect, useRef, useId } from 'react';

export default function M3Slider({
  min,
  max,
  step,
  value,
  onChange,
  colorClass: propColorClass = 'bg-[var(--accent-color)]',
  disabled = false,
  variant = 'default',
  trackClass = '',
  thumbClass = '',
  height = undefined,
  ariaLabel = 'Slider',
  ariaValueText = undefined,
  id = undefined,
  name = undefined,
}) {
  const generatedId = useId();
  const inputId = id || `m3-slider-${generatedId.replace(/:/g, '')}`;
  const inputName = name || inputId;
  const colorClass =
    propColorClass === 'bg-[var(--accent-color)]' ? 'bg-[var(--accent-color)]' : propColorClass;
  const [internalValue, setInternalValue] = useState(value);
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef(null);
  const frameRef = useRef(null);
  const pendingValueRef = useRef(value);

  useEffect(() => {
    if (!isInteracting) setInternalValue(value);
  }, [value, isInteracting]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const percentage =
    max === min ? 0 : Math.min(100, Math.max(0, ((internalValue - min) / (max - min)) * 100));

  const beginInteraction = () => {
    setIsInteracting(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const endInteraction = () => {
    timeoutRef.current = setTimeout(() => setIsInteracting(false), 120);
  };

  const handleInputChange = (e) => {
    const nextValue = parseFloat(e.target.value);
    setInternalValue(nextValue);
    pendingValueRef.current = nextValue;

    if (frameRef.current) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      onChange({ target: { value: String(pendingValueRef.current) } });
    });
  };

  const commonInputProps = {
    type: 'range',
    min,
    max,
    step,
    value: internalValue,
    disabled,
    id: inputId,
    name: inputName,
    'aria-label': ariaLabel,
    'aria-orientation': /** @type {const} */ ('horizontal'),
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': internalValue,
    'aria-valuetext': ariaValueText,
    onPointerDown: beginInteraction,
    onPointerUp: endInteraction,
    onPointerCancel: endInteraction,
    onMouseDown: beginInteraction,
    onMouseUp: endInteraction,
    onTouchStart: beginInteraction,
    onTouchEnd: endInteraction,
    onInput: handleInputChange,
    onChange: handleInputChange,
    className: 'absolute w-full h-full opacity-0 cursor-pointer z-20 select-none',
    style: { touchAction: 'pan-y', WebkitTapHighlightColor: 'transparent' },
  };

  if (variant === 'thin') {
    return (
      <div
        className={`group relative flex h-4 w-full cursor-pointer items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
        style={{ touchAction: 'pan-y' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute h-1 w-full overflow-hidden rounded-full bg-[var(--glass-bg-hover)] transition-all duration-300 group-hover:h-1.5">
          <div
            className={`h-full ${colorClass} transition-all duration-150 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input {...commonInputProps} />
        <div
          className="pointer-events-none absolute z-10 h-3 w-3 rounded-full bg-[var(--text-primary)] opacity-0 shadow-lg transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>
    );
  }

  if (variant === 'thinLg') {
    return (
      <div
        className={`group relative flex h-6 w-full cursor-pointer items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
        style={{ touchAction: 'pan-y' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute h-2 w-full overflow-hidden rounded-full bg-[var(--glass-bg-hover)] transition-all duration-300 group-hover:h-2.5">
          <div
            className={`h-full ${colorClass} transition-all duration-150 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input {...commonInputProps} />
        <div
          className="pointer-events-none absolute z-10 h-4 w-4 rounded-full bg-[var(--text-primary)] opacity-0 shadow-lg transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    );
  }

  if (variant === 'volume') {
    return (
      <div
        className={`group relative flex h-10 w-full items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
        style={{ touchAction: 'pan-y' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute h-full w-full overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <div
            className={`h-full transition-all duration-150 ease-out ${colorClass} opacity-90`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          {...commonInputProps}
          className="absolute z-10 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    );
  }

  // Default / Custom
  const containerH = height || 'h-10';

  return (
    <div
      className={`m3-slider-default relative w-full ${containerH} group flex items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
      style={{
        touchAction: 'pan-y',
        .../** @type {Record<string, string>} */ ({
          '--m3-slider-position': `${percentage}%`,
        }),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Track */}
      {trackClass ? (
        <div className={`absolute w-full ${trackClass} overflow-hidden rounded-full`}>
          <div
            className={`h-full ${colorClass} transition-all duration-150 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <div
          className={`m3-slider__track absolute w-full ${height ? 'h-full rounded bg-[var(--glass-bg-hover)]' : 'h-5 rounded-full border'} overflow-hidden`}
          style={
            !height
              ? { backgroundColor: 'var(--glass-bg-hover)', borderColor: 'var(--glass-border)' }
              : {}
          }
        >
          <div
            className={`h-full transition-all duration-150 ease-out ${colorClass}`}
            style={{
              width: `${percentage}%`,
              boxShadow: !height ? '0_0_15px_rgba(0,0,0,0.2)' : 'none',
            }}
          />
        </div>
      )}

      <input {...commonInputProps} />

      {/* Thumb (Optional / Custom) */}
      {thumbClass ? (
        <div
          className={`pointer-events-none absolute z-10 ${thumbClass}`}
          style={{ left: `calc(${percentage}% - 6px)` }} // simple centering, adjustment might be needed
        />
      ) : (
        !height && (
          <div
            className="m3-slider__thumb pointer-events-none absolute h-8 w-1 rounded-full bg-[var(--text-primary)] transition-transform duration-200 group-active:scale-y-110"
            style={{
              left: 'calc(var(--m3-slider-position) - var(--m3-slider-thumb-offset, 2px))',
              boxShadow: '0 0 15px color-mix(in srgb, var(--accent-color) 40%, transparent)',
            }}
          />
        )
      )}
    </div>
  );
}
