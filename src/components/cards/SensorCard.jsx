import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
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
  Info,
  getIconComponent,
} from '../../icons';
import { getHistory, getStatistics } from '../../services/haClient';
import SparkLine from '../charts/SparkLine';
import { Gauge, Donut, Bar } from '../charts/SensorGauge';
import ModernDropdown from '../ui/ModernDropdown';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import {
  resolveSensorCardConfig,
  isSensorEntityActive,
  canSensorUseNumericVariants,
} from '../../utils/sensorCardConfig';
import { useSensorCardAction } from '../../hooks/useSensorCardAction';
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

const SensorCard = memo(
  /** @param {any} props */ function SensorCard({
    entity,
    entities = {},
    conn,
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
  }) {
    const translate = t || ((key) => key);
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
            binaryStateKeys[deviceClass]?.[state] || (state === 'on' ? 'status.on' : 'status.off')
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
      callService,
      action: config.action,
      entities:
        entities[entity?.entity_id] === entity
          ? entities
          : { ...entities, ...(entity ? { [entity.entity_id]: entity } : {}) },
      onOpen,
      disabled: editMode || preview,
    });
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
    const variant = settings?.sensorVariant || 'default';
    const isRangeVariant = ['gauge', 'donut', 'bar'].includes(variant);
    const showGraph =
      !isSmall &&
      isNumeric &&
      showStatus &&
      config.statusMode !== 'attribute' &&
      !preview &&
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
        Array.isArray(settings?.sensorColorThresholds) &&
        settings.sensorColorThresholds.length === 3
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
      showStatus && isSmall && isRangeVariant && isNumeric && normalizedNumericState !== null;
    const useDenseMobileSmallLayout = isMobile && isSmall;
    const useDenseMobileLargeLayout = isMobile && !isSmall;
    const smallVariantGaugeSize = 80;
    const smallVariantGaugeStroke = 8;
    const smallVariantWideVisualClass = useDenseMobileSmallLayout
      ? 'h-auto w-[clamp(3.5rem,24cqw,4.5rem)]'
      : 'h-auto w-[clamp(3.5rem,25cqw,6rem)]';
    const smallVariantDonutSize = useDenseMobileSmallLayout ? 36 : 42;
    const smallVariantDonutStroke = useDenseMobileSmallLayout ? 5 : 6;
    const smallVariantBarHeight = useDenseMobileSmallLayout ? 7 : 8;
    const largeVariantGaugeSize = useDenseMobileLargeLayout ? 88 : 124;
    const largeVariantGaugeStroke = useDenseMobileLargeLayout ? 10 : 14;
    const largeVariantDonutSize = useDenseMobileLargeLayout ? 64 : 96;
    const largeVariantDonutStroke = useDenseMobileLargeLayout ? 6 : 10;
    const largeVariantBarHeight = useDenseMobileLargeLayout ? 14 : 20;
    const useCompactMobileRangeLayout = useDenseMobileLargeLayout && showVariantPanel;

    const [history, setHistory] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);

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
      if (!conn || !displayEntity?.entity_id || !showGraph || !isVisible) {
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
            entityId: displayEntity.entity_id,
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
            statisticId: displayEntity.entity_id,
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
    }, [conn, displayEntity?.entity_id, showGraph, state, isVisible]);

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
        className={`inline-flex w-fit items-center rounded-full border font-bold tracking-widest uppercase ${size === 'small' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'} ${compactToggleStateTone}`}
      >
        {displayState}
      </span>
    );

    const control = (action, value) => {
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

    const actionUnavailable =
      config.action.type !== 'service' &&
      config.action.entityId &&
      (!config.action.targetEntity ||
        !config.action.targetSupported ||
        config.action.targetEntity.state === 'unavailable' ||
        (config.action.targetEntity.state === 'unknown' &&
          ['toggle', 'turn_on', 'turn_off'].includes(config.action.type)));
    const actionDisabled =
      editMode ||
      preview ||
      actionFeedback.pending ||
      (config.action.type !== 'more-info' && (!conn || actionUnavailable));
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
                    : translate('sensor.scene.activate'));
    const ActionIcon =
      getIconComponent(config.action.icon) ||
      (['toggle', 'turn_on', 'turn_off'].includes(config.action.type)
        ? Power
        : config.action.type === 'more-info'
          ? ArrowRight
          : Play);
    const executeAction = (event, override) => {
      event?.stopPropagation();
      if (actionDisabled) return;
      actionFeedback.execute(override);
    };
    const handleCardClick = (event) => {
      if (editMode || preview) return;
      if (config.action.trigger === 'card' && config.action.type !== 'none') executeAction(event);
      else onOpen?.(event);
    };
    const handleCardKeyDown = (event) => {
      if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      handleCardClick(event);
    };
    const renderFeedback = () =>
      actionFeedback.status !== 'idle' && (
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
          title={actionLabel}
          className={`relative z-20 flex min-h-11 ${compact ? 'max-w-[min(10rem,45cqw)] shrink-0 px-3 @max-[200px]:w-11 @max-[200px]:px-0' : 'w-full px-4'} items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2 text-xs font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 disabled:opacity-60`}
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
            {actionLabel}
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
        const val = parseFloat(primaryState);
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
                onClick={(e) => {
                  e.stopPropagation();
                  control('increment');
                }}
                className="flex h-5 w-6 items-center justify-center rounded-md text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                disabled={val >= max}
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  control('decrement');
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
                control('decrement');
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
              disabled={val <= min}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
                {formatUnitValue(inputDisplayValue, { fallback: '--' })}
              </span>
              <span className="ml-1 text-[10px] font-medium tracking-wider text-[var(--text-secondary)] uppercase">
                {inputDisplayUnit}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                control('increment');
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
            strokeWidth={smallVariantDonutStroke}
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
      ? actionLabel
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

    if (isSmall) {
      const smallToggleIconClass = showToggleControls
        ? actionActive
          ? 'ring-1 ring-[var(--accent-color)]/40 bg-[var(--accent-bg)] text-[var(--accent-color)]'
          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50'
        : iconIsAction && actionActive
          ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
          : iconToneClass;

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
                aria-label={iconIsAction || showToggleControls ? actionLabel : undefined}
                aria-busy={iconIsAction || showToggleControls ? actionFeedback.pending : undefined}
                className={`flex flex-shrink-0 items-center justify-center ${iconIsAction || showToggleControls ? 'h-11 w-11 rounded-xl' : useDenseMobileSmallLayout ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl'} ${smallToggleIconClass} transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]`}
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
                <p
                  className={`${useDenseMobileSmallLayout ? 'mb-1 text-[10px]' : 'mb-1.5 text-xs'} block max-w-full truncate leading-none font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60`}
                  title={String(name)}
                >
                  {String(name)}
                </p>
              )}
              {showStatus && (
                <div
                  className={`flex min-w-0 items-baseline ${useDenseMobileSmallLayout ? 'gap-0.5' : 'gap-1'}`}
                >
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
              {actionFeedback.status !== 'idle'
                ? renderFeedback()
                : renderActionCaption('mt-1 @max-[200px]:hidden')}
            </div>

            {showSmallVariantVisual && (
              <div
                className="pointer-events-none ml-auto shrink-0 pr-1"
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

        {showGraph && history.length > 0 && (
          <div
            className="pointer-events-none absolute right-0 bottom-0 left-0 z-0 h-24"
            data-sensor-graph="history"
          >
            <SparkLine
              data={history}
              height={96}
              currentIndex={history.length - 1}
              fade
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
                aria-label={iconIsAction ? actionLabel : undefined}
                aria-busy={iconIsAction ? actionFeedback.pending : undefined}
                className={`flex items-center justify-center ${iconIsAction ? 'h-11 w-11 rounded-2xl' : useCompactMobileActionLayout ? 'h-8 w-8 rounded-xl' : useDenseMobileLargeLayout ? (useCompactMobileToggleLayout ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl') : useCompactDesktopSelectLayout ? 'h-10 w-10 rounded-xl' : 'h-11 w-11 rounded-2xl'} ${iconIsAction && actionActive ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : iconToneClass} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
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
              <p
                className={`${useCompactDesktopSelectLayout ? 'mt-1.5 text-[10px] leading-[1.15]' : 'mt-2 text-xs'} line-clamp-2 w-full font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60`}
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

          {showInputStatus && showStatus && isNumeric && (
            <div
              className={`flex shrink-0 items-baseline justify-end text-right ${useCompactMobileRangeLayout ? 'gap-1' : useDenseMobileLargeLayout ? 'gap-1.5' : 'gap-1.5'}`}
            >
              <span
                className={`${useCompactMobileRangeLayout ? 'text-[1.3rem]' : useDenseMobileLargeLayout ? 'text-[1.65rem]' : 'text-3xl'} leading-none font-thin whitespace-nowrap text-[var(--text-primary)] tabular-nums`}
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

        {useDenseMobileLargeLayout && showName && (
          <p
            className={`relative z-10 shrink-0 ${useCompactMobileToggleLayout || useCompactMobileActionLayout ? 'mt-1 text-[9px]' : 'mt-1.5 text-[10px]'} line-clamp-2 w-full font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60`}
            title={String(name)}
          >
            {String(name)}
          </p>
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
                className={`${useDenseMobileLargeLayout ? `${useCompactMobileToggleLayout ? 'flex h-9 items-center justify-center rounded-xl px-2.5 py-2 text-[9px]' : 'flex h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px]'} bg-[var(--glass-bg)]` : 'rounded-full px-4 py-2 text-xs'} font-bold tracking-widest uppercase transition-all ${primaryState !== 'on' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
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
                className={`${useDenseMobileLargeLayout ? `${useCompactMobileToggleLayout ? 'flex h-9 items-center justify-center rounded-xl px-2.5 py-2 text-[9px]' : 'flex h-10 items-center justify-center rounded-xl px-3 py-2 text-[10px]'} bg-[var(--glass-bg)]` : 'rounded-full px-4 py-2 text-xs'} font-bold tracking-widest uppercase transition-all ${primaryState === 'on' ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {translate('common.on')}
              </button>
            </div>
          ) : (
            <>{renderControls()}</>
          )}
          {renderFeedback()}
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
                    strokeWidth={largeVariantGaugeStroke}
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
                    strokeWidth={largeVariantDonutStroke}
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
