import { useEffect, useState } from 'react';
import { Car, RefreshCw, Zap, MapPin, Thermometer } from '../icons';
import M3Slider from '../components/ui/M3Slider';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import { formatDateTime, formatRelativeTime } from '../utils';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  getUnavailableLabel,
  inferUnitKind,
  isUnavailableState,
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
 * @param {(e?: any) => void} props.onClose - Function to close modal
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.callService - Function to call HA services
 * @param {Function} props.getS - Function to get entity state
 * @param {Function} props.getA - Function to get entity attribute
 * @param {(key: string) => string} props.t - Translation function
 * @param {Object} props.car - Car settings and resolved entity IDs
 */

export default function LeafModal({ show, onClose, entities, callService, getS, getA, t, car }) {
  const { unitsMode, language } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const modalTitleId = `leaf-modal-title-${(car?.name || 'car').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const [confirmAction, setConfirmAction] = useState(null);
  const [lockCode, setLockCode] = useState('');

  useEffect(() => {
    if (!confirmAction) return undefined;
    const timeout = setTimeout(() => setConfirmAction(null), 3000);
    return () => clearTimeout(timeout);
  }, [confirmAction]);

  if (!show) return null;

  const {
    name,
    batteryId,
    climateId,
    locationId,
    latitudeId,
    longitudeId,
    chargingId,
    chargingStateId,
    chargingPowerId,
    chargeRateId,
    timeToFullId,
    chargeEndTimeId,
    chargeControlId,
    chargeControlIds,
    chargeLimitNumberId,
    chargeLimitSelectId,
    lockId,
    ignitionSwitchId,
    pluggedId,
    rangeId,
    odometerId,
    fuelLevelId,
    tempId,
    lastUpdatedId,
    apiStatusId,
    updateButtonId,
  } = car || {};

  const effectiveChargingId = chargingStateId || chargingId;

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
    entities[effectiveChargingId]?.state === 'on' ||
    entities[effectiveChargingId]?.state === 'charging';
  const isHeating =
    entities[climateId]?.state &&
    !['off', 'unknown', 'unavailable'].includes(entities[climateId]?.state);

  const statusColor = isCharging
    ? 'var(--status-success-fg)'
    : isHeating
      ? 'var(--status-warning-fg)'
      : 'var(--text-secondary)';
  const statusBg = isCharging
    ? 'var(--status-success-bg)'
    : isHeating
      ? 'var(--status-warning-bg)'
      : 'var(--glass-bg)';

  const lat =
    (locationId ? getA(locationId, 'latitude') : null) ??
    (latitudeId ? parseFloat(getS(latitudeId)) : null);
  const long =
    (locationId ? getA(locationId, 'longitude') : null) ??
    (longitudeId ? parseFloat(getS(longitudeId)) : null);

  const chargingPowerValue = chargingPowerId ? getS(chargingPowerId) : null;
  const chargeRateValue = chargeRateId ? getS(chargeRateId) : null;
  const timeToFullValue = timeToFullId ? getS(timeToFullId) : null;
  const chargeEndTimeValue = chargeEndTimeId ? getS(chargeEndTimeId) : null;
  const odometerValue = odometerId ? getS(odometerId) : null;
  const fuelLevelValue = fuelLevelId ? getS(fuelLevelId) : null;
  const apiStatusValue = apiStatusId ? getS(apiStatusId) : null;
  const controlIds = [
    ...new Set(
      [...(Array.isArray(chargeControlIds) ? chargeControlIds : []), chargeControlId].filter(
        Boolean
      )
    ),
  ];
  // A button's state is its last press, so one that was never pressed is "unknown" but usable.
  const isUsable = (entityId) => {
    const state = entityId ? entities[entityId]?.state : undefined;
    if (state === undefined) return false;
    return /^(input_)?button\./.test(entityId)
      ? state !== 'unavailable'
      : !isUnavailableState(state);
  };
  const climateDisabled = !isUsable(climateId);
  const lockState = lockId ? entities[lockId]?.state : null;
  const lockUsable = isUsable(lockId);
  const isLocked = lockState === 'locked' || lockState === 'locking';
  const lockCodeFormat = lockId ? entities[lockId]?.attributes?.code_format : null;
  const lockRequiresCode =
    typeof lockCodeFormat === 'string' && !!lockCodeFormat.trim() && lockCodeFormat !== 'none';
  const lockCodeMissing = lockRequiresCode && !lockCode.trim();
  const lockLabel = !lockUsable
    ? getUnavailableLabel(lockState, t)
    : !isLocked
      ? t('car.lock')
      : confirmAction === 'unlock'
        ? t('lock.action.confirmUnlock')
        : t('car.unlock');
  const ignitionState = ignitionSwitchId ? entities[ignitionSwitchId]?.state : null;
  const ignitionUsable = isUsable(ignitionSwitchId);
  const isIgnitionOn = ignitionState === 'on';
  const pluggedState = pluggedId ? entities[pluggedId]?.state : null;
  const isPlugged = ['on', 'plugged', 'true'].includes(pluggedState);

  const formatReading = (entityId, rawValue) => {
    if (rawValue === null || rawValue === undefined || isUnavailableState(rawValue)) return '--';
    const attributes = entities[entityId]?.attributes || {};
    const text = String(rawValue);
    if (attributes.device_class === 'timestamp' || /^\d{4}-\d{2}-\d{2}[T ]\d/.test(text)) {
      return formatDateTime(text, language);
    }
    if (!Number.isFinite(Number(text.replace(',', '.')))) return text;
    const sourceUnit = attributes.unit_of_measurement;
    const kind = inferUnitKind(attributes.device_class, sourceUnit);
    const value = formatUnitValue(text.replace(',', '.'), {
      kind,
      fromUnit: sourceUnit,
      unitMode: effectiveUnitMode,
    });
    const unit = kind ? getDisplayUnitForKind(kind, effectiveUnitMode) : sourceUnit;
    return unit ? `${value} ${unit}` : value;
  };

  const detailMetricCount = [
    tempValue !== null || Boolean(tempId),
    Boolean(odometerId),
    Boolean(fuelLevelId),
    Boolean(chargingPowerId),
    Boolean(chargeRateId),
    Boolean(timeToFullId),
    Boolean(chargeEndTimeId),
  ].filter(Boolean).length;
  const actionControlCount =
    controlIds.length +
    Number(Boolean(chargeLimitNumberId)) +
    Number(Boolean(chargeLimitSelectId)) +
    Number(Boolean(lockId)) +
    Number(Boolean(ignitionSwitchId));
  const showClimateOnRight =
    Boolean(climateId) && detailMetricCount <= 2 && actionControlCount <= 3;
  const currentClimateTarget = Number(getA(climateId, 'temperature') || 20);

  const handleChargeControl = (entityId) => {
    if (!entityId) return;
    const domain = entityId.split('.')[0];
    const state = entities[entityId]?.state;
    if (domain === 'switch') {
      const isOn = state === 'on';
      callService('switch', isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });
      return;
    }
    if (domain === 'button') {
      callService('button', 'press', { entity_id: entityId });
      return;
    }
    if (domain === 'input_button') {
      callService('input_button', 'press', { entity_id: entityId });
      return;
    }
    if (domain === 'script') {
      callService('script', 'turn_on', { entity_id: entityId });
    }
  };

  const handleLockControl = () => {
    if (!lockUsable || lockCodeMissing) return;
    if (isLocked && confirmAction !== 'unlock') {
      setConfirmAction('unlock');
      return;
    }
    setConfirmAction(null);
    const payload = { entity_id: lockId };
    if (lockRequiresCode) payload.code = lockCode.trim();
    callService('lock', isLocked ? 'unlock' : 'lock', payload);
  };

  const handleIgnitionControl = () => {
    if (!ignitionUsable) return;
    if (!isIgnitionOn && confirmAction !== 'engineStart') {
      setConfirmAction('engineStart');
      return;
    }
    setConfirmAction(null);
    callService('switch', isIgnitionOn ? 'turn_off' : 'turn_on', {
      entity_id: ignitionSwitchId,
    });
  };

  const updateClimateTarget = (nextValue) => {
    if (!climateId || climateDisabled) return;
    const clamped = Math.min(30, Math.max(16, Number(nextValue)));
    callService('climate', 'set_temperature', {
      entity_id: climateId,
      temperature: clamped,
    });
  };

  return (
    <AccessibleModalShell open={show} onClose={onClose} titleId={modalTitleId} size="l">
      {() => (
        <>
          <ModalHeader
            title={name || t('car.defaultName')}
            closeLabel={t('common.close')}
            onClose={onClose}
            icon={<Car />}
            iconStyle={{ backgroundColor: statusBg, color: statusColor }}
            status={
              <StatusChip
                tone={isCharging ? 'on' : isHeating ? 'warn' : 'neutral'}
                label={
                  isCharging ? t('car.charging') : isHeating ? t('car.heating') : t('status.idle')
                }
                detail={
                  lastUpdatedId ? formatRelativeTime(entities[lastUpdatedId]?.state, t) : null
                }
              />
            }
            actions={
              updateButtonId && (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={t('car.update')}
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  disabled={!isUsable(updateButtonId)}
                  onClick={() => callService('button', 'press', { entity_id: updateButtonId })}
                >
                  <span className="hidden sm:inline">{t('car.update')}</span>
                </Button>
              )
            }
          />

          <ModalBody className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-5">
            {/* Left Column - Map (Span 3) */}
            <div className="lg:col-span-3">
              <div className="group relative h-36 w-full overflow-hidden rounded-2xl bg-[var(--glass-bg)]/50 sm:h-[clamp(12rem,24vw,20rem)] md:h-[clamp(14rem,22vw,24rem)]">
                {lat && long ? (
                  <>
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
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
                    <span className="modal-section-label">{t('map.locationUnknown')}</span>
                  </div>
                )}
              </div>

              {/* Climate Control */}
              {climateId && !showClimateOnRight && (
                <div className="popup-surface mt-3 w-full space-y-3 rounded-2xl p-3 lg:max-w-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-full p-1 ${isHeating ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`}
                      >
                        <Thermometer className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold tracking-[0.12em] text-[var(--text-primary)] uppercase">
                          {t('car.climate')}
                        </p>
                        <p className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
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
                      aria-label={t('car.climate')}
                      aria-pressed={Boolean(isHeating)}
                      disabled={climateDisabled}
                      className={`relative h-7 w-12 rounded-full transition-all disabled:opacity-40 ${isHeating ? 'bg-orange-500' : 'bg-[var(--glass-border)]'}`}
                    >
                      <div
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${isHeating ? 'left-[calc(100%-24px)]' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <div className="space-y-2.5 border-t border-[var(--glass-border)]/50 pt-2">
                    <div className="flex items-end justify-between">
                      <span className="modal-section-label">{t('car.target')}</span>
                      <span className="rounded-full bg-[var(--glass-bg)] px-2.5 py-0.5 text-sm font-semibold text-[var(--text-primary)]">
                        {formatUnitValue(displayTargetTempValue, {
                          kind: 'temperature',
                          fallback: '--',
                        })}
                        {displayTempUnit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateClimateTarget(currentClimateTarget - 0.5)}
                        disabled={climateDisabled}
                        className="popup-surface popup-surface-hover h-9 w-9 shrink-0 rounded-full text-base leading-none disabled:opacity-40"
                        aria-label={t('common.decrease')}
                      >
                        -
                      </button>
                      <div className="min-w-0 flex-1">
                        <M3Slider
                          min={16}
                          max={30}
                          step={0.5}
                          value={currentClimateTarget}
                          disabled={climateDisabled}
                          onChange={(e) => updateClimateTarget(parseFloat(e.target.value))}
                          colorClass={isHeating ? 'bg-orange-500' : 'bg-white/20'}
                        />
                      </div>
                      <button
                        onClick={() => updateClimateTarget(currentClimateTarget + 0.5)}
                        disabled={climateDisabled}
                        className="popup-surface popup-surface-hover h-9 w-9 shrink-0 rounded-full text-base leading-none disabled:opacity-40"
                        aria-label={t('common.increase')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Stats & Controls (Span 2) */}
            <div className="space-y-4 lg:col-span-2">
              {climateId && showClimateOnRight && (
                <div className="popup-surface space-y-3 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-full p-1 ${isHeating ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`}
                      >
                        <Thermometer className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold tracking-[0.12em] text-[var(--text-primary)] uppercase">
                          {t('car.climate')}
                        </p>
                        <p className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
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
                      aria-label={t('car.climate')}
                      aria-pressed={Boolean(isHeating)}
                      disabled={climateDisabled}
                      className={`relative h-7 w-12 rounded-full transition-all disabled:opacity-40 ${isHeating ? 'bg-orange-500' : 'bg-[var(--glass-border)]'}`}
                    >
                      <div
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${isHeating ? 'left-[calc(100%-24px)]' : 'left-1'}`}
                      />
                    </button>
                  </div>

                  <div className="space-y-2.5 border-t border-[var(--glass-border)]/50 pt-2">
                    <div className="flex items-end justify-between">
                      <span className="modal-section-label">{t('car.target')}</span>
                      <span className="rounded-full bg-[var(--glass-bg)] px-2.5 py-0.5 text-sm font-semibold text-[var(--text-primary)]">
                        {formatUnitValue(displayTargetTempValue, {
                          kind: 'temperature',
                          fallback: '--',
                        })}
                        {displayTempUnit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateClimateTarget(currentClimateTarget - 0.5)}
                        disabled={climateDisabled}
                        className="popup-surface popup-surface-hover h-9 w-9 shrink-0 rounded-full text-base leading-none disabled:opacity-40"
                        aria-label={t('common.decrease')}
                      >
                        -
                      </button>
                      <div className="min-w-0 flex-1">
                        <M3Slider
                          min={16}
                          max={30}
                          step={0.5}
                          value={currentClimateTarget}
                          disabled={climateDisabled}
                          onChange={(e) => updateClimateTarget(parseFloat(e.target.value))}
                          colorClass={isHeating ? 'bg-orange-500' : 'bg-white/20'}
                        />
                      </div>
                      <button
                        onClick={() => updateClimateTarget(currentClimateTarget + 0.5)}
                        disabled={climateDisabled}
                        className="popup-surface popup-surface-hover h-9 w-9 shrink-0 rounded-full text-base leading-none disabled:opacity-40"
                        aria-label={t('common.increase')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Stats */}
              <div className="grid grid-cols-2 gap-3">
                {batteryId && (
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3.5">
                    <span className="modal-section-label mb-1 flex items-center gap-1">
                      {isCharging && (
                        <Zap className="h-3.5 w-3.5 animate-pulse text-[var(--status-success-fg)]" />
                      )}
                      {t('car.battery')}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-2xl font-light ${isCharging ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'}`}
                      >
                        {batteryId ? formatValue(getS(batteryId)) : '--'}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-muted)]">%</span>
                    </div>
                    {pluggedId && (
                      <span
                        className={`mt-1 text-[11px] font-bold tracking-[0.12em] uppercase ${isPlugged ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-muted)]'}`}
                      >
                        {!isUsable(pluggedId)
                          ? getUnavailableLabel(pluggedState, t)
                          : isPlugged
                            ? t('car.pluggedIn')
                            : t('car.unplugged')}
                      </span>
                    )}
                  </div>
                )}

                {rangeId && (
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3.5">
                    <span className="modal-section-label mb-1">{t('car.range')}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-light text-[var(--text-primary)]">
                        {formatUnitValue(displayRangeValue, { kind: 'length', fallback: '--' })}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-muted)]">
                        {displayRangeUnit}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {(tempValue !== null ||
                tempId ||
                odometerId ||
                fuelLevelId ||
                chargingPowerId ||
                chargeRateId ||
                timeToFullId ||
                chargeEndTimeId) && (
                <div className="popup-surface space-y-2 rounded-2xl p-3">
                  {(tempValue !== null || tempId) && (
                    <div className="flex items-center justify-between px-1 py-1.5">
                      <span className="modal-section-label">{t('car.tempInside')}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatUnitValue(displayTempValue, { kind: 'temperature', fallback: '--' })}
                        {displayTempUnit}
                      </span>
                    </div>
                  )}
                  {odometerId && (
                    <div className="flex items-center justify-between px-1 py-1.5">
                      <span className="modal-section-label">{t('car.odometer')}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatValue(odometerValue)}{' '}
                        {entities[odometerId]?.attributes?.unit_of_measurement || displayRangeUnit}
                      </span>
                    </div>
                  )}
                  {fuelLevelId && (
                    <div className="flex items-center justify-between px-1 py-1.5">
                      <span className="modal-section-label">{t('car.fuel')}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatValue(fuelLevelValue)}%
                      </span>
                    </div>
                  )}
                  {chargingPowerId && (
                    <div className="flex items-center justify-between px-1 py-1.5">
                      <span className="modal-section-label">{t('car.chargingPower')}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatReading(chargingPowerId, chargingPowerValue)}
                      </span>
                    </div>
                  )}
                  {chargeRateId && (
                    <div className="flex items-center justify-between px-1 py-1.5">
                      <span className="modal-section-label">{t('car.chargeRate')}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatReading(chargeRateId, chargeRateValue)}
                      </span>
                    </div>
                  )}
                  {timeToFullId && (
                    <div className="flex items-center justify-between px-1 py-1.5">
                      <span className="modal-section-label">{t('car.timeToFull')}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatReading(timeToFullId, timeToFullValue)}
                      </span>
                    </div>
                  )}
                  {chargeEndTimeId && (
                    <div className="flex items-center justify-between px-1 py-1.5">
                      <span className="modal-section-label">{t('car.chargeEndTime')}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatReading(chargeEndTimeId, chargeEndTimeValue)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {(controlIds.length > 0 || chargeLimitNumberId || chargeLimitSelectId) && (
                <div className="popup-surface space-y-3 rounded-2xl p-4">
                  <div className="modal-section-label">{t('car.chargeControl')}</div>
                  {controlIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {controlIds.map((entityId) => (
                        <Button
                          key={entityId}
                          size="sm"
                          variant="secondary"
                          disabled={!isUsable(entityId)}
                          onClick={() => handleChargeControl(entityId)}
                        >
                          {entities[entityId]?.attributes?.friendly_name || entityId}
                        </Button>
                      ))}
                    </div>
                  )}
                  {chargeLimitNumberId && (
                    <div className="space-y-2">
                      <div className="modal-section-label">
                        {entities[chargeLimitNumberId]?.attributes?.friendly_name ||
                          t('car.chargeLimit')}
                      </div>
                      <M3Slider
                        min={entities[chargeLimitNumberId]?.attributes?.min ?? 50}
                        max={entities[chargeLimitNumberId]?.attributes?.max ?? 100}
                        step={entities[chargeLimitNumberId]?.attributes?.step ?? 1}
                        value={parseFloat(getS(chargeLimitNumberId)) || 0}
                        disabled={!isUsable(chargeLimitNumberId)}
                        onChange={(e) =>
                          callService('number', 'set_value', {
                            entity_id: chargeLimitNumberId,
                            value: parseFloat(e.target.value),
                          })
                        }
                        colorClass="bg-[var(--accent-color)]"
                      />
                    </div>
                  )}
                  {chargeLimitSelectId && (
                    <select
                      value={getS(chargeLimitSelectId) || ''}
                      disabled={!isUsable(chargeLimitSelectId)}
                      onChange={(e) =>
                        callService('select', 'select_option', {
                          entity_id: chargeLimitSelectId,
                          option: e.target.value,
                        })
                      }
                      className="popup-surface w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-40"
                    >
                      {(entities[chargeLimitSelectId]?.attributes?.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {(lockId || ignitionSwitchId) && (
                <div className="popup-surface space-y-3 rounded-2xl p-4">
                  <div className="modal-section-label">{t('car.controls')}</div>
                  {lockRequiresCode && lockUsable && (
                    <label className="flex flex-col gap-2">
                      <span className="modal-section-label">{t('lock.code.prompt')}</span>
                      <input
                        type="password"
                        autoComplete="off"
                        value={lockCode}
                        onChange={(event) => setLockCode(event.target.value)}
                        className="h-11 rounded-[var(--modal-control-radius)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 text-center text-lg tracking-[0.3em] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                      />
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {lockId && (
                      <Button
                        size="sm"
                        variant={confirmAction === 'unlock' ? 'destructive' : 'secondary'}
                        disabled={!lockUsable || lockCodeMissing}
                        onClick={handleLockControl}
                      >
                        {lockLabel}
                      </Button>
                    )}
                    {ignitionSwitchId && (
                      <Button
                        size="sm"
                        variant={confirmAction === 'engineStart' ? 'destructive' : 'secondary'}
                        disabled={!ignitionUsable}
                        onClick={handleIgnitionControl}
                      >
                        {isIgnitionOn
                          ? t('car.engineStop')
                          : confirmAction === 'engineStart'
                            ? t('car.confirmEngineStart')
                            : t('car.engineStart')}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {apiStatusId && apiStatusValue && (
                <div className="modal-section-label px-1">
                  {t('car.apiStatus')}: {apiStatusValue}
                </div>
              )}
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
