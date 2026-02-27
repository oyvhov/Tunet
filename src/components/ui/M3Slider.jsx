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
  trackClass,
  thumbClass,
  height,
  ariaLabel = 'Slider',
  id,
  name,
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
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': internalValue,
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
    style: { touchAction: 'pan-x', WebkitTapHighlightColor: 'transparent' },
  };

  if (variant === 'thin') {
    return (
      <div
        className={`group relative flex h-4 w-full cursor-pointer items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
        style={{ touchAction: 'pan-x' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute h-1 w-full overflow-hidden rounded-full bg-white/10 transition-all duration-300 group-hover:h-1.5">
          <div
            className={`h-full ${colorClass} transition-all duration-150 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input {...commonInputProps} />
        <div
          className="pointer-events-none absolute z-10 h-3 w-3 rounded-full bg-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      </div>
    );
  }

  if (variant === 'thinLg') {
    return (
      <div
        className={`group relative flex h-6 w-full cursor-pointer items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
        style={{ touchAction: 'pan-x' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute h-2 w-full overflow-hidden rounded-full bg-white/10 transition-all duration-300 group-hover:h-2.5">
          <div
            className={`h-full ${colorClass} transition-all duration-150 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input {...commonInputProps} />
        <div
          className="pointer-events-none absolute z-10 h-4 w-4 rounded-full bg-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    );
  }

  if (variant === 'volume') {
    return (
      <div
        className={`group relative flex h-10 w-full items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
        style={{ touchAction: 'pan-x' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute h-full w-full overflow-hidden rounded-2xl border border-white/5 bg-white/5">
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
      className={`relative w-full ${containerH} group flex items-center ${disabled ? 'pointer-events-none opacity-30' : ''}`}
      style={{ touchAction: 'pan-x' }}
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
          className={`absolute w-full ${height ? 'h-full rounded bg-white/10' : 'h-5 rounded-full border'} overflow-hidden`}
          style={
            !height
              ? { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.05)' }
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
            className="pointer-events-none absolute h-8 w-1 rounded-full bg-white transition-transform duration-200 group-active:scale-y-110"
            style={{
              left: `calc(${percentage}% - 2px)`,
              boxShadow: '0_0_15px_rgba(255,255,255,0.4)',
            }}
          />
        )
      )}
    </div>
  );
}
