import { getIconComponent } from '../../icons';
import {
  Car,
  Flame,
  MapPin,
  Thermometer,
  Zap
} from '../../icons';

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
  t
}) => {
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const {
    batteryId,
    rangeId,
    locationId,
    chargingId,
    pluggedId,
    climateId,
    tempId,
    imageUrl
  } = settings;

  const batteryValue = getNumberState(entities, batteryId);
  const rangeValue = getNumberState(entities, rangeId);
  const rangeUnit = rangeId ? (entities[rangeId]?.attributes?.unit_of_measurement || 'km') : 'km';
  const climateTempValueRaw = climateId ? getA(climateId, 'current_temperature') : null;
  const climateTempValue = climateTempValueRaw !== null && climateTempValueRaw !== undefined
    ? parseFloat(climateTempValueRaw)
    : null;
  const tempValue = getNumberState(entities, tempId) ?? (Number.isFinite(climateTempValue) ? climateTempValue : null);
  const locationLabel = locationId ? getS(locationId) : null;

  const chargingState = getSafeState(entities, chargingId);
  const pluggedState = getSafeState(entities, pluggedId);
  const climateEntity = climateId ? entities[climateId] : null;

  const isCharging = chargingState === 'on' || chargingState === 'charging';
  const isPlugged = pluggedState === 'on' || pluggedState === 'plugged' || pluggedState === 'true';
  const isHtg = climateEntity && !['off', 'unavailable', 'unknown'].includes(climateEntity.state);
  const resolvedImageUrl = imageUrl ? (getEntityImageUrl ? getEntityImageUrl(imageUrl) : imageUrl) : null;

  const name = customNames[cardId] || t('car.defaultName');
  const Icon = customIcons[cardId] ? (getIconComponent(customIcons[cardId]) || Car) : Car;
  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const isSmall = sizeSetting === 'small';

  if (isSmall) {
    return (
      <div key={cardId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.06)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.2)' : (isHtg ? 'rgba(249, 115, 22, 0.2)' : 'var(--card-border)')}}>
        {controls}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all ${isHtg ? 'bg-orange-500/20 text-orange-400 animate-pulse' : (isCharging ? 'bg-green-500/15 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]')}`}>
            <Icon className="w-6 h-6 stroke-[1.5px]" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none mb-1.5">{name}</p>
            <div className="flex flex-col leading-tight gap-0.5">
              <span className={`text-sm font-bold ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                {batteryValue !== null ? `${Math.round(batteryValue)}%` : '--'}
              </span>
              {rangeValue !== null && (
                <span className="text-xs text-[var(--text-secondary)]">{Math.round(rangeValue)} {rangeUnit}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={cardId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen(); }} className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={{...cardStyle, backgroundColor: isHtg ? 'rgba(249, 115, 22, 0.08)' : 'var(--card-bg)', borderColor: editMode ? 'rgba(59, 130, 246, 0.2)' : (isHtg ? 'rgba(249, 115, 22, 0.3)' : 'var(--card-border)')}}>
      {controls}
      <div className="flex justify-between items-start font-sans">
        <div className={`p-3 rounded-2xl transition-all ${isHtg ? 'bg-orange-500/20 text-orange-400 animate-pulse' : (isCharging ? 'bg-green-500/15 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]')}`}><Icon className="w-5 h-5 stroke-[1.5px]" /></div>
        <div className="flex flex-col items-end gap-2">
          {locationLabel && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><MapPin className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{String(locationLabel)}</span></div>
          )}
          {tempValue !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"><Thermometer className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{Math.round(tempValue)}°</span></div>
          )}
          {isHtg && <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-orange-500/10 border-orange-500/20 text-orange-400 animate-pulse"><Flame className="w-3 h-3" /><span className="text-xs tracking-widest font-bold uppercase">{t('car.heating')}</span></div>}
        </div>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase mb-1 font-bold opacity-60">{name}</p>
          <div className="flex items-baseline gap-2 leading-none font-sans">
            <span className={`text-2xl font-medium leading-none ${isCharging ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
              {batteryValue !== null ? `${Math.round(batteryValue)}%` : '--'}
            </span>
            {isCharging && <Zap className="w-5 h-5 text-green-400 animate-pulse -ml-1 mb-1" fill="currentColor" />}
            {rangeValue !== null && (
              <span className="text-[var(--text-muted)] font-medium text-base ml-1">{Math.round(rangeValue)}{rangeUnit}</span>
            )}
          </div>
          {pluggedId && (
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-2 font-bold opacity-60">
              {isPlugged ? t('car.pluggedIn') : t('car.unplugged')}
            </p>
          )}
        </div>
        {resolvedImageUrl && (
          <img
            src={resolvedImageUrl}
            alt=""
            className="h-20 w-auto max-w-[45%] object-contain opacity-80 pointer-events-none select-none drop-shadow-lg"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
    </div>
  );
};

export default CarCard;
