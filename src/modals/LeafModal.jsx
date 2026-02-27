import { X, Car, Clock, RefreshCw, Zap, MapPin, Thermometer } from '../icons';
import M3Slider from '../components/ui/M3Slider';
import { formatRelativeTime } from '../utils';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
} from '../utils';

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

export default function LeafModal({ show, onClose, entities, callService, getS, getA, t, car }) {
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
    updateButtonId,
  } = car || {};

  const climateTempRaw = climateId ? getA(climateId, 'current_temperature') : null;
  const climateTemp =
    climateTempRaw !== null && climateTempRaw !== undefined ? parseFloat(climateTempRaw) : null;
  const tempValue = tempId ? getS(tempId) : Number.isFinite(climateTemp) ? climateTemp : null;
  const rangeRaw = rangeId ? getS(rangeId) : null;
  const rangeNumber =
    rangeRaw !== null && rangeRaw !== undefined
      ? parseFloat(String(rangeRaw).replace(',', '.'))
      : null;
  const sourceRangeUnit = rangeId
    ? entities[rangeId]?.attributes?.unit_of_measurement || 'km'
    : 'km';
  const sourceTempUnit = tempId
    ? entities[tempId]?.attributes?.unit_of_measurement ||
      haConfig?.unit_system?.temperature ||
      '°C'
    : climateId
      ? entities[climateId]?.attributes?.temperature_unit ||
        haConfig?.unit_system?.temperature ||
        '°C'
      : haConfig?.unit_system?.temperature || '°C';
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

  const isCharging =
    entities[chargingId]?.state === 'on' || entities[chargingId]?.state === 'charging';
  const isHeating =
    entities[climateId]?.state &&
    !['off', 'unknown', 'unavailable'].includes(entities[climateId]?.state);

  const statusColor = isCharging ? '#4ade80' : isHeating ? '#fb923c' : 'var(--text-secondary)';
  const statusBg = isCharging
    ? 'rgba(74, 222, 128, 0.1)'
    : isHeating
      ? 'rgba(251, 146, 60, 0.1)'
      : 'var(--glass-bg)';

  const lat = locationId ? getA(locationId, 'latitude') : null;
  const long = locationId ? getA(locationId, 'longitude') : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative max-h-[80vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-12"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-6 right-6 z-20 flex gap-3 md:top-10 md:right-10">
          {updateButtonId && (
            <button
              onClick={() => callService('button', 'press', { entity_id: updateButtonId })}
              className="flex h-9 items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 text-[var(--text-secondary)] shadow-lg backdrop-blur-md transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden text-[10px] font-bold tracking-widest uppercase sm:inline">
                {t('car.update')}
              </span>
            </button>
          )}
          <button onClick={onClose} className="modal-close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Header Section */}
        <div className="mb-6 flex items-center gap-4 font-sans">
          <div
            className="rounded-2xl p-4 transition-all duration-500"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            <Car className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
              {name || t('car.defaultName')}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div
                className="inline-block rounded-full px-3 py-1 transition-all duration-500"
                style={{ backgroundColor: statusBg, color: statusColor }}
              >
                <p className="text-[10px] font-bold tracking-widest uppercase italic">
                  {t('status.statusLabel')}:{' '}
                  {isCharging ? t('car.charging') : isHeating ? t('car.heating') : t('status.idle')}
                </p>
              </div>
              {lastUpdatedId && (
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--glass-bg)] px-3 py-1.5 text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">
                    {formatRelativeTime(entities[lastUpdatedId]?.state, t)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 font-sans lg:grid-cols-5">
          {/* Left Column - Map (Span 3) */}
          <div className="lg:col-span-3">
            <div className="group relative h-[clamp(14rem,32vw,26rem)] w-full overflow-hidden rounded-2xl bg-[var(--glass-bg)]/50 md:h-[clamp(18rem,26vw,32rem)]">
              {lat && long ? (
                <>
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${long - 0.005}%2C${lat - 0.005}%2C${long + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${long}`}
                    style={{ filter: 'invert(0.9) grayscale(0.8) contrast(1.2) brightness(0.8)' }}
                    className="h-full w-full opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                  ></iframe>
                  <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 rounded-xl bg-black/60 px-4 py-2 shadow-lg backdrop-blur-md">
                    <MapPin className="h-3 w-3 text-[var(--accent-color)]" />
                    <span className="text-xs font-bold tracking-widest text-white uppercase">
                      {t('map.lastSeenHere')}
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
                  <MapPin className="mb-4 h-24 w-24 opacity-20" />
                  <span className="text-xs font-bold tracking-widest uppercase opacity-50">
                    {t('common.missing')} Map
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats & Controls (Span 2) */}
          <div className="space-y-4 lg:col-span-2">
            {/* Battery - Primary Stat */}
            {batteryId && (
              <div className="popup-surface flex flex-col items-center gap-1 rounded-2xl p-4 transition-all">
                <div className="mb-1 flex items-center gap-2">
                  {isCharging && <Zap className="h-4 w-4 animate-pulse text-green-400" />}
                  <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                    {t('car.battery')}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-light italic ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}
                  >
                    {batteryId ? formatValue(getS(batteryId)) : '--'}
                  </span>
                  <span className="text-xl font-medium text-gray-500">%</span>
                </div>
                {pluggedId && (
                  <div
                    className={`mt-2 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${entities[pluggedId]?.state === 'on' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-500'}`}
                  >
                    {entities[pluggedId]?.state === 'on' ? t('car.pluggedIn') : t('car.unplugged')}
                  </div>
                )}
              </div>
            )}

            {/* Smaller Grid for Secondary Stats */}
            <div className="grid grid-cols-2 gap-3">
              {rangeId && (
                <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-4">
                  <span className="mb-1 text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                    {t('car.range')}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-light text-[var(--text-primary)]">
                      {formatUnitValue(displayRangeValue, { kind: 'length', fallback: '--' })}
                    </span>
                    <span className="text-xs font-bold text-gray-500">{displayRangeUnit}</span>
                  </div>
                </div>
              )}
              {(tempValue !== null || tempId) && (
                <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-4">
                  <span className="mb-1 text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                    Temp
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-light text-[var(--text-primary)]">
                      {formatUnitValue(displayTempValue, { kind: 'temperature', fallback: '--' })}
                    </span>
                    <span className="text-xs font-bold text-gray-500">{displayTempUnit}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Climate Control */}
            {climateId && (
              <div className="popup-surface space-y-4 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full p-1.5 ${isHeating ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--glass-bg)] text-gray-500'}`}
                    >
                      <Thermometer className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
                        {t('car.climate')}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">
                        {isHeating ? t('common.on') : t('common.off')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      callService('climate', isHeating ? 'turn_off' : 'turn_on', {
                        entity_id: climateId,
                      })
                    }
                    className={`relative h-8 w-14 rounded-full transition-all ${isHeating ? 'bg-orange-500' : 'bg-[var(--glass-border)]'}`}
                  >
                    <div
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${isHeating ? 'left-[calc(100%-28px)]' : 'left-1'}`}
                    />
                  </button>
                </div>

                <div className="space-y-3 border-t border-[var(--glass-border)]/50 pt-2">
                  <div className="flex items-end justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                      {t('car.target')}
                    </span>
                    <span className="text-lg font-light text-[var(--text-primary)]">
                      {formatUnitValue(displayTargetTempValue, {
                        kind: 'temperature',
                        fallback: '--',
                      })}
                      {displayTempUnit}
                    </span>
                  </div>
                  <M3Slider
                    min={16}
                    max={30}
                    step={0.5}
                    value={getA(climateId, 'temperature') || 20}
                    onChange={(e) =>
                      callService('climate', 'set_temperature', {
                        entity_id: climateId,
                        temperature: parseFloat(e.target.value),
                      })
                    }
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
