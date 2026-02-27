import WeatherGraph from '../charts/WeatherGraph';
import WeatherEffects from '../effects/WeatherEffects';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
} from '../../utils';

const getWeatherInfo = (condition, t) => {
  const map = {
    'clear-night': { label: t?.('weather.condition.clearNight') || 'Clear', icon: 'clear-night' },
    cloudy: { label: t?.('weather.condition.cloudy') || 'Cloudy', icon: 'overcast' },
    fog: { label: t?.('weather.condition.fog') || 'Fog', icon: 'fog' },
    hail: { label: t?.('weather.condition.hail') || 'Hail', icon: 'hail' },
    lightning: { label: t?.('weather.condition.lightning') || 'Lightning', icon: 'thunderstorms' },
    'lightning-rainy': {
      label: t?.('weather.condition.lightning') || 'Lightning',
      icon: 'thunderstorms-rain',
    },
    partlycloudy: {
      label: t?.('weather.condition.partlyCloudy') || 'Partly cloudy',
      icon: 'partly-cloudy-day',
    },
    pouring: { label: t?.('weather.condition.pouring') || 'Heavy rain', icon: 'extreme-rain' },
    rainy: { label: t?.('weather.condition.rainy') || 'Rain', icon: 'rain' },
    snowy: { label: t?.('weather.condition.snowy') || 'Snow', icon: 'snow' },
    'snowy-rainy': { label: t?.('weather.condition.snowy') || 'Snow', icon: 'sleet' },
    sunny: { label: t?.('weather.condition.sunny') || 'Sunny', icon: 'clear-day' },
    windy: { label: t?.('weather.condition.windy') || 'Wind', icon: 'wind' },
    'windy-variant': { label: t?.('weather.condition.windy') || 'Wind', icon: 'wind' },
    exceptional: { label: t?.('weather.condition.exceptional') || 'Extreme', icon: 'extreme' },
  };
  return map[condition] || { label: condition || 'Unknown', icon: 'not-available' };
};

export default function WeatherTempCard({
  cardId,
  dragProps,
  getControls,
  cardStyle,
  settingsKey,
  cardSettings,
  entities,
  tempHistory,
  tempHistoryById,
  forecastsById,
  outsideTempId,
  weatherEntityId,
  editMode,
  onOpen,
  t,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  const settings = cardSettings[settingsKey] || {};
  const isSmall = settings.size === 'small';
  const weatherId = settings.weatherId;
  const tempId = settings.tempId;
  const weatherEntity = weatherId ? entities[weatherId] : null;
  const tempEntity = tempId ? entities[tempId] : null;

  const showEffects = settings.showEffects !== false;
  const subtitle = settings.subtitle || null;

  if (!weatherEntity) return null;

  const state = weatherEntity?.state;
  const info = getWeatherInfo(state, t);
  const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/production/fill/all/${info.icon}.svg`;

  const tempValueRaw = tempEntity?.state ?? weatherEntity?.attributes?.temperature;
  const tempValue = parseFloat(tempValueRaw);
  const currentTemp = Number.isFinite(tempValue) ? tempValue : NaN;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const sourceTempUnit =
    tempEntity?.attributes?.unit_of_measurement ||
    weatherEntity?.attributes?.temperature_unit ||
    haConfig?.unit_system?.temperature ||
    '°C';
  const displayTempUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const displayTempValue = convertValueByKind(currentTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const graphHistoryHours = Number.isFinite(settings.graphHistoryHours)
    ? settings.graphHistoryHours
    : 12;
  const graphColorLimits = [
    Number.isFinite(settings.graphLimit1) ? settings.graphLimit1 : 0,
    Number.isFinite(settings.graphLimit2) ? settings.graphLimit2 : 10,
    Number.isFinite(settings.graphLimit3) ? settings.graphLimit3 : 20,
    Number.isFinite(settings.graphLimit4) ? settings.graphLimit4 : 28,
  ]
    .map((limit) =>
      convertValueByKind(limit, {
        kind: 'temperature',
        fromUnit: '°C',
        unitMode: effectiveUnitMode,
      })
    )
    .filter((limit) => Number.isFinite(limit))
    .sort((a, b) => a - b);

  // Try to use history first (sensor), fallback to forecast (weather entity)
  let history = [];
  if (tempId) {
    history = tempId === outsideTempId ? tempHistory : tempHistoryById[tempId] || [];
  } else if (weatherId === weatherEntityId) {
    history = tempHistory;
  }

  // Fallback: Use forecast data if history not available/empty
  // Use explicit forecast from weather.get_forecasts service (forecastsById) if available,
  // otherwise fallback to deprecated attributes.forecast
  const forecast = forecastsById?.[weatherId] || weatherEntity?.attributes?.forecast;

  if ((!history || history.length < 2) && forecast) {
    // Convert HA forecast format to match history format expected by WeatherGraph
    // Forecast: [{ datetime: '...', temperature: 20 }, ...]
    // History target: { last_updated: '...', state: 20 }
    history = forecast.map((entry) => ({
      last_updated: entry.datetime || entry.time,
      state: entry.temperature,
    }));
  }

  const historyForDisplay = Array.isArray(history)
    ? history.map((entry) => {
        const raw = parseFloat(entry?.state);
        if (!Number.isFinite(raw)) return entry;
        const converted = convertValueByKind(raw, {
          kind: 'temperature',
          fromUnit: sourceTempUnit,
          unitMode: effectiveUnitMode,
        });
        return Number.isFinite(converted) ? { ...entry, state: converted } : entry;
      })
    : [];

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {getControls(cardId)}
        {showEffects && <WeatherEffects condition={state} />}
        <div className="absolute inset-0 z-0 opacity-30">
          <WeatherGraph
            history={historyForDisplay}
            currentTemp={displayTempValue}
            historyHours={graphHistoryHours}
            colorLimits={graphColorLimits}
          />
        </div>
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-4">
          <div className="-ml-1 flex h-12 w-12 items-center justify-center drop-shadow-md filter transition-transform duration-500 group-hover:scale-110">
            <img src={iconUrl} alt={info.label} className="h-full w-full object-contain" />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
              {info.label}
            </p>
            <span className="text-2xl leading-none font-light text-[var(--text-primary)]">
              {formatUnitValue(displayTempValue, { fallback: '--' })}
              {displayTempUnit}
            </span>
            {subtitle && (
              <p className="mt-1 truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                {subtitle}
              </p>
            )}
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
        if (!editMode && onOpen) onOpen();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={cardStyle}
    >
      {getControls(cardId)}
      {showEffects && <WeatherEffects condition={state} />}
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="-mt-2 -ml-2 h-20 w-20 drop-shadow-lg filter transition-transform duration-500 group-hover:scale-110">
            <img src={iconUrl} alt={info.label} className="h-full w-full object-contain" />
            {subtitle && (
              <p className="mt-0.5 truncate text-center text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[var(--text-secondary)]">
              <span className="text-xs font-bold tracking-widest uppercase">{info.label}</span>
            </div>
            <span className="text-4xl leading-none font-thin text-[var(--text-primary)]">
              {formatUnitValue(displayTempValue, { fallback: '--' })}
              {displayTempUnit}
            </span>
          </div>
        </div>
      </div>
      <div className="relative z-0 -mx-7 mt-auto -mb-7 h-32 overflow-hidden rounded-b-3xl opacity-80">
        <WeatherGraph
          history={historyForDisplay}
          currentTemp={displayTempValue}
          historyHours={graphHistoryHours}
          colorLimits={graphColorLimits}
        />
      </div>
    </div>
  );
}
