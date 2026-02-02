import React, { useState, useEffect } from 'react';
import { Minus, Plus, Activity, Power, ToggleLeft, ToggleRight } from 'lucide-react';
import { getHistory, getStatistics } from '../services/haClient';
import SparkLine from './SparkLine';

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
  if (!entity) return null;

  const translate = t || ((key) => key);
  const state = entity.state;
  const unit = entity.attributes?.unit_of_measurement || '';
  const isNumeric = typeof state === 'string'
    ? /^\s*-?\d+(\.\d+)?\s*$/.test(state)
    : !isNaN(parseFloat(state));
  const domain = entity.entity_id.split('.')[0];
  const deviceClass = entity.attributes?.device_class;
  const isOnOffState = state === 'on' || state === 'off';
  const binaryStateKeys = {
    door: { on: 'binary.door.open', off: 'binary.door.closed' },
    window: { on: 'binary.window.open', off: 'binary.window.closed' },
    garage_door: { on: 'binary.garageDoor.open', off: 'binary.garageDoor.closed' },
    motion: { on: 'binary.motion.detected', off: 'binary.motion.clear' },
    moisture: { on: 'binary.moisture.wet', off: 'binary.moisture.dry' },
    occupancy: { on: 'binary.occupancy.occupied', off: 'binary.occupancy.clear' },
    smoke: { on: 'binary.smoke.detected', off: 'binary.smoke.clear' },
    lock: { on: 'binary.lock.unlocked', off: 'binary.lock.locked' }
  };
  const binaryDisplayState = domain === 'binary_sensor' && isOnOffState
    ? translate(binaryStateKeys[deviceClass]?.[state] || (state === 'on' ? 'status.on' : 'status.off'))
    : null;
  const toggleDisplayState = isOnOffState && ['automation', 'input_boolean', 'switch', 'input_number'].includes(domain)
    ? translate(state === 'on' ? 'status.on' : 'status.off')
    : null;
  const displayState = isNumeric ? parseFloat(state) : (binaryDisplayState || toggleDisplayState || state);
  
  // Feature flags from settings
  const showControls = settings?.showControls;
  const isSmall = settings?.size === 'small';
  const showGraph = !isSmall && isNumeric && domain !== 'input_number' && settings?.showGraph !== false;

  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!conn || !entity.entity_id || !showGraph) {
      setHistory([]);
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

    fetchHistory();
  }, [conn, entity.entity_id, showGraph, state]);

  // Determine controls based on domain
  const isToggleDomain = domain === 'input_boolean' || domain === 'switch' || domain === 'automation';
  const showToggleControls = isToggleDomain;

  const renderControls = () => {
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
              {isNumeric ? parseFloat(state) : state}
            </span>
            <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider ml-1">
              {unit}
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
      <div {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { if (!editMode) onOpen?.(e); }} className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer' : 'cursor-move'}`} style={{...cardStyle, containerType: 'inline-size'}}>
        {controls}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[var(--glass-bg)] flex-shrink-0 flex items-center justify-center text-[var(--text-secondary)]">
            {Icon ? <Icon className="w-6 h-6 stroke-[1.5px]" /> : <Activity className="w-6 h-6" />}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{String(name)}</p>
             <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-[var(--text-primary)] leading-none">
                  {displayState}
                </span>
                {unit && <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider leading-none">{unit}</span>}
            </div>
          </div>
        </div>
        
        {showToggleControls ? (
          <div className="sensor-card-controls shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); if (state !== 'on') onControl('toggle'); }}
              className={`control-on px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${state === 'on' ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
            >
              På
            </button>
             <button 
              onClick={(e) => { e.stopPropagation(); if (state === 'on') onControl('toggle'); }}
              className={`control-off px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${state !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
            >
              Av
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
    <div {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { if (!editMode) onOpen?.(e); }} className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer' : 'cursor-move'}`} style={cardStyle}>
      {controls}
      
      <div className="absolute -bottom-4 -right-4 text-[var(--glass-border)] opacity-[0.03] pointer-events-none">
        {Icon && <Icon size={140} />}
      </div>

      {showGraph && history.length > 0 && (
        <div className="absolute inset-x-0 bottom-2 h-24 z-0 pointer-events-none">
          <SparkLine data={history} height={96} currentIndex={history.length - 1} fade />
        </div>
      )}

      <div className="relative z-10 flex justify-between items-start">
        <div className="p-3 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-muted)]">
          {Icon ? <Icon className="w-5 h-5 stroke-[1.5px]" /> : <Activity className="w-5 h-5" />}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
          <span className="text-xs tracking-widest uppercase font-bold">
            {displayState}
          </span>
          {unit && <span className="text-[10px] font-medium uppercase tracking-wider">{unit}</span>}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{String(name)}</p>
        {showToggleControls ? (
          <div className="flex items-center gap-2 mt-4 bg-[var(--glass-bg)] rounded-full p-1 w-fit">
            <button 
              onClick={(e) => { e.stopPropagation(); if (state === 'on') onControl('toggle'); }}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${state !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Av
            </button>
             <button 
              onClick={(e) => { e.stopPropagation(); if (state !== 'on') onControl('toggle'); }}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${state === 'on' ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              På
            </button>
          </div>
        ) : (
          <>
            {domain !== 'input_number' && (
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
