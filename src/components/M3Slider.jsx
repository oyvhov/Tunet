import { useState, useEffect, useRef } from 'react';

const M3Slider = ({ min, max, step, value, onChange, colorClass = "bg-blue-500", disabled = false, variant = "default" }) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isInteracting, setIsInteracting] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isInteracting) setInternalValue(value);
  }, [value, isInteracting]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const percentage = max === min ? 0 : Math.min(100, Math.max(0, ((internalValue - min) / (max - min)) * 100));
  
  if (variant === "thin") {
    return (
      <div className={`relative w-full h-4 flex items-center group cursor-pointer ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden group-hover:h-1.5 transition-all duration-300">
          <div className={`h-full ${colorClass} transition-all duration-150 ease-out`} style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={internalValue} disabled={disabled}
          onMouseDown={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onTouchStart={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseUp={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onTouchEnd={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onChange={(e) => { setInternalValue(parseFloat(e.target.value)); onChange(e); }}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div className="absolute w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" style={{ left: `calc(${percentage}% - 6px)` }} />
      </div>
    );
  }

  if (variant === "thinLg") {
    return (
      <div className={`relative w-full h-6 flex items-center group cursor-pointer ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-2 bg-white/10 rounded-full overflow-hidden group-hover:h-2.5 transition-all duration-300">
          <div className={`h-full ${colorClass} transition-all duration-150 ease-out`} style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={internalValue} disabled={disabled}
          onMouseDown={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onTouchStart={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseUp={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onTouchEnd={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onChange={(e) => { setInternalValue(parseFloat(e.target.value)); onChange(e); }}
          className="absolute w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div className="absolute w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10" style={{ left: `calc(${percentage}% - 8px)` }} />
      </div>
    );
  }

  if (variant === "volume") {
    return (
      <div className={`relative w-full h-10 flex items-center group ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="absolute w-full h-full bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          <div className={`h-full transition-all duration-150 ease-out ${colorClass} opacity-90`} style={{ width: `${percentage}%` }} />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={internalValue} disabled={disabled}
          onMouseDown={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onTouchStart={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
          onMouseUp={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onTouchEnd={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
          onChange={(e) => { setInternalValue(parseFloat(e.target.value)); onChange(e); }}
          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-10 flex items-center group ${disabled ? 'opacity-30 pointer-events-none' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="absolute w-full h-5 rounded-full overflow-hidden border" style={{backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.05)'}}>
        <div 
          className={`h-full transition-all duration-150 ease-out ${colorClass}`}
          style={{ width: `${percentage}%`, boxShadow: '0_0_15px_rgba(0,0,0,0.2)' }}
        />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={internalValue} disabled={disabled}
        onMouseDown={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
        onTouchStart={() => { setIsInteracting(true); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
        onMouseUp={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
        onTouchEnd={() => { timeoutRef.current = setTimeout(() => setIsInteracting(false), 1000); }}
        onChange={(e) => { setInternalValue(parseFloat(e.target.value)); onChange(e); }}
        className="absolute w-full h-10 opacity-0 cursor-pointer z-10"
      />
      <div className="absolute w-1 h-8 bg-white rounded-full transition-transform duration-200 pointer-events-none group-active:scale-y-110" style={{ left: `calc(${percentage}% - 2px)`, boxShadow: '0_0_15px_rgba(255,255,255,0.4)' }} />
    </div>
  );
};

export default M3Slider;
