import { useState, useEffect } from 'react';
import { X, Clock, Calendar } from 'lucide-react';
import { getHistory, getStatistics } from '../services/haClient';
import SensorHistoryGraph from './SensorHistoryGraph';

export default function SensorModal({ isOpen, onClose, entityId, entity, customName, conn, t = (key) => key }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && entity && conn) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const end = new Date();
          const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          
          let points = [];
          
          // Try fetching history first
          try {
            const data = await getHistory(conn, {
              entityId: entity.entity_id,
              start,
              end,
              minimal_response: true
            });

            if (data && Array.isArray(data)) {
              points = data
                .filter(d => !isNaN(parseFloat(d.state)))
                .map(d => ({ value: parseFloat(d.state), time: new Date(d.last_changed) }));
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
        } catch (e) {
          console.error("Failed to load history", e);
        } finally {
          setLoading(false);
        }
      };

      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [isOpen, entity, conn]);

  if (!isOpen || !entity) return null;

  const attrs = entity.attributes || {};
  const name = customName || attrs.friendly_name || entityId;
  const unit = attrs.unit_of_measurement ? `${attrs.unit_of_measurement}` : '';
  const state = entity.state;
  const isNumeric = !isNaN(parseFloat(state));
  
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

  const displayState = isNumeric ? parseFloat(state) : formatStateLabel(state);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-[6px] bg-black/40 transition-all duration-300" 
         onClick={onClose}>
      
      <div 
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[2rem] shadow-2xl relative font-sans flex flex-col transition-all"
        style={{
            backgroundColor: 'var(--modal-bg)', 
            color: 'var(--text-primary)'
            /* No border for flatter look, using shadow effectively */
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
                     <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-50 mb-4">{t('sensorInfo.attributes')}</h3>
                     <div className="flex flex-col gap-2">
                        {attributeEntries.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-2">
                                <span className="text-sm text-[var(--text-secondary)] capitalize opacity-80">{key.replace(/_/g, ' ')}</span>
                                <span className="text-sm font-medium text-[var(--text-primary)] text-right max-w-[65%] truncate opacity-90">{String(value)}</span>
                            </div>
                        ))}
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
