import { memo, useEffect, useRef, useState } from 'react';
import WeatherGraph from '../charts/WeatherGraph';
import WeatherEffects from '../effects/WeatherEffects';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { getLocaleForLanguage } from '../../i18n';
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

const getForecastDate = (entry) =>
  new Date(entry?.datetime || entry?.datetime_local || entry?.time || entry?.start || '');

const inferForecastType = (forecast) => {
  if (!Array.isArray(forecast) || forecast.length < 2) return null;
  const first = getForecastDate(forecast[0]);
  const second = getForecastDate(forecast[1]);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return null;
  return Math.abs(second.getTime() - first.getTime()) < 12 * 60 * 60 * 1000 ? 'hourly' : 'daily';
};

const ForecastTypeToggle = memo(function ForecastTypeToggle({
  forecastView,
  setForecastView,
  t,
  compact = false,
}) {
  return (
    <div
      className={`flex rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-0.5 ${compact ? 'flex-col' : ''}`}
      role="group"
      aria-label={t?.('weather.view.forecast') || 'Forecast'}
    >
      {['hourly', 'daily'].map((view) => {
        const active = forecastView === view;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={active}
            onClick={(event) => {
              event.stopPropagation();
              setForecastView(view);
            }}
            className={`rounded-full leading-none font-bold tracking-[0.1em] uppercase transition-colors ${
              compact ? 'px-1.5 py-1 text-[7px]' : 'px-2.5 py-1 text-[9px]'
            } ${
              active
                ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t?.(`weather.view.${view}`) || view}
          </button>
        );
      })}
    </div>
  );
});

const WeatherTempCard = memo(
  /** @param {any} props */ function WeatherTempCard({
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
    isMobile,
    isFullWidthMobile,
    language,
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
    const [cardView, setCardView] = useState('current');
    const [forecastView, setForecastView] = useState('hourly');
    const [swipeAnimation, setSwipeAnimation] = useState('');
    const swipeContentRef = useRef(null);
    const pendingViewRef = useRef(null);
    const suppressCardClickRef = useRef(false);
    const swipeGestureRef = useRef({
      active: false,
      dragging: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
    });

    useEffect(() => {
      if (!swipeAnimation) return undefined;
      const isOutgoing = swipeAnimation.includes('swipe-out');
      const timer = globalThis.setTimeout(
        () => {
          if (swipeAnimation === 'weather-card-swipe-out-left') {
            setCardView(pendingViewRef.current || 'forecast');
            setSwipeAnimation('weather-card-swipe-in-right');
            return;
          }
          if (swipeAnimation === 'weather-card-swipe-out-right') {
            setCardView(pendingViewRef.current || 'current');
            setSwipeAnimation('weather-card-swipe-in-left');
            return;
          }

          pendingViewRef.current = null;
          setSwipeAnimation('');
          const content = swipeContentRef.current;
          if (content) {
            content.removeAttribute('data-dragging');
            content.style.setProperty('--weather-swipe-x', '0px');
            content.style.opacity = '1';
          }
        },
        isOutgoing ? 155 : 195
      );
      return () => globalThis.clearTimeout(timer);
    }, [swipeAnimation]);

    if (!weatherEntity) return null;

    const state = weatherEntity.state;
    const info = getWeatherInfo(state, t);
    const iconUrl = `https://cdn.jsdelivr.net/gh/basmilius/meteocons@v2.0.0/production/fill/all/${info.icon}.svg`;
    const tempValueRaw = tempEntity?.state ?? weatherEntity.attributes?.temperature;
    const tempValue = parseFloat(tempValueRaw);
    const currentTemp = Number.isFinite(tempValue) ? tempValue : NaN;
    const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
    const sourceTempUnit =
      tempEntity?.attributes?.unit_of_measurement ||
      weatherEntity.attributes?.temperature_unit ||
      /** @type {any} */ (haConfig?.unit_system)?.temperature ||
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

    let history = [];
    if (tempId) {
      history = tempId === outsideTempId ? tempHistory : tempHistoryById[tempId] || [];
    } else if (weatherId === weatherEntityId) {
      history = tempHistory;
    }

    const forecastEntry = forecastsById?.[weatherId];
    const legacyForecast = Array.isArray(forecastEntry) ? forecastEntry : null;
    const attributeForecast = Array.isArray(weatherEntity.attributes?.forecast)
      ? weatherEntity.attributes.forecast
      : null;
    const hourlyForecast =
      (!Array.isArray(forecastEntry) && forecastEntry?.hourly) ||
      (inferForecastType(legacyForecast) === 'hourly' ? legacyForecast : null) ||
      (inferForecastType(attributeForecast) === 'hourly' ? attributeForecast : null) ||
      [];
    const dailyForecast =
      (!Array.isArray(forecastEntry) && forecastEntry?.daily) ||
      (inferForecastType(legacyForecast) === 'daily' ? legacyForecast : null) ||
      (inferForecastType(attributeForecast) === 'daily' ? attributeForecast : null) ||
      [];
    const graphForecast = hourlyForecast.length > 0 ? hourlyForecast : dailyForecast;

    if ((!history || history.length < 2) && graphForecast.length > 0) {
      history = graphForecast.map((entry) => ({
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

    const locale = getLocaleForLanguage(language);
    const forecastLimit = isSmall
      ? isMobile && isFullWidthMobile
        ? 3
        : 2
      : isMobile && !isFullWidthMobile
        ? 2
        : 4;
    const forecastItems = (forecastView === 'hourly' ? hourlyForecast : dailyForecast)
      .map((entry, index) => {
        const date = getForecastDate(entry);
        const rawTemperature = parseFloat(entry?.temperature);
        if (Number.isNaN(date.getTime()) || !Number.isFinite(rawTemperature)) return null;
        const temperature = convertValueByKind(rawTemperature, {
          kind: 'temperature',
          fromUnit: sourceTempUnit,
          unitMode: effectiveUnitMode,
        });
        const itemInfo = getWeatherInfo(entry.condition || state, t);
        return {
          key: `${date.toISOString()}-${index}`,
          label:
            forecastView === 'hourly'
              ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
          temperature,
          info: itemInfo,
          iconUrl: `https://cdn.jsdelivr.net/gh/basmilius/meteocons@v2.0.0/production/fill/all/${itemInfo.icon}.svg`,
        };
      })
      .filter(Boolean)
      .slice(0, forecastLimit);

    const handleCardClick = (event) => {
      event.stopPropagation();
      if (suppressCardClickRef.current) {
        suppressCardClickRef.current = false;
        return;
      }
      if (!editMode && onOpen) onOpen();
    };
    const resetSwipePosition = () => {
      const content = swipeContentRef.current;
      if (!content) return;
      content.removeAttribute('data-dragging');
      content.style.setProperty('--weather-swipe-x', '0px');
      content.style.opacity = '1';
    };
    const handlePointerDown = (event) => {
      if (
        editMode ||
        swipeAnimation ||
        event.button > 0 ||
        event.target.closest?.('button, input, select, textarea, a')
      ) {
        return;
      }
      suppressCardClickRef.current = false;
      swipeGestureRef.current = {
        active: true,
        dragging: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const handlePointerMove = (event) => {
      const gesture = swipeGestureRef.current;
      if (!gesture.active || gesture.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      gesture.currentX = event.clientX;

      if (!gesture.dragging) {
        if (Math.abs(deltaX) < 7 && Math.abs(deltaY) < 7) return;
        if (Math.abs(deltaY) >= Math.abs(deltaX)) {
          gesture.active = false;
          return;
        }
        gesture.dragging = true;
        suppressCardClickRef.current = true;
      }

      const content = swipeContentRef.current;
      if (!content) return;
      const allowedDirection =
        (cardView === 'current' && deltaX < 0) || (cardView === 'forecast' && deltaX > 0);
      const displayedDelta = allowedDirection ? deltaX : deltaX * 0.16;
      const width = event.currentTarget.getBoundingClientRect().width || 1;
      content.dataset.dragging = 'true';
      content.style.setProperty('--weather-swipe-x', `${displayedDelta}px`);
      content.style.opacity = String(1 - Math.min(Math.abs(displayedDelta) / width, 0.32));
    };
    const finishPointerGesture = (event, cancelled = false) => {
      const gesture = swipeGestureRef.current;
      if (!gesture.active || gesture.pointerId !== event.pointerId) return;

      gesture.active = false;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (!gesture.dragging || cancelled) {
        resetSwipePosition();
        return;
      }

      const deltaX = gesture.currentX - gesture.startX;
      const width = event.currentTarget.getBoundingClientRect().width || 1;
      const threshold = Math.min(64, width * 0.18);
      const swipeToForecast = cardView === 'current' && deltaX <= -threshold;
      const swipeToCurrent = cardView === 'forecast' && deltaX >= threshold;

      if (!swipeToForecast && !swipeToCurrent) {
        resetSwipePosition();
        return;
      }

      swipeContentRef.current?.removeAttribute('data-dragging');
      pendingViewRef.current = swipeToForecast ? 'forecast' : 'current';
      setSwipeAnimation(
        swipeToForecast ? 'weather-card-swipe-out-left' : 'weather-card-swipe-out-right'
      );
    };
    const swipeHint =
      t?.('weather.view.swipeHint') ||
      'Swipe left or right to switch between current weather and forecast';

    if (isSmall) {
      const smallPadding = isMobile && isFullWidthMobile ? 'px-6 py-3' : 'p-4 pl-5';
      return (
        <div
          key={cardId}
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          onClick={handleCardClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointerGesture(event)}
          onPointerCancel={(event) => finishPointerGesture(event, true)}
          title={editMode ? undefined : swipeHint}
          className={`glass-texture touch-feedback group relative flex h-full items-center overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${
            !editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'
          }`}
          style={{ ...cardStyle, touchAction: editMode ? undefined : 'pan-y' }}
        >
          {getControls(cardId)}
          {showEffects && <WeatherEffects condition={state} />}

          <div
            ref={swipeContentRef}
            data-testid="weather-swipe-content"
            className={`weather-card-swipe-content absolute inset-0 z-10 flex items-center ${smallPadding} ${swipeAnimation}`}
          >
            {cardView === 'current' ? (
              <>
                <div className="absolute inset-0 z-0 opacity-30">
                  <WeatherGraph
                    history={historyForDisplay}
                    currentTemp={displayTempValue}
                    historyHours={graphHistoryHours}
                    colorLimits={graphColorLimits}
                  />
                </div>
                <div className="relative z-10 flex min-w-0 flex-1 items-center gap-4">
                  <div className="-ml-1 flex h-12 w-12 shrink-0 items-center justify-center drop-shadow-md filter transition-transform duration-500 group-hover:scale-110">
                    <img src={iconUrl} alt={info.label} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <p
                      className={`mb-1.5 font-bold break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60 ${
                        isMobile
                          ? 'text-[10px] leading-tight tracking-[0.08em]'
                          : 'text-xs leading-none tracking-widest'
                      }`}
                    >
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
              </>
            ) : (
              <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2.5">
                {forecastItems.length > 0 ? (
                  <div
                    className="grid min-w-0 flex-1 gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${forecastItems.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {forecastItems.map((item) => (
                      <div key={item.key} className="flex min-w-0 flex-col items-center gap-0.5">
                        <span className="max-w-full truncate text-[7px] leading-none font-bold tracking-[0.08em] text-[var(--text-secondary)] uppercase opacity-70">
                          {item.label}
                        </span>
                        <img
                          src={item.iconUrl}
                          alt={item.info.label}
                          className="h-6 w-6 object-contain drop-shadow-sm"
                        />
                        <span className="text-[11px] leading-none font-light text-[var(--text-primary)]">
                          {formatUnitValue(item.temperature, { fallback: '--' })}
                          {displayTempUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="min-w-0 flex-1 truncate text-center text-[10px] text-[var(--text-secondary)] opacity-60">
                    {t?.('weather.noForecast') || 'No forecast available'}
                  </p>
                )}
                <ForecastTypeToggle
                  forecastView={forecastView}
                  setForecastView={setForecastView}
                  t={t}
                  compact
                />
              </div>
            )}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1"
          >
            <span
              className={`h-1 rounded-full transition-all ${cardView === 'current' ? 'w-3 bg-[var(--text-primary)] opacity-65' : 'w-1 bg-[var(--text-secondary)] opacity-35'}`}
            />
            <span
              className={`h-1 rounded-full transition-all ${cardView === 'forecast' ? 'w-3 bg-[var(--text-primary)] opacity-65' : 'w-1 bg-[var(--text-secondary)] opacity-35'}`}
            />
          </div>
        </div>
      );
    }

    const largePadding = isMobile ? (isFullWidthMobile ? 'px-7 py-5' : 'p-5') : 'p-7';
    const graphMargins = isMobile
      ? isFullWidthMobile
        ? '-mx-7 -mb-5'
        : '-mx-5 -mb-5'
      : '-mx-7 -mb-7';

    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={handleCardClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointerGesture(event)}
        onPointerCancel={(event) => finishPointerGesture(event, true)}
        title={editMode ? undefined : swipeHint}
        className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${
          !editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'
        }`}
        style={{ ...cardStyle, touchAction: editMode ? undefined : 'pan-y' }}
      >
        {getControls(cardId)}
        {showEffects && <WeatherEffects condition={state} />}

        <div
          ref={swipeContentRef}
          data-testid="weather-swipe-content"
          className={`weather-card-swipe-content absolute inset-0 z-10 flex h-full flex-col justify-between ${largePadding} ${swipeAnimation}`}
        >
          {cardView === 'current' ? (
            <>
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div
                      className={`${
                        isMobile ? '-mt-1 -ml-1 h-12 w-12' : '-mt-2 -ml-2 h-20 w-20'
                      } drop-shadow-lg filter transition-transform duration-500 group-hover:scale-110`}
                    >
                      <img
                        src={iconUrl}
                        alt={info.label}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    {subtitle && (
                      <p className="mt-0.5 line-clamp-2 text-left text-xs leading-snug font-bold tracking-widest break-words text-[var(--text-secondary)] uppercase opacity-60">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div
                      className={`flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] py-1 text-[var(--text-secondary)] ${
                        isMobile ? 'px-2.5' : 'px-3'
                      }`}
                    >
                      <span
                        className={`leading-none font-bold uppercase ${
                          isMobile ? 'text-[10px] tracking-[0.08em]' : 'text-xs tracking-widest'
                        }`}
                      >
                        {info.label}
                      </span>
                    </div>
                    <span className="text-4xl leading-none font-thin text-[var(--text-primary)]">
                      {formatUnitValue(displayTempValue, { fallback: '--' })}
                      {displayTempUnit}
                    </span>
                  </div>
                </div>
              </div>
              <div
                className={`relative z-0 mt-auto h-32 overflow-hidden rounded-b-3xl opacity-80 ${graphMargins}`}
              >
                <WeatherGraph
                  history={historyForDisplay}
                  currentTemp={displayTempValue}
                  historyHours={graphHistoryHours}
                  colorLimits={graphColorLimits}
                />
              </div>
            </>
          ) : (
            <>
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div
                    className={`${
                      isMobile ? '-mt-0.5 -ml-0.5 h-10 w-10' : '-mt-1 -ml-1 h-16 w-16'
                    } drop-shadow-lg filter`}
                  >
                    <img src={iconUrl} alt={info.label} className="h-full w-full object-contain" />
                  </div>
                  {subtitle && (
                    <p className="mt-0.5 line-clamp-2 text-left text-xs leading-snug font-bold tracking-widest break-words text-[var(--text-secondary)] uppercase opacity-60">
                      {subtitle}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-[10px] leading-none font-bold tracking-[0.08em] text-[var(--text-secondary)] uppercase">
                    {info.label}
                  </div>
                  <span
                    className={`${isMobile ? 'text-3xl' : 'text-4xl'} leading-none font-thin text-[var(--text-primary)]`}
                  >
                    {formatUnitValue(displayTempValue, { fallback: '--' })}
                    {displayTempUnit}
                  </span>
                </div>
              </div>
              <div className="relative z-10 mt-auto flex min-h-0 flex-col gap-2">
                <div className="flex justify-end">
                  <ForecastTypeToggle
                    forecastView={forecastView}
                    setForecastView={setForecastView}
                    t={t}
                  />
                </div>
                {forecastItems.length > 0 ? (
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${forecastItems.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {forecastItems.map((item) => (
                      <div
                        key={item.key}
                        className={`flex min-w-0 flex-col items-center ${isMobile ? 'gap-0.5' : 'gap-1'}`}
                      >
                        <span className="max-w-full truncate text-[9px] leading-none font-bold tracking-[0.1em] text-[var(--text-secondary)] uppercase opacity-70">
                          {item.label}
                        </span>
                        <img
                          src={item.iconUrl}
                          alt={item.info.label}
                          className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} object-contain drop-shadow-md`}
                        />
                        <span
                          className={`${isMobile ? 'text-xs' : 'text-sm'} leading-none font-light text-[var(--text-primary)]`}
                        >
                          {formatUnitValue(item.temperature, { fallback: '--' })}
                          {displayTempUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-[var(--text-secondary)] opacity-60">
                    {t?.('weather.noForecast') || 'No forecast available'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1"
        >
          <span
            className={`h-1 rounded-full transition-all ${cardView === 'current' ? 'w-3 bg-[var(--text-primary)] opacity-65' : 'w-1 bg-[var(--text-secondary)] opacity-35'}`}
          />
          <span
            className={`h-1 rounded-full transition-all ${cardView === 'forecast' ? 'w-3 bg-[var(--text-primary)] opacity-65' : 'w-1 bg-[var(--text-secondary)] opacity-35'}`}
          />
        </div>
      </div>
    );
  }
);

export default WeatherTempCard;
