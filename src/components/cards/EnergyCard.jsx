import { memo, useEffect, useRef, useState } from 'react';
import { Home, Sun, Zap } from '../../icons';
import { formatUnitValue } from '../../utils';

const getNumericState = (entities, entityId) => {
  if (!entityId || !entities?.[entityId]) return null;
  const state = entities[entityId]?.state;
  if (state === null || state === undefined || state === 'unavailable' || state === 'unknown') {
    return null;
  }
  const value = parseFloat(state);
  return Number.isFinite(value) ? value : null;
};

const getEntityUnit = (entities, entityId, fallback = '') =>
  entities?.[entityId]?.attributes?.unit_of_measurement || fallback;

const formatEntityReading = (entities, entityId, fallbackUnit = '') => {
  const value = getNumericState(entities, entityId);
  if (value === null) return '--';
  const unit = getEntityUnit(entities, entityId, fallbackUnit);
  const normalizedUnit = String(unit || '').trim().toLowerCase();

  if (normalizedUnit === 'kw' && Math.abs(value) < 1) {
    const watts = value * 1000;
    const formattedWatts = formatUnitValue(watts, { fallback: '--' });
    return `${formattedWatts} W`;
  }

  const formatted = formatUnitValue(value, { fallback: '--' });
  return unit ? `${formatted} ${unit}` : formatted;
};

const nodeBaseClass =
  'absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1.5 text-center';

const CIRCLE_R = 31; // half of 62px circle — fixed pixels to prevent line detachment at any container width

const FLOW_LAYOUT = {
  solar:   { x: 50, y: 5 },
  grid:    { x: 14, y: 80 },
  home:    { x: 86, y: 60 },
  battery: { x: 50, y: 100 },
};

// Compact layout for narrow cards (<480px): nodes raised and tightened
const FLOW_LAYOUT_COMPACT = {
  solar:   { x: 50, y: 6 },
  grid:    { x: 14, y: 34 },
  home:    { x: 86, y: 34 },
  battery: { x: 50, y: 78 },
};

const scalePoint = (point, width, height) => ({
  x: (point.x / 100) * width,
  y: (point.y / 100) * height,
});

const buildFlowPaths = ({ solar, grid, home, battery }, width, height) => {
  const R = CIRCLE_R;
  const d = 4;

  const solarPoint = scalePoint(solar, width, height);
  const gridPoint = scalePoint(grid, width, height);
  const homePoint = scalePoint(home, width, height);
  const batteryPoint = scalePoint(battery, width, height);

  const curveToSide = (startX, startY, endX, endY, side) => {
    const ctrlOff = Math.max(20, (10 / 100) * width);
    const controlX = side === 'left' ? endX + ctrlOff : endX - ctrlOff;
    return `M${startX},${startY} C${startX},${endY} ${controlX},${endY} ${endX},${endY}`;
  };

  return {
    batteryHome: curveToSide(batteryPoint.x + d, batteryPoint.y - R, homePoint.x - R, homePoint.y + d, 'right'),
    gridHome: `M${gridPoint.x + R},${gridPoint.y} H${homePoint.x - R}`,
    solarGrid: curveToSide(solarPoint.x - d, solarPoint.y + R, gridPoint.x + R, gridPoint.y - d, 'left'),
    solarHome: curveToSide(solarPoint.x + d, solarPoint.y + R, homePoint.x - R, homePoint.y - d, 'right'),
    solarBattery: `M${solarPoint.x},${solarPoint.y + R} V${batteryPoint.y - R}`,
  };
};

