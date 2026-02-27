import { getIconComponent } from '../../icons';
import { Car, Flame, MapPin, Thermometer, Zap } from '../../icons';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
} from '../../utils';

/* ─── Helpers (pure, no React) ─── */

const getSafeState = (entities, id) => {
  const state = id ? entities[id]?.state : null;
  if (!state || state === 'unavailable' || state === 'unknown') return null;
  return state;
};

const getNumberState = (entities, id) => {
  const state = getSafeState(entities, id);
  if (state === null) return null;
  const value = parseFloat(state);
  return Number.isFinite(value) ? value : null;
};

const formatValue = (num) => {
  if (num === null || num === undefined) return null;
  const strVal = String(num).replace(',', '.');
  const parsed = parseFloat(strVal);
  if (isNaN(parsed)) return num;
  return Math.round(parsed * 10) / 10;
};

/* ─── CarCard ─── */

const CarCard = ({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  customIcons,
  getS,
  getA,
  getEntityImageUrl,
  _callService,
  onOpen,
  _isMobile,
  t,
}) => {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const { batteryId, rangeId, locationId, chargingId, pluggedId, climateId, tempId, imageUrl } =
    settings;

  const batteryValue = getNumberState(entities, batteryId);
  const rangeValue = getNumberState(entities, rangeId);
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const sourceRangeUnitRaw = rangeId ? entities[rangeId]?.attributes?.unit_of_measurement : '';
  const sourceRangeUnit = typeof sourceRangeUnitRaw === 'string' ? sourceRangeUnitRaw.trim() : '';
  const useSourceRangeUnit = unitsMode === 'follow_ha' && !!sourceRangeUnit;
  const rangeUnit = useSourceRangeUnit
    ? sourceRangeUnit
    : getDisplayUnitForKind('length', effectiveUnitMode);
  const displayRangeValue = useSourceRangeUnit
    ? rangeValue
    : convertValueByKind(rangeValue, {
        kind: 'length',
        fromUnit: sourceRangeUnit || 'km',
        unitMode: effectiveUnitMode,
      });
  const climateTempValueRaw = climateId ? getA(climateId, 'current_temperature') : null;
  const climateTempValue =
    climateTempValueRaw !== null && climateTempValueRaw !== undefined
      ? parseFloat(climateTempValueRaw)
      : null;
  const sourceTempUnit = tempId
    ? entities[tempId]?.attributes?.unit_of_measurement ||
      haConfig?.unit_system?.temperature ||
      '°C'
    : climateId
      ? entities[climateId]?.attributes?.temperature_unit ||
        haConfig?.unit_system?.temperature ||
        '°C'
      : haConfig?.unit_system?.temperature || '°C';
  const displayTempUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const tempValue =
    getNumberState(entities, tempId) ??
    (Number.isFinite(climateTempValue) ? climateTempValue : null);
  const displayTempValue = convertValueByKind(tempValue, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const locationLabel = locationId ? getS(locationId) : null;

  const chargingState = getSafeState(entities, chargingId);
  const pluggedState = getSafeState(entities, pluggedId);
  const climateEntity = climateId ? entities[climateId] : null;

  const isCharging = chargingState === 'on' || chargingState === 'charging';
  const isPlugged = pluggedState === 'on' || pluggedState === 'plugged' || pluggedState === 'true';
  const isHtg = climateEntity && !['off', 'unavailable', 'unknown'].includes(climateEntity.state);
  const resolvedImageUrl = imageUrl
    ? getEntityImageUrl
      ? getEntityImageUrl(imageUrl)
      : imageUrl
    : null;

  const name = customNames[cardId] || t('car.defaultName');
  const Icon = customIcons[cardId] ? getIconComponent(customIcons[cardId]) || Car : Car;
  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const isSmall = sizeSetting === 'small';

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={{
          ...cardStyle,
          backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.06)' : 'var(--card-bg)',
          borderColor: editMode
            ? 'rgba(59, 130, 246, 0.2)'
            : isHtg
              ? 'rgba(249, 115, 22, 0.2)'
              : 'var(--card-border)',
        }}
      >
        {controls}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all group-hover:scale-110 ${isHtg ? 'animate-pulse bg-orange-500/20 text-orange-400' : isCharging ? 'bg-green-500/15 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
          >
            <Icon className="h-6 w-6 stroke-[1.5px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="mb-1.5 truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {name}
            </p>
            <div className="flex flex-col gap-0.5 leading-tight">
              <span
                className={`text-sm font-bold ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}
              >
                {batteryValue !== null ? `${formatValue(batteryValue)}%` : '--'}
              </span>
              {displayRangeValue !== null && (
                <span className="text-xs text-[var(--text-secondary)]">
                  {formatUnitValue(displayRangeValue, { fallback: '--' })} {rangeUnit}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={{
        ...cardStyle,
        backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.08)' : 'var(--card-bg)',
        borderColor: editMode
          ? 'rgba(59, 130, 246, 0.2)'
          : isHtg
            ? 'rgba(249, 115, 22, 0.3)'
            : 'var(--card-border)',
      }}
    >
      {controls}
      <div className="flex items-start justify-between font-sans">
        <div
          className={`rounded-2xl p-3 transition-all group-hover:scale-110 ${isHtg ? 'animate-pulse bg-orange-500/20 text-orange-400' : isCharging ? 'bg-green-500/15 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
        >
          <Icon className="h-5 w-5 stroke-[1.5px]" />
        </div>
        <div className="flex max-w-[65%] flex-col items-end gap-2">
          {locationLabel && (
            <div className="flex max-w-full items-start gap-1.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-[var(--text-secondary)]">
              <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span className="text-xs leading-tight font-bold tracking-widest break-words whitespace-normal uppercase">
                {String(locationLabel)}
              </span>
            </div>
          )}
          {tempValue !== null && (
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1.5 text-[var(--text-secondary)]">
              <Thermometer className="h-3 w-3" />
              <span className="text-xs font-bold tracking-widest uppercase">
                {formatUnitValue(displayTempValue, { fallback: '--' })}
                {displayTempUnit}
              </span>
            </div>
          )}
          {isHtg && (
            <div className="flex animate-pulse items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-orange-400">
              <Flame className="h-3 w-3" />
              <span className="text-xs font-bold tracking-widest uppercase">
                {t('car.heating')}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
            {name}
          </p>
          <div className="flex items-baseline gap-2 font-sans leading-none">
            <span
              className={`text-4xl leading-none font-thin ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}
            >
              {batteryValue !== null ? `${formatValue(batteryValue)}%` : '--'}
            </span>
            {isCharging && (
              <Zap
                className="mb-1 -ml-1 h-5 w-5 animate-pulse text-green-400"
                fill="currentColor"
              />
            )}
            {displayRangeValue !== null && (
              <span className="ml-1 text-xl font-light text-[var(--text-secondary)]">
                {formatUnitValue(displayRangeValue, { fallback: '--' })}
                {rangeUnit}
              </span>
            )}
          </div>
          {pluggedId && (
            <p className="mt-2 text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-60">
              {isPlugged ? t('car.pluggedIn') : t('car.unplugged')}
            </p>
          )}
        </div>
        {resolvedImageUrl && (
          <img
            src={resolvedImageUrl}
            alt=""
            className="pointer-events-none h-20 w-auto max-w-[45%] object-contain opacity-80 drop-shadow-lg select-none"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CarCard;
