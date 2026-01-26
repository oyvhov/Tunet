import { useState, useEffect } from 'react';
import { X, Clock, Calendar } from 'lucide-react';
import { getHistory, getStatistics } from '../services/haClient';
import SensorHistoryGraph from './SensorHistoryGraph';
import { formatRelativeTime } from '../utils';

export default function SensorModal({ isOpen, onClose, entityId, entity, customName, conn, t = (key) => key }) {
  const [history, setHistory] = useState([]);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAttributes, setShowAttributes] = useState(false);

  useEffect(() => {
    if (isOpen && entity && conn) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const end = new Date();
          const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          
          let points = [];
          let events = [];
          const isBinaryEntity = entity.entity_id?.startsWith('binary_sensor.');
          
          // Try fetching history first
          try {
            const data = await getHistory(conn, {
              entityId: entity.entity_id,
              start,
              end,
              minimal_response: !isBinaryEntity,
              no_attributes: !isBinaryEntity
            });

            if (data && Array.isArray(data)) {
              const raw = Array.isArray(data[0]) ? data[0] : data;
              points = raw
                .filter(d => !isNaN(parseFloat(d?.state)))
                .map(d => ({ value: parseFloat(d.state), time: new Date(d.last_changed || d.last_updated) }));
              events = raw
                .map(d => {
                  if (!d) return null;
                  const stateValue = d.state ?? d.s;
                  const changed = d.last_changed || d.last_updated || d.l;
                  if (stateValue === undefined || !changed) return null;
                  return {
                    state: stateValue,
                    time: new Date(changed),
                    lastChanged: changed
                  };
                })
                .filter(Boolean);
            }
          } catch (err) {
            console.warn("History fetch failed, trying stats", err);
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
               console.warn("Stats fetch failed", statErr);
             }
          }

          // Final fallback for current state as line
          if (points.length < 2 && !isNaN(parseFloat(entity.state))) {
             const now = new Date();
             const val = parseFloat(entity.state);
             points = [
               { value: val, time: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
               { value: val, time: now }
             ];
          }

          setHistory(points);
          setHistoryEvents(events);
        } catch (e) {
          console.error("Failed to load history", e);
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    } else {
      setHistory([]);
      setHistoryEvents([]);
    }
  }, [isOpen, entity, conn]);

  if (!isOpen || !entity) return null;

  const attrs = entity.attributes || {};
  const name = customName || attrs.friendly_name || entityId;
  const unit = attrs.unit_of_measurement ? `${attrs.unit_of_measurement}` : '';
  const state = entity.state;
  const isNumeric = !isNaN(parseFloat(state));
  const deviceClass = attrs.device_class;
  const isBinary = entity.entity_id?.startsWith('binary_sensor.') && (state === 'on' || state === 'off');
  
  const lastChanged = entity.last_changed ? new Date(entity.last_changed).toLocaleString() : '--';
  const lastUpdated = entity.last_updated ? new Date(entity.last_updated).toLocaleString() : '--';

  const attributeEntries = Object.entries(attrs)
    .filter(([key]) => !['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'].includes(key));

  const formatStateLabel = (value) => {
    if (value === null || value === undefined) return '--';
    const normalized = String(value).toLowerCase();
    const stateMap = {
      on: t('common.on'),
      off: t('common.off'),
      unavailable: t('status.unavailable'),
      unknown: t('common.unknown'),
      open: t('state.open'),
      closed: t('state.closed'),
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
      offline: t('state.offline')
    };
    return stateMap[normalized] || String(value);
  };

  const formatBinaryStateLabel = (value) => {
    const normalized = String(value).toLowerCase();
    const isOnOff = normalized === 'on' || normalized === 'off';
    if (!isOnOff) return formatStateLabel(value);
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
    const key = binaryStateKeys[deviceClass]?.[normalized];
    return key ? t(key) : (normalized === 'on' ? t('status.on') : t('status.off'));
  };

  const displayState = isNumeric ? parseFloat(state) : (isBinary ? formatBinaryStateLabel(state) : formatStateLabel(state));

  const recentEvents = historyEvents
    .filter(e => e && e.time instanceof Date && !isNaN(e.time))
    .sort((a, b) => b.time - a.time)
    .slice(0, 30);

  return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 transition-all duration-300" 
          style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)'
          }}
          onClick={onClose}>
      
      <div 
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[2rem] shadow-2xl relative font-sans flex flex-col transition-all backdrop-blur-xl border popup-anim"
        style={{
            background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
            borderColor: 'var(--glass-border)',
            color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="pt-8 pb-2 px-8 flex justify-between items-start">
             <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium tracking-wide uppercase text-[var(--text-secondary)] opacity-80">{name}</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-50">{t('sensorInfo.state')}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-light tracking-tighter text-[var(--text-primary)]">{displayState}</span>
                <span className="text-xl text-[var(--text-secondary)] font-normal">{unit}</span>
              </div>
            </div>
            <button 
            onClick={onClose} 
            className="p-2 -mr-2 -mt-2 rounded-full hover:bg-[var(--glass-bg-hover)] transition-colors text-[var(--text-secondary)]"
            >
            <X className="w-6 h-6" />
            </button>
        </div>

        <div className="px-8 pb-4">
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono opacity-40">{entityId}</span>
        </div>

        {/* Graph Section - Flat, no box */}
        {isNumeric && (
          <div className="w-full px-4 py-2 mt-2">
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--text-primary)] opacity-20"></div>
              </div>
            ) : (
              <SensorHistoryGraph data={history} height={220} noDataLabel={t('sensorInfo.noHistory')} />
            )}
          </div>
        )}

        {!isNumeric && isBinary && (
          <div className="px-8 pb-2 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">{t('history.activity')}</h3>
              <span className="text-[10px] text-[var(--text-secondary)] opacity-60">{t('history.last24h')}</span>
            </div>
            <div className="mt-4 space-y-3">
              {loading && (
                <div className="h-[120px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--text-primary)] opacity-20"></div>
                </div>
              )}
              {!loading && recentEvents.length === 0 && (
                <div className="text-xs text-[var(--text-secondary)] opacity-60">{t('sensorInfo.noHistory')}</div>
              )}
              {!loading && recentEvents.map((event, idx) => {
                const stateLabel = formatBinaryStateLabel(event.state);
                return (
                  <div key={`${event.lastChanged || idx}`} className="flex items-start gap-3">
                    <div className={`mt-1.5 h-2 w-2 rounded-full ${event.state === 'on' ? 'bg-yellow-400' : 'bg-gray-500'} opacity-80`} />
                    <div className="flex flex-col">
                      <span className="text-sm text-[var(--text-primary)]">
                        {t('history.wasState').replace('{state}', stateLabel)}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] opacity-70">
                        {event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {formatRelativeTime(event.time, t)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px w-full bg-[var(--text-primary)] my-4 opacity-[0.05]"></div>

        {/* Attributes List - Clean vertical list */}
        <div className="px-8 pb-8 space-y-8">
            
            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-50">{t('sensorInfo.lastChanged')}</span>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] opacity-80">
                        <Clock className="w-3.5 h-3.5 opacity-50" />
                        <span>{lastChanged}</span>
                    </div>
                </div>
                 <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-50">{t('sensorInfo.lastUpdated')}</span>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] opacity-80">
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        <span>{lastUpdated}</span>
                    </div>
                </div>
            </div>

            {/* Other Attributes */}
            {attributeEntries.length > 0 && (
                <div className="pt-2">
                     <button
                        type="button"
                        onClick={() => setShowAttributes((prev) => !prev)}
                        className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--glass-bg)]/20 hover:bg-[var(--glass-bg)]/35 transition-colors"
                     >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-70">{t('sensorInfo.attributes')}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">
                          {showAttributes ? t('sensorInfo.hideAttributes') : t('sensorInfo.showAttributes')}
                        </span>
                     </button>
                     {showAttributes && (
                       <div className="flex flex-col gap-2 mt-3">
                          {attributeEntries.map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between py-2">
                                  <span className="text-sm text-[var(--text-secondary)] capitalize opacity-80">{key.replace(/_/g, ' ')}</span>
                                  <span className="text-sm font-medium text-[var(--text-primary)] text-right max-w-[65%] truncate opacity-90">{String(value)}</span>
                              </div>
                          ))}
                       </div>
                     )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
