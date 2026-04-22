import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { X, Sun, Home, Zap } from '../icons';
import { getStatistics } from '../services/haClient';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { Gauge } from '../components/charts/SensorGauge';

// ── helpers ──────────────────────────────────────────────────────────────────

const parseNum = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

const fmtKwh = (v, dec = 2) => {
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  if (!Number.isFinite(n)) return '--';
  return `${n.toFixed(dec)} kWh`;
};

const fmtCost = (v, currency = '€', dec = 2) => {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '';
  return `${Number(v).toFixed(dec)} ${currency}`;
};

const getTodayStart = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
};

const computeTodayTotal = (stats) => {
  if (!stats?.length) return null;
  const sorted = [...stats].sort((a, b) => new Date(a.start) - new Date(b.start));
  const sums = sorted.map(s => parseNum(s.sum)).filter(v => v !== null);
  if (sums.length >= 2) return Math.max(0, sums[sums.length - 1] - sums[0]);
  if (sums.length === 1) return Math.max(0, sums[0]);
  const states = sorted.map(s => parseNum(s.state ?? s.mean)).filter(v => v !== null);
  if (states.length >= 2) return Math.max(0, states[states.length - 1] - states[0]);
  return null;
};

// ── sub-components ────────────────────────────────────────────────────────────

function StatGaugeCard({ label, value, unit, pct, color }) {
  const safePercent = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div
      className="flex flex-col items-center justify-between gap-2 rounded-2xl border p-4 text-center"
      style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}
    >
      <Gauge value={safePercent} min={0} max={100} size={100} strokeWidth={10} color={color} />
      <div className="mt-[-8px]">
        <div className="text-xl font-semibold text-[var(--text-primary)]">
          {value !== null && value !== undefined && unit
            ? `${Number(value).toFixed(1)} ${unit}`
            : pct !== null && pct !== undefined
              ? `${Math.round(safePercent)} %`
              : '--'}
        </div>
        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{label}</div>
      </div>
    </div>
  );
}

function ColorSwatch({ color }) {
  return (
    <span
      className="inline-block h-4 w-6 flex-shrink-0 rounded-sm"
      style={{ background: color, opacity: 0.8 }}
    />
  );
}

