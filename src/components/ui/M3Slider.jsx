import { useState, useEffect, useRef, useId } from 'react';

export default function M3Slider({ 
  min, max, step, value, onChange, 
  colorClass: propColorClass = "bg-blue-500", 
  disabled = false, 
  variant = "default",
  trackClass,
  thumbClass,
  height,
  ariaLabel = "Slider",
  id,
  name,
}) {
  const generatedId = useId();
  const inputId = id || `m3-slider-${generatedId.replace(/:/g, '')}`;
  const inputName = name || inputId;
  const colorClass = propColorClass === "bg-blue-500" ? "bg-[var(--accent-color)]" : propColorClass;
  const [internalValue, setInternalValue] = useState(value);
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef(null);
  const frameRef = useRef(null);
  const pendingValueRef = useRef(value);

  useEffect(() => {
    if (!isInteracting) setInternalValue(value);
  }, [value, isInteracting]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const percentage = max === min ? 0 : Math.min(100, Math.max(0, ((internalValue - min) / (max - min)) * 100));

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
    type: "range", min, max, step, value: internalValue, disabled,
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
    className: "absolute w-full h-full opacity-0 cursor-pointer z-20 select-none",
    style: { touchAction: 'pan-x', WebkitTapHighlightColor: 'transparent' }
  };

  if (variant === "thin") {
    return (
      <div className={`relative w-full h-4 flex items-center group cursor-pointer ${disabled ? 'opacity-30 pointer-events-none' : ''}`} style={{ touchAction: 'pan-x' }} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden group-hover:h-1.5 transition-all duration-300">
          <div className={`h-full ${colorClass} transition-all duration-150 ease-out`} style={{ width: `${percentage}%` }} />
        </div>
        <input {...commonInputProps} />
        <div className="absolute w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" style={{ left: `calc(${percentage}% - 6px)` }} />
      </div>
    );
  }

  if (variant === "thinLg") {
    return (
      <div className={`relative w-full h-6 flex items-center group cursor-pointer ${disabled ? 'opacity-30 pointer-events-none' : ''}`} style={{ touchAction: 'pan-x' }} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-2 bg-white/10 rounded-full overflow-hidden group-hover:h-2.5 transition-all duration-300">
          <div className={`h-full ${colorClass} transition-all duration-150 ease-out`} style={{ width: `${percentage}%` }} />
        </div>
        <input {...commonInputProps} />
        <div className="absolute w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" style={{ left: `calc(${percentage}% - 8px)` }} />
      </div>
    );
  }

  if (variant === "volume") {
    return (
      <div className={`relative w-full h-10 flex items-center group ${disabled ? 'opacity-30 pointer-events-none' : ''}`} style={{ touchAction: 'pan-x' }} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-full bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          <div className={`h-full transition-all duration-150 ease-out ${colorClass} opacity-90`} style={{ width: `${percentage}%` }} />
        </div>
        <input {...commonInputProps} className="absolute w-full h-full opacity-0 cursor-pointer z-10" />
      </div>
    );
  }

  // Default / Custom
  const containerH = height || "h-10";
  
  return (
    <div className={`relative w-full ${containerH} flex items-center group ${disabled ? 'opacity-30 pointer-events-none' : ''}`} style={{ touchAction: 'pan-x' }} onClick={(e) => e.stopPropagation()}>
        {/* Track */}
        {trackClass ? (
            <div className={`absolute w-full ${trackClass} overflow-hidden rounded-full`}>
                 <div className={`h-full ${colorClass} transition-all duration-150 ease-out`} style={{ width: `${percentage}%` }} />
            </div>
        ) : (
            <div className={`absolute w-full ${height ? 'h-full bg-white/10 rounded': 'h-5 rounded-full border'} overflow-hidden`} style={!height ? {backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.05)'} : {}}>
                <div 
                    className={`h-full transition-all duration-150 ease-out ${colorClass}`}
                    style={{ width: `${percentage}%`, boxShadow: !height ? '0_0_15px_rgba(0,0,0,0.2)' : 'none' }}
                />
            </div>
        )}
      
      <input {...commonInputProps} />
      
      {/* Thumb (Optional / Custom) */}
      {thumbClass ? (
          <div 
            className={`absolute pointer-events-none z-10 ${thumbClass}`} 
            style={{ left: `calc(${percentage}% - 6px)` }} // simple centering, adjustment might be needed
          /> 
      ) : (
         !height && <div className="absolute w-1 h-8 bg-white rounded-full transition-transform duration-200 pointer-events-none group-active:scale-y-110" style={{ left: `calc(${percentage}% - 2px)`, boxShadow: '0_0_15px_rgba(255,255,255,0.4)' }} />
      )}
    </div>
  );
}
