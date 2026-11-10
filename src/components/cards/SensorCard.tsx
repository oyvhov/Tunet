import { useState, useEffect, useRef, useMemo, memo } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import {
  Minus,
  Plus,
  Activity,
  Play,
  ListChecks as List,
  Power,
  RefreshCw,
  Check,
  ArrowRight,
  ExternalLink,
  Info,
  getIconComponent,
} from '../../icons';
import { getHistory, getStatistics } from '../../services/haClient';
import SparkLine from '../charts/SparkLine';
import SensorTrend from '../charts/SensorTrend';
import { Gauge, Donut, Bar } from '../charts/SensorGauge';
import GlideNumber from '../ui/GlideNumber';
import CardName from '../ui/CardName';
import ModernDropdown from '../ui/ModernDropdown';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import {
  resolveSensorCardConfig,
  isSensorEntityActive,
  canSensorUseNumericVariants,
} from '../../utils/sensorCardConfig';
import { useRefreshTick } from '../../hooks/useRefreshTick';
import { useSensorCardAction } from '../../hooks/useSensorCardAction';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  inferUnitKind,
  isUnavailableState,
  downsampleTimeSeries,
  aggregateTimeSeries,
  getSensorGraphWindow,
  historyRowsToPoints,
  resolveSensorGraphRange,
  SENSOR_GRAPH_RANGES,
  SENSOR_GRAPH_STATS,
} from '../../utils';
import type { IconComponent } from '../../icons/iconMap';
import type { CardCallService } from '../../types/cards';
import type { EntityMap } from '../../types/dashboard';
import type { Translate } from '../../types/ha';
import type { SensorCardSettings } from '../../utils/sensorCardConfig';
import type { SensorGraphWindow, TimeSeriesPoint } from '../../utils/sensorHistory';
import type { StatisticsEntry } from '../../services/haClient';

const GRAPH_REFRESH_MS = 5 * 60 * 1000;
const GRAPH_REFRESH_SLOW_MS = 60 * 60 * 1000;

const SENSOR_THRESHOLD_COLOR_MAP: Record<string, string> = {
  red: 'var(--color-red-500)',
  amber: 'var(--color-amber-400)',
  green: 'var(--color-green-400)',
};

const DEFAULT_SENSOR_COLOR_THRESHOLDS = [
  { limit: 20, color: 'red' },
  { limit: 60, color: 'amber' },
  { limit: 100, color: 'green' },
];

type SensorCardViewSettings = SensorCardSettings & {
  showControls?: boolean;
  showName?: boolean;
  showIcon?: boolean;
  showGraph?: boolean;
  size?: string;
  sensorVariant?: string;
  sensorLayout?: string;
  graphRange?: unknown;
  graphStyle?: string;
  graphStat?: string;
  sensorMinType?: string;
  sensorMaxType?: string;
  sensorMin?: unknown;
  sensorMax?: unknown;
  sensorMinEntity?: string;
  sensorMaxEntity?: string;
  sensorValueMode?: string;
  sensorUseColorThresholds?: boolean;
  sensorColorThresholds?: { limit?: unknown; color?: string }[];
};

interface SensorCardProps {
  entity: EntityMap[string] | null | undefined;
  entities?: EntityMap;
  conn?: Connection | null;
  callService?: CardCallService;
  connected?: boolean;
  settings: SensorCardViewSettings;
  dragProps?: Record<string, unknown>;
  cardStyle?: CSSProperties;
  Icon?: IconComponent | null;
  name: ReactNode;
  editMode?: boolean;
  preview?: boolean;
  controls?: ReactNode;
  onControl?: (action: string, value?: string) => unknown;
  onOpen?: (target?: unknown) => void;
  isMobile?: boolean;
  t?: Translate;
}

