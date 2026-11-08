import { useEffect, useMemo, useState } from 'react';
import {
  Cloud,
  CloudRain,
  Sun,
  Moon,
  CloudSun,
  Wind,
  Snowflake,
  Zap,
  AlertTriangle,
} from '../icons';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import { getForecast, getHistory, getStatistics } from '../services/haClient';
import { historyRowsToPoints } from '../utils/sensorHistory';
import { getIconComponent } from '../icons';
import { getLocaleForLanguage } from '../i18n';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Segmented from '../components/ui/Segmented';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
} from '../utils';

const getWeatherInfo = (condition, t) => {
  const map = {
    'clear-night': {
      label: t?.('weather.condition.clearNight') || 'Clear',
      Icon: Moon,
      color: 'text-[var(--accent-color)]',
    },
    cloudy: {
      label: t?.('weather.condition.cloudy') || 'Cloudy',
      Icon: Cloud,
      color: 'text-[var(--text-secondary)]',
    },
    fog: {
      label: t?.('weather.condition.fog') || 'Fog',
      Icon: Cloud,
      color: 'text-[var(--text-secondary)]',
    },
    hail: {
      label: t?.('weather.condition.hail') || 'Hail',
      Icon: CloudRain,
      color: 'text-[var(--accent-color)]',
    },
    lightning: {
      label: t?.('weather.condition.lightning') || 'Lightning',
      Icon: Zap,
      color: 'text-[var(--status-warning-fg)]',
    },
    'lightning-rainy': {
      label: t?.('weather.condition.lightning') || 'Lightning',
      Icon: Zap,
      color: 'text-[var(--status-warning-fg)]',
    },
    partlycloudy: {
      label: t?.('weather.condition.partlyCloudy') || 'Partly cloudy',
      Icon: CloudSun,
      color: 'text-[var(--status-warning-fg)]',
    },
    pouring: {
      label: t?.('weather.condition.pouring') || 'Heavy rain',
      Icon: CloudRain,
      color: 'text-[var(--accent-color)]',
    },
    rainy: {
      label: t?.('weather.condition.rainy') || 'Rain',
      Icon: CloudRain,
      color: 'text-[var(--accent-color)]',
    },
    snowy: {
      label: t?.('weather.condition.snowy') || 'Snow',
      Icon: Snowflake,
      color: 'text-[var(--text-primary)]',
    },
    'snowy-rainy': {
      label: t?.('weather.condition.snowy') || 'Snow',
      Icon: Snowflake,
      color: 'text-[var(--text-primary)]',
    },
    sunny: {
      label: t?.('weather.condition.sunny') || 'Sunny',
      Icon: Sun,
      color: 'text-[var(--status-warning-fg)]',
    },
    windy: {
      label: t?.('weather.condition.windy') || 'Wind',
      Icon: Wind,
      color: 'text-[var(--text-secondary)]',
    },
    'windy-variant': {
      label: t?.('weather.condition.windy') || 'Wind',
      Icon: Wind,
      color: 'text-[var(--text-secondary)]',
    },
    exceptional: {
      label: t?.('weather.condition.exceptional') || 'Extreme',
      Icon: AlertTriangle,
      color: 'text-[var(--status-error-fg)]',
    },
  };
  return (
    map[condition] || {
      label:
        condition === 'unavailable'
          ? t?.('status.unavailable') || 'Unavailable'
          : condition && condition !== 'unknown'
            ? condition
            : t?.('common.unknown') || 'Unknown',
      Icon: Cloud,
      color: 'text-[var(--text-secondary)]',
    }
  );
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
  t,
}) {
  const translate = t || ((key) => key);
  const locale = getLocaleForLanguage(language);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const use12HourTime = locale === 'en-US';
  const activeWeatherEntity = weatherEntity || {
    state: 'unknown',
    attributes: {},
    entity_id: null,
  };
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const condition = activeWeatherEntity.state;
  const info = getWeatherInfo(condition, t);
  const MainIcon = info.Icon;
  const modalTitleId = `weather-modal-title-${activeWeatherEntity?.entity_id?.replace(/[^a-zA-Z0-9_-]/g, '-') || 'weather'}`;

  const currentTempRaw = tempEntity?.state ?? activeWeatherEntity.attributes?.temperature;
  const currentTemp = Number.isFinite(parseFloat(currentTempRaw))
    ? parseFloat(currentTempRaw)
    : null;

  const attrs = activeWeatherEntity.attributes || {};
  const sourceTemperatureUnit =
    attrs.temperature_unit || haConfig?.unit_system?.temperature || '°C';
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
  const windDisplay =
    gustVal !== '--' && gustVal !== windVal
      ? `${windVal} (${gustVal}) ${windUnit}`
      : `${windVal} ${windUnit}`;

  const details = [
    {
      key: 'humidity',
      label: translate('weather.detail.humidity'),
      value: formatValue(attrs.humidity, '%'),
      iconName: 'mdi:water-percent',
    },
    {
      key: 'pressure',
      label: translate('weather.detail.pressure'),
      value: `${formatUnitValue(convertValueByKind(attrs.pressure, { kind: 'pressure', fromUnit: sourcePressureUnit, unitMode: effectiveUnitMode }), { fallback: '--' })} ${pressureUnit}`,
      iconName: 'mdi:gauge',
    },
    {
      key: 'wind',
      label: `${translate('weather.detail.wind')} / ${translate('weather.detail.gust')}`,
      value: windDisplay,
      iconName: 'mdi:weather-windy',
    },
    {
      key: 'dew',
      label: translate('weather.detail.dewPoint'),
      value: `${formatUnitValue(convertValueByKind(attrs.dew_point, { kind: 'temperature', fromUnit: sourceTemperatureUnit, unitMode: effectiveUnitMode }), { fallback: '--' })} ${temperatureUnit}`,
      iconName: 'mdi:thermometer',
    },
    {
      key: 'precip',
      label: translate('weather.detail.precip'),
      value: `${formatUnitValue(convertValueByKind(attrs.precipitation, { kind: 'precipitation', fromUnit: sourcePrecipitationUnit, unitMode: effectiveUnitMode }), { fallback: '--' })} ${precipitationUnit}`,
      iconName: 'mdi:weather-rainy',
    },
  ];

  const [forecastType, setForecastType] = useState('hourly');
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyPeriodHours, setHistoryPeriodHours] = useState(12);
  const [historySeries, setHistorySeries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const hasTempSensor = !!tempEntity?.entity_id;

  useEffect(() => {
    if (!show || !conn || !tempEntity?.entity_id) {
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

        const statsPeriod =
          historyPeriodHours <= 12 ? '5minute' : historyPeriodHours <= 24 ? '15minute' : 'hour';
        const stats = await getStatistics(conn, {
          start,
          end,
          statisticId: tempEntity.entity_id,
          period: statsPeriod,
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
          no_attributes: true,
        });

        if (!cancelled) {
          setHistorySeries(
            historyRowsToPoints(rawHistory).sort((a, b) => a.time.getTime() - b.time.getTime())
          );
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
  }, [show, conn, tempEntity?.entity_id, historyPeriodHours]);

  useEffect(() => {
    if (!show || !conn || !activeWeatherEntity?.entity_id) return;

    let cancelled = false;
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const data = await getForecast(conn, {
          entityId: activeWeatherEntity.entity_id,
          type: forecastType,
        });
        if (!cancelled) {
          const next =
            Array.isArray(data) && data.length > 0
              ? data
              : Array.isArray(activeWeatherEntity.attributes?.forecast)
                ? activeWeatherEntity.attributes.forecast
                : [];
          setForecast(next);
        }
      } catch {
        if (!cancelled) {
          const fallback = Array.isArray(activeWeatherEntity.attributes?.forecast)
            ? activeWeatherEntity.attributes.forecast
            : [];
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
  }, [
    show,
    conn,
    activeWeatherEntity?.entity_id,
    forecastType,
    activeWeatherEntity?.attributes?.forecast,
  ]);

  const forecastSeries = useMemo(() => {
    if (!forecast.length) return [];
    return forecast
      .map((f) => ({
        value: Number.isFinite(parseFloat(f.temperature)) ? parseFloat(f.temperature) : null,
        time: new Date(f.datetime || f.datetime_local || f.time || f.start || f.forecast_time),
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
      const sourceTemp = Number.isFinite(parseFloat(f.temperature))
        ? parseFloat(f.temperature)
        : null;
      const temp = Number.isFinite(sourceTemp)
        ? convertValueByKind(sourceTemp, {
            kind: 'temperature',
            fromUnit: sourceTemperatureUnit,
            unitMode: effectiveUnitMode,
          })
        : null;
      const label =
        forecastType === 'hourly'
          ? time.toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: use12HourTime,
            })
          : time.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
      const itemCondition = f.condition || condition;
      const itemInfo = getWeatherInfo(itemCondition, t);
      const precip = f.precipitation ?? f.precipitation_probability ?? f.precipitation_amount;
      return {
        key: `${label}-${index}`,
        label,
        temp,
        info: itemInfo,
        precip,
      };
    });
  }, [
    forecast,
    forecastType,
    condition,
    t,
    locale,
    use12HourTime,
    sourceTemperatureUnit,
    effectiveUnitMode,
  ]);

  if (!show || !weatherEntity) return null;

  const forecastControl = (
    <Segmented
      ariaLabel={translate('weather.view.forecast')}
      value={forecastType}
      onChange={setForecastType}
      options={[
        { value: 'hourly', label: translate('weather.view.hourly') },
        { value: 'daily', label: translate('weather.view.daily') },
      ]}
    />
  );
  const rangeControl = hasTempSensor ? (
    <Segmented
      ariaLabel={translate('sensor.graphRange')}
      value={historyPeriodHours}
      onChange={setHistoryPeriodHours}
      options={[6, 12, 24].map((hours) => ({
        value: hours,
        label: translate(`sensor.graphRange${hours}h`),
      }))}
    />
  ) : (
    forecastControl
  );

  return (
    <AccessibleModalShell
      open={show && !!weatherEntity}
      onClose={onClose}
      titleId={modalTitleId}
      size="l"
    >
      {() => (
        <>
          <ModalHeader
            title={attrs.friendly_name || translate('weather.name')}
            closeLabel={translate('common.close')}
            onClose={onClose}
            icon={<MainIcon className={info.color} strokeWidth={1.5} />}
            status={<StatusChip label={info.label} />}
          />

          <ModalBody className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            <div className="min-w-0 space-y-6 md:col-span-2">
              <div className="popup-surface rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="modal-section-label">{translate('weather.detail.temperature')}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="theme-text-primary text-4xl font-light">
                        {currentTemp !== null
                          ? formatUnitValue(currentTempDisplay, { fallback: '--' })
                          : '--'}
                      </span>
                      <span className="text-lg text-[var(--text-secondary)]">
                        {temperatureUnit}
                      </span>
                    </div>
                  </div>
                  {rangeControl}
                </div>
                <div className="mt-4">
                  {graphLoading ? (
                    <div className="flex h-[140px] items-center justify-center text-sm text-[var(--text-secondary)]">
                      {translate('common.loading')}
                    </div>
                  ) : graphSeries.length === 0 ? (
                    <div className="flex h-[140px] items-center justify-center text-sm text-[var(--text-secondary)]">
                      {hasTempSensor
                        ? translate('sensorInfo.noHistory') || 'No history data available'
                        : translate('weather.noForecast')}
                    </div>
                  ) : (
                    <SensorHistoryGraph
                      data={graphSeries}
                      height={140}
                      color={hasTempSensor ? historyColor : '#60a5fa'}
                      noDataLabel={
                        hasTempSensor
                          ? translate('sensorInfo.noHistory') || 'No history data available'
                          : translate('weather.noForecast')
                      }
                      formatXLabel={(date) => {
                        if (!hasTempSensor && forecastType === 'daily') {
                          return date
                            .toLocaleDateString(locale, { weekday: 'short' })
                            .replace('.', '');
                        }
                        return date.toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: use12HourTime,
                        });
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3 px-1">
                {hasTempSensor && <div className="flex justify-end">{forecastControl}</div>}
                <div className="scrollbar-hide mask-linear flex items-start justify-between gap-6 overflow-x-auto pb-2">
                  {forecastList.map((item) => {
                    return (
                      <div
                        key={item.key}
                        className="group flex min-w-[3.5rem] flex-shrink-0 cursor-default flex-col items-center gap-3"
                      >
                        <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--text-secondary)] uppercase transition-colors group-hover:text-[var(--text-primary)]">
                          {item.label}
                        </span>
                        <div className="relative my-1">
                          <item.info.Icon
                            className={`h-8 w-8 transform drop-shadow-md transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-110 md:h-10 md:w-10 ${item.info.color}`}
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-lg font-light tracking-tight text-[var(--text-primary)] md:text-xl">
                            {Number.isFinite(item.temp)
                              ? formatUnitValue(item.temp, { fallback: '--' })
                              : '--'}{' '}
                            {temperatureUnit}
                          </span>
                          {parseFloat(item.precip) > 0 && (
                            <div className="mt-1 flex items-center gap-0.5 text-[11px] text-[var(--accent-color)]">
                              <span className="font-bold">
                                {formatUnitValue(
                                  convertValueByKind(item.precip, {
                                    kind: 'precipitation',
                                    fromUnit: sourcePrecipitationUnit,
                                    unitMode: effectiveUnitMode,
                                  }),
                                  { fallback: '--' }
                                )}
                              </span>
                              <span className="opacity-70">{precipitationUnit}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-[var(--glass-border)] md:col-span-1 md:border-l md:pl-6">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-1 md:gap-y-6">
                {details.map((detail) => {
                  const DetailIcon = getIconComponent(detail.iconName);
                  return (
                    <div key={detail.key} className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        {DetailIcon && <DetailIcon className="h-3.5 w-3.5 flex-none" />}
                        <span className="modal-section-label truncate">{detail.label}</span>
                      </div>
                      <span className="pl-5.5 text-sm font-medium text-[var(--text-primary)]">
                        {detail.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
