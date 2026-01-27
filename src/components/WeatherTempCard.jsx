import WeatherGraph from './WeatherGraph';
import { getWeatherInfo } from '../weather';

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
  outsideTempId,
  weatherEntityId,
  editMode,
  t
}) {
  const settings = cardSettings[settingsKey] || {};
  const weatherId = settings.weatherId;
  const tempId = settings.tempId;
  const weatherEntity = weatherId ? entities[weatherId] : null;
  const tempEntity = tempId ? entities[tempId] : null;
  if (!weatherEntity) return null;

  const state = weatherEntity?.state;
  const info = getWeatherInfo(state, t);
  const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/production/fill/all/${info.icon}.svg`;
  const tempValueRaw = tempEntity?.state ?? weatherEntity?.attributes?.temperature;
  const tempValue = parseFloat(tempValueRaw);
  const currentTemp = Number.isFinite(tempValue) ? tempValue : NaN;
  const history = tempId
    ? (tempId === outsideTempId ? tempHistory : (tempHistoryById[tempId] || []))
    : (weatherId === weatherEntityId ? tempHistory : []);

  return (
    <div key={cardId} {...dragProps} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
      {getControls(cardId)}
      <div className="flex justify-between items-start relative z-10">
        <div className="w-24 h-24 -ml-4 -mt-4 filter drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
          <img src={iconUrl} alt={info.label} className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
            <span className="text-xs tracking-widest uppercase font-bold">{info.label}</span>
          </div>
          <span className="text-4xl font-medium text-[var(--text-primary)] leading-none mt-2">{Number.isFinite(currentTemp) ? currentTemp : '--'}°</span>
        </div>
      </div>
      <div className="h-32 mt-auto relative z-0 -mb-7 -mx-7 opacity-80 overflow-hidden rounded-b-3xl">
        <WeatherGraph history={history} currentTemp={currentTemp} />
      </div>
    </div>
  );
}