function FlowNode({ icon: Icon, value, secondaryValue, accent, x, y, bottom }) {
  return (
    <div
      className={nodeBaseClass}
      style={bottom !== undefined
        ? { left: `${x}%`, bottom: `${bottom}px`, top: 'auto' }
        : { left: `${x}%`, top: `${y}%` }
      }
    >
      <div
        className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full border backdrop-blur-sm"
        style={{
          background: `radial-gradient(circle at 50% 36%, ${accent}18 0%, ${accent}08 30%, rgba(48,45,76,0.96) 100%)`,
          borderColor: `${accent}36`,
          color: accent,
          boxShadow: `0 10px 28px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        <Icon className="mb-1 h-[28px] w-[28px]" />
        <div className="flex flex-col items-center gap-[2px] px-0 py-0">
          {value ? (
            <div
              className="text-[11px] font-semibold leading-none text-[var(--text-primary)]"
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              {value}
            </div>
          ) : null}
          {secondaryValue ? <div className="flex flex-col items-center gap-[1px]">{secondaryValue}</div> : null}
        </div>
      </div>
    </div>
  );
}

function BatteryLevelIcon({ className = '', level = null }) {
  const safeLevel = Number.isFinite(level) ? Math.max(0, Math.min(100, level)) : null;
  const fillHeight = safeLevel === null ? 0 : 2 + (safeLevel / 100) * 12;

  return (
    <svg
      viewBox="0 0 16 24"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="1" width="4" height="2" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="3" y="3" width="10" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      {safeLevel !== null ? (
        <rect
          x="4.6"
          y={19 - fillHeight}
          width="6.8"
          height={fillHeight}
          rx="1.2"
          fill="currentColor"
          opacity="0.28"
        />
      ) : null}
      <text
        x="8"
        y="14"
        textAnchor="middle"
        fontSize="6.2"
        fontWeight="700"
        fill="var(--text-primary)"
        dominantBaseline="middle"
      >
        {safeLevel === null ? '--' : `${Math.round(safeLevel)}`}
      </text>
    </svg>
  );
}

function GridPylonIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3L8.8 8.2H10.7L7.9 13H10.3L8.9 21M12 3L15.2 8.2H13.3L16.1 13H13.7L15.1 21M6.5 8.2H17.5M7.8 13H16.2M10.1 17H13.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlowPath({
  id,
  className,
  d,
  active,
  reverse = false,
  duration = 2.2,
  strength = 0,
}) {
  const [showOrbs, setShowOrbs] = useState(false);

  useEffect(() => {
    setShowOrbs(active);
  }, [active]);

  const pathOpacity = active ? 1 : 0.18;
  const strokeWidth = active ? 1.8 : 1.3;
  const orbRadius = 3.2;

  return (
    <>
      <path
        id={id}
        d={d}
        className={className}
        vectorEffect="non-scaling-stroke"
        style={{ opacity: pathOpacity, strokeWidth }}
      />
      {active && showOrbs && (
        <>
          {[0, 1].map((i) => (
            <circle
              key={i}
              r={orbRadius}
              className={`${className} energy-flow-orb`}
              vectorEffect="non-scaling-stroke"
              style={i === 1 ? { opacity: 0 } : undefined}
            >
              {i === 1 && (
                <animate
                  attributeName="opacity"
                  values="0;1"
                  begin={`${duration / 2}s`}
                  dur="0.001s"
                  fill="freeze"
                />
              )}
              <animateMotion
                dur={`${duration}s`}
                repeatCount="indefinite"
                calcMode="paced"
                begin={i === 1 ? `${duration / 2}s` : undefined}
                keyPoints={reverse ? '1;0' : undefined}
                keyTimes={reverse ? '0;1' : undefined}
              >
                <mpath href={`#${id}`} />
              </animateMotion>
            </circle>
          ))}
        </>
      )}
    </>
  );
}