function SourcesTable({ rows, t }) {
  if (!rows.length) return (
    <div className="py-6 text-center text-sm text-[var(--text-muted)]">
      {t?.('energy.noData') || 'No data available'}
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-[var(--text-muted)]" style={{ borderColor: 'var(--glass-border)' }}>
            <th className="pb-2 text-left font-medium">{t?.('energy.source') || 'Source'}</th>
            <th className="pb-2 text-right font-medium">{t?.('energy.usage') || 'Usage'}</th>
            <th className="pb-2 text-right font-medium">{t?.('energy.cost') || 'Coût'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b ${row.isTotal ? 'font-semibold' : ''}`}
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  {row.color ? <ColorSwatch color={row.color} /> : <span className="w-6" />}
                  <span className="text-[var(--text-primary)]">{row.label}</span>
                </div>
              </td>
              <td className="py-2.5 text-right text-[var(--text-primary)]">{row.usage}</td>
              <td className="py-2.5 text-right text-[var(--text-secondary)]">{row.cost || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── flow diagram (same structure as EnergyCard) ───────────────────────────────

// Node positions as % of container. More vertical spread than EnergyCard.
const MODAL_FLOW_LAYOUT = {
  solar:   { x: 50, y: 10 },
  grid:    { x: 12, y: 44 },
  home:    { x: 88, y: 44 },
  battery: { x: 50, y: 78 },
};

const CIRCLE_R = 37; // half of the 74px circle, fixed px

// Uses fixed pixel circle radius so paths always touch circle edges
// regardless of container width (fixes detachment on wide modals).
const buildModalFlowPaths = (layout, width, height) => {
  const toXY = (p) => ({ x: (p.x / 100) * width, y: (p.y / 100) * height });
  const solar   = toXY(layout.solar);
  const grid    = toXY(layout.grid);
  const home    = toXY(layout.home);
  const battery = toXY(layout.battery);

  const ctrlOff = Math.max(30, (10 / 100) * width);
  const curve = (x0, y0, x1, y1, side) => {
    const cx = side === 'left' ? x1 + ctrlOff : x1 - ctrlOff;
    return `M${x0},${y0} C${x0},${y1} ${cx},${y1} ${x1},${y1}`;
  };

  const R = CIRCLE_R;
  const d = 4;

  return {
    solarGrid:    curve(solar.x - d,   solar.y + R,   grid.x + R,   grid.y - d,   'left'),
    solarHome:    curve(solar.x + d,   solar.y + R,   home.x - R,   home.y - d,   'right'),
    solarBattery:`M${solar.x},${solar.y + R} V${battery.y - R}`,
    gridHome:    `M${grid.x + R},${grid.y} H${home.x - R}`,
    batteryHome:  curve(battery.x + d, battery.y - R, home.x - R,   home.y + d,   'right'),
  };
};

function FlowPath({ id, className, d, active, reverse = false, duration = 2.2 }) {
  const [showOrbs, setShowOrbs] = useState(false);

  useEffect(() => {
    setShowOrbs(active);
  }, [active]);

  const orbRadius = 3.2;
  return (
    <>
      <path
        id={id}
        d={d}
        className={className}
        vectorEffect="non-scaling-stroke"
        style={{ opacity: active ? 1 : 0.18, strokeWidth: active ? 1.8 : 1.3 }}
      />
      {active && showOrbs && (
        <>
          {[0, 1].map((i) => (
            <circle key={i} r={orbRadius} className={`${className} energy-flow-orb`} vectorEffect="non-scaling-stroke" style={i === 1 ? { opacity: 0 } : undefined}>
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

const nodeBaseClass = 'absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1.5 text-center';

function FlowNode({ icon: Icon, secondaryValue, accent, x, y }) {
  return (
    <div className={nodeBaseClass} style={{ left: `${x}%`, top: `${y}%` }}>
      <div
        className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full border backdrop-blur-sm"
        style={{
          background: `radial-gradient(circle at 50% 36%, ${accent}18 0%, ${accent}08 30%, rgba(48,45,76,0.96) 100%)`,
          borderColor: `${accent}36`,
          color: accent,
          boxShadow: `0 10px 28px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        <Icon className="mb-1 h-[30px] w-[30px]" />
        {secondaryValue && <div className="flex flex-col items-center gap-[1px]">{secondaryValue}</div>}
      </div>
    </div>
  );
}

function GridPylonIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3L8.8 8.2H10.7L7.9 13H10.3L8.9 21M12 3L15.2 8.2H13.3L16.1 13H13.7L15.1 21M6.5 8.2H17.5M7.8 13H16.2M10.1 17H13.9"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function BatteryKwhIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="2" width="10" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="0.5" width="4" height="2" rx="1" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function DailyFlowDiagram({ solar, gridImport, gridExport, batteryCharge, batteryDischarge, home, hasBattery = true, hasSolar = true }) {
  const flowRef = useRef(null);
  const [flowSize, setFlowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!flowRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setFlowSize({ width, height });
    });
    observer.observe(flowRef.current);
    return () => observer.disconnect();
  }, []);

  const showDiagram = flowSize.width > 1 && flowSize.height > 1;
  const fmt = (v) => v !== null && v !== undefined ? `${Number(v).toFixed(1)} kWh` : '--';
  const safe = (v) => Math.max(0, v ?? 0);

  const solarVal          = hasSolar ? safe(solar) : 0;
  const gridExportVal     = safe(gridExport);
  const gridImportVal     = safe(gridImport);
  const batteryChargeVal  = hasBattery ? safe(batteryCharge) : 0;
  const batteryDischargeVal = hasBattery ? safe(batteryDischarge) : 0;
  const homeVal           = safe(home);

  const batteryGridExchange = hasBattery ? Math.max(batteryChargeVal, batteryDischargeVal) : 0;

  const flowPaths = buildModalFlowPaths(MODAL_FLOW_LAYOUT, flowSize.width, flowSize.height);
  const pathIds = {
    batteryHome:  'modal_battery_home',
    gridHome:     'modal_grid_home',
    solarGrid:    'modal_solar_grid',
    solarHome:    'modal_solar_home',
    solarBattery: 'modal_solar_battery',
  };

  // height derived from layout: battery at 78% + circle radius
  const diagramHeight = Math.round(CIRCLE_R / (1 - MODAL_FLOW_LAYOUT.battery.y / 100)) + 8;

  return (
    <div className="relative" style={{ height: diagramHeight }}>
      <style>{`
        .energy-flow-svg { overflow: visible; }
        .energy-path-grid    { stroke: #60a5fa; fill: none; stroke-linecap: round; }
        .energy-path-solar   { stroke: #fbbf24; fill: none; stroke-linecap: round; }
        .energy-path-battery { stroke: #a78bfa; fill: none; stroke-linecap: round; }
        .energy-flow-orb     { fill: rgba(255,255,255,0.96); filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor); }
      `}</style>

      <div ref={flowRef} className="absolute inset-0">
        <svg
          className="energy-flow-svg h-full w-full"
          viewBox={`0 0 ${flowSize.width} ${flowSize.height}`}
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          style={{ visibility: showDiagram ? 'visible' : 'hidden' }}
        >
          {showDiagram && hasBattery && (
            <FlowPath id={pathIds.batteryHome}  className="energy-path-battery" d={flowPaths.batteryHome}  active={batteryDischargeVal > 0}   duration={2.2} />
          )}
          {showDiagram && (
            <FlowPath id={pathIds.gridHome}     className="energy-path-grid"    d={flowPaths.gridHome}     active={gridImportVal > 0}         duration={2.0} />
          )}
          {showDiagram && hasSolar && (
            <FlowPath id={pathIds.solarGrid}    className="energy-path-solar"   d={flowPaths.solarGrid}    active={gridExportVal > 0}         duration={2.4} />
          )}
          {showDiagram && hasSolar && (
            <FlowPath id={pathIds.solarHome}    className="energy-path-solar"   d={flowPaths.solarHome}    active={solarVal > 0 && homeVal > 0} duration={2.1} />
          )}
          {showDiagram && hasSolar && hasBattery && (
            <FlowPath id={pathIds.solarBattery} className="energy-path-battery" d={flowPaths.solarBattery} active={batteryChargeVal > 0 && solarVal > 0} duration={2.6} />
          )}
        </svg>
      </div>

      {hasSolar && (
        <FlowNode
          icon={Sun}
          secondaryValue={<div className="text-[9px] leading-none text-[var(--text-primary)]">{fmt(solar)}</div>}
          accent="#fbbf24"
          x={MODAL_FLOW_LAYOUT.solar.x}
          y={MODAL_FLOW_LAYOUT.solar.y}
        />
      )}
      <FlowNode
        icon={GridPylonIcon}
        secondaryValue={
          <>
            <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">← <span className="text-[var(--text-primary)]">{fmt(gridExport)}</span></div>
            <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">→ <span className="text-[var(--text-primary)]">{fmt(gridImport)}</span></div>
          </>
        }
        accent="#60a5fa"
        x={MODAL_FLOW_LAYOUT.grid.x}
        y={MODAL_FLOW_LAYOUT.grid.y}
      />
      <FlowNode
        icon={Home}
        secondaryValue={<div className="text-[9px] leading-none text-[var(--text-primary)]">{fmt(home)}</div>}
        accent="#e5eef8"
        x={MODAL_FLOW_LAYOUT.home.x}
        y={MODAL_FLOW_LAYOUT.home.y}
      />
      {hasBattery && (
        <FlowNode
          icon={BatteryKwhIcon}
          secondaryValue={
            <>
              <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">↓ <span className="text-[var(--text-primary)]">{fmt(batteryCharge)}</span></div>
              <div className="text-[9px] leading-none text-[var(--text-secondary)] opacity-80">↑ <span className="text-[var(--text-primary)]">{fmt(batteryDischarge)}</span></div>
            </>
          }
          accent="#a78bfa"
          x={MODAL_FLOW_LAYOUT.battery.x}
          y={MODAL_FLOW_LAYOUT.battery.y}
        />
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function EnergyModal({ show, onClose, conn, entities, settings, name, t }) {
  const translate = t || ((k) => k);
  const [dailyStats, setDailyStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);

  const electricityPrice = parseNum(settings?.electricityPrice);
  const injectionPrice = parseNum(settings?.injectionPrice);
  const hasBattery = settings?.hasBattery ?? true; // Default to true for backward compatibility
  const hasSolar = settings?.hasSolar ?? true; // Default to true for backward compatibility

  const dateRange = useMemo(() => {
    const start = getTodayStart();
    start.setDate(start.getDate() + dateOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    if (end > new Date()) end.setTime(Date.now());
    return { start, end };
  }, [dateOffset]);

  const lifetimeIds = useMemo(() => ({
    solar: settings?.solarProductionLifetimeId,
    gridExport: settings?.gridInjectionLifetimeId,
    gridImport: settings?.gridConsumptionLifetimeId,
    batteryCharge: settings?.batteryInjectionLifetimeId,
    batteryDischarge: settings?.batteryConsumptionLifetimeId,
    home: settings?.homeConsumptionLifetimeId,
  }), [settings]);

  const fetchDailyStats = useCallback(async () => {
    if (!conn) return;
    const { start, end } = dateRange;
    const ids = Object.entries(lifetimeIds).filter(([, v]) => v);
    if (!ids.length) return;

    const results = {};
    await Promise.allSettled(
      ids.map(async ([key, id]) => {
        try {
          const stats = await getStatistics(conn, { start, end, statisticId: id, period: 'hour' });
          results[key] = stats;
        } catch {
          results[key] = [];
        }
      })
    );
    setDailyStats(results);
  }, [conn, dateRange, lifetimeIds]);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    fetchDailyStats().finally(() => setLoading(false));
  }, [show, fetchDailyStats]);

  const totals = useMemo(() => ({
    solar: computeTodayTotal(dailyStats.solar),
    gridExport: computeTodayTotal(dailyStats.gridExport),
    gridImport: computeTodayTotal(dailyStats.gridImport),
    batteryCharge: computeTodayTotal(dailyStats.batteryCharge),
    batteryDischarge: computeTodayTotal(dailyStats.batteryDischarge),
    home: computeTodayTotal(dailyStats.home),
  }), [dailyStats]);

  const statCards = useMemo(() => {
    const { solar, gridExport, gridImport, home } = totals;

    const netGrid = (gridExport !== null || gridImport !== null)
      ? (gridExport ?? 0) - (gridImport ?? 0)
      : null;

    const autosuffisancePct = hasSolar && (home !== null && home > 0 && gridImport !== null)
      ? Math.max(0, Math.min(100, ((home - (gridImport ?? 0)) / home) * 100))
      : null;

    const selfConsumedPct = hasSolar && solar !== null && solar > 0 && gridExport !== null
      ? Math.max(0, Math.min(100, ((solar - gridExport) / solar) * 100))
      : null;

    return { netGrid, autosuffisancePct, selfConsumedPct };
  }, [totals]);

  const sourceRows = useMemo(() => {
    const rows = [];
    const { solar, gridExport, gridImport, batteryCharge, batteryDischarge } = totals;

    if (hasSolar && solar !== null) {
      rows.push({ label: translate('energy.solarProduction') || 'Production photovoltaïque totale', color: '#fbbf24', usage: fmtKwh(solar), isTotal: true });
    }
    if (hasBattery && (batteryCharge !== null || batteryDischarge !== null)) {
      if (batteryDischarge !== null) rows.push({ label: translate('energy.batteryDischarge') || 'Consommation totale de la batterie', color: '#a78bfa', usage: fmtKwh(batteryDischarge) });
      if (batteryCharge !== null) rows.push({ label: translate('energy.batteryCharge') || 'Injection totale dans la batterie', color: '#f472b6', usage: fmtKwh(-batteryCharge) });
      if (batteryCharge !== null && batteryDischarge !== null) {
        rows.push({ label: translate('energy.batteryTotal') || 'Batterie totale', isTotal: true, usage: fmtKwh(batteryDischarge - batteryCharge) });
      }
    }
    if (gridImport !== null || gridExport !== null) {
      if (gridImport !== null) {
        rows.push({ label: translate('energy.gridImport') || 'Consommation totale du réseau', color: '#60a5fa', usage: fmtKwh(gridImport), cost: electricityPrice !== null ? fmtCost(gridImport * electricityPrice) : '' });
      }
      if (gridExport !== null) {
        rows.push({ label: translate('energy.gridExport') || 'Injection totale sur le réseau', color: '#c084fc', usage: fmtKwh(-gridExport), cost: injectionPrice !== null ? fmtCost(-gridExport * injectionPrice) : '' });
      }
      if (gridImport !== null && gridExport !== null) {
        const net = gridImport - gridExport;
        const cost = electricityPrice !== null && injectionPrice !== null
          ? fmtCost(gridImport * electricityPrice - gridExport * injectionPrice)
          : '';
        rows.push({ label: translate('energy.gridTotal') || 'Total du réseau', isTotal: true, usage: fmtKwh(net), cost });
      }
    }
    return rows;
  }, [totals, electricityPrice, injectionPrice, translate]);

  const dateLabel = useMemo(() => {
    if (dateOffset === 0) return translate('energy.today') || "Aujourd'hui";
    return new Date(dateRange.start).toLocaleDateString([], { day: 'numeric', month: 'short' });
  }, [dateOffset, dateRange, translate]);

  const { netGrid, autosuffisancePct, selfConsumedPct } = statCards;
  const { solar, gridImport, gridExport, batteryCharge, batteryDischarge, home } = totals;

  if (!show) return null;

  return (
    <AccessibleModalShell
      open={show}
      onClose={onClose}
      titleId="energy-modal-title"
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-12"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          {/* Top-right actions */}
          <div className="absolute top-6 right-6 z-20 md:top-10 md:right-10">
            <button onClick={onClose} className="modal-close" aria-label={translate('common.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Header */}
          <div className="mb-6 flex items-center gap-4 font-sans">
            <div className="rounded-2xl p-4 transition-all duration-500" style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h3
                id="energy-modal-title"
                className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic"
              >
                {name || translate('addCard.type.energy') || 'Énergie'}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full bg-[var(--glass-bg)] px-3 py-1">
                  <button
                    onClick={() => setDateOffset(d => d - 1)}
                    className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    aria-label="Previous day"
                  >‹</button>
                  <span className="min-w-[80px] text-center text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                    {dateLabel}
                  </span>
                  <button
                    onClick={() => setDateOffset(d => Math.min(0, d + 1))}
                    disabled={dateOffset === 0}
                    className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-30"
                    aria-label="Next day"
                  >›</button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Stat gauges */}
            <div className={`grid gap-3 ${hasSolar ? 'grid-cols-3' : 'grid-cols-1'}`}>
              <StatGaugeCard
                label={translate('energy.netGrid') || 'Net restitué au réseau'}
                value={netGrid !== null ? Math.abs(netGrid).toFixed(1) : null}
                unit={netGrid !== null ? 'kWh' : null}
                pct={netGrid !== null && hasSolar && solar ? Math.min(100, (Math.abs(netGrid) / solar) * 100) : 0}
                color="#60a5fa"
              />
              {hasSolar && (
                <StatGaugeCard
                  label={translate('energy.selfConsumed') || 'Énergie solaire auto-consommée'}
                  value={null}
                  pct={selfConsumedPct}
                  color="#fbbf24"
                />
              )}
              {hasSolar && (
                <StatGaugeCard
                  label={translate('energy.autosuffisance') || 'Autosuffisance'}
                  value={null}
                  pct={autosuffisancePct}
                  color="#34d399"
                />
              )}
            </div>

            {/* Energy flow diagram */}
            <div
              className="rounded-2xl border p-5"
              style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}
            >
              <div className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
                {translate('energy.distribution') || "Distribution d'énergie"}
              </div>
              <DailyFlowDiagram
                solar={solar}
                gridImport={gridImport}
                gridExport={gridExport}
                batteryCharge={batteryCharge}
                batteryDischarge={batteryDischarge}
                home={home}
                hasBattery={hasBattery}
                hasSolar={hasSolar}
              />
            </div>

            {/* Sources table */}
            <div
              className="rounded-2xl border p-5"
              style={{ borderColor: 'var(--glass-border)', background: 'var(--card-bg)' }}
            >
              <div className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
                {translate('energy.sources') || 'Sources'}
              </div>
              <SourcesTable rows={sourceRows} t={translate} />
            </div>
          </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
