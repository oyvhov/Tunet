import { useEffect, useMemo, useState } from 'react';
import { 
  X, Cloud, CloudRain, Sun, Moon, CloudSun, Wind, Snowflake, Zap, AlertTriangle 
} from '../icons';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import { getForecast, getHistory, getStatistics } from '../services/haClient';
import { getIconComponent } from '../icons';
import { getLocaleForLanguage } from '../i18n';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode } from '../utils';

const getWeatherInfo = (condition, t) => {
  const map = {
    'clear-night': { label: t?.('weather.condition.clearNight') || 'Clear', Icon: Moon, color: 'text-[var(--accent-color)]' },
    'cloudy': { label: t?.('weather.condition.cloudy') || 'Cloudy', Icon: Cloud, color: 'text-gray-400' },
    'fog': { label: t?.('weather.condition.fog') || 'Fog', Icon: Cloud, color: 'text-gray-400' },
    'hail': { label: t?.('weather.condition.hail') || 'Hail', Icon: CloudRain, color: 'text-[var(--accent-color)]' },
    'lightning': { label: t?.('weather.condition.lightning') || 'Lightning', Icon: Zap, color: 'text-yellow-400' },
    'lightning-rainy': { label: t?.('weather.condition.lightning') || 'Lightning', Icon: Zap, color: 'text-yellow-400' },
    'partlycloudy': { label: t?.('weather.condition.partlyCloudy') || 'Partly cloudy', Icon: CloudSun, color: 'text-yellow-200' },
    'pouring': { label: t?.('weather.condition.pouring') || 'Heavy rain', Icon: CloudRain, color: 'text-[var(--accent-color)]' },
    'rainy': { label: t?.('weather.condition.rainy') || 'Rain', Icon: CloudRain, color: 'text-[var(--accent-color)]' },
    'snowy': { label: t?.('weather.condition.snowy') || 'Snow', Icon: Snowflake, color: 'text-white' },
    'snowy-rainy': { label: t?.('weather.condition.snowy') || 'Snow', Icon: Snowflake, color: 'text-white' },
    'sunny': { label: t?.('weather.condition.sunny') || 'Sunny', Icon: Sun, color: 'text-yellow-400' },
    'windy': { label: t?.('weather.condition.windy') || 'Wind', Icon: Wind, color: 'text-gray-300' },
    'windy-variant': { label: t?.('weather.condition.windy') || 'Wind', Icon: Wind, color: 'text-gray-300' },
    'exceptional': { label: t?.('weather.condition.exceptional') || 'Extreme', Icon: AlertTriangle, color: 'text-red-400' }
  };
  return map[condition] || { label: condition || 'Unknown', Icon: Cloud, color: 'text-gray-400' };
};

const formatValue = (value, unit, fallback = '--') => {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return `${value}${unit || ''}`;
};

