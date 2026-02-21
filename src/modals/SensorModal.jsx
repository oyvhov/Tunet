import { useState, useEffect } from 'react';
import { X, Activity } from 'lucide-react';
import { logger } from '../utils/logger';
import { getHistory, getHistoryRest, getStatistics } from '../services/haClient';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import BinaryTimeline from '../components/charts/BinaryTimeline';
import { formatRelativeTime } from '../utils';
import { getIconComponent } from '../icons';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode, inferUnitKind } from '../utils';

export default function SensorModal({ isOpen, onClose, entityId, entity, customName, conn, haUrl, haToken, t = (key) => key }) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const [history, setHistory] = useState([]);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [_historyError, setHistoryError] = useState(null);
  const [_historyMeta, setHistoryMeta] = useState({ source: null, rawCount: 0 });
  const [historyHours, setHistoryHours] = useState(24);

  // Keep track of window for the timeline
  const [timeWindow, setTimeWindow] = useState({ start: new Date(Date.now() - 24*60*60*1000), end: new Date() });

  const toDateSafe = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
      const ms = value < 1e12 ? value * 1000 : value;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === 'string') {
      const direct = new Date(value);
      if (!Number.isNaN(direct.getTime())) return direct;
      const num = Number(value);
      if (Number.isFinite(num)) {
        const ms = num < 1e12 ? num * 1000 : num;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
      }
    }
    return null;
  };

  // Helper to determine if entity should show activity (called early before useEffect)
  const getShouldShowActivity = () => {
    const domain = entityId?.split('.')?.[0];
    const activityDomains = [
      'binary_sensor', 'automation', 'switch', 'input_boolean',
      'cover', 'light', 'fan', 'lock', 'climate',
      'media_player', 'scene', 'script', 'input_select'
    ];
    
    if (!activityDomains.includes(domain)) return false;
    if (state === 'unavailable' || state === 'unknown') return false;
    if (isNumeric && domain !== 'light' && domain !== 'climate') return false;
    return true;
  };

  useEffect(() => {
    if (isOpen && entity && conn) {
      const fetchHistory = async () => {
        setLoading(true);
        setHistoryError(null);
        setHistoryMeta({ source: null, rawCount: 0 });
        try {
          const end = new Date();
          const start = new Date(end.getTime() - historyHours * 60 * 60 * 1000);
          setTimeWindow({ start, end });
          
          let points = [];
          let events = [];
          
          // Determine if we need history data for activity/events display
          const needsActivityData = getShouldShowActivity();
          
          // Try fetching history via REST first (recommended for full data)
          try {
            // Always fetch history for numeric or activity-requiring entities
            const shouldFetch = needsActivityData || isNumeric;
            
            if (shouldFetch) {
              const data = await getHistoryRest(haUrl, haToken, {
                entityId: entity.entity_id,
                start,
                end,
                minimal_response: false,
                no_attributes: false,
                significant_changes_only: false
              });

              if (data && Array.isArray(data)) {
                const raw = Array.isArray(data[0]) ? data[0] : data;
                setHistoryMeta({ source: 'rest', rawCount: raw.length });
                points = raw
                  .filter(d => !isNaN(parseFloat(d?.state)))
                  .map(d => ({
                    value: parseFloat(d.state),
                    time: toDateSafe(d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.lu || d.lc)
                  }))
                  .filter(d => d.time);
                events = raw
                  .map(d => {
                    if (!d) return null;
                    const stateValue = d.state ?? d.s;
                    const changed = d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.l || d.lc || d.lu;
                    const time = toDateSafe(changed);
                    if (stateValue === undefined || !time) return null;
                    return {
                      state: stateValue,
                      time,
                      lastChanged: changed
                    };
                  })
                  .filter(Boolean);
              }
            }
          } catch (err) {
            const restMessage = err?.message || 'History REST failed';
            // Continue to WS fallback
            try {
              const shouldFetch = needsActivityData || isNumeric;
              if (shouldFetch) {
                const wsData = await getHistory(conn, {
                  entityId: entity.entity_id,
                  start,
                  end,
                  minimal_response: false,
                  no_attributes: false
                });
                if (wsData && Array.isArray(wsData)) {
                  const raw = Array.isArray(wsData[0]) ? wsData[0] : wsData;
                  setHistoryMeta({ source: 'ws', rawCount: raw.length });
                  points = raw
                    .filter(d => !isNaN(parseFloat(d?.state)))
                    .map(d => ({
                      value: parseFloat(d.state),
                      time: toDateSafe(d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.lu || d.lc)
                    }))
                    .filter(d => d.time);
                  events = raw
                    .map(d => {
                      if (!d) return null;
                      const stateValue = d.state ?? d.s;
                      const changed = d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.l || d.lc || d.lu;
                      const time = toDateSafe(changed);
                      if (stateValue === undefined || !time) return null;
                      return {
                        state: stateValue,
                        time,
                        lastChanged: changed
                      };
                    })
                    .filter(Boolean);
                  setHistoryError(null);
                } else {
                  setHistoryError(restMessage);
                }
              }
            } catch (_wsErr) {
              setHistoryError(restMessage);
            }
          }

          // Fallback to statistics if history is sparse or empty
          if (points.length < 2) {
             try {
                const stats = await getStatistics(conn, {
                  statisticId: entity.entity_id,
                  start,
                  end,
                  period: 'hour'
                });
                
                if (stats && Array.isArray(stats)) {
                  points = stats
                    .map(d => ({
                      value: typeof d.mean === 'number' ? d.mean : (typeof d.state === 'number' ? d.state : d.sum),
                      time: new Date(d.start)
                    }))
                    .filter(d => !isNaN(parseFloat(d.value)));
                }
             } catch (statErr) {
              logger.warn('Stats fetch failed', statErr);
             }
          }

          // Final fallback for current state as line
          if (points.length < 2 && !isNaN(parseFloat(entity.state))) {
             const now = new Date();
             const val = parseFloat(entity.state);
             points = [
               { value: val, time: new Date(now.getTime() - historyHours * 60 * 60 * 1000) },
               { value: val, time: now }
             ];
          }

          // Fallback for events (Binary Timeline) if no history found
          // Even if unavailable, we want to show that state
          if (events.length === 0 && entity.state) {
             events = [{
               state: entity.state,
               time: start, 
               lastChanged: start.toISOString()
             }];
          }
          setHistory(points);
          setHistoryEvents(events);
        } catch (_e) {
          console.error("Failed to load history", _e);
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    } else {
      setHistory([]);
      setHistoryEvents([]);
    }
  }, [isOpen, entity, conn, haUrl, haToken, historyHours]);

  if (!isOpen || !entity) return null;

  const attrs = entity.attributes || {};
  const name = customName || attrs.friendly_name || entityId;
  const unit = attrs.unit_of_measurement ? `${attrs.unit_of_measurement}` : '';
  const state = entity.state;
  const domain = entityId?.split('.')?.[0];
  const isNumeric = !['script', 'scene'].includes(domain) && !isNaN(parseFloat(state)) && !String(state).match(/^unavailable|unknown$/) && !entityId.startsWith('binary_sensor.');
  const deviceClass = attrs.device_class;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const inferredUnitKind = inferUnitKind(deviceClass, unit);
  // Determine if entity should show activity timeline and log
  const shouldShowActivity = () => getShouldShowActivity();
  
  const hasActivity = shouldShowActivity();

  const lastChanged = entity.last_changed ? new Date(entity.last_changed).toLocaleString() : '--';
  const lastUpdated = entity.last_updated ? new Date(entity.last_updated).toLocaleString() : '--';

  const attributeEntries = Object.entries(attrs)
    .filter(([key]) => !['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'].includes(key));

  const formatStateLabel = (value, dc = deviceClass) => {
    if (value === null || value === undefined) return '--';
    const normalized = String(value).toLowerCase();

    // Check for ISO Date (e.g. Scenes/Scripts)
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try {
         const d = new Date(value);
         if (!isNaN(d.getTime())) {
           return d.toLocaleString();
         }
      } catch (_e) {
        // Silently ignore parse errors for non-date values
      }
    }

    // Base state mappings
    const stateMap = {
      on: t('common.on'),
      off: t('common.off'),
      unavailable: t('status.unavailable'),
      unknown: t('common.unknown'),
      open: t('state.open'),
      closed: t('state.closed'),
      opening: t('state.open'),
      closing: t('state.closed'),
      locked: t('state.locked'),
      unlocked: t('state.unlocked'),
      active: t('state.active'),
      inactive: t('state.inactive'),
      idle: t('state.idle'),
      charging: t('state.charging'),
      playing: t('state.playing'),
      paused: t('state.paused'),
      standby: t('state.standby'),
      home: t('status.home'),
      away: t('status.notHome'),
      not_home: t('status.notHome'),
      online: t('state.online'),
      offline: t('state.offline'),
      heat: t('climate.hvac.heat'),
      cool: t('climate.hvac.cool'),
      auto: t('climate.hvac.auto'),
      'fan_only': t('climate.hvac.fanOnly'),
      dry: t('climate.hvac.dry')
    };
    
    // Check if it's an on/off state and apply device_class specific mapping
    const isOnOff = normalized === 'on' || normalized === 'off';
    if (isOnOff && dc) {
      const deviceClassMap = {
        door: { on: 'binary.door.open', off: 'binary.door.closed' },
        window: { on: 'binary.window.open', off: 'binary.window.closed' },
        garage_door: { on: 'binary.garageDoor.open', off: 'binary.garageDoor.closed' },
        motion: { on: 'binary.motion.detected', off: 'binary.motion.clear' },
        moisture: { on: 'binary.moisture.wet', off: 'binary.moisture.dry' },
        occupancy: { on: 'binary.occupancy.occupied', off: 'binary.occupancy.clear' },
        smoke: { on: 'binary.smoke.detected', off: 'binary.smoke.clear' },
        lock: { on: 'binary.lock.unlocked', off: 'binary.lock.locked' }
      };
      const key = deviceClassMap[dc]?.[normalized];
      if (key) return t(key);
    }
    
    return stateMap[normalized] || String(value);
  };

  const numericState = isNumeric ? parseFloat(state) : null;
  const convertedNumericState = isNumeric && inferredUnitKind
    ? convertValueByKind(numericState, {
      kind: inferredUnitKind,
      fromUnit: unit,
      unitMode: effectiveUnitMode,
    })
    : numericState;
  const displayUnit = isNumeric && inferredUnitKind
    ? getDisplayUnitForKind(inferredUnitKind, effectiveUnitMode)
    : unit;

  let displayState = isNumeric
    ? formatUnitValue(convertedNumericState, { fallback: '--' })
    : formatStateLabel(state, deviceClass);
  // Add prefix for Scene timestamps
  if (domain === 'scene' && String(state).match(/^\d{4}-\d{2}-\d{2}T/)) {
    displayState = `${t('state.sceneSet')} ${formatRelativeTime(state, t)}`;
  }

  const recentEvents = historyEvents
    .filter(e => e && e.time && !Number.isNaN(new Date(e.time).getTime()))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  // Icon Logic
  const Icon = getIconComponent(attrs.icon) || Activity;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] overflow-hidden flex flex-col lg:grid lg:grid-cols-5 backdrop-blur-xl shadow-2xl popup-anim relative max-h-[90vh] md:h-auto md:min-h-[550px]"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="absolute top-6 right-6 md:top-10 md:right-10 z-50">
          <button onClick={onClose} className="modal-close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* LEFT PANEL: Visuals & Graph (3 cols) */}
        <div className="lg:col-span-3 relative p-6 md:p-10 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r shrink-0" style={{borderColor: 'var(--glass-border)'}}>
           
           {/* Header */}
           <div className="flex items-center gap-4 shrink-0 mb-6">
             <div
               className="p-4 rounded-2xl transition-all duration-500"
               style={{
                 backgroundColor: entity.state === 'unavailable' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                 color: entity.state === 'unavailable' ? '#ef4444' : '#60a5fa'
               }}
             >
               <Icon className="w-8 h-8" />
             </div>
             <div className="min-w-0">
               <h2 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none truncate">
                 {name}
               </h2>
                 <div className={`mt-2 px-3 py-1 rounded-full border inline-flex items-center gap-2 ${entity.state === 'unavailable' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
                 <div className={`w-1.5 h-1.5 rounded-full ${entity.state === 'unavailable' ? 'bg-red-500' : 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]'}`} />
                 <span className="text-[10px] font-bold uppercase tracking-widest leading-none pt-[1px]">
                   {String(displayState)} {displayUnit}
                 </span>
               </div>
             </div>
           </div>

           {/* Main Content Area */}
           <div className="flex-1 flex flex-col min-h-0 relative">
              {isNumeric && !hasActivity ? (
                <div className="h-full w-full min-h-[250px] relative">
                   {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--text-primary)] opacity-20"></div>
                      </div>
                    ) : (
                      <div className="-ml-4 -mr-4 md:mr-0 h-full">
                         <SensorHistoryGraph data={history} height={350} noDataLabel={t('sensorInfo.noHistory')} strokeColor="var(--text-primary)" areaColor="var(--text-primary)" />
                      </div>
                    )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                   {loading && (
                      <div className="h-[100px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--text-primary)] opacity-20"></div>
                      </div>
                   )}
                   
                   {!loading && hasActivity && (
                     <>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-80 mb-4 bg-transparent">{t('history.activity')}</h4> 
                        <div className="mb-6">
                           <BinaryTimeline events={historyEvents} startTime={timeWindow.start} endTime={timeWindow.end} />
                        </div>
                        
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-80 mb-4 bg-transparent shadow-sm pb-2 border-b border-[var(--glass-border)]">{t('history.log')}</h4>
                        <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {recentEvents.length === 0 && (
                                <div className="text-sm text-[var(--text-secondary)] italic opacity-60 py-8 text-center">{t('sensorInfo.noHistory')}</div>
                            )}
                            {recentEvents.map((event, idx) => {
                                let stateLabel = formatStateLabel(event.state, deviceClass);
                                const domain = entityId?.split('.')?.[0];
                                
                                // Specific formatting for Scenes in log
                                if (domain === 'scene' && String(event.state).match(/^\d{4}-\d{2}-\d{2}T/)) {
                                  stateLabel = `${t('state.sceneSet')} ${formatRelativeTime(event.state, t)}`;
                                }

                                const useStateOnly = (domain === 'binary_sensor' || domain === 'motion') && (deviceClass === 'motion' || deviceClass === 'occupancy' || deviceClass === 'presence');
                                const logLabel = (useStateOnly || domain === 'scene')
                                  ? (domain === 'scene' ? stateLabel : t('history.stateOnly').replace('{state}', stateLabel))
                                  : t('history.wasState').replace('{state}', stateLabel);

                                return (
                                <div key={`${event.lastChanged || idx}`} className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/5 group border border-transparent hover:border-white/5">
                                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${(event.state === 'on' || event.state === 'true' || event.state === 'open' || event.state === 'unlocked' || event.state === 'playing' || event.state > 0) ? 'bg-green-400 opacity-80' : 'bg-[var(--text-secondary)] opacity-35'}`} />
                                    <div className="flex-1 min-w-0 flex items-baseline justify-between gap-4">
                                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {logLabel}
                                        </span>
                                        <span className="text-xs font-mono text-[var(--text-secondary)] opacity-70 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {formatRelativeTime(event.time, t)}
                                        </span>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                     </>
                   )}
                   
                   {!loading && !hasActivity && isNumeric && (
                     <div className="-ml-4 -mr-4 md:mr-0 h-full">
                        <SensorHistoryGraph data={history} height={350} noDataLabel={t('sensorInfo.noHistory')} strokeColor="var(--text-primary)" areaColor="var(--text-primary)" />
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>

        {/* RIGHT PANEL: Meta & Attributes (2 cols) */}
        <div className="lg:col-span-2 relative bg-[var(--glass-bg)]/10 p-6 md:p-10 overflow-y-auto flex flex-col gap-10">
           
           {/* Timestamps */}
           <div>
               <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-6 opacity-40">{t('sensorInfo.timeline')}</h4>
               <div className="space-y-6">
                  <div className="relative pl-4 border-l border-[var(--glass-border)]">
                      <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent-color)]"></div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-50 mb-0.5">{t('sensorInfo.lastChanged')}</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{lastChanged}</p>
                  </div>
                  <div className="relative pl-4 border-l border-[var(--glass-border)]">
                      <div className="absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-50 mb-0.5">{t('sensorInfo.lastUpdated')}</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{lastUpdated}</p>
                  </div>
               </div>
           </div>

           {/* History Range */}
           <div>
             <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4 opacity-40">{t('history.rangeHours')}</h4>
             <div className="flex flex-wrap gap-2">
               {[6, 12, 24, 48, 72].map((hours) => (
                 <button
                   key={hours}
                   onClick={() => setHistoryHours(hours)}
                   className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${historyHours === hours ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                 >
                   {hours}h
                 </button>
               ))}
             </div>
           </div>

           {/* Attributes */}
           {attributeEntries.length > 0 && (
                <div className="flex-1">
                     <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-40">{t('sensorInfo.attributes')}</h4>
                     </div>
                     
                     <div className="space-y-4">
                          {attributeEntries.map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-40 capitalize">{key.replace(/_/g, ' ')}</span>
                                  <span className="text-sm font-medium text-[var(--text-primary)] opacity-80 break-words leading-snug font-mono">{String(value)}</span>
                              </div>
                          ))}
                     </div>
                </div>
           )}

           <div className="mt-auto pt-10 opacity-30">
              <p className="text-[10px] font-mono text-center select-all">{entityId}</p>
           </div>

        </div>
      </div>
    </div>
  );
}
