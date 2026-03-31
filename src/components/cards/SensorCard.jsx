import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
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
  downsampleTimeSeries,
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

const SensorCard = memo(/** @param {any} props */ function SensorCard({
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
  isMobile = false,
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
      ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
      : isActiveState
        ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
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
            Math.min(
              100,
              ((normalizedNumericState - chartMin) / (safeChartMax - chartMin || 1)) * 100
            )
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

    const matchedThreshold = colorThresholds.find(
      (threshold) => thresholdInputValue <= threshold.limit
    );
    const selectedColor =
      matchedThreshold?.color || colorThresholds[colorThresholds.length - 1]?.color;
    return SENSOR_THRESHOLD_COLOR_MAP[selectedColor] || 'var(--accent-color)';
  }, [useColorThresholds, isRangeVariant, thresholdInputValue, colorThresholds]);
  const showVariantPanel =
    !isSmall &&
    variant !== 'default' &&
    domain !== 'input_number' &&
    showStatus &&
    (variant === 'number' || (isNumeric && normalizedNumericState !== null));
  const showSmallVariantVisual =
    isSmall &&
    isRangeVariant &&
    ['gauge', 'donut'].includes(variant) &&
    isNumeric &&
    normalizedNumericState !== null;
  const useDenseMobileSmallLayout = isMobile && isSmall;
  const useDenseMobileLargeLayout = isMobile && !isSmall;
  const smallVariantGaugeSize = useDenseMobileSmallLayout ? 48 : 56;
  const smallVariantGaugeStroke = useDenseMobileSmallLayout ? 7 : 8;
  const smallVariantDonutSize = useDenseMobileSmallLayout ? 36 : 42;
  const smallVariantDonutStroke = useDenseMobileSmallLayout ? 5 : 6;
  const largeVariantGaugeSize = useDenseMobileLargeLayout ? 88 : 124;
  const largeVariantGaugeStroke = useDenseMobileLargeLayout ? 10 : 14;
  const largeVariantDonutSize = useDenseMobileLargeLayout ? 64 : 96;
  const largeVariantDonutStroke = useDenseMobileLargeLayout ? 6 : 10;
  const largeVariantBarHeight = useDenseMobileLargeLayout ? 14 : 20;
  const useCompactMobileRangeLayout = useDenseMobileLargeLayout && showVariantPanel;

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
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

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
          .map((d) => {
            // Handle both standard format (state/last_changed ISO string) and
            // HA compressed format (s/lc as Unix timestamp in seconds).
            const rawState = d.state !== undefined ? d.state : d.s;
            const val = parseFloat(rawState);
            if (isNaN(val)) return null;
            let time;
            if (d.last_changed) {
              const t = new Date(d.last_changed);
              if (isNaN(t.getTime())) return null;
              time = t;
            } else if (typeof d.lc === 'number') {
              time = new Date(d.lc * 1000);
            } else {
              return null;
            }
            return { value: val, time };
          })
          .filter(Boolean);

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
          setHistory(downsampleTimeSeries(processed));
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
  const useStackedSmallControls = useDenseMobileSmallLayout && (showToggleControls || showControls);
  const showCompactMobileToggleState = isMobile && showToggleControls && showStatus && !isNumeric;
  const useCompactMobileToggleLayout = useDenseMobileLargeLayout && showToggleControls;
  const compactToggleStateTone = isUnavailable
    ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
    : state === 'on'
      ? 'border-transparent bg-[var(--accent-bg)] text-[var(--accent-color)]'
      : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]';

  const renderCompactToggleState = (size = 'large') => (
    <span
      className={`inline-flex w-fit items-center rounded-full border font-bold tracking-widest uppercase ${size === 'small' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'} ${compactToggleStateTone}`}
    >
      {displayState}
    </span>
  );

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
              className={`flex h-5 w-6 items-center justify-center rounded-md transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 ${showActive ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
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
            className={`w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2 hover:bg-[var(--glass-bg-hover)] ${showActive ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'} flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase transition-all active:scale-95`}
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
          size={smallVariantGaugeSize}
          strokeWidth={smallVariantGaugeStroke}
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
          size={smallVariantDonutSize}
          strokeWidth={smallVariantDonutStroke}
          color={variantColor}
        />
      );
    }

    return null;
  };

  if (isSmall) {
    const smallToggleIconClass = showToggleControls
      ? isActiveState
        ? 'ring-1 ring-[var(--accent-color)]/40 bg-[var(--accent-bg)] text-[var(--accent-color)]'
        : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50'
      : iconToneClass;

    return (
      <div
        ref={cardRef}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          if (!editMode) onOpen?.(e);
        }}
        className={`touch-feedback group relative flex h-full overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${useDenseMobileSmallLayout ? 'items-center gap-3 p-3 pl-4' : 'items-center gap-3 p-4 pl-5'} ${!editMode ? 'cursor-pointer' : 'cursor-move'}`}
        style={{ ...cardStyle, containerType: 'inline-size' }}
      >
        {controls}
        <div
          className={`relative flex min-w-0 flex-1 items-center ${useDenseMobileSmallLayout ? 'gap-2.5' : 'gap-3'}`}
        >
          {showIcon && (
            <div
              className={`flex flex-shrink-0 items-center justify-center ${useDenseMobileSmallLayout ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl'} ${smallToggleIconClass} transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
              onClick={showToggleControls && !editMode ? (e) => {
                e.stopPropagation();
                onControl('toggle');
              } : undefined}
              role={showToggleControls ? 'button' : undefined}
              tabIndex={showToggleControls ? 0 : undefined}
              style={showToggleControls ? { cursor: 'pointer' } : undefined}
            >
              {Icon ? (
                <Icon className={`${useDenseMobileSmallLayout ? 'h-4.5 w-4.5' : 'h-5 w-5'} stroke-[1.5px]`} />
              ) : (
                <Activity className={useDenseMobileSmallLayout ? 'h-4.5 w-4.5' : 'h-5 w-5'} />
              )}
            </div>
          )}
          <div
            className={`flex min-w-0 flex-1 flex-col ${showSmallVariantVisual ? (useDenseMobileSmallLayout ? 'pr-8' : 'pr-14') : ''}`}
          >
            {showName && (
              <p
                className={`${useDenseMobileSmallLayout ? 'mb-1 text-[10px]' : 'mb-1.5 text-xs'} block max-w-full truncate leading-none font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60`}
                title={String(name)}
              >
                {String(name)}
              </p>
            )}
            {showStatus && (
              <div className={`flex min-w-0 items-baseline ${useDenseMobileSmallLayout ? 'gap-0.5' : 'gap-1'}`}>
                {showToggleControls ? (
                  <span
                    className={`text-[10px] font-bold tracking-widest uppercase ${isActiveState ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    {displayState}
                  </span>
                ) : showCompactMobileToggleState ? (
                  renderCompactToggleState('small')
                ) : (
                  <span
                    className={`${useDenseMobileSmallLayout ? 'truncate text-[13px]' : 'text-sm'} min-w-0 leading-none font-bold text-[var(--text-primary)]`}
                  >
                    {chartDisplayValue ?? displayState}
                  </span>
                )}
                {!showToggleControls && !showCompactMobileToggleState && displayNumericUnit && valueMode !== 'percent' && (
                  <span
                    className={`${useDenseMobileSmallLayout ? 'text-[9px]' : 'text-[10px]'} shrink-0 leading-none font-medium tracking-wider text-[var(--text-secondary)] uppercase`}
                  >
                    {displayNumericUnit}
                  </span>
                )}
              </div>
            )}
          </div>

          {showSmallVariantVisual && (
            <div
              className={`pointer-events-none absolute top-1/2 shrink-0 -translate-y-1/2 ${useDenseMobileSmallLayout ? 'right-0.5' : 'right-0'}`}
            >
              {renderSmallVariantVisual()}
            </div>
          )}
        </div>

        {!showToggleControls && (
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
      className={`touch-feedback group relative flex h-full flex-col overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'p-4' : 'p-5') : 'p-7'} ${useCompactMobileToggleLayout ? 'justify-start' : 'justify-between'} ${!editMode ? 'cursor-pointer' : 'cursor-move'}`}
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

      <div
        className={`relative z-10 flex shrink-0 items-start justify-between ${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'gap-2.5' : 'gap-3') : ''}`}
      >
        <div className="flex min-w-0 flex-col items-start">
          {showIcon ? (
            <div
              className={`flex items-center justify-center ${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl') : 'h-11 w-11 rounded-2xl'} ${iconToneClass} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
            >
              {Icon ? (
                <Icon className={`${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'h-[15px] w-[15px]' : 'h-4 w-4') : 'h-5 w-5'} stroke-[1.5px]`} />
              ) : (
                <Activity className={useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'h-[15px] w-[15px]' : 'h-4 w-4') : 'h-5 w-5'} />
              )}
            </div>
          ) : (
            <div className={useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'h-9 w-9' : 'h-10 w-10') : 'h-11 w-11'} />
          )}

          {showName && (
            <p
              className={`${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'mt-1 text-[9px]' : 'mt-1.5 text-[10px]') : 'mt-2 text-xs'} w-full truncate font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60`}
              title={String(name)}
            >
              {String(name)}
            </p>
          )}

          {showCompactMobileToggleState && (
            <div className={useCompactMobileToggleLayout ? 'mt-1.5' : 'mt-2'}>
              {renderCompactToggleState(useCompactMobileToggleLayout ? 'small' : 'large')}
            </div>
          )}
        </div>

        {domain !== 'input_number' && showStatus && isNumeric && (
          <div
            className={`flex min-w-0 items-baseline justify-end text-right ${useCompactMobileRangeLayout ? 'max-w-[58%] gap-0.5' : useDenseMobileLargeLayout ? 'gap-1' : 'gap-1.5'}`}
          >
            <span
              className={`${useCompactMobileRangeLayout ? 'truncate text-[1.3rem]' : useDenseMobileLargeLayout ? 'text-[1.65rem]' : 'text-3xl'} min-w-0 leading-none font-thin text-[var(--text-primary)]`}
            >
              {chartDisplayValue ?? displayState}
            </span>
            {displayNumericUnit && valueMode !== 'percent' && (
              <span
                className={`${useCompactMobileRangeLayout ? 'text-[9px]' : useDenseMobileLargeLayout ? 'text-xs' : 'text-sm'} shrink-0 font-medium tracking-wider text-[var(--text-secondary)] uppercase`}
              >
                {displayNumericUnit}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`relative z-10 ${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'mt-2' : useCompactMobileRangeLayout ? 'mt-2' : 'mt-3') : 'mt-4'} ${useCompactMobileToggleLayout ? 'mt-auto pt-2' : ''}`}>
        {domain !== 'input_number' && showStatus && !isNumeric && !showCompactMobileToggleState && (
          <div className={useDenseMobileLargeLayout ? 'mb-2' : 'mb-3'}>
            <span
              className={`${useDenseMobileLargeLayout ? 'text-[1.4rem]' : 'text-3xl'} block truncate leading-none font-thin text-[var(--text-primary)]`}
            >
              {displayState}
            </span>
          </div>
        )}

        {showToggleControls ? (
          <div
            className={`${useDenseMobileLargeLayout ? `${useCompactMobileToggleLayout ? 'mt-0 gap-1.5' : 'mt-3 gap-2'} grid w-full grid-cols-2 bg-transparent p-0` : 'mt-4 flex w-fit items-center gap-2 rounded-full bg-[var(--glass-bg)] p-1'}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (state === 'on') onControl('toggle');
              }}
              className={`${useDenseMobileLargeLayout ? `${useCompactMobileToggleLayout ? 'flex h-9 items-center justify-center rounded-xl px-2.5 py-2 text-[9px]' : 'flex h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px]'} bg-[var(--glass-bg)]` : 'rounded-full px-4 py-2 text-xs'} font-bold tracking-widest uppercase transition-all ${state !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.off')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (state !== 'on') onControl('toggle');
              }}
              className={`${useDenseMobileLargeLayout ? `${useCompactMobileToggleLayout ? 'flex h-9 items-center justify-center rounded-xl px-2.5 py-2 text-[9px]' : 'flex h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px]'} bg-[var(--glass-bg)]` : 'rounded-full px-4 py-2 text-xs'} font-bold tracking-widest uppercase transition-all ${state === 'on' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('common.on')}
            </button>
          </div>
        ) : (
          <>{renderControls()}</>
        )}

        {showVariantPanel && (
          <div className={`${useDenseMobileLargeLayout ? 'mt-1.5 space-y-1 overflow-hidden' : 'mt-4 space-y-3'} transition-all duration-300`}>
            {variant === 'gauge' && isNumeric && normalizedNumericState !== null && (
              <div className={`${useDenseMobileLargeLayout ? 'flex items-center justify-center overflow-hidden' : '-mt-1 flex items-center justify-center'}`}>
                <Gauge
                  value={normalizedNumericState}
                  min={chartMin}
                  max={safeChartMax}
                  size={largeVariantGaugeSize}
                  strokeWidth={largeVariantGaugeStroke}
                  color={variantColor}
                />
              </div>
            )}

            {variant === 'donut' && isNumeric && normalizedNumericState !== null && (
              <div className={`${useDenseMobileLargeLayout ? 'flex items-center justify-center overflow-hidden' : '-mt-5 flex items-center justify-center'}`}>
                <Donut
                  value={normalizedNumericState}
                  min={chartMin}
                  max={safeChartMax}
                  size={largeVariantDonutSize}
                  strokeWidth={largeVariantDonutStroke}
                  color={variantColor}
                />
              </div>
            )}

            {variant === 'bar' && isNumeric && normalizedNumericState !== null && (
              <Bar
                value={normalizedNumericState}
                min={chartMin}
                max={safeChartMax}
                height={largeVariantBarHeight}
                color={variantColor}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default SensorCard;