export default function WeatherModal({
  show,
  onClose,
  conn,
  weatherEntity,
  tempEntity,
  language,
  t
}) {
  if (!show || !weatherEntity) return null;

  const translate = t || ((key) => key);
  const locale = getLocaleForLanguage(language);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const condition = weatherEntity.state;
  const info = getWeatherInfo(condition, t);
  const MainIcon = info.Icon;

  const currentTempRaw = tempEntity?.state ?? weatherEntity.attributes?.temperature;
  const currentTemp = Number.isFinite(parseFloat(currentTempRaw)) ? parseFloat(currentTempRaw) : null;

  const attrs = weatherEntity.attributes || {};
  const sourceTemperatureUnit = attrs.temperature_unit || haConfig?.unit_system?.temperature || '°C';
  const sourceWindUnit = attrs.wind_speed_unit || 'km/h';
  const sourcePressureUnit = attrs.pressure_unit || 'hPa';
  const sourcePrecipitationUnit = attrs.precipitation_unit || 'mm';

  const temperatureUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const windUnit = getDisplayUnitForKind('wind', effectiveUnitMode);
  const pressureUnit = getDisplayUnitForKind('pressure', effectiveUnitMode);
  const precipitationUnit = getDisplayUnitForKind('precipitation', effectiveUnitMode);

  const currentTempDisplay = convertValueByKind(currentTemp, {
    kind: 'temperature',
    fromUnit: sourceTemperatureUnit,
    unitMode: effectiveUnitMode,
  });

  const windDisplayValue = convertValueByKind(attrs.wind_speed, {
    kind: 'wind',
    fromUnit: sourceWindUnit,
    unitMode: effectiveUnitMode,
  });
  const gustDisplayValue = convertValueByKind(attrs.wind_gust_speed, {
    kind: 'wind',
    fromUnit: sourceWindUnit,
    unitMode: effectiveUnitMode,
  });
  const windVal = formatUnitValue(windDisplayValue, { fallback: '--' });
  const gustVal = formatUnitValue(gustDisplayValue, { fallback: '--' });
  const windDisplay = (gustVal !== '--' && gustVal !== windVal)
    ? `${windVal} (${gustVal}) ${windUnit}`
    : `${windVal} ${windUnit}`;

  const details = [
    { key: 'humidity', label: translate('weather.detail.humidity'), value: formatValue(attrs.humidity, '%'), iconName: 'mdi:water-percent' },
    {
      key: 'pressure',
      label: translate('weather.detail.pressure'),
      value: `${formatUnitValue(convertValueByKind(attrs.pressure, { kind: 'pressure', fromUnit: sourcePressureUnit, unitMode: effectiveUnitMode }), { fallback: '--' })} ${pressureUnit}`,
      iconName: 'mdi:gauge'
    },
    { key: 'wind', label: `${translate('weather.detail.wind')} / ${translate('weather.detail.gust')}`, value: windDisplay, iconName: 'mdi:weather-windy' },
    {
      key: 'dew',
      label: translate('weather.detail.dewPoint'),
      value: `${formatUnitValue(convertValueByKind(attrs.dew_point, { kind: 'temperature', fromUnit: sourceTemperatureUnit, unitMode: effectiveUnitMode }), { fallback: '--' })} ${temperatureUnit}`,
      iconName: 'mdi:thermometer'
    },
    {
      key: 'precip',
      label: translate('weather.detail.precip'),
      value: `${formatUnitValue(convertValueByKind(attrs.precipitation, { kind: 'precipitation', fromUnit: sourcePrecipitationUnit, unitMode: effectiveUnitMode }), { fallback: '--' })} ${precipitationUnit}`,
      iconName: 'mdi:weather-rainy'
    }
  ];

  const [forecastType, setForecastType] = useState('hourly');
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyPeriodHours, setHistoryPeriodHours] = useState(12);
  const [historySeries, setHistorySeries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const hasTempSensor = !!tempEntity?.entity_id;

  useEffect(() => {
    if (!conn || !tempEntity?.entity_id) {
      setHistorySeries([]);
      return;
    }

    let cancelled = false;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const end = new Date();
        const start = new Date();
        start.setHours(start.getHours() - historyPeriodHours);

        const statsPeriod = historyPeriodHours <= 12 ? '5minute' : (historyPeriodHours <= 24 ? '15minute' : 'hour');
        const stats = await getStatistics(conn, {
          start,
          end,
          statisticId: tempEntity.entity_id,
          period: statsPeriod
        });

        if (!cancelled && Array.isArray(stats) && stats.length > 0) {
          const mappedStats = stats
            .map((point) => {
              const value = Number.isFinite(point.mean) ? point.mean : parseFloat(point.state);
              const time = new Date(point.start || point.end);
              if (!Number.isFinite(value) || Number.isNaN(time.getTime())) return null;
              return { value, time };
            })
            .filter(Boolean);

          if (mappedStats.length > 0) {
            setHistorySeries(mappedStats);
            return;
          }
        }

        const rawHistory = await getHistory(conn, {
          start,
          end,
          entityId: tempEntity.entity_id,
          minimal_response: false,
          no_attributes: true
        });

        if (!cancelled) {
          const mappedHistory = (Array.isArray(rawHistory) ? rawHistory : [])
            .map((entry) => {
              const value = parseFloat(entry.state);
              const time = new Date(entry.last_updated || entry.last_changed);
              if (!Number.isFinite(value) || Number.isNaN(time.getTime())) return null;
              return { value, time };
            })
            .filter(Boolean)
            .sort((a, b) => a.time - b.time);
          setHistorySeries(mappedHistory);
        }
      } catch {
        if (!cancelled) setHistorySeries([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [conn, tempEntity?.entity_id, historyPeriodHours]);

  useEffect(() => {
    if (!conn || !weatherEntity?.entity_id) return;

    let cancelled = false;
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const data = await getForecast(conn, { entityId: weatherEntity.entity_id, type: forecastType });
        if (!cancelled) {
          const next = Array.isArray(data) && data.length > 0
            ? data
            : (Array.isArray(weatherEntity.attributes?.forecast) ? weatherEntity.attributes.forecast : []);
          setForecast(next);
        }
      } catch {
        if (!cancelled) {
          const fallback = Array.isArray(weatherEntity.attributes?.forecast) ? weatherEntity.attributes.forecast : [];
          setForecast(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchForecast();
    return () => {
      cancelled = true;
    };
  }, [conn, weatherEntity?.entity_id, forecastType, weatherEntity?.attributes?.forecast]);

  const forecastSeries = useMemo(() => {
    if (!forecast.length) return [];
    return forecast
      .map((f) => ({
        value: Number.isFinite(parseFloat(f.temperature)) ? parseFloat(f.temperature) : null,
        time: new Date(f.datetime || f.datetime_local || f.time || f.start || f.forecast_time)
      }))
      .filter((p) => p.value !== null && p.time instanceof Date && !Number.isNaN(p.time.getTime()));
  }, [forecast]);

  const historyColor = useMemo(() => {
    if (!historySeries.length) return '#60a5fa';
    const last = historySeries[historySeries.length - 1]?.value;
    if (!Number.isFinite(last)) return '#60a5fa';
    if (last <= 0) return '#3b82f6';
    if (last <= 10) return '#06b6d4';
    if (last <= 20) return '#22c55e';
    if (last <= 28) return '#eab308';
    return '#ef4444';
  }, [historySeries]);

  const graphSeries = hasTempSensor ? historySeries : forecastSeries;
  const graphLoading = hasTempSensor ? historyLoading : loading;

  const forecastList = useMemo(() => {
    const sliced = forecastType === 'hourly' ? forecast.slice(0, 12) : forecast.slice(0, 7);
    return sliced.map((f, index) => {
      const time = new Date(f.datetime || f.datetime_local || f.time || f.start || f.forecast_time);
      const sourceTemp = Number.isFinite(parseFloat(f.temperature)) ? parseFloat(f.temperature) : null;
      const temp = Number.isFinite(sourceTemp)
        ? convertValueByKind(sourceTemp, { kind: 'temperature', fromUnit: sourceTemperatureUnit, unitMode: effectiveUnitMode })
        : null;
      const label = forecastType === 'hourly'
        ? time.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        : time.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
      const itemCondition = f.condition || condition;
      const itemInfo = getWeatherInfo(itemCondition, t);
      const precip = f.precipitation ?? f.precipitation_probability ?? f.precipitation_amount;
      return {
        key: `${label}-${index}`,
        label,
        temp,
        info: itemInfo,
        precip
      };
    });
  }, [forecast, forecastType, condition, t, locale, sourceTemperatureUnit, effectiveUnitMode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-5 md:p-8 font-sans relative max-h-[80vh] overflow-y-auto backdrop-blur-xl popup-anim"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-6 font-sans">
          <div className="p-4 rounded-2xl transition-all duration-500" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' }}>
            <MainIcon className={`w-8 h-8 ${info.color}`} strokeWidth={1.5} />
            {/* <img src={iconUrl} alt={info.label} className="w-8 h-8 object-contain" /> */}
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">
              {attrs.friendly_name || translate('weather.name')}
            </h3>
            <div className="mt-2 px-3 py-1 rounded-full border inline-flex items-center gap-2" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
              <span className="text-[10px] uppercase font-bold italic tracking-widest">{info.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-2 space-y-6">
            <div className="p-5 rounded-2xl popup-surface">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">{translate('weather.detail.temperature')}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-light text-[var(--text-primary)]">
                      {currentTemp !== null ? formatUnitValue(currentTempDisplay, { fallback: '--' }) : '--'}
                    </span>
                    <span className="text-lg text-[var(--text-secondary)]">{temperatureUnit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasTempSensor ? (
                    [6, 12, 24].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => setHistoryPeriodHours(hours)}
                        className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${historyPeriodHours === hours ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                      >
                        {hours}h
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        onClick={() => setForecastType('hourly')}
                        className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${forecastType === 'hourly' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                      >
                        {translate('weather.view.hourly')}
                      </button>
                      <button
                        onClick={() => setForecastType('daily')}
                        className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${forecastType === 'daily' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                      >
                        {translate('weather.view.daily')}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4">
                {graphLoading ? (
                  <div className="h-[140px] flex items-center justify-center text-[var(--text-secondary)] text-sm">{translate('common.loading')}</div>
                ) : graphSeries.length === 0 ? (
                  <div className="h-[140px] flex items-center justify-center text-[var(--text-secondary)] text-sm">{hasTempSensor ? (translate('sensorInfo.noHistory') || 'No history data available') : translate('weather.noForecast')}</div>
                ) : (
                  <SensorHistoryGraph 
                    data={graphSeries} 
                    height={140} 
                    color={hasTempSensor ? historyColor : '#60a5fa'}
                    noDataLabel={hasTempSensor ? (translate('sensorInfo.noHistory') || 'No history data available') : translate('weather.noForecast')}
                    formatXLabel={(date) => {
                      if (!hasTempSensor && forecastType === 'daily') {
                        return date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
                      }
                      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                )}
              </div>
            </div>

            <div className="px-1">
              <div className="flex items-start justify-between overflow-x-auto scrollbar-hide pb-2 mask-linear gap-6">
                {forecastList.map((item, _index) => {
                  return (
                    <div
                      key={item.key}
                      className="flex flex-col items-center gap-3 flex-shrink-0 group cursor-default min-w-[3.5rem]"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors opacity-70 group-hover:opacity-100">{item.label}</span>
                      <div className="relative my-1">
                         <item.info.Icon className={`w-8 h-8 md:w-10 md:h-10 drop-shadow-md transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500 ${item.info.color}`} strokeWidth={1.5} />
                         {/* <img src={item.iconUrl} alt="" className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md transform group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500" /> */}
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-lg md:text-xl font-light text-[var(--text-primary)] tracking-tight">{Number.isFinite(item.temp) ? formatUnitValue(item.temp, { fallback: '--' }) : '--'} {temperatureUnit}</span>
                        {(parseFloat(item.precip) > 0) && (
                          <div className="flex items-center gap-0.5 text-[var(--accent-color)] mt-1">
                            <span className="text-[9px] font-bold">{formatUnitValue(convertValueByKind(item.precip, { kind: 'precipitation', fromUnit: sourcePrecipitationUnit, unitMode: effectiveUnitMode }), { fallback: '--' })}</span>
                            <span className="text-[7px] opacity-70">{precipitationUnit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-1 pt-6 md:pt-0 md:border-l border-white/5 md:pl-8 flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-6">
              {details.map((detail) => {
                const DetailIcon = getIconComponent(detail.iconName);
                return (
                  <div key={detail.key} className="flex flex-col gap-1 group">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 transition-opacity">
                      {DetailIcon && <DetailIcon className="w-3.5 h-3.5" />}
                      <span className="text-[9px] uppercase tracking-widest truncate">{detail.label}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)] pl-5.5">{detail.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
