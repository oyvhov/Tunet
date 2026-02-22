import WeatherGraph from '../charts/WeatherGraph';
import WeatherEffects from '../effects/WeatherEffects';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode } from '../../utils';

const getWeatherInfo = (condition, t) => {
  const map = {
    'clear-night': { label: t?.('weather.condition.clearNight') || 'Clear', icon: 'clear-night' },
    'cloudy': { label: t?.('weather.condition.cloudy') || 'Cloudy', icon: 'overcast' },
    'fog': { label: t?.('weather.condition.fog') || 'Fog', icon: 'fog' },
    'hail': { label: t?.('weather.condition.hail') || 'Hail', icon: 'hail' },
    'lightning': { label: t?.('weather.condition.lightning') || 'Lightning', icon: 'thunderstorms' },
    'lightning-rainy': { label: t?.('weather.condition.lightning') || 'Lightning', icon: 'thunderstorms-rain' },
    'partlycloudy': { label: t?.('weather.condition.partlyCloudy') || 'Partly cloudy', icon: 'partly-cloudy-day' },
    'pouring': { label: t?.('weather.condition.pouring') || 'Heavy rain', icon: 'extreme-rain' },
    'rainy': { label: t?.('weather.condition.rainy') || 'Rain', icon: 'rain' },
    'snowy': { label: t?.('weather.condition.snowy') || 'Snow', icon: 'snow' },
    'snowy-rainy': { label: t?.('weather.condition.snowy') || 'Snow', icon: 'sleet' },
    'sunny': { label: t?.('weather.condition.sunny') || 'Sunny', icon: 'clear-day' },
    'windy': { label: t?.('weather.condition.windy') || 'Wind', icon: 'wind' },
    'windy-variant': { label: t?.('weather.condition.windy') || 'Wind', icon: 'wind' },
    'exceptional': { label: t?.('weather.condition.exceptional') || 'Extreme', icon: 'extreme' }
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
  t
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
  const sourceTempUnit = tempEntity?.attributes?.unit_of_measurement
    || weatherEntity?.attributes?.temperature_unit
    || haConfig?.unit_system?.temperature
    || '°C';
  const displayTempUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const displayTempValue = convertValueByKind(currentTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const graphHistoryHours = Number.isFinite(settings.graphHistoryHours) ? settings.graphHistoryHours : 12;
  const graphColorLimits = [
    Number.isFinite(settings.graphLimit1) ? settings.graphLimit1 : 0,
    Number.isFinite(settings.graphLimit2) ? settings.graphLimit2 : 10,
    Number.isFinite(settings.graphLimit3) ? settings.graphLimit3 : 20,
    Number.isFinite(settings.graphLimit4) ? settings.graphLimit4 : 28,
  ]
    .map((limit) => convertValueByKind(limit, {
      kind: 'temperature',
      fromUnit: '°C',
      unitMode: effectiveUnitMode,
    }))
    .filter((limit) => Number.isFinite(limit))
    .sort((a, b) => a - b);

  // Try to use history first (sensor), fallback to forecast (weather entity)
  let history = [];
  if (tempId) {
    history = tempId === outsideTempId ? tempHistory : (tempHistoryById[tempId] || []);
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
    history = forecast.map(entry => ({
      last_updated: entry.datetime || entry.time,
      state: entry.temperature
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
      <div key={cardId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }} className={`glass-texture touch-feedback p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`} style={cardStyle}>
        {getControls(cardId)}
        {showEffects && <WeatherEffects condition={state} />}
        <div className="absolute inset-0 opacity-30 z-0">
          <WeatherGraph history={historyForDisplay} currentTemp={displayTempValue} historyHours={graphHistoryHours} colorLimits={graphColorLimits} />
        </div>
        <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
          <div className="w-12 h-12 flex items-center justify-center -ml-1 filter drop-shadow-md transition-transform duration-500 group-hover:scale-110">
            <img src={iconUrl} alt={info.label} className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{info.label}</p>
            <span className="text-2xl font-light text-[var(--text-primary)] leading-none">{formatUnitValue(displayTempValue, { fallback: '--' })}{displayTempUnit}</span>
            {subtitle && <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={cardId} {...dragProps} data-haptic={editMode ? undefined : 'card'} onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }} className={`glass-texture touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
      {getControls(cardId)}
      {showEffects && <WeatherEffects condition={state} />}
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex justify-between items-start">
          <div className="w-20 h-20 -ml-2 -mt-2 filter drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
            <img src={iconUrl} alt={info.label} className="w-full h-full object-contain" />
            {subtitle && <p className="text-[var(--text-secondary)] text-xs text-center tracking-widest uppercase font-bold truncate mt-0.5 opacity-60">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
              <span className="text-xs tracking-widest uppercase font-bold">{info.label}</span>
            </div>
            <span className="text-4xl font-thin text-[var(--text-primary)] leading-none">{formatUnitValue(displayTempValue, { fallback: '--' })}{displayTempUnit}</span>
          </div>
        </div>
      </div>
      <div className="h-32 mt-auto relative z-0 -mb-7 -mx-7 opacity-80 overflow-hidden rounded-b-3xl">
        <WeatherGraph history={historyForDisplay} currentTemp={displayTempValue} historyHours={graphHistoryHours} colorLimits={graphColorLimits} />
      </div>
    </div>
  );
}
