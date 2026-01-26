import React, { useState, useEffect } from 'react';
import { Minus, Plus, Activity, Power } from 'lucide-react';
import { getHistory, getStatistics } from '../services/haClient';
import SparkLine from './SparkLine';

const SensorCard = ({ 
  entity, 
  conn,
  settings, 
  dragProps, 
  cardStyle, 
  Icon, 
  name, 
  editMode, 
  controls,
  onControl 
}) => {
  if (!entity) return null;

  const state = entity.state;
  const unit = entity.attributes?.unit_of_measurement || '';
  const isNumeric = !isNaN(parseFloat(state));
  const domain = entity.entity_id.split('.')[0];
  
  // Feature flags from settings
  const showControls = settings?.showControls;
  const isSmall = settings?.size === 'small';
  const showGraph = !isSmall && isNumeric && settings?.showGraph !== false;

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
  const isToggleDomain = domain === 'input_boolean' || domain === 'switch';

  const renderControls = () => {
    if (!showControls) return null;

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

    return null;
  };

  if (isSmall) {
    return (
      <div {...dragProps} className={`p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={cardStyle}>
        {controls}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[var(--glass-bg)] flex-shrink-0 flex items-center justify-center text-[var(--text-secondary)]">
            {Icon ? <Icon className="w-6 h-6 stroke-[1.5px]" /> : <Activity className="w-6 h-6" />}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none mb-1.5">{String(name)}</p>
             <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-[var(--text-primary)] leading-none">
                  {isNumeric ? parseFloat(state) : state}
                </span>
                {unit && <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider leading-none">{unit}</span>}
            </div>
          </div>
        </div>
        
        {isToggleDomain ? (
           <div className="flex flex-col items-center gap-1 bg-[var(--glass-bg)] rounded-xl p-0.5 shrink-0">
             <button
               onClick={(e) => { e.stopPropagation(); if(state !== 'on') onControl('toggle'); }}
               className={`w-9 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${state === 'on' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-secondary)] opacity-50 hover:bg-white/5'}`}
             >
               PÅ
             </button>
             <button
               onClick={(e) => { e.stopPropagation(); if(state === 'on') onControl('toggle'); }}
               className={`w-9 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${state !== 'on' ? 'bg-white/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-50 hover:bg-white/5'}`}
             >
               AV
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
    <div {...dragProps} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-default' : 'cursor-move'}`} style={cardStyle}>
      {controls}
      
      <div className="absolute -bottom-4 -right-4 text-[var(--glass-border)] opacity-[0.03] pointer-events-none">
        {Icon && <Icon size={140} />}
      </div>

      {showGraph && history.length > 0 && (
         <div className="absolute inset-x-0 bottom-0 h-24 z-0 pointer-events-none">
            <SparkLine data={history} height={96} currentIndex={history.length - 1} />
         </div>
      )}

      <div className="relative z-10 flex justify-between items-start">
        <div className="p-3 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-muted)]">
          {Icon ? <Icon className="w-5 h-5 stroke-[1.5px]" /> : <Activity className="w-5 h-5" />}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
          <span className="text-xs tracking-widest uppercase font-bold">
            {isNumeric ? parseFloat(state) : state}
          </span>
          {unit && <span className="text-[10px] font-medium uppercase tracking-wider">{unit}</span>}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{String(name)}</p>
        {isToggleDomain ? (
          <div className="w-full mt-3 p-1 rounded-xl flex items-center gap-1 bg-[var(--glass-bg)]">
             <button
               onClick={(e) => { e.stopPropagation(); if(state === 'on') onControl('toggle'); }}
               className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${state !== 'on' ? 'bg-white/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-50 hover:bg-white/5'}`}
             >
               AV
             </button>
             <button
               onClick={(e) => { e.stopPropagation(); if(state !== 'on') onControl('toggle'); }}
               className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${state === 'on' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-secondary)] opacity-50 hover:bg-white/5'}`}
             >
               PÅ
             </button>
          </div>
        ) : (
          <>
            {domain !== 'input_number' && (
              <h3 className="text-2xl font-medium text-[var(--text-primary)] leading-none">
                {isNumeric ? parseFloat(state) : state}
              </h3>
            )}
            {renderControls()}
          </>
        )}
      </div>
    </div>
  );
};

export default SensorCard;
