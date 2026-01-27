import WeatherGraph from './WeatherGraph';
import { ICON_MAP } from '../iconMap';
import { getWeatherInfo } from '../weather';

export default function WeatherCard({
  dragProps,
  getControls,
  cardStyle,
  editMode,
  entities,
  weatherEntityId,
  outsideTempId,
  tempHistory,
  weatherForecast,
  customNames,
  customIcons,
  t
}) {
  const weatherEntity = entities[weatherEntityId];
  const tempEntity = entities[outsideTempId];
  const currentTemp = parseFloat(tempEntity?.state);
  const state = weatherEntity?.state;
  const name = customNames['weather'] || t('weather.name');
  const forecastData = weatherForecast.length > 0 ? weatherForecast : weatherEntity?.attributes?.forecast;

  const info = getWeatherInfo(state, t);
  const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/production/fill/all/${info.icon}.svg`;
  const CustomIcon = customIcons['weather'] ? ICON_MAP[customIcons['weather']] : null;

  return (
    <div key="weather" {...dragProps} className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`} style={cardStyle}>
      {getControls('weather')}
      <div className="flex justify-between items-start relative z-10">
        <div className="w-24 h-24 -ml-4 -mt-4 filter drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
          {CustomIcon ? (
            <div className="p-3 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)]"><CustomIcon className="w-8 h-8" /></div>
          ) : (
            <img src={iconUrl} alt={info.label} className="w-full h-full object-contain" />
          )}
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]">
            <span className="text-xs tracking-widest uppercase font-bold">{info.label}</span>
          </div>
          <span className="text-4xl font-medium text-[var(--text-primary)] leading-none mt-2">{!isNaN(currentTemp) ? currentTemp : '--'}°</span>
        </div>
      </div>
      <div className="h-32 mt-auto relative z-0 -mb-7 -mx-7 opacity-80 overflow-hidden rounded-b-3xl">
        <WeatherGraph history={tempHistory} currentTemp={currentTemp} />
      </div>
    </div>
  );
}