const EnergyCard = memo(function EnergyCard({
  cardId,
  entities,
  settings,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  isMobile,
  onOpen,
  t,
}) {
  const flowRef = useRef(null);
  const [flowSize, setFlowSize] = useState(null);

  useEffect(() => {
    if (!flowRef.current || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setFlowSize({ width, height });
      }
    });

    observer.observe(flowRef.current);
    return () => observer.disconnect();
  }, []);

  const name = customNames?.[cardId] || settings?.heading || t?.('addCard.type.energy') || 'Energy';
  const isSmall = settings?.size === 'small';
  const hasBattery = settings?.hasBattery ?? true; // Default to true for backward compatibility
  const hasSolar = settings?.hasSolar ?? true; // Default to true for backward compatibility

  const solarPower = hasSolar ? Math.max(0, getNumericState(entities, settings?.solarProductionInstantId) || 0) : 0;
  const gridImportPower = Math.max(0, getNumericState(entities, settings?.gridConsumptionInstantId) || 0);
  const gridExportPower = Math.max(0, getNumericState(entities, settings?.gridInjectionInstantId) || 0);
  const batteryChargePower = hasBattery ? Math.max(0, getNumericState(entities, settings?.batteryInjectionInstantId) || 0) : 0;
  const batteryDischargePower = hasBattery ? Math.max(0, getNumericState(entities, settings?.batteryConsumptionInstantId) || 0) : 0;
  const batteryLevelValue = hasBattery ? getNumericState(entities, settings?.batteryLevelId) : null;
  const homePower = Math.max(0, getNumericState(entities, settings?.homeConsumptionInstantId) || 0);

  const solarToHomePower = hasSolar ? Math.min(solarPower, homePower) : 0;
  const homeAfterSolarPower = Math.max(0, homePower - solarToHomePower);
  const batteryToHomePower = hasBattery ? Math.min(batteryDischargePower, homeAfterSolarPower) : 0;
  const gridToHomePower = Math.min(gridImportPower, Math.max(0, homeAfterSolarPower - batteryToHomePower));

  const solarAfterHomePower = hasSolar ? Math.max(0, solarPower - solarToHomePower) : 0;
  const solarToBatteryPower = hasSolar && hasBattery ? Math.min(batteryChargePower, solarAfterHomePower) : 0;
  const gridToBatteryPower = hasBattery ? Math.min(gridImportPower, Math.max(0, batteryChargePower - solarToBatteryPower)) : 0;

  const solarToGridPower = hasSolar ? Math.min(gridExportPower, Math.max(0, solarAfterHomePower - solarToBatteryPower)) : 0;
  const batteryToGridPower = hasBattery ? Math.min(
    gridExportPower,
    Math.max(0, batteryDischargePower - batteryToHomePower)
  ) : 0;
  const batteryGridExchangePower = hasBattery ? Math.max(gridToBatteryPower, batteryToGridPower) : 0;
  const maxAnimatedPower = Math.max(
    solarToHomePower,
    solarToGridPower,
    solarToBatteryPower,
    gridToHomePower,
    batteryToHomePower,
    batteryGridExchangePower,
    1
  );
  const strengthOf = (value) => Math.max(0, Math.min(1, value / maxAnimatedPower));

  const display = {
    solar: hasSolar ? formatEntityReading(entities, settings?.solarProductionInstantId, 'W') : null,
    home: formatEntityReading(entities, settings?.homeConsumptionInstantId, 'W'),
    grid:
      gridExportPower > gridImportPower
        ? formatEntityReading(entities, settings?.gridInjectionInstantId, 'W')
        : formatEntityReading(entities, settings?.gridConsumptionInstantId, 'W'),
    battery: hasBattery ? (
      batteryDischargePower > batteryChargePower
        ? formatEntityReading(entities, settings?.batteryConsumptionInstantId, 'W')
        : formatEntityReading(entities, settings?.batteryInjectionInstantId, 'W')
    ) : null,
    batteryInjection: hasBattery ? formatEntityReading(entities, settings?.batteryInjectionInstantId, 'W') : null,
    batteryConsumption: hasBattery ? formatEntityReading(entities, settings?.batteryConsumptionInstantId, 'W') : null,
    batteryLevel: hasBattery ? formatEntityReading(entities, settings?.batteryLevelId, '%') : null,
  };

  const safeId = String(cardId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const pathIds = {
    batteryHome: `${safeId}_battery_home`,
    gridHome: `${safeId}_grid_home`,
    solarGrid: `${safeId}_solar_grid`,
    solarHome: `${safeId}_solar_home`,
    solarBattery: `${safeId}_solar_battery`,
  };
  const measured = flowSize !== null;
  const fw = flowSize?.width ?? 0;
  const fh = flowSize?.height ?? 0;
  const baseLayout = fw < 480 ? FLOW_LAYOUT_COMPACT : FLOW_LAYOUT;
  // Pin battery to bottom of container so it's never clipped regardless of card height
  const batteryYPct = fh > 0
    ? Math.round(((fh - CIRCLE_R)*1.1 / fh) * 100)
    : baseLayout.battery.y;
  const homeYPct = fh > 0
    ? Math.round(((fh * 0.47) / fh) * 100)
    : baseLayout.home.y;
  const gridYPct = fh > 0
    ? Math.round(((fh * 0.47) / fh) * 100)
    : baseLayout.grid.y;
  const activeLayout = { ...baseLayout, battery: { x: 50, y: batteryYPct }, home: { x: 86, y: homeYPct }, grid: { x: 14, y: gridYPct } };
  const flowPaths = measured ? buildFlowPaths(activeLayout, fw, fh) : null;

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen?.();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${
          !editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'
        }`}
        style={cardStyle}
      >
        {controls}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
          >
            <Zap className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {name}
            </p>
            <div className="text-lg font-light text-[var(--text-primary)]">{display.home}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen?.();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${
        isMobile ? 'gap-4 p-5' : 'gap-4 p-6'
      } ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <style>{`
        .energy-flow-svg {
          overflow: visible;
        }
        .energy-path-grid {
          stroke: #60a5fa;
          stroke-width: 1.8;
          fill: none;
          stroke-linecap: round;
        }
        .energy-path-solar {
          stroke: #fbbf24;
          stroke-width: 1.8;
          fill: none;
          stroke-linecap: round;
        }
        .energy-path-battery {
          stroke: #a78bfa;
          stroke-width: 1.8;
          fill: none;
          stroke-linecap: round;
        }
        .energy-flow-orb {
          fill: rgba(255,255,255,0.96);
          filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor);
        }
      `}</style>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[0.22em] text-[var(--text-secondary)] uppercase opacity-60">
            {name}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1" style={{ minHeight: fw < 480 ? 110 : 0 }}>
        <div ref={flowRef} className="absolute inset-0">
          {measured && (
          <svg
            className="energy-flow-svg h-full w-full"
            viewBox={`0 0 ${fw} ${fh}`}
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
          >
            {hasBattery && (
              <FlowPath
                id={pathIds.batteryHome}
                className="energy-path-battery"
                d={flowPaths.batteryHome}
                active={batteryToHomePower > 0}
                duration={2.2}
                strength={strengthOf(batteryToHomePower)}
              />
            )}
            <FlowPath
              id={pathIds.gridHome}
              className="energy-path-grid"
              d={flowPaths.gridHome}
              active={gridToHomePower > 0}
              duration={2}
              strength={strengthOf(gridToHomePower)}
            />
            {hasSolar && (
              <FlowPath
                id={pathIds.solarGrid}
                className="energy-path-solar"
                d={flowPaths.solarGrid}
                active={solarToGridPower > 0}
                duration={2.4}
                strength={strengthOf(solarToGridPower)}
              />
            )}
            {hasSolar && (
              <FlowPath
                id={pathIds.solarHome}
                className="energy-path-solar"
                d={flowPaths.solarHome}
                active={solarToHomePower > 0}
                duration={2.1}
                strength={strengthOf(solarToHomePower)}
              />
            )}
            {hasSolar && hasBattery && (
              <FlowPath
                id={pathIds.solarBattery}
                className="energy-path-battery"
                d={flowPaths.solarBattery}
                active={solarToBatteryPower > 0}
                duration={2.6}
                strength={strengthOf(solarToBatteryPower)}
              />
            )}
          </svg>
          )}
        </div>

        {measured && (
          <>
            {hasSolar && (
              <FlowNode
                icon={Sun}
                value={null}
                secondaryValue={
                  <div className="text-[9px] leading-none text-[var(--text-primary)]">{display.solar}</div>
                }
                accent="#fbbf24"
                x={activeLayout.solar.x}
                y={activeLayout.solar.y}
              />
            )}

            <FlowNode
              icon={GridPylonIcon}
              value={null}
              secondaryValue={
                <>
                  <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">
                    ← <span className="text-[var(--text-primary)]">{formatEntityReading(entities, settings?.gridInjectionInstantId, 'W')}</span>
                  </div>
                  <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">
                    → <span className="text-[var(--text-primary)]">{formatEntityReading(entities, settings?.gridConsumptionInstantId, 'W')}</span>
                  </div>
                </>
              }
              accent="#60a5fa"
              x={activeLayout.grid.x}
              y={activeLayout.grid.y}
            />

            <FlowNode
              icon={Home}
              value={null}
              secondaryValue={
                <div className="text-[9px] leading-none text-[var(--text-primary)]">{display.home}</div>
              }
              accent="#e5eef8"
              x={activeLayout.home.x}
              y={activeLayout.home.y}
            />

            {hasBattery && (
              <FlowNode
                icon={(props) => <BatteryLevelIcon {...props} level={batteryLevelValue} />}
                value={null}
                secondaryValue={
                  <>
                    <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">
                      ↓ <span className="text-[var(--text-primary)]">{display.batteryInjection}</span>
                    </div>
                    <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">
                      ↑ <span className="text-[var(--text-primary)]">{display.batteryConsumption}</span>
                    </div>
                  </>
                }
                accent="#a78bfa"
                x={activeLayout.battery.x}
                y={activeLayout.battery.y}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default EnergyCard;
