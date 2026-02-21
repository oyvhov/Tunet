import { X, Car, Clock, RefreshCw, Zap, MapPin, Thermometer } from '../icons';
import M3Slider from '../components/ui/M3Slider';
import { formatRelativeTime } from '../utils';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode } from '../utils';

const formatValue = (val) => {
  if (val === null || val === undefined) return '--';
  const strVal = String(val).replace(',', '.');
  const num = parseFloat(strVal);
  if (isNaN(num)) return val;
  // Maximum 1 decimal
  return Math.round(num * 10) / 10;
};

/**
 * LeafModal - Generic car modal for car information and controls
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.callService - Function to call HA services
 * @param {Function} props.getS - Function to get entity state
 * @param {Function} props.getA - Function to get entity attribute
 * @param {Function} props.t - Translation function
 * @param {Object} props.car - Car settings and resolved entity IDs
 */

export default function LeafModal({
  show,
  onClose,
  entities,
  callService,
  getS,
  getA,
  t,
  car
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);

  if (!show) return null;

  const {
    name,
    batteryId,
    climateId,
    locationId,
    chargingId,
    pluggedId,
    rangeId,
    tempId,
    lastUpdatedId,
    updateButtonId
  } = car || {};

  const climateTempRaw = climateId ? getA(climateId, 'current_temperature') : null;
  const climateTemp = climateTempRaw !== null && climateTempRaw !== undefined
    ? parseFloat(climateTempRaw)
    : null;
  const tempValue = tempId ? getS(tempId) : (Number.isFinite(climateTemp) ? climateTemp : null);
  const rangeRaw = rangeId ? getS(rangeId) : null;
  const rangeNumber = rangeRaw !== null && rangeRaw !== undefined ? parseFloat(String(rangeRaw).replace(',', '.')) : null;
  const sourceRangeUnit = rangeId ? (entities[rangeId]?.attributes?.unit_of_measurement || 'km') : 'km';
  const sourceTempUnit = tempId
    ? (entities[tempId]?.attributes?.unit_of_measurement || haConfig?.unit_system?.temperature || '°C')
    : (climateId ? (entities[climateId]?.attributes?.temperature_unit || haConfig?.unit_system?.temperature || '°C') : (haConfig?.unit_system?.temperature || '°C'));
  const climateTargetRaw = climateId ? getA(climateId, 'temperature', 20) : 20;
  const climateTargetValue = parseFloat(String(climateTargetRaw).replace(',', '.'));
  const displayRangeUnit = getDisplayUnitForKind('length', effectiveUnitMode);
  const displayTempUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const displayRangeValue = convertValueByKind(rangeNumber, {
    kind: 'length',
    fromUnit: sourceRangeUnit,
    unitMode: effectiveUnitMode,
  });
  const displayTempValue = convertValueByKind(tempValue, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const displayTargetTempValue = convertValueByKind(climateTargetValue, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });

  const isCharging = entities[chargingId]?.state === 'on' || entities[chargingId]?.state === 'charging';
  const isHeating = entities[climateId]?.state && !['off', 'unknown', 'unavailable'].includes(entities[climateId]?.state);
  
  const statusColor = isCharging ? '#4ade80' : (isHeating ? '#fb923c' : 'var(--text-secondary)');
  const statusBg = isCharging ? 'rgba(74, 222, 128, 0.1)' : (isHeating ? 'rgba(251, 146, 60, 0.1)' : 'var(--glass-bg)');

  const lat = locationId ? getA(locationId, "latitude") : null;
  const long = locationId ? getA(locationId, "longitude") : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 font-sans relative max-h-[80vh] overflow-y-auto backdrop-blur-xl popup-anim" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)', 
          color: 'var(--text-primary)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-6 right-6 md:top-10 md:right-10 flex gap-3 z-20">
            {updateButtonId && (
                <button 
                  onClick={() => callService("button", "press", { entity_id: updateButtonId })}
                  className="h-9 px-4 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2 backdrop-blur-md shadow-lg"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{t('car.update')}</span>
                </button>
            )}
            <button onClick={onClose} className="modal-close"><X className="w-4 h-4" /></button>
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6 font-sans">
          <div className="p-4 rounded-2xl transition-all duration-500" style={{ backgroundColor: statusBg, color: statusColor }}>
             <Car className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">
              {name || t('car.defaultName')}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="px-3 py-1 rounded-full inline-block transition-all duration-500" style={{ backgroundColor: statusBg, color: statusColor }}>
                <p className="text-[10px] uppercase font-bold italic tracking-widest">{t('status.statusLabel')}: {isCharging ? t('car.charging') : (isHeating ? t('car.heating') : t('status.idle'))}</p>
              </div>
              {lastUpdatedId && (
                 <div className="px-3 py-1.5 rounded-full inline-flex items-center gap-2 bg-[var(--glass-bg)] text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">{formatRelativeTime(entities[lastUpdatedId]?.state, t)}</span>
                 </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start font-sans">
          
           {/* Left Column - Map (Span 3) */}
           <div className="lg:col-span-3">
              <div className="h-[clamp(14rem,32vw,26rem)] md:h-[clamp(18rem,26vw,32rem)] w-full rounded-2xl bg-[var(--glass-bg)]/50 overflow-hidden relative group">
                {lat && long ? (
                  <>
                    <iframe 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        scrolling="no" 
                        marginHeight="0" 
                        marginWidth="0" 
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${long-0.005}%2C${lat-0.005}%2C${long+0.005}%2C${lat+0.005}&layer=mapnik&marker=${lat}%2C${long}`} 
                        style={{filter: 'invert(0.9) grayscale(0.8) contrast(1.2) brightness(0.8)'}}
                        className="opacity-70 group-hover:opacity-100 transition-opacity duration-500 w-full h-full"
                    ></iframe>
                    <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-md bg-black/60 shadow-lg flex items-center gap-2 pointer-events-none">
                        <MapPin className="w-3 h-3 text-[var(--accent-color)]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white">
                            {t('map.lastSeenHere')}
                        </span>
                    </div>
                  </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
                        <MapPin className="w-24 h-24 opacity-20 mb-4" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-50">{t('common.missing')} Map</span>
                    </div>
                )}
              </div>
           </div>

           {/* Right Column - Stats & Controls (Span 2) */}
           <div className="lg:col-span-2 space-y-4">
              
              {/* Battery - Primary Stat */}
              {batteryId && (
                 <div className="p-4 rounded-2xl popup-surface flex flex-col items-center gap-1 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                        {isCharging && <Zap className="w-4 h-4 text-green-400 animate-pulse" />}
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">{t('car.battery')}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-light italic ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                          {batteryId ? formatValue(getS(batteryId)) : '--'}
                        </span>
                        <span className="text-xl text-gray-500 font-medium">%</span>
                    </div>
                    {pluggedId && (
                       <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${entities[pluggedId]?.state === 'on' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-500'}`}>
                          {entities[pluggedId]?.state === 'on' ? t('car.pluggedIn') : t('car.unplugged')}
                       </div>
                    )}
                 </div>
              )}

              {/* Smaller Grid for Secondary Stats */}
              <div className="grid grid-cols-2 gap-3">
                 {rangeId && (
                    <div className="p-4 rounded-2xl popup-surface flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em] mb-1">{t('car.range')}</span>
                        <div className="flex items-baseline gap-1">
                       <span className="text-2xl font-light text-[var(--text-primary)]">{formatUnitValue(displayRangeValue, { kind: 'length', fallback: '--' })}</span>
                       <span className="text-xs text-gray-500 font-bold">{displayRangeUnit}</span>
                        </div>
                    </div>
                 )}
                 {(tempValue !== null || tempId) && (
                    <div className="p-4 rounded-2xl popup-surface flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em] mb-1">Temp</span>
                        <div className="flex items-baseline gap-1">
                       <span className="text-2xl font-light text-[var(--text-primary)]">{formatUnitValue(displayTempValue, { kind: 'temperature', fallback: '--' })}</span>
                       <span className="text-xs text-gray-500 font-bold">{displayTempUnit}</span>
                        </div>
                    </div>
                 )}
              </div>

              {/* Climate Control */}
              {climateId && (
                 <div className="p-4 rounded-2xl popup-surface space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-full ${isHeating ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--glass-bg)] text-gray-500'}`}>
                                <Thermometer className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">{t('car.climate')}</p>
                                <p className="text-[10px] uppercase font-bold text-gray-500">{isHeating ? t('common.on') : t('common.off')}</p>
                            </div>
                        </div>
                        <button 
                          onClick={() => callService("climate", isHeating ? "turn_off" : "turn_on", { entity_id: climateId })}
                          className={`w-14 h-8 rounded-full transition-all relative ${isHeating ? 'bg-orange-500' : 'bg-[var(--glass-border)]'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-sm ${isHeating ? 'left-[calc(100%-28px)]' : 'left-1'}`} />
                        </button>
                    </div>
                    
                    <div className="space-y-3 pt-2 border-t border-[var(--glass-border)]/50">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{t('car.target')}</span>
                          <span className="text-lg font-light text-[var(--text-primary)]">{formatUnitValue(displayTargetTempValue, { kind: 'temperature', fallback: '--' })}{displayTempUnit}</span>
                        </div>
                        <M3Slider 
                          min={16} max={30} step={0.5} 
                          value={getA(climateId, "temperature") || 20} 
                          onChange={(e) => callService("climate", "set_temperature", { entity_id: climateId, temperature: parseFloat(e.target.value) })}
                          colorClass={isHeating ? 'bg-orange-500' : 'bg-white/20'}
                        />
                    </div>
                 </div>
              )}

           </div>
        </div>
      </div>
    </div>
  );
}

