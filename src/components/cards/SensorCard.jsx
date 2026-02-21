import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Activity, Play } from 'lucide-react';
import { getHistory, getStatistics } from '../../services/haClient';
import SparkLine from '../charts/SparkLine';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode, inferUnitKind } from '../../utils';

export default function SensorCard({ 
  entity, 
  conn,
  settings, 
  dragProps, 
  cardStyle, 
  Icon, 
  name, 
  editMode, 
  controls,
  onControl,
  onOpen,
  t
}) {
  const translate = t || ((key) => key);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const state = entity?.state;
  const unit = entity?.attributes?.unit_of_measurement || '';
  const isNumeric = typeof state === 'string'
    ? /^\s*-?\d+(\.\d+)?\s*$/.test(state)
    : !isNaN(parseFloat(state));
  const domain = entity?.entity_id?.split('.')[0] || '';
  const deviceClass = entity?.attributes?.device_class;
  const isOnOffState = state === 'on' || state === 'off';
  const isUnavailable = state === 'unavailable' || state === 'unknown';
  const numericState = isNumeric ? parseFloat(state) : null;
  const isBinaryNumeric = isNumeric && (numericState === 0 || numericState === 1);
  const isBinaryLike = isOnOffState || isBinaryNumeric;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const inferredUnitKind = inferUnitKind(deviceClass, unit);
  const convertedNumericState = isNumeric && !isBinaryNumeric && inferredUnitKind
    ? convertValueByKind(numericState, {
      kind: inferredUnitKind,
      fromUnit: unit,
      unitMode: effectiveUnitMode,
    })
    : numericState;
  const displayNumericUnit = isNumeric && !isBinaryNumeric && inferredUnitKind
    ? getDisplayUnitForKind(inferredUnitKind, effectiveUnitMode)
    : unit;
  const isActiveState = isOnOffState ? state === 'on' : (isBinaryNumeric ? numericState === 1 : false);
  const binaryStateKeys = {
    door: { on: 'binary.door.open', off: 'binary.door.closed' },
    window: { on: 'binary.window.open', off: 'binary.window.closed' },
    garage_door: { on: 'binary.garageDoor.open', off: 'binary.garageDoor.closed' },
    motion: { on: 'binary.motion.detected', off: 'binary.motion.clear' },
    moisture: { on: 'binary.moisture.wet', off: 'binary.moisture.dry' },
    occupancy: { on: 'binary.occupancy.occupied', off: 'binary.occupancy.clear' },
    presence: { on: 'binary.occupancy.occupied', off: 'binary.occupancy.clear' },
    smoke: { on: 'binary.smoke.detected', off: 'binary.smoke.clear' },
    lock: { on: 'binary.lock.unlocked', off: 'binary.lock.locked' }
  };
  const binaryDisplayState = domain === 'binary_sensor' && isOnOffState
    ? translate(binaryStateKeys[deviceClass]?.[state] || (state === 'on' ? 'status.on' : 'status.off'))
    : null;
  const toggleDisplayState = isOnOffState && ['automation', 'input_boolean', 'switch', 'input_number'].includes(domain)
    ? translate(state === 'on' ? 'status.on' : 'status.off')
    : null;
  const sceneDisplayState = domain === 'scene' ? translate('sensor.scene.label') : null;
  const scriptDisplayState = domain === 'script' ? translate('sensor.script.label') : null;
  const displayState = isNumeric
    ? formatUnitValue(convertedNumericState, { fallback: '--' })
    : (binaryDisplayState || toggleDisplayState || sceneDisplayState || scriptDisplayState || state);
  const iconToneClass = isBinaryLike
    ? (isUnavailable
      ? 'bg-red-500/10 text-red-400'
      : (isActiveState ? 'bg-green-500/15 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'))
    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]';
  
  // Feature flags from settings
  const showControls = settings?.showControls !== false;
  const showName = settings?.showName !== false;
  const showStatus = settings?.showStatus !== false;
  const isSmall = settings?.size === 'small';
  const showGraph = !isSmall && isNumeric && domain !== 'input_number' && settings?.showGraph !== false;

  const [history, setHistory] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeUntil, setActiveUntil] = useState(0);
  const cardRef = useRef(null);

  useEffect(() => {
    if (activeUntil > 0) {
      const timeout = setTimeout(() => {
        setActiveUntil(0);
      }, activeUntil - Date.now());
      return () => clearTimeout(timeout);
    }
  }, [activeUntil]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!conn || !entity?.entity_id || !showGraph || !isVisible) {
      if (!isVisible && showGraph) {
        // Keep empty while waiting for visibility
        return;
      }
      // If we are visible but no graph needed or no conn, clear
      if (!showGraph) setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const data = await getHistory(conn, {
          entityId: entity.entity_id,
          start,
          end,
          minimal_response: true
        });

        const processed = (data && Array.isArray(data) ? data : [])
          .filter(d => !isNaN(parseFloat(d.state)))
          .map(d => ({ value: parseFloat(d.state), time: new Date(d.last_changed) }));

        if (processed.length === 1) {
          const onlyPoint = processed[0];
          const earlierPoint = {
            value: onlyPoint.value,
            time: new Date(onlyPoint.time.getTime() - 60 * 60 * 1000)
          };
          setHistory([earlierPoint, onlyPoint]);
          return;
        }

        if (processed.length > 1) {
          setHistory(processed);
          return;
        }

        const stats = await getStatistics(conn, {
          statisticId: entity.entity_id,
          start,
          end,
          period: 'hour'
        });

        const statPoints = (stats && Array.isArray(stats) ? stats : [])
          .map(d => ({
            value: typeof d.mean === 'number' ? d.mean : (typeof d.state === 'number' ? d.state : d.sum),
            time: new Date(d.start)
          }))
          .filter(d => !isNaN(parseFloat(d.value)));

        if (statPoints.length === 1) {
          const onlyPoint = statPoints[0];
          const earlierPoint = {
            value: onlyPoint.value,
            time: new Date(onlyPoint.time.getTime() - 60 * 60 * 1000)
          };
          setHistory([earlierPoint, onlyPoint]);
          return;
        }

        if (statPoints.length > 1) {
          setHistory(statPoints);
          return;
        }

        if (!isNaN(parseFloat(state))) {
          const now = new Date();
          const currentValue = parseFloat(state);
          setHistory([
            { value: currentValue, time: new Date(now.getTime() - 60 * 60 * 1000) },
            { value: currentValue, time: now }
          ]);
          return;
        }

        setHistory([]);
      } catch (e) {
        console.error("Failed to fetch history", e);
        setHistory([]);
      }
    };

    let idleId;
    let timerId;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => fetchHistory(), { timeout: 4000 });
    } else {
      timerId = setTimeout(() => fetchHistory(), Math.random() * 500);
    }

    return () => {
      if (idleId) window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, [conn, entity?.entity_id, showGraph, state, isVisible]);

  // Early return AFTER all hooks to respect Rules of Hooks
  if (!entity) return null;

  // Determine controls based on domain
  const isToggleDomain = domain === 'input_boolean' || domain === 'switch' || domain === 'automation';
  const showToggleControls = isToggleDomain && showControls;

  const renderControls = () => {
    if (!showControls) return null;

    if (domain === 'script' || domain === 'scene') {
      const showActive = (domain === 'script' && state === 'on') || Date.now() < activeUntil;
      const label = showActive 
        ? (domain === 'scene' ? t('sensor.scene.activated') : t('sensor.script.ran'))
        : (domain === 'script' ? t('sensor.script.run') : t('sensor.scene.activate'));
      
      const handleRun = (e) => {
        e.stopPropagation();
        onControl('turn_on');
        setActiveUntil(Date.now() + 5000);
      };

      if (isSmall) {
        return (
          <div className="flex flex-col items-center gap-1 bg-[var(--glass-bg)] rounded-lg p-0.5">
            <button 
              onClick={handleRun}
              className={`w-6 h-5 flex items-center justify-center rounded-md hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all ${showActive ? 'bg-green-500/20 text-green-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          </div>
        );
      }

      return (
        <div className="flex items-center mt-4 w-full">
          <button 
            onClick={handleRun}
            className={`w-full py-2 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] ${showActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'text-[var(--text-primary)]'} font-bold uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2`}
          >
            <Play className="w-3 h-3 fill-current" /> {label}
          </button>
        </div>
      );
    }

    if (domain === 'input_number') {
      const min = entity.attributes?.min || 0;
      const max = entity.attributes?.max || 100;
      const val = parseFloat(state);

      if (isSmall) {
        return (
          <div className="flex flex-col items-center gap-1 bg-[var(--glass-bg)] rounded-lg p-0.5">
            <button 
              onClick={(e) => { e.stopPropagation(); onControl('increment'); }}
              className="w-6 h-5 flex items-center justify-center rounded-md hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              disabled={val >= max}
            >
              <Plus className="w-3 h-3" />
            </button>
             <button 
              onClick={(e) => { e.stopPropagation(); onControl('decrement'); }}
              className="w-6 h-5 flex items-center justify-center rounded-md hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              disabled={val <= min}
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
        );
      }

      return (
        <div className="flex items-center justify-between gap-2 mt-4 bg-[var(--glass-bg)] rounded-xl px-2.5 py-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); onControl('decrement'); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            disabled={val <= min}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
              {isNumeric ? formatUnitValue(convertedNumericState, { fallback: '--' }) : state}
            </span>
            <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider ml-1">
              {displayNumericUnit}
            </span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onControl('increment'); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            disabled={val >= max}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    // For other domains, only show controls if explicitly enabled
    if (!showControls) return null;
    
    return null;
  };

  if (isSmall) {
    return (
      <div ref={cardRef} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { if (!editMode) onOpen?.(e); }} className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer' : 'cursor-move'}`} style={{...cardStyle, containerType: 'inline-size'}}>
        {controls}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${iconToneClass}`}>
            {Icon ? <Icon className="w-6 h-6 stroke-[1.5px]" /> : <Activity className="w-6 h-6" />}
          </div>
          <div className="flex flex-col min-w-0">
            {showName && <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{String(name)}</p>}
             <div className="flex items-baseline gap-1">
                {showStatus && <span className="text-sm font-bold text-[var(--text-primary)] leading-none">
                  {displayState}
                </span>}
                {showStatus && displayNumericUnit && <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider leading-none">{displayNumericUnit}</span>}
            </div>
          </div>
        </div>
        
        {showToggleControls ? (
          <div className="sensor-card-controls shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); if (state !== 'on') onControl('toggle'); }}
              className={`control-on px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${state === 'on' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
            >
              {translate('common.on')}
            </button>
             <button 
              onClick={(e) => { e.stopPropagation(); if (state === 'on') onControl('toggle'); }}
              className={`control-off px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${state !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
            >
              {translate('common.off')}
            </button>
          </div>
        ) : (
          <div className="shrink-0">
             {renderControls()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={cardRef} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { if (!editMode) onOpen?.(e); }} className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer' : 'cursor-move'}`} style={cardStyle}>
      {controls}
      
      <div className="absolute -bottom-4 -right-4 text-[var(--glass-border)] opacity-[0.03] pointer-events-none">
        {Icon && <Icon size={140} />}
      </div>

      {showGraph && history.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-24 z-0 pointer-events-none">
          <SparkLine data={history} height={96} currentIndex={history.length - 1} fade />
        </div>
      )}

      <div className="relative z-10 flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${iconToneClass}`}>
          {Icon ? <Icon className="w-5 h-5 stroke-[1.5px]" /> : <Activity className="w-5 h-5" />}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
          <span className="text-xs tracking-widest uppercase font-bold">
            {displayState}
          </span>
          {displayNumericUnit && <span className="text-[10px] font-medium uppercase tracking-wider">{displayNumericUnit}</span>}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        {showName && <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{String(name)}</p>}
        {showToggleControls ? (
          <div className="flex items-center gap-2 mt-4 bg-[var(--glass-bg)] rounded-full p-1 w-fit">
            <button 
              onClick={(e) => { e.stopPropagation(); if (state === 'on') onControl('toggle'); }}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${state !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.off')}
            </button>
             <button 
              onClick={(e) => { e.stopPropagation(); if (state !== 'on') onControl('toggle'); }}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${state === 'on' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.on')}
            </button>
          </div>
        ) : (
          <>
            {domain !== 'input_number' && showStatus && (
              <h3 className="text-2xl font-medium text-[var(--text-primary)] leading-none">
                {displayState}
              </h3>
            )}
            {renderControls()}
          </>
        )}
      </div>
    </div>
  );
}
