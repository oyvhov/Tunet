import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Minus, Plus, Activity, Play } from 'lucide-react';
import { getHistory, getStatistics } from '../../services/haClient';
import SparkLine from '../charts/SparkLine';
import { Gauge, Donut, Bar } from '../charts/SensorGauge';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  inferUnitKind,
} from '../../utils';

const SENSOR_THRESHOLD_COLOR_MAP = {
  red: 'var(--color-red-500)',
  amber: 'var(--color-amber-400)',
  green: 'var(--color-green-400)',
};

const DEFAULT_SENSOR_COLOR_THRESHOLDS = [
  { limit: 20, color: 'red' },
  { limit: 60, color: 'amber' },
  { limit: 100, color: 'green' },
];

export default function SensorCard({
  entity,
  entities = {},
  conn,
  settings,
  dragProps,
  cardStyle,
  Icon,
  name,
  editMode,
  controls,
  onControl,
  onOpen,
  t,
}) {
  const translate = t || ((key) => key);
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const state = entity?.state;
  const unit = entity?.attributes?.unit_of_measurement || '';
  const isNumeric =
    typeof state === 'string' ? /^\s*-?\d+(\.\d+)?\s*$/.test(state) : !isNaN(parseFloat(state));
  const domain = entity?.entity_id?.split('.')[0] || '';
  const deviceClass = entity?.attributes?.device_class;
  const isOnOffState = state === 'on' || state === 'off';
  const isUnavailable = state === 'unavailable' || state === 'unknown';
  const numericState = isNumeric ? parseFloat(state) : null;
  const isBinaryNumeric = isNumeric && (numericState === 0 || numericState === 1);
  const isBinaryLike = isOnOffState || isBinaryNumeric;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const inferredUnitKind = inferUnitKind(deviceClass, unit);
  const convertedNumericState =
    isNumeric && !isBinaryNumeric && inferredUnitKind
      ? convertValueByKind(numericState, {
          kind: inferredUnitKind,
          fromUnit: unit,
          unitMode: effectiveUnitMode,
        })
      : numericState;
  const displayNumericUnit =
    isNumeric && !isBinaryNumeric && inferredUnitKind
      ? getDisplayUnitForKind(inferredUnitKind, effectiveUnitMode)
      : unit;
  const isActiveState = isOnOffState
    ? state === 'on'
    : isBinaryNumeric
      ? numericState === 1
      : false;
  const binaryStateKeys = {
    door: { on: 'binary.door.open', off: 'binary.door.closed' },
    window: { on: 'binary.window.open', off: 'binary.window.closed' },
    garage_door: { on: 'binary.garageDoor.open', off: 'binary.garageDoor.closed' },
    motion: { on: 'binary.motion.detected', off: 'binary.motion.clear' },
    moisture: { on: 'binary.moisture.wet', off: 'binary.moisture.dry' },
    occupancy: { on: 'binary.occupancy.occupied', off: 'binary.occupancy.clear' },
    presence: { on: 'binary.occupancy.occupied', off: 'binary.occupancy.clear' },
    smoke: { on: 'binary.smoke.detected', off: 'binary.smoke.clear' },
    lock: { on: 'binary.lock.unlocked', off: 'binary.lock.locked' },
  };
  const binaryDisplayState =
    domain === 'binary_sensor' && isOnOffState
      ? translate(
          binaryStateKeys[deviceClass]?.[state] || (state === 'on' ? 'status.on' : 'status.off')
        )
      : null;
  const toggleDisplayState =
    isOnOffState && ['automation', 'input_boolean', 'switch', 'input_number'].includes(domain)
      ? translate(state === 'on' ? 'status.on' : 'status.off')
      : null;
  const sceneDisplayState = domain === 'scene' ? translate('sensor.scene.label') : null;
  const scriptDisplayState = domain === 'script' ? translate('sensor.script.label') : null;
  const displayState = isNumeric
    ? formatUnitValue(convertedNumericState, { fallback: '--' })
    : binaryDisplayState || toggleDisplayState || sceneDisplayState || scriptDisplayState || state;
  const iconToneClass = isBinaryLike
    ? isUnavailable
      ? 'bg-red-500/10 text-red-400'
      : isActiveState
        ? 'bg-green-500/15 text-green-400'
        : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]';

  // Feature flags from settings
  const showControls = settings?.showControls !== false;
  const showName = settings?.showName !== false;
  const showStatus = settings?.showStatus !== false;
  const showIcon = settings?.showIcon !== false;
  const isSmall = settings?.size === 'small';
  const variant = settings?.sensorVariant || 'default';
  const isRangeVariant = ['gauge', 'donut', 'bar'].includes(variant);
  const showGraph =
    !isSmall &&
    isNumeric &&
    domain !== 'input_number' &&
    settings?.showGraph !== false &&
    variant === 'default';

  // Resolve min/max for gauge/donut/bar
  const { chartMin, chartMax } = useMemo(() => {
    if (!isNumeric || numericState === null) return { chartMin: 0, chartMax: 100 };
    const needsRange = isRangeVariant;
    if (!needsRange) return { chartMin: 0, chartMax: 100 };

    const resolveVal = (type, val, entityId) => {
      if (type === 'entity' && entityId && entities[entityId]) {
        const entityState = entities[entityId]?.state;
        const parsed = parseFloat(entityState);
        if (isNaN(parsed)) return null;
        const sourceUnit = entities[entityId]?.attributes?.unit_of_measurement || '';
        const sourceDeviceClass = entities[entityId]?.attributes?.device_class;
        const sourceKind = inferUnitKind(sourceDeviceClass, sourceUnit);

        if (!sourceKind) return parsed;

        return convertValueByKind(parsed, {
          kind: sourceKind,
          fromUnit: sourceUnit,
          unitMode: effectiveUnitMode,
        });
      }
      return typeof val === 'number' ? val : null;
    };

    const minType = settings?.sensorMinType || 'value';
    const maxType = settings?.sensorMaxType || 'value';
    const minVal = resolveVal(minType, settings?.sensorMin, settings?.sensorMinEntity);
    const maxVal = resolveVal(maxType, settings?.sensorMax, settings?.sensorMaxEntity);

    return {
      chartMin: minVal ?? 0,
      chartMax: maxVal ?? 100,
    };
  }, [
    isNumeric,
    numericState,
    settings?.sensorMinType,
    settings?.sensorMin,
    settings?.sensorMinEntity,
    settings?.sensorMaxType,
    settings?.sensorMax,
    settings?.sensorMaxEntity,
    entities,
    effectiveUnitMode,
    isRangeVariant,
  ]);

  const normalizedNumericState =
    typeof convertedNumericState === 'number' ? convertedNumericState : numericState;
  const safeChartMax = chartMax <= chartMin ? chartMin + 1 : chartMax;
  const valueMode = settings?.sensorValueMode || 'actual';
  const chartValue =
    variant !== 'default' && isNumeric && numericState !== null
      ? valueMode === 'percent'
        ? Math.max(
            0,
            Math.min(100, ((normalizedNumericState - chartMin) / (safeChartMax - chartMin || 1)) * 100)
          )
        : normalizedNumericState
      : null;
  const chartDisplayValue =
    valueMode === 'percent' && chartValue !== null
      ? `${Math.round(chartValue)}%`
      : isNumeric
        ? formatUnitValue(normalizedNumericState, { fallback: displayState })
        : displayState;
  const useColorThresholds = settings?.sensorUseColorThresholds !== false;
  const colorThresholds = useMemo(() => {
    const source =
      Array.isArray(settings?.sensorColorThresholds) && settings.sensorColorThresholds.length === 3
        ? settings.sensorColorThresholds
        : DEFAULT_SENSOR_COLOR_THRESHOLDS;

    return source
      .map((item, index) => {
        const parsedLimit = parseFloat(item?.limit);
        const fallbackLimit = DEFAULT_SENSOR_COLOR_THRESHOLDS[index]?.limit ?? 100;
        return {
          limit: Number.isFinite(parsedLimit) ? parsedLimit : fallbackLimit,
          color: item?.color || DEFAULT_SENSOR_COLOR_THRESHOLDS[index]?.color || 'green',
        };
      })
      .sort((a, b) => a.limit - b.limit);
  }, [settings?.sensorColorThresholds]);
  const thresholdInputValue = valueMode === 'percent' ? chartValue : normalizedNumericState;
  const variantColor = useMemo(() => {
    if (!useColorThresholds) {
      return 'var(--accent-color)';
    }

    if (!isRangeVariant || thresholdInputValue === null || !Number.isFinite(thresholdInputValue)) {
      return 'var(--accent-color)';
    }

    const matchedThreshold = colorThresholds.find((threshold) => thresholdInputValue <= threshold.limit);
    const selectedColor = matchedThreshold?.color || colorThresholds[colorThresholds.length - 1]?.color;
    return SENSOR_THRESHOLD_COLOR_MAP[selectedColor] || 'var(--accent-color)';
  }, [useColorThresholds, isRangeVariant, thresholdInputValue, colorThresholds]);
  const showVariantPanel =
    !isSmall &&
    variant !== 'default' &&
    domain !== 'input_number' &&
    showStatus &&
    (variant === 'number' || (isNumeric && normalizedNumericState !== null));
  const showSmallVariantVisual =
    isSmall && isRangeVariant && ['gauge', 'donut'].includes(variant) && isNumeric && normalizedNumericState !== null;

  const [history, setHistory] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeUntil, setActiveUntil] = useState(0);
  const cardRef = useRef(null);

  useEffect(() => {
    if (activeUntil > 0) {
      const timeout = setTimeout(() => {
        setActiveUntil(0);
      }, activeUntil - Date.now());
      return () => clearTimeout(timeout);
    }
  }, [activeUntil]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!conn || !entity?.entity_id || !showGraph || !isVisible) {
      if (!isVisible && showGraph) {
        // Keep empty while waiting for visibility
        return;
      }
      // If we are visible but no graph needed or no conn, clear
      if (!showGraph) setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const data = await getHistory(conn, {
          entityId: entity.entity_id,
          start,
          end,
          minimal_response: true,
        });

        const processed = (data && Array.isArray(data) ? data : [])
          .filter((d) => !isNaN(parseFloat(d.state)))
          .map((d) => ({ value: parseFloat(d.state), time: new Date(d.last_changed) }));

        if (processed.length === 1) {
          const onlyPoint = processed[0];
          const earlierPoint = {
            value: onlyPoint.value,
            time: new Date(onlyPoint.time.getTime() - 60 * 60 * 1000),
          };
          setHistory([earlierPoint, onlyPoint]);
          return;
        }

        if (processed.length > 1) {
          setHistory(processed);
          return;
        }

        const stats = await getStatistics(conn, {
          statisticId: entity.entity_id,
          start,
          end,
          period: 'hour',
        });

        const statPoints = (stats && Array.isArray(stats) ? stats : [])
          .map((d) => ({
            value:
              typeof d.mean === 'number' ? d.mean : typeof d.state === 'number' ? d.state : d.sum,
            time: new Date(d.start),
          }))
          .filter((d) => !isNaN(parseFloat(d.value)));

        if (statPoints.length === 1) {
          const onlyPoint = statPoints[0];
          const earlierPoint = {
            value: onlyPoint.value,
            time: new Date(onlyPoint.time.getTime() - 60 * 60 * 1000),
          };
          setHistory([earlierPoint, onlyPoint]);
          return;
        }

        if (statPoints.length > 1) {
          setHistory(statPoints);
          return;
        }

        if (!isNaN(parseFloat(state))) {
          const now = new Date();
          const currentValue = parseFloat(state);
          setHistory([
            { value: currentValue, time: new Date(now.getTime() - 60 * 60 * 1000) },
            { value: currentValue, time: now },
          ]);
          return;
        }

        setHistory([]);
      } catch (e) {
        console.error('Failed to fetch history', e);
        setHistory([]);
      }
    };

    let idleId;
    let timerId;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => fetchHistory(), { timeout: 4000 });
    } else {
      timerId = setTimeout(() => fetchHistory(), Math.random() * 500);
    }

    return () => {
      if (idleId) window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, [conn, entity?.entity_id, showGraph, state, isVisible]);

  // Early return AFTER all hooks to respect Rules of Hooks
  if (!entity) return null;

  // Determine controls based on domain
  const isToggleDomain =
    domain === 'input_boolean' || domain === 'switch' || domain === 'automation';
  const showToggleControls = isToggleDomain && showControls;

  const renderControls = () => {
    if (!showControls) return null;

    if (domain === 'script' || domain === 'scene') {
      const showActive = (domain === 'script' && state === 'on') || Date.now() < activeUntil;
      const label = showActive
        ? domain === 'scene'
          ? t('sensor.scene.activated')
          : t('sensor.script.ran')
        : domain === 'script'
          ? t('sensor.script.run')
          : t('sensor.scene.activate');

      const handleRun = (e) => {
        e.stopPropagation();
        onControl('turn_on');
        setActiveUntil(Date.now() + 5000);
      };

      if (isSmall) {
        return (
          <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--glass-bg)] p-0.5">
            <button
              onClick={handleRun}
              className={`flex h-5 w-6 items-center justify-center rounded-md transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 ${showActive ? 'bg-green-500/20 text-green-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Play className="h-3 w-3 fill-current" />
            </button>
          </div>
        );
      }

      return (
        <div className="mt-4 flex w-full items-center">
          <button
            onClick={handleRun}
            className={`w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2 hover:bg-[var(--glass-bg-hover)] ${showActive ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'text-[var(--text-primary)]'} flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all active:scale-95`}
          >
            <Play className="h-3 w-3 fill-current" /> {label}
          </button>
        </div>
      );
    }

    if (domain === 'input_number') {
      const min = entity.attributes?.min || 0;
      const max = entity.attributes?.max || 100;
      const val = parseFloat(state);

      if (isSmall) {
        return (
          <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--glass-bg)] p-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onControl('increment');
              }}
              className="flex h-5 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
              disabled={val >= max}
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onControl('decrement');
              }}
              className="flex h-5 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
              disabled={val <= min}
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        );
      }

      return (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[var(--glass-bg)] px-2.5 py-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onControl('decrement');
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
            disabled={val <= min}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
              {isNumeric ? formatUnitValue(convertedNumericState, { fallback: '--' }) : state}
            </span>
            <span className="ml-1 text-[10px] font-medium tracking-wider text-[var(--text-secondary)] uppercase">
              {displayNumericUnit}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onControl('increment');
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
            disabled={val >= max}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    // For other domains, only show controls if explicitly enabled
    if (!showControls) return null;

    return null;
  };

  const renderSmallVariantVisual = () => {
    if (!showSmallVariantVisual) return null;

    if (variant === 'gauge') {
      return (
        <Gauge
          value={normalizedNumericState}
          min={chartMin}
          max={safeChartMax}
          size={56}
          strokeWidth={8}
          color={variantColor}
        />
      );
    }

    if (variant === 'donut') {
      return (
        <Donut
          value={normalizedNumericState}
          min={chartMin}
          max={safeChartMax}
          size={42}
          strokeWidth={6}
          color={variantColor}
        />
      );
    }

    return null;
  };

  if (isSmall) {
    return (
      <div
        ref={cardRef}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          if (!editMode) onOpen?.(e);
        }}
        className={`touch-feedback group relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer' : 'cursor-move'}`}
        style={{ ...cardStyle, containerType: 'inline-size' }}
      >
        {controls}
        <div className="relative flex min-w-0 flex-1 items-center gap-4">
          {showIcon && (
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${iconToneClass} transition-transform duration-500 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
            >
              {Icon ? <Icon className="h-6 w-6 stroke-[1.5px]" /> : <Activity className="h-6 w-6" />}
            </div>
          )}
          <div className={`flex min-w-0 flex-col ${showSmallVariantVisual ? 'pr-14' : ''}`}>
            {showName && (
              <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
                {String(name)}
              </p>
            )}
            <div className="flex items-baseline gap-1">
              {showStatus && (
                <span className="text-sm leading-none font-bold text-[var(--text-primary)]">
                  {chartDisplayValue ?? displayState}
                </span>
              )}
              {showStatus && displayNumericUnit && (
                <span className="text-[10px] leading-none font-medium tracking-wider text-[var(--text-secondary)] uppercase">
                  {displayNumericUnit}
                </span>
              )}
            </div>
          </div>

          {showSmallVariantVisual && (
            <div className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 shrink-0">
              {renderSmallVariantVisual()}
            </div>
          )}
        </div>

        {showToggleControls ? (
          <div className="sensor-card-controls shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (state !== 'on') onControl('toggle');
              }}
              className={`control-on rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all ${state === 'on' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.on')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (state === 'on') onControl('toggle');
              }}
              className={`control-off rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all ${state !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.off')}
            </button>
          </div>
        ) : (
          <div className="shrink-0">{renderControls()}</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        if (!editMode) onOpen?.(e);
      }}
      className={`touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}

      <div className="pointer-events-none absolute -right-4 -bottom-4 text-[var(--glass-border)] opacity-[0.03]">
        {Icon && <Icon size={140} />}
      </div>

      {showGraph && history.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-24">
          <SparkLine data={history} height={96} currentIndex={history.length - 1} fade />
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between shrink-0">
        <div className="flex min-w-0 flex-col items-start">
          {showIcon ? (
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconToneClass} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
            >
              {Icon ? <Icon className="h-5 w-5 stroke-[1.5px]" /> : <Activity className="h-5 w-5" />}
            </div>
          ) : (
            <div className="h-11 w-11" />
          )}

          {showName && (
            <p className="mt-2 w-full truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {String(name)}
            </p>
          )}
        </div>

        {domain !== 'input_number' && showStatus && (
          <div className="flex items-baseline gap-1.5 text-right">
            <span className="text-3xl font-thin leading-none text-[var(--text-primary)]">
              {chartDisplayValue ?? displayState}
            </span>
            {displayNumericUnit && valueMode !== 'percent' && (
              <span className="text-sm font-medium tracking-wider text-[var(--text-secondary)] uppercase">
                {displayNumericUnit}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-4">
        {showToggleControls ? (
          <div className="mt-4 flex w-fit items-center gap-2 rounded-full bg-[var(--glass-bg)] p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (state === 'on') onControl('toggle');
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all ${state !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.off')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (state !== 'on') onControl('toggle');
              }}
              className={`rounded-full px-4 py-2 text-xs font-bold tracking-widest uppercase transition-all ${state === 'on' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.on')}
            </button>
          </div>
        ) : (
          <>{renderControls()}</>
        )}

        {showVariantPanel && (
          <div className="mt-4 space-y-3 transition-all duration-300">
            {variant === 'gauge' && isNumeric && normalizedNumericState !== null && (
              <div className="-mt-1 flex items-center justify-center">
                <Gauge
                  value={normalizedNumericState}
                  min={chartMin}
                  max={safeChartMax}
                  size={124}
                  strokeWidth={14}
                  color={variantColor}
                />
              </div>
            )}

            {variant === 'donut' && isNumeric && normalizedNumericState !== null && (
              <div className="-mt-5 flex items-center justify-center">
                <Donut
                  value={normalizedNumericState}
                  min={chartMin}
                  max={safeChartMax}
                  size={96}
                  strokeWidth={10}
                  color={variantColor}
                />
              </div>
            )}

            {variant === 'bar' && isNumeric && normalizedNumericState !== null && (
              <Bar
                value={normalizedNumericState}
                min={chartMin}
                max={safeChartMax}
                height={20}
                color={variantColor}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