const SensorCard = memo(
  /** Sensor value with history graph, gauges and an optional action. */ function SensorCard({
    entity,
    entities = {},
    conn,
    connected,
    callService,
    settings,
    dragProps,
    cardStyle,
    Icon: EntityIcon,
    name,
    editMode,
    preview = false,
    controls,
    onControl,
    onOpen,
    isMobile = false,
    t,
  }: SensorCardProps) {
    const translate: Translate = t || ((key: string) => key);
    const { unitsMode } = useConfig();
    const { haConfig } = useHomeAssistantMeta();
    const config = resolveSensorCardConfig(settings, entity, entities);
    const Icon =
      config.action.trigger === 'icon' && config.action.icon
        ? getIconComponent(config.action.icon) || EntityIcon
        : EntityIcon;
    const primaryDomain = entity?.entity_id?.split('.')[0] || '';
    const primaryState = entity?.state;
    const displayEntity = ['entity', 'attribute'].includes(config.statusMode)
      ? config.statusEntity
      : entity;
    const rawState =
      config.statusMode === 'attribute'
        ? displayEntity?.attributes?.[config.statusAttribute]
        : displayEntity?.state;
    const state =
      rawState && typeof rawState === 'object'
        ? JSON.stringify(rawState)
        : typeof rawState === 'boolean'
          ? String(rawState)
          : rawState;
    const isClimateTemperatureAttribute =
      config.statusMode === 'attribute' &&
      displayEntity?.entity_id?.startsWith('climate.') &&
      ['current_temperature', 'temperature', 'target_temp_high', 'target_temp_low'].includes(
        config.statusAttribute
      );
    const unit =
      config.statusMode === 'attribute'
        ? isClimateTemperatureAttribute
          ? displayEntity?.attributes?.temperature_unit ||
            haConfig?.unit_system?.temperature ||
            haConfig?.temperature_unit ||
            ''
          : ''
        : displayEntity?.attributes?.unit_of_measurement || '';
    const isNumeric =
      config.statusMode !== 'text' &&
      (typeof state === 'string' ? /^\s*-?\d+(\.\d+)?\s*$/.test(state) : !isNaN(parseFloat(state)));
    const domain = displayEntity?.entity_id?.split('.')[0] || '';
    const deviceClass = isClimateTemperatureAttribute
      ? 'temperature'
      : config.statusMode === 'attribute'
        ? undefined
        : displayEntity?.attributes?.device_class;
    const isOnOffState = state === 'on' || state === 'off';
    const isUnavailable = state === 'unavailable' || state === 'unknown';
    const numericState = isNumeric ? parseFloat(state) : null;
    const isBinaryNumeric = isNumeric && !unit && (numericState === 0 || numericState === 1);
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
      config.statusMode === 'text'
        ? ''
        : isNumeric && !isBinaryNumeric && inferredUnitKind
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
            binaryStateKeys[deviceClass as keyof typeof binaryStateKeys]?.[state as 'on' | 'off'] ||
              (state === 'on' ? 'status.on' : 'status.off')
          )
        : null;
    const toggleDisplayState =
      isOnOffState &&
      ['automation', 'input_boolean', 'switch', 'input_number', 'light', 'climate'].includes(domain)
        ? translate(state === 'on' ? 'status.on' : 'status.off')
        : null;
    const sceneDisplayState =
      config.statusMode === 'auto' && domain === 'scene' ? translate('sensor.scene.label') : null;
    const buttonDisplayState =
      config.statusMode === 'auto' && ['button', 'input_button'].includes(domain)
        ? translate('sensor.button.label')
        : null;
    const customScriptStatus =
      typeof settings?.scriptStatusText === 'string' ? settings.scriptStatusText.trim() : '';
    const scriptDisplayState =
      config.statusMode === 'auto' && domain === 'script'
        ? customScriptStatus ||
          translate(state === 'on' ? 'sensor.script.running' : 'sensor.script.ready')
        : null;
    const isSelectDomain = primaryDomain === 'select' || primaryDomain === 'input_select';
    const selectOptions = isSelectDomain ? entity?.attributes?.options || [] : [];
    const automaticDisplayState = isNumeric
      ? formatUnitValue(convertedNumericState, { fallback: '--' })
      : binaryDisplayState ||
        toggleDisplayState ||
        sceneDisplayState ||
        buttonDisplayState ||
        scriptDisplayState ||
        state;
    const displayState =
      config.statusMode === 'text'
        ? config.statusText || automaticDisplayState
        : (automaticDisplayState ?? '--');
    const actionActive = isSensorEntityActive(config.action.targetEntity);
    const actionFeedback = useSensorCardAction({
      conn,
      connected,
      callService,
      action: config.action,
      entities:
        entities[entity?.entity_id as string] === entity
          ? entities
          : { ...entities, ...(entity ? { [entity.entity_id as string]: entity } : {}) },
      onOpen,
      disabled: editMode || preview,
    });
    const [armedAction, setArmedAction] = useState<string | null>(null);
    useEffect(() => {
      if (armedAction === null) return undefined;
      const timer = setTimeout(() => setArmedAction(null), 3000);
      return () => clearTimeout(timer);
    }, [armedAction]);
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
    const showStatus = config.statusMode !== 'hidden';
    const showIcon = settings?.showIcon !== false;
    const isSmall = settings?.size === 'small';
    // The trend is the small-card form of the history graph; large cards draw the full graph.
    const variant =
      settings?.sensorVariant === 'trend' && !isSmall
        ? 'default'
        : settings?.sensorVariant || 'default';
    const isRangeVariant = ['gauge', 'donut', 'bar'].includes(variant);
    const canGraphHistory =
      isNumeric && showStatus && config.statusMode !== 'attribute' && domain !== 'input_number';
    const showGraph =
      !isSmall &&
      canGraphHistory &&
      !preview &&
      settings?.showGraph !== false &&
      variant === 'default';
    const showTrend = isSmall && canGraphHistory && variant === 'trend';
    const loadHistory = showGraph || (showTrend && !preview);
    const graphRange = resolveSensorGraphRange(settings?.graphRange);
    const graphStyle = settings?.graphStyle === 'bar' && !showTrend ? 'bar' : 'line';
    const graphStat =
      graphStyle === 'bar' && SENSOR_GRAPH_STATS.includes(settings?.graphStat as string)
        ? settings.graphStat
        : 'mean';

    // Resolve min/max for gauge/donut/bar
    const { chartMin, chartMax } = useMemo(() => {
      if (!isNumeric || numericState === null) return { chartMin: 0, chartMax: 100 };
      const needsRange = isRangeVariant;
      if (!needsRange) return { chartMin: 0, chartMax: 100 };

      const resolveVal = (type: string, val: unknown, entityId: string | undefined) => {
        if (type === 'entity' && entityId && entities[entityId]) {
          const entityState = entities[entityId]?.state;
          const parsed = parseFloat(entityState as string);
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
    const valueMode = showTrend ? 'actual' : settings?.sensorValueMode || 'actual';
    const chartValue =
      variant !== 'default' && isNumeric && numericState !== null
        ? valueMode === 'percent'
          ? Math.max(
              0,
              Math.min(
                100,
                (((normalizedNumericState as number) - chartMin) / (safeChartMax - chartMin || 1)) *
                  100
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
        Array.isArray(settings?.sensorColorThresholds) &&
        settings.sensorColorThresholds.length === 3
          ? settings.sensorColorThresholds
          : DEFAULT_SENSOR_COLOR_THRESHOLDS;

      return source
        .map((item, index) => {
          const parsedLimit = parseFloat(item?.limit as string);
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

      if (
        !isRangeVariant ||
        thresholdInputValue === null ||
        !Number.isFinite(thresholdInputValue)
      ) {
        return 'var(--accent-color)';
      }

      const matchedThreshold = colorThresholds.find(
        (threshold) => thresholdInputValue <= threshold.limit
      );
      const selectedColor =
        matchedThreshold?.color || colorThresholds[colorThresholds.length - 1]?.color;
      return SENSOR_THRESHOLD_COLOR_MAP[selectedColor] || 'var(--accent-color)';
    }, [useColorThresholds, isRangeVariant, thresholdInputValue, colorThresholds]);
    const chartAriaLabel = `${String(name)}: ${chartDisplayValue ?? displayState}${
      displayNumericUnit && valueMode !== 'percent' ? ` ${displayNumericUnit}` : ''
    }.${isRangeVariant ? ` ${chartMin}–${safeChartMax}.` : ''}`;
    const showVariantPanel =
      !isSmall &&
      variant !== 'default' &&
      canSensorUseNumericVariants(config, displayEntity, entity) &&
      showStatus &&
      (variant === 'number' || (isNumeric && normalizedNumericState !== null));
    const showSmallVariantVisual =
      showStatus &&
      isSmall &&
      (isRangeVariant || showTrend) &&
      isNumeric &&
      normalizedNumericState !== null;
    const useDenseMobileSmallLayout = isMobile && isSmall;
    const useDenseMobileLargeLayout = isMobile && !isSmall;
    const smallVariantGaugeSize = 80;
    // On two-column phones the visual gives way so the value is never cut short.
    const smallVariantWideVisualClass = useDenseMobileSmallLayout
      ? 'h-auto w-[clamp(2.75rem,24cqw,4.5rem)]'
      : 'h-auto w-[clamp(3.5rem,25cqw,6rem)]';
    const smallTrendClass = useDenseMobileSmallLayout
      ? 'h-8 w-[clamp(2.5rem,22cqw,5rem)]'
      : 'h-10 w-[clamp(4rem,24cqw,6.5rem)]';
    const smallVariantDonutSize = useDenseMobileSmallLayout ? 36 : 42;
    const smallVariantBarHeight = useDenseMobileSmallLayout ? 7 : 8;
    const largeVariantGaugeSize = useDenseMobileLargeLayout ? 88 : 124;
    const largeVariantDonutSize = useDenseMobileLargeLayout ? 64 : 96;
    const largeVariantBarHeight = useDenseMobileLargeLayout ? 14 : 20;
    const useCompactMobileRangeLayout = useDenseMobileLargeLayout && showVariantPanel;

    const [history, setHistory] = useState<TimeSeriesPoint[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const historyWindowRef = useRef<SensorGraphWindow | null>(null);

    useEffect(() => {
      if (typeof IntersectionObserver === 'undefined') {
        setIsVisible(true);
        return undefined;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
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

    const refreshTick = useRefreshTick(conn, {
      enabled: loadHistory && isVisible,
      intervalMs: SENSOR_GRAPH_RANGES[graphRange] > 48 ? GRAPH_REFRESH_SLOW_MS : GRAPH_REFRESH_MS,
    });

    useEffect(() => {
      if (!conn || !displayEntity?.entity_id || !loadHistory || !isVisible) {
        if (!isVisible && loadHistory) {
          // Keep empty while waiting for visibility
          return;
        }
        // If we are visible but no graph needed or no conn, clear
        if (!loadHistory) setHistory([]);
        return;
      }

      let cancelled = false;
      const parseStatistics = (stats: StatisticsEntry[] | null | undefined): TimeSeriesPoint[] =>
        (stats && Array.isArray(stats) ? stats : [])
          .map((d) => ({
            value:
              typeof d.mean === 'number' ? d.mean : typeof d.state === 'number' ? d.state : d.sum,
            ...(typeof d.min === 'number' ? { min: d.min } : {}),
            ...(typeof d.max === 'number' ? { max: d.max } : {}),
            ...(typeof d.change === 'number' ? { change: d.change } : {}),
            time: new Date(d.start),
          }))
          .filter((d) => !isNaN(parseFloat(d.value)));
      const fetchHistory = async () => {
        try {
          const end = new Date();
          const graphWindow = getSensorGraphWindow(graphRange, end);
          const rangeHours = SENSOR_GRAPH_RANGES[graphRange];
          const start =
            graphStyle === 'bar'
              ? graphWindow.start
              : new Date(end.getTime() - rangeHours * 60 * 60 * 1000);
          historyWindowRef.current = graphWindow;
          const preferStatistics = rangeHours > 48;
          const loadStatistics = async () =>
            parseStatistics(
              await getStatistics(conn, {
                statisticId: displayEntity.entity_id as string,
                start,
                end,
                period: graphWindow.period,
                ...(graphStyle === 'bar' || preferStatistics
                  ? { types: ['mean', 'min', 'max', 'state', 'change'] }
                  : {}),
              })
            );

          if (preferStatistics) {
            const statPoints = await loadStatistics();
            if (cancelled) return;
            if (graphStyle === 'bar' && statPoints.length > 0) {
              setHistory(statPoints);
              return;
            }
            if (statPoints.length > 1) {
              setHistory(downsampleTimeSeries(statPoints));
              return;
            }
          }

          const data =
            !preferStatistics || rangeHours <= 168
              ? await getHistory(conn, {
                  entityId: displayEntity.entity_id as string,
                  start,
                  end,
                  minimal_response: true,
                })
              : [];
          if (cancelled) return;

          const processed = historyRowsToPoints(data);

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
            setHistory(graphStyle === 'bar' ? processed : downsampleTimeSeries(processed));
            return;
          }

          const statPoints = preferStatistics ? [] : await loadStatistics();
          if (cancelled) return;

          if (graphStyle === 'bar' && statPoints.length > 0) {
            setHistory(statPoints);
            return;
          }

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

          setHistory([]);
        } catch (e) {
          if (cancelled) return;
          // What is on screen stays until a later fetch succeeds.
          console.error('Failed to fetch history', e);
        }
      };

      let idleId: number | undefined;
      let timerId: ReturnType<typeof setTimeout> | undefined;

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => fetchHistory(), { timeout: 4000 });
      } else {
        timerId = setTimeout(() => fetchHistory(), Math.random() * 500);
      }

      return () => {
        cancelled = true;
        if (idleId) window.cancelIdleCallback(idleId);
        if (timerId) clearTimeout(timerId);
      };
    }, [
      conn,
      displayEntity?.entity_id,
      loadHistory,
      isVisible,
      graphRange,
      graphStyle,
      refreshTick,
    ]);

    const graphData = useMemo(() => {
      if (graphStyle !== 'bar' || history.length === 0 || !historyWindowRef.current) return history;
      const bars = aggregateTimeSeries(history, {
        ...historyWindowRef.current,
        stat: graphStat,
        stateClass: displayEntity?.attributes?.state_class as string | undefined,
      });
      return bars.length > 0 ? bars : history;
    }, [history, graphStyle, graphStat, displayEntity?.attributes?.state_class]);

    // Early return AFTER all hooks to respect Rules of Hooks
    if (!entity) return null;

    // Determine controls based on domain
    const managedAction =
      !config.action.isAutomatic ||
      Boolean(
        config.action.label || config.action.labelOn || config.action.labelOff || config.action.icon
      ) ||
      config.action.trigger !== 'button' ||
      config.action.entityId !== entity.entity_id ||
      ['scene', 'script', 'button', 'input_button', 'climate'].includes(primaryDomain);
    const useCompactMobileActionLayout = useDenseMobileLargeLayout && managedAction;
    const isToggleDomain =
      !managedAction && ['input_boolean', 'switch', 'automation', 'light'].includes(primaryDomain);
    const showToggleControls = isToggleDomain && showControls;
    const showCompactMobileToggleState = isMobile && showToggleControls && showStatus && !isNumeric;
    const useCompactMobileToggleLayout = useDenseMobileLargeLayout && showToggleControls;
    const useCompactSelectLayout = isSelectDomain && !isSmall;
    const useCompactDesktopSelectLayout = useCompactSelectLayout && !useDenseMobileLargeLayout;
    const compactToggleStateTone = isUnavailable
      ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
      : state === 'on'
        ? 'border-transparent bg-[var(--accent-bg)] text-[var(--accent-color)]'
        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]';

    const renderCompactToggleState = (size = 'large') => (
      <span
        className={`inline-flex w-fit items-center rounded-full border font-bold tracking-widest uppercase transition-colors duration-200 ${size === 'small' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'} ${compactToggleStateTone}`}
      >
        {displayState}
      </span>
    );

    const control = (action: string, value?: string) => {
      if (editMode || preview) return;
      Promise.resolve(onControl?.(action, value)).catch(() => {});
    };
    const renderSelectDropdown = (compact = false) => (
      <ModernDropdown
        label={translate('sensor.select.label')}
        icon={compact ? undefined : List}
        options={selectOptions}
        current={primaryState || ''}
        onChange={(option) => {
          control('select_option', option);
        }}
        placeholder={translate('sensor.select.label')}
        labelHidden
        variant="compact"
        menuPortal
        menuAlign="end"
        menuMinWidth={compact ? 180 : 220}
        stopPropagation
        wrapperClassName={compact ? 'w-auto' : 'w-full'}
        buttonClassName={
          compact
            ? `${useDenseMobileSmallLayout ? 'min-w-[4.75rem] max-w-[7rem] px-2.5 py-2' : 'min-w-[5.5rem] max-w-[7.5rem] px-3 py-2.5'} rounded-xl`
            : `${useCompactSelectLayout ? 'rounded-xl px-3 py-2.5' : 'rounded-2xl px-3.5 py-3'} w-full`
        }
        valueClassName={
          compact
            ? 'max-w-[4.5rem] text-[9px] tracking-[0.16em]'
            : `${useCompactSelectLayout ? 'text-[9px] tracking-[0.16em]' : 'text-[10px] tracking-[0.18em]'} max-w-full`
        }
        menuClassName={compact ? 'shadow-[0_18px_48px_rgba(0,0,0,0.35)]' : ''}
        optionClassName={compact ? 'text-[10px]' : 'text-[11px]'}
      />
    );

    const actionUnavailable = Boolean(
      config.action.type !== 'service' &&
      config.action.entityId &&
      (!config.action.targetEntity ||
        !config.action.targetSupported ||
        config.action.targetEntity.state === 'unavailable' ||
        (config.action.targetEntity.state === 'unknown' &&
          ['toggle', 'turn_on', 'turn_off'].includes(config.action.type)))
    );
    const actionDisabled =
      editMode ||
      preview ||
      actionFeedback.pending ||
      (config.action.type === 'url'
        ? !config.action.url
        : config.action.type !== 'more-info' && (!conn || actionUnavailable));
    const actionLabel =
      (actionActive ? config.action.labelOn : config.action.labelOff) ||
      config.action.label ||
      (config.action.type === 'scene'
        ? translate('sensor.scene.activate')
        : config.action.type === 'script'
          ? translate('sensor.script.run')
          : config.action.type === 'toggle'
            ? translate(actionActive ? 'sensor.action.turnOff' : 'sensor.action.turnOn')
            : config.action.type === 'turn_on'
              ? translate('sensor.action.turnOn')
              : config.action.type === 'turn_off'
                ? translate('sensor.action.turnOff')
                : config.action.type === 'more-info'
                  ? translate('sensor.action.details')
                  : config.action.type === 'press'
                    ? translate('sensor.action.press')
                    : config.action.type === 'url'
                      ? translate('sensor.action.openLink')
                      : translate('sensor.scene.activate'));
    const ActionIcon =
      getIconComponent(config.action.icon) ||
      (['toggle', 'turn_on', 'turn_off'].includes(config.action.type)
        ? Power
        : config.action.type === 'more-info'
          ? ArrowRight
          : config.action.type === 'url'
            ? ExternalLink
            : Play);
    const confirmText = config.action.confirmLabel || translate('sensor.action.confirmPrompt');
    const isArmed = (override?: string) => armedAction === (override || 'default');
    const executeAction = (event?: { stopPropagation(): void }, override?: string) => {
      event?.stopPropagation();
      if (actionDisabled) return;
      const key = typeof override === 'string' ? override : 'default';
      if (config.action.confirm && armedAction !== key) {
        setArmedAction(key);
        return;
      }
      setArmedAction(null);
      actionFeedback.execute(override);
    };
    const armedTone =
      'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] ring-1 ring-[var(--status-warning-border)]';
    const handleCardClick = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      if (editMode || preview) return;
      if (config.action.trigger === 'card' && config.action.type !== 'none') executeAction(event);
      else onOpen?.(event);
    };
    const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      handleCardClick(event);
    };
    const renderFeedback = (showConfirm = true) =>
      armedAction !== null
        ? showConfirm && (
            <span
              role="status"
              aria-live="polite"
              className="block text-xs font-semibold text-[var(--status-warning-fg)]"
            >
              {confirmText}
            </span>
          )
        : actionFeedback.status !== 'idle' && (
            <span
              role="status"
              aria-live="polite"
              className={`block text-xs ${['error', 'timeout'].includes(actionFeedback.status) ? 'text-[var(--status-error-fg)]' : 'text-[var(--text-secondary)]'}`}
            >
              {translate(`sensor.action.${actionFeedback.status}`)}
            </span>
          );
    const renderPrimaryButton = (compact = false) =>
      showControls &&
      config.action.type !== 'none' &&
      config.action.trigger === 'button' && (
        <button
          type="button"
          onClick={executeAction}
          disabled={actionDisabled}
          aria-busy={actionFeedback.pending}
          title={isArmed() ? confirmText : actionLabel}
          className={`relative z-20 flex min-h-11 ${compact ? 'max-w-[min(10rem,45cqw)] shrink-0 px-3 @max-[200px]:w-11 @max-[200px]:px-0' : 'w-full px-4'} items-center justify-center gap-2 rounded-xl border py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-60 ${isArmed() ? `border-transparent ${armedTone}` : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'}`}
        >
          {actionFeedback.pending ? (
            <RefreshCw className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
          ) : actionFeedback.status === 'confirmed' || actionFeedback.status === 'sent' ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <ActionIcon className="h-4 w-4 shrink-0" />
          )}
          <span
            className={`${compact ? 'line-clamp-2 @max-[200px]:sr-only' : ''} min-w-0 break-words`}
          >
            {isArmed() ? confirmText : actionLabel}
          </span>
        </button>
      );

    const renderControls = () => {
      if (managedAction)
        return (
          <div className={isSmall ? '' : useCompactMobileActionLayout ? 'mt-2' : 'mt-4'}>
            {renderPrimaryButton(isSmall)}
          </div>
        );
      // Select entities always show the dropdown since it is the primary interaction
      if (isSelectDomain && selectOptions.length > 0) {
        if (isSmall) {
          return renderSelectDropdown(true);
        }

        return (
          <div className={`${useCompactSelectLayout ? 'mt-2.5' : 'mt-4'} w-full`}>
            {renderSelectDropdown()}
          </div>
        );
      }

      if (!showControls) return null;

      if (primaryDomain === 'input_number') {
        const min = entity.attributes?.min || 0;
        const max = entity.attributes?.max || 100;
        const val = parseFloat(primaryState as string);
        const inputDisabled = isUnavailableState(primaryState) || Number.isNaN(val);
        const inputUnit = entity.attributes?.unit_of_measurement || '';
        const inputKind = inferUnitKind(entity.attributes?.device_class, inputUnit);
        const inputDisplayValue = inputKind
          ? convertValueByKind(val, {
              kind: inputKind,
              fromUnit: inputUnit,
              unitMode: effectiveUnitMode,
            })
          : val;
        const inputDisplayUnit = inputKind
          ? getDisplayUnitForKind(inputKind, effectiveUnitMode)
          : inputUnit;

        if (isSmall) {
          return (
            <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--glass-bg)] p-0.5">
              <button
                aria-label={translate('common.increase')}
                onClick={(e) => {
                  e.stopPropagation();
                  control('increment');
                }}
                className="relative flex h-5 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] transition-all before:absolute before:-inset-x-2.5 before:-top-6 before:-bottom-0.5 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-40"
                disabled={inputDisabled || val >= max}
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                aria-label={translate('common.decrease')}
                onClick={(e) => {
                  e.stopPropagation();
                  control('decrement');
                }}
                className="relative flex h-5 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] transition-all before:absolute before:-inset-x-2.5 before:-top-0.5 before:-bottom-6 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-40"
                disabled={inputDisabled || val <= min}
              >
                <Minus className="h-3 w-3" />
              </button>
            </div>
          );
        }

        return (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[var(--glass-bg)] px-2.5 py-1.5">
            <button
              aria-label={translate('common.decrease')}
              onClick={(e) => {
                e.stopPropagation();
                control('decrement');
              }}
              className="relative flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all before:absolute before:-inset-2 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-40"
              disabled={inputDisabled || val <= min}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                <GlideNumber
                  value={inputDisplayValue}
                  format={(value) => formatUnitValue(value, { fallback: '--' })}
                />
              </span>
              <span className="ml-1 text-[10px] font-medium tracking-wider text-[var(--text-secondary)] uppercase">
                {inputDisplayUnit}
              </span>
            </div>
            <button
              aria-label={translate('common.increase')}
              onClick={(e) => {
                e.stopPropagation();
                control('increment');
              }}
              className="relative flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all before:absolute before:-inset-2 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-40"
              disabled={inputDisabled || val >= max}
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

    // Numbers count to new values; percent mode counts the rounded percentage.
    const showsPercent = valueMode === 'percent' && chartValue !== null;
    const glideValue = showsPercent ? chartValue : isNumeric ? normalizedNumericState : null;
    const renderValue = () =>
      typeof glideValue === 'number' && Number.isFinite(glideValue) ? (
        <GlideNumber
          value={glideValue}
          format={(value) =>
            showsPercent
              ? `${Math.round(value)}%`
              : formatUnitValue(value, { fallback: String(displayState) })
          }
        />
      ) : (
        (chartDisplayValue ?? displayState)
      );

    // The trend ends at the live reading (same unit as the history) until the next refresh.
    const lastHistoryValue = history[history.length - 1]?.value;
    const trendData =
      !showTrend || numericState === null
        ? []
        : history.length === 0
          ? preview
            ? [{ value: numericState }, { value: numericState }]
            : []
          : lastHistoryValue === numericState
            ? history
            : [...history, { value: numericState }];

    const renderSmallVariantVisual = () => {
      if (!showSmallVariantVisual) return null;

      if (showTrend) {
        return (
          <div className={smallTrendClass}>
            {trendData.length > 0 && (
              <SensorTrend
                data={trendData}
                color={variantColor}
                className="h-full w-full"
                ariaLabel={chartAriaLabel}
              />
            )}
          </div>
        );
      }

      if (variant === 'gauge') {
        return (
          <Gauge
            value={normalizedNumericState}
            min={chartMin}
            max={safeChartMax}
            size={smallVariantGaugeSize}
            color={variantColor}
            className={smallVariantWideVisualClass}
            ariaLabel={chartAriaLabel}
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
            color={variantColor}
            ariaLabel={chartAriaLabel}
          />
        );
      }

      if (variant === 'bar') {
        return (
          <div className={smallVariantWideVisualClass}>
            <Bar
              value={normalizedNumericState}
              min={chartMin}
              max={safeChartMax}
              height={smallVariantBarHeight}
              color={variantColor}
              ariaLabel={chartAriaLabel}
            />
          </div>
        );
      }

      return null;
    };

    const iconIsAction = config.action.trigger === 'icon' && config.action.type !== 'none';
    const IconTag = iconIsAction ? 'button' : 'div';
    const SmallIconTag = iconIsAction || showToggleControls ? 'button' : 'div';
    const cardIsAction = config.action.trigger === 'card' && config.action.type !== 'none';
    const showDetailsButton = cardIsAction && config.action.type !== 'more-info';
    const cardIsInteractive = (cardIsAction || managedAction) && !editMode && !preview;
    const cardLabel = cardIsAction
      ? isArmed()
        ? confirmText
        : actionLabel
      : `${String(name)}: ${translate('sensor.action.details')}`;
    const showInputStatus =
      primaryDomain !== 'input_number' || managedAction || config.statusMode !== 'auto';
    const detailsButton = showDetailsButton && (
      <button
        type="button"
        disabled={editMode || preview}
        aria-label={translate('sensor.action.details')}
        title={translate('sensor.action.details')}
        onClick={(event) => {
          event.stopPropagation();
          onOpen?.();
        }}
        className="relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors before:absolute before:-inset-1.5 hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    );
    const actionCaption =
      config.action.trigger !== 'button' && config.action.type !== 'none'
        ? config.action.label
        : '';
    const renderActionCaption = (className = '') =>
      actionCaption ? (
        <span
          className={`flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] ${className}`}
        >
          <ActionIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{actionCaption}</span>
        </span>
      ) : null;

    const useCenteredLayout =
      settings?.sensorLayout === 'centered' &&
      !isSmall &&
      !isNumeric &&
      !isSelectDomain &&
      primaryDomain !== 'input_number' &&
      !showVariantPanel;

    if (isSmall) {
      const smallToggleIconClass = isArmed()
        ? armedTone
        : showToggleControls
          ? actionActive
            ? 'ring-1 ring-[var(--accent-color)]/40 bg-[var(--accent-bg)] text-[var(--accent-color)]'
            : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50'
          : iconIsAction && actionActive
            ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
            : iconToneClass;
      // On a narrow card a gauge or ring is the picture, so a plain icon makes room for the name.
      const hideIconWhenNarrow =
        showSmallVariantVisual && !showTrend && !iconIsAction && !showToggleControls;

      return (
        <div
          ref={cardRef}
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          role={cardIsInteractive ? 'button' : undefined}
          tabIndex={cardIsInteractive ? 0 : undefined}
          aria-label={cardIsInteractive ? cardLabel : undefined}
          aria-busy={cardIsAction ? actionFeedback.pending : undefined}
          aria-disabled={cardIsAction ? !!actionDisabled : undefined}
          className={`touch-feedback group relative flex h-full overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${useDenseMobileSmallLayout ? 'items-center gap-3 p-3 pl-4' : 'items-center gap-3 p-4 pl-5'} ${!editMode ? 'cursor-pointer' : 'cursor-move'}`}
          style={{ ...cardStyle, containerType: 'inline-size' }}
        >
          {controls}
          <div
            className={`relative flex min-w-0 flex-1 items-center ${useDenseMobileSmallLayout ? 'gap-2.5' : 'gap-3'}`}
          >
            {showIcon && (
              <SmallIconTag
                type={iconIsAction || showToggleControls ? 'button' : undefined}
                disabled={iconIsAction || showToggleControls ? actionDisabled : undefined}
                aria-label={
                  iconIsAction || showToggleControls
                    ? isArmed()
                      ? confirmText
                      : actionLabel
                    : undefined
                }
                aria-busy={iconIsAction || showToggleControls ? actionFeedback.pending : undefined}
                className={`flex flex-shrink-0 items-center justify-center ${iconIsAction || showToggleControls ? 'h-11 w-11 rounded-xl' : useDenseMobileSmallLayout ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl'} ${hideIconWhenNarrow ? '@max-[220px]:hidden' : ''} ${smallToggleIconClass} transition-all duration-200 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
                onClick={
                  (iconIsAction || showToggleControls) && !editMode && !preview
                    ? (e) => {
                        e.stopPropagation();
                        executeAction(e);
                      }
                    : undefined
                }
                tabIndex={iconIsAction || showToggleControls ? 0 : undefined}
                style={showToggleControls ? { cursor: 'pointer' } : undefined}
              >
                {(iconIsAction || showToggleControls) && actionFeedback.pending ? (
                  <RefreshCw className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                ) : Icon ? (
                  <Icon
                    className={`${useDenseMobileSmallLayout ? 'h-4.5 w-4.5' : 'h-5 w-5'} stroke-[1.5px]`}
                  />
                ) : (
                  <Activity className={useDenseMobileSmallLayout ? 'h-4.5 w-4.5' : 'h-5 w-5'} />
                )}
              </SmallIconTag>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              {showName && (
                <CardName
                  className={`${useDenseMobileSmallLayout ? 'mb-1 text-[10px]' : 'mb-1.5 text-xs'} max-w-full leading-tight font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60`}
                >
                  {String(name)}
                </CardName>
              )}
              {showStatus && (
                <div
                  className={`flex min-w-0 items-baseline ${useDenseMobileSmallLayout ? 'gap-0.5' : 'gap-1'}`}
                >
                  {showToggleControls ? (
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-200 ${isActiveState ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)]'}`}
                    >
                      {displayState}
                    </span>
                  ) : showCompactMobileToggleState ? (
                    renderCompactToggleState('small')
                  ) : (
                    <span
                      className={`${useDenseMobileSmallLayout ? 'truncate text-[13px]' : 'text-sm'} min-w-0 leading-none font-bold text-[var(--text-primary)] tabular-nums`}
                    >
                      {renderValue()}
                    </span>
                  )}
                  {!showToggleControls &&
                    !showCompactMobileToggleState &&
                    displayNumericUnit &&
                    valueMode !== 'percent' && (
                      <span
                        className={`${useDenseMobileSmallLayout ? 'text-[9px]' : 'text-[10px]'} shrink-0 leading-none font-medium tracking-wider text-[var(--text-secondary)] uppercase`}
                      >
                        {displayNumericUnit}
                      </span>
                    )}
                </div>
              )}
              {actionFeedback.status !== 'idle' || armedAction !== null
                ? renderFeedback()
                : renderActionCaption('mt-1 @max-[200px]:hidden')}
            </div>

            {showSmallVariantVisual && (
              <div
                className={`pointer-events-none ml-auto shrink-0 pr-1 ${showTrend ? '@max-[220px]:hidden' : ''}`}
                data-sensor-graph={variant}
              >
                {renderSmallVariantVisual()}
              </div>
            )}
          </div>

          {!showToggleControls && <div className="shrink-0">{renderControls()}</div>}
          {detailsButton}
        </div>
      );
    }

    if (useCenteredLayout) {
      const showCenteredButton =
        showControls &&
        config.action.type !== 'none' &&
        config.action.trigger === 'button' &&
        (managedAction || showToggleControls);
      const centeredButtonTone = isArmed()
        ? armedTone
        : config.action.type === 'more-info'
          ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
          : actionActive
            ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] hover:opacity-90'
            : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90';

      return (
        <div
          ref={cardRef}
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          data-sensor-layout="centered"
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          role={cardIsInteractive ? 'button' : undefined}
          tabIndex={cardIsInteractive ? 0 : undefined}
          aria-label={cardIsInteractive ? cardLabel : undefined}
          aria-busy={cardIsAction ? actionFeedback.pending : undefined}
          aria-disabled={cardIsAction ? !!actionDisabled : undefined}
          className={`touch-feedback group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${useDenseMobileLargeLayout ? 'p-5' : 'p-4 sm:p-7'} ${!editMode ? 'cursor-pointer' : 'cursor-move'}`}
          style={cardStyle}
        >
          {controls}
          {detailsButton && <div className="absolute top-3 right-3 z-20">{detailsButton}</div>}
          {showIcon && (
            <IconTag
              type={iconIsAction ? 'button' : undefined}
              disabled={iconIsAction ? actionDisabled : undefined}
              onClick={iconIsAction ? executeAction : undefined}
              aria-label={iconIsAction ? (isArmed() ? confirmText : actionLabel) : undefined}
              aria-busy={iconIsAction ? actionFeedback.pending : undefined}
              className={`relative z-10 flex shrink-0 items-center justify-center rounded-full ${useDenseMobileLargeLayout ? 'mb-3 p-4' : 'mb-4 p-5'} ${iconIsAction && isArmed() ? armedTone : iconIsAction && actionActive ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : iconToneClass} [transition:transform_500ms,background-color_200ms,color_200ms] group-hover:scale-110 group-hover:rotate-3`}
            >
              {iconIsAction && actionFeedback.pending ? (
                <RefreshCw
                  className={`${useDenseMobileLargeLayout ? 'h-6 w-6' : 'h-8 w-8'} animate-spin motion-reduce:animate-none`}
                />
              ) : Icon ? (
                <Icon
                  className={`${useDenseMobileLargeLayout ? 'h-6 w-6' : 'h-8 w-8'} stroke-[1.5px]`}
                />
              ) : (
                <Activity className={useDenseMobileLargeLayout ? 'h-6 w-6' : 'h-8 w-8'} />
              )}
            </IconTag>
          )}
          <div className="relative z-10 w-full min-w-0 px-4 text-center">
            {showStatus && (
              <p
                className={`truncate text-xs font-bold tracking-widest uppercase ${armedAction !== null ? 'text-[var(--status-warning-fg)]' : 'text-[var(--text-secondary)] opacity-60'}`}
              >
                {armedAction !== null ? confirmText : displayState}
              </p>
            )}
            {showName && (
              <CardName
                lines={1}
                className={`${showStatus ? 'mt-1' : ''} text-xs tracking-widest text-[var(--text-muted)] uppercase opacity-40`}
              >
                {String(name)}
              </CardName>
            )}
            {renderFeedback(!showStatus)}
            {renderActionCaption('mt-1 justify-center')}
          </div>
          {showCenteredButton && (
            <button
              type="button"
              onClick={executeAction}
              disabled={actionDisabled}
              aria-busy={actionFeedback.pending}
              aria-label={isArmed() ? confirmText : actionLabel}
              title={isArmed() ? confirmText : actionLabel}
              className={`relative z-20 mt-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 disabled:opacity-60 ${centeredButtonTone}`}
            >
              {actionFeedback.pending ? (
                <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : actionFeedback.status === 'confirmed' || actionFeedback.status === 'sent' ? (
                <Check className="h-4 w-4" />
              ) : (
                <ActionIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        ref={cardRef}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role={cardIsInteractive ? 'button' : undefined}
        tabIndex={cardIsInteractive ? 0 : undefined}
        aria-label={cardIsInteractive ? cardLabel : undefined}
        aria-busy={cardIsAction ? actionFeedback.pending : undefined}
        aria-disabled={cardIsAction ? !!actionDisabled : undefined}
        className={`touch-feedback group relative flex h-full flex-col overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${useCompactMobileActionLayout ? 'p-3' : useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'p-4' : 'p-5') : useCompactDesktopSelectLayout ? 'p-5' : 'p-7'} ${useCompactMobileToggleLayout || useCompactSelectLayout ? 'justify-start' : 'justify-between'} ${!editMode ? 'cursor-pointer' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}

        <div className="pointer-events-none absolute -right-4 -bottom-4 text-[var(--glass-border)] opacity-[0.03]">
          {Icon && <Icon size={140} />}
        </div>

        {showGraph && graphData.length > 0 && (
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 z-0 h-24"
            data-sensor-graph="history"
            data-graph-range={graphRange}
          >
            <SparkLine
              data={graphData}
              height={96}
              currentIndex={graphData.length - 1}
              fade
              bleed
              variant={graphStyle}
              maxBars={graphData.length}
              zeroBaseline={graphStat === 'change'}
              ariaLabel={chartAriaLabel}
            />
          </div>
        )}

        <div
          className={`relative z-10 flex shrink-0 items-start justify-between ${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'gap-2.5' : 'gap-3') : useCompactDesktopSelectLayout ? 'gap-2.5' : ''}`}
        >
          <div className="flex min-w-0 flex-col items-start">
            {showIcon ? (
              <IconTag
                type={iconIsAction ? 'button' : undefined}
                disabled={iconIsAction ? actionDisabled : undefined}
                onClick={iconIsAction ? executeAction : undefined}
                aria-label={iconIsAction ? (isArmed() ? confirmText : actionLabel) : undefined}
                aria-busy={iconIsAction ? actionFeedback.pending : undefined}
                className={`flex items-center justify-center ${iconIsAction ? 'h-11 w-11 rounded-2xl' : useCompactMobileActionLayout ? 'h-8 w-8 rounded-xl' : useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl') : useCompactDesktopSelectLayout ? 'h-10 w-10 rounded-xl' : 'h-11 w-11 rounded-2xl'} ${iconIsAction && isArmed() ? armedTone : iconIsAction && actionActive ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : iconToneClass} [transition:transform_500ms,background-color_200ms,color_200ms] group-hover:scale-110 group-hover:rotate-3`}
              >
                {iconIsAction && actionFeedback.pending ? (
                  <RefreshCw className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                ) : Icon ? (
                  <Icon
                    className={`${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'h-[15px] w-[15px]' : 'h-4 w-4') : useCompactDesktopSelectLayout ? 'h-4 w-4' : 'h-5 w-5'} stroke-[1.5px]`}
                  />
                ) : (
                  <Activity
                    className={
                      useDenseMobileLargeLayout
                        ? useCompactMobileToggleLayout
                          ? 'h-[15px] w-[15px]'
                          : 'h-4 w-4'
                        : useCompactDesktopSelectLayout
                          ? 'h-4 w-4'
                          : 'h-5 w-5'
                    }
                  />
                )}
              </IconTag>
            ) : (
              <div
                className={
                  useDenseMobileLargeLayout
                    ? useCompactMobileToggleLayout
                      ? 'h-9 w-9'
                      : 'h-10 w-10'
                    : useCompactDesktopSelectLayout
                      ? 'h-10 w-10'
                      : 'h-11 w-11'
                }
              />
            )}

            {!useDenseMobileLargeLayout && showName && (
              <CardName
                className={`${useCompactDesktopSelectLayout ? 'mt-1.5 text-[10px] leading-[1.15]' : 'mt-2 text-xs'} w-full font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60`}
              >
                {String(name)}
              </CardName>
            )}

            {showCompactMobileToggleState && (
              <div className={useCompactMobileToggleLayout ? 'mt-1.5' : 'mt-2'}>
                {renderCompactToggleState(useCompactMobileToggleLayout ? 'small' : 'large')}
              </div>
            )}
          </div>

          {showInputStatus && showStatus && isNumeric && (
            <div
              className={`flex shrink-0 items-baseline justify-end text-right ${useCompactMobileRangeLayout ? 'gap-1' : useDenseMobileLargeLayout ? 'gap-1.5' : 'gap-1.5'}`}
            >
              <span
                className={`${useCompactMobileRangeLayout ? 'text-[1.3rem]' : useDenseMobileLargeLayout ? 'text-[1.65rem]' : 'text-3xl'} leading-none font-thin whitespace-nowrap text-[var(--text-primary)] tabular-nums`}
              >
                {renderValue()}
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

        {useDenseMobileLargeLayout && showName && (
          <CardName
            className={`relative z-10 shrink-0 ${useCompactMobileToggleLayout || useCompactMobileActionLayout ? 'mt-1 text-[9px]' : 'mt-1.5 text-[10px]'} w-full font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60`}
          >
            {String(name)}
          </CardName>
        )}

        <div
          className={`relative z-10 ${useDenseMobileLargeLayout ? (useCompactMobileToggleLayout || useCompactMobileActionLayout ? 'mt-1' : useCompactMobileRangeLayout ? 'mt-1' : 'mt-2') : useCompactDesktopSelectLayout ? 'mt-2.5' : 'mt-4'} ${useCompactMobileToggleLayout ? 'mt-auto pt-2' : ''}`}
        >
          {showInputStatus && showStatus && !isNumeric && !showCompactMobileToggleState && (
            <div
              className={
                useCompactMobileActionLayout
                  ? ''
                  : useDenseMobileLargeLayout
                    ? 'mb-2'
                    : useCompactDesktopSelectLayout
                      ? 'mb-2'
                      : 'mb-3'
              }
            >
              <span
                className={`${useDenseMobileLargeLayout ? (isSelectDomain ? 'text-[1.2rem]' : 'text-[1.4rem]') : useCompactDesktopSelectLayout ? 'text-[2rem]' : 'text-3xl'} block truncate leading-none font-thin text-[var(--text-primary)]`}
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
                disabled={actionDisabled}
                aria-busy={actionFeedback.pending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (primaryState === 'on') executeAction(e, 'turn_off');
                }}
                aria-label={isArmed('turn_off') ? confirmText : undefined}
                className={`${useDenseMobileLargeLayout ? `${useCompactMobileToggleLayout ? 'flex h-9 items-center justify-center rounded-xl px-2.5 py-2 text-[9px]' : 'flex h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px]'} bg-[var(--glass-bg)]` : 'rounded-full px-4 py-2 text-xs'} font-bold tracking-widest uppercase transition-all ${isArmed('turn_off') ? armedTone : primaryState !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {translate('common.off')}
              </button>
              <button
                disabled={actionDisabled}
                aria-busy={actionFeedback.pending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (primaryState !== 'on') executeAction(e, 'turn_on');
                }}
                aria-label={isArmed('turn_on') ? confirmText : undefined}
                className={`${useDenseMobileLargeLayout ? `${useCompactMobileToggleLayout ? 'flex h-9 items-center justify-center rounded-xl px-2.5 py-2 text-[9px]' : 'flex h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px]'} bg-[var(--glass-bg)]` : 'rounded-full px-4 py-2 text-xs'} font-bold tracking-widest uppercase transition-all ${isArmed('turn_on') ? armedTone : primaryState === 'on' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {translate('common.on')}
              </button>
            </div>
          ) : (
            <>{renderControls()}</>
          )}
          {renderFeedback(!(managedAction && showControls && config.action.trigger === 'button'))}
          {(actionCaption || detailsButton) && (
            <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
              {renderActionCaption()}
              {detailsButton && <span className="ml-auto">{detailsButton}</span>}
            </div>
          )}

          {showVariantPanel && (
            <div
              className={`${useDenseMobileLargeLayout ? 'mt-1.5 space-y-1 overflow-hidden' : 'mt-4 space-y-3'} transition-all duration-300`}
            >
              {variant === 'gauge' && isNumeric && normalizedNumericState !== null && (
                <div
                  className={`${useDenseMobileLargeLayout ? 'flex items-center justify-center overflow-hidden' : '-mt-1 flex items-center justify-center'}`}
                >
                  <Gauge
                    value={normalizedNumericState}
                    min={chartMin}
                    max={safeChartMax}
                    size={largeVariantGaugeSize}
                    color={variantColor}
                    ariaLabel={chartAriaLabel}
                  />
                </div>
              )}

              {variant === 'donut' && isNumeric && normalizedNumericState !== null && (
                <div
                  className={`${useDenseMobileLargeLayout ? 'flex items-center justify-center overflow-hidden' : '-mt-5 flex items-center justify-center'}`}
                >
                  <Donut
                    value={normalizedNumericState}
                    min={chartMin}
                    max={safeChartMax}
                    size={largeVariantDonutSize}
                    color={variantColor}
                    ariaLabel={chartAriaLabel}
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
                  ariaLabel={chartAriaLabel}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default SensorCard;
