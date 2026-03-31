import { useEffect, useMemo, useState } from 'react';
import { Coins, X, TrendingUp, BarChart3 } from '../icons';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import { getHistory, getStatistics } from '../services/haClient';
import { getIconComponent } from '../icons';
import { useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';

const parseNumeric = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : null;
};

const toDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const num = Number(value);
    if (Number.isFinite(num)) {
      const ms = num < 1e12 ? num * 1000 : num;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
};

const buildBuckets = (points, rangeHours) => {
  if (!points.length) return [];
  const rangeMs = rangeHours * 60 * 60 * 1000;
  const bucketMs = rangeHours > 48 ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const now = Date.now();
  const startMs = now - rangeMs;
  const buckets = new Map();

  points.forEach((p) => {
    const time = p.time instanceof Date ? p.time.getTime() : new Date(p.time).getTime();
    if (!Number.isFinite(time)) return;
    if (time < startMs) return;
    const bucketStart = Math.floor((time - startMs) / bucketMs) * bucketMs + startMs;
    const entry = buckets.get(bucketStart) || { last: p.value, lastTime: time, time: new Date(bucketStart) };
    // Keep the latest value in each bucket (energy cost accumulates)
    if (time >= entry.lastTime) {
      entry.last = p.value;
      entry.lastTime = time;
    }
    buckets.set(bucketStart, entry);
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.time - b.time)
    .map((b) => ({
      time: b.time,
      value: b.last,
    }));
};

const buildDeltaSeries = (series) => {
  if (series.length < 2) return series;
  // Skip first point — no previous value to diff against
  return series.slice(1).map((point, idx) => {
    const prev = series[idx]; // idx is offset by 1 due to slice
    return { ...point, value: point.value - prev.value };
  });
};

const ensureRangeCoverage = (data, start, end) => {
  if (!data.length) return data;
  const startTime = start instanceof Date ? start : new Date(start);
  const endTime = end instanceof Date ? end : new Date(end);
  const normalized = [...data].sort((a, b) => a.time - b.time);
  const first = normalized[0];
  const last = normalized[normalized.length - 1];

  if (first.time > startTime) {
    normalized.unshift({ ...first, time: startTime });
  }
  if (last.time < endTime) {
    normalized.push({ ...last, time: endTime });
  }
  return normalized;
};

const BarChart = ({ data, height = 200, color = '#34d399', rangeHours = 24 }) => {
  if (!data.length) return null;
  const width = 600;
  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value), 0);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  // Zero line position (where bars originate from)
  const zeroY = padding.top + ((max - 0) / range) * chartHeight;

  // Y-axis labels
  const yLabels = [
    { value: max, y: padding.top },
    { value: (max + min) / 2, y: padding.top + chartHeight / 2 },
    { value: min, y: padding.top + chartHeight },
  ];

  // X-axis labels — pick ~5 evenly spaced, format based on range
  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (rangeHours >= 168) {
      return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
    }
    if (rangeHours >= 48) {
      return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const xLabelCount = Math.min(data.length, 5);
  const xLabels = [];
  for (let i = 0; i < xLabelCount; i++) {
    const idx = Math.round((i / (xLabelCount - 1)) * (data.length - 1));
    const point = data[idx];
    if (point) {
      const x = padding.left + (idx / Math.max(data.length - 1, 1)) * chartWidth;
      const t = point.time instanceof Date ? point.time : new Date(point.time);
      const label = formatTime(t);
      xLabels.push({ x, label });
    }
  }

  const formatVal = (v) => {
    if (Math.abs(v) >= 1000) return v.toFixed(0);
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
  };

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
        {/* Y-axis grid lines and labels */}
        {yLabels.map((label, i) => (
          <g key={`y-${i}`}>
            <line
              x1={padding.left}
              y1={label.y}
              x2={width - padding.right}
              y2={label.y}
              stroke="currentColor"
              strokeOpacity="0.06"
            />
            <text
              x={padding.left - 6}
              y={label.y + 4}
              textAnchor="end"
              fill="currentColor"
              opacity="0.4"
              fontSize="11"
            >
              {formatVal(label.value)}
            </text>
          </g>
        ))}
        {/* Zero line when there are negative values */}
        {min < 0 && max > 0 && (
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeDasharray="4 4"
          />
        )}
        {/* Bars */}
        {data.map((point, idx) => {
          const slotWidth = chartWidth / data.length;
          const x = padding.left + idx * slotWidth + slotWidth / 2;
          const barWidth = slotWidth * 0.7;
          const valueY = padding.top + ((max - point.value) / range) * chartHeight;
          const barTop = Math.min(valueY, zeroY);
          const barHeight = Math.abs(valueY - zeroY);
          return (
            <rect
              key={`${point.time}-${idx}`}
              x={x - barWidth / 2}
              y={barTop}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              rx={3}
              fill={point.value < 0 ? 'var(--status-error-fg, #ef4444)' : color}
              opacity={0.85}
            />
          );
        })}
        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text
            key={`x-${i}`}
            x={label.x}
            y={height - 6}
            textAnchor="middle"
            fill="currentColor"
            opacity="0.4"
            fontSize="11"
          >
            {label.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default function CostModal({
  show,
  onClose,
  conn,
  entities,
  todayEntityId,
  monthEntityId,
  name,
  iconName,
  t,
  currency: propCurrency,
}) {
  const { haConfig } = useHomeAssistantMeta();
  const currency = propCurrency || haConfig?.currency || 'kr';

  const translate = t || ((key) => key);
  const [source, setSource] = useState('today');
  const [rangeHours, setRangeHours] = useState(24);
  const [chartType, setChartType] = useState('line');
  const [metric, setMetric] = useState('value');
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState([]);

  const todayEntity = todayEntityId ? entities?.[todayEntityId] : null;
  const monthEntity = monthEntityId ? entities?.[monthEntityId] : null;
  const activeEntity = source === 'month' ? monthEntity : todayEntity;

  useEffect(() => {
    if (source === 'month' && !monthEntityId && todayEntityId) setSource('today');
    if (source === 'today' && !todayEntityId && monthEntityId) setSource('month');
  }, [source, todayEntityId, monthEntityId]);

  useEffect(() => {
    if (!show) return;
    if (!conn || !activeEntity?.entity_id) {
      setSeries([]);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const end = new Date();
        const start = new Date(end.getTime() - rangeHours * 60 * 60 * 1000);
        const raw = await getHistory(conn, {
          entityId: activeEntity.entity_id,
          start,
          end,
          minimal_response: true,
          no_attributes: true,
        });

        let points = (raw || [])
          .map((d) => ({
            value: parseNumeric(d.state ?? d.s),
            time: toDateSafe(
              d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.lc || d.lu
            ),
          }))
          .filter(
            (d) => d.value !== null && d.time instanceof Date
          );

        if (points.length < 2) {
          const stats = await getStatistics(conn, {
            statisticId: activeEntity.entity_id,
            start,
            end,
            period: rangeHours > 48 ? 'day' : 'hour',
          });
          points = (stats || [])
            .map((d) => ({
              value: parseNumeric(
                typeof d.mean === 'number' ? d.mean : typeof d.state === 'number' ? d.state : d.sum
              ),
              time: new Date(d.start),
            }))
            .filter(
              (d) => d.value !== null && d.time instanceof Date && !Number.isNaN(d.time.getTime())
            );
        }

        if (points.length < 2) {
          const val = parseNumeric(activeEntity.state);
          if (val !== null) {
            const now = new Date();
            points = [
              { value: val, time: new Date(now.getTime() - rangeHours * 60 * 60 * 1000) },
              { value: val, time: now },
            ];
          }
        }

        const rawSeries = points
          .map((p) => ({ value: p.value, time: p.time }))
          .sort((a, b) => a.time.getTime() - b.time.getTime());
        const lineSeries = ensureRangeCoverage(rawSeries, start, end);
        const bucketed = buildBuckets(rawSeries, rangeHours);
        const deltaSeries = buildDeltaSeries(bucketed);

        let nextSeries;
        if (metric === 'delta') {
          // Delta: cost change per period — works for both line and bar views
          nextSeries = deltaSeries;
        } else if (chartType === 'bars') {
          // Value + bars: accumulated cost at end of each period
          nextSeries = bucketed;
        } else {
          // Value + line: raw cumulative curve
          nextSeries = lineSeries;
        }

        setSeries(nextSeries);
      } catch (error) {
        console.error('Cost history fetch failed', error);
        setSeries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [show, conn, activeEntity?.entity_id, activeEntity?.state, rangeHours, metric, chartType]);

  const stats = useMemo(() => {
    if (!series.length) return { min: '--', max: '--', avg: '--', last: '--' };
    const values = series.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const last = values[values.length - 1];
    return {
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
      last: last.toFixed(2),
    };
  }, [series]);

  const displayName = name || translate('energyCost.title');
  const CustomIcon = iconName ? getIconComponent(iconName) : null;
  const HeaderIcon = CustomIcon || Coins;
  const modalTitleId =
    `cost-modal-title-${activeEntity?.entity_id?.replace(/[^a-zA-Z0-9_-]/g, '-') || 'cost'}`;

  if (!show) return null;

  return (
    <AccessibleModalShell
      open={show}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-10"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 md:top-10 md:right-10"
          aria-label={translate('common.close')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex items-center gap-4 font-sans">
          <div
            className="rounded-2xl p-4 transition-all duration-500"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}
          >
            <HeaderIcon className="h-8 w-8" />
          </div>
          <div>
            <h3
              id={modalTitleId}
              className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic"
            >
              {displayName}
            </h3>
            <div
              className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1"
              style={{
                backgroundColor: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              <span className="text-[10px] font-bold tracking-widest uppercase italic">
                {source === 'month'
                  ? translate('energyCost.thisMonth')
                  : translate('energyCost.today')}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {[
              { key: 'today', label: translate('energyCost.today') },
              { key: 'month', label: translate('energyCost.thisMonth') },
            ]
              .filter((item) => (item.key === 'today' ? todayEntityId : monthEntityId))
              .map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSource(item.key)}
                  className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${source === item.key ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                >
                  {item.label}
                </button>
              ))}
          </div>
          <div className="flex items-center gap-2">
            {[24, 48, 72, 168].map((hours) => (
              <button
                key={hours}
                onClick={() => setRangeHours(hours)}
                className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${rangeHours === hours ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                {hours >= 168 ? '7d' : `${hours}h`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${chartType === 'line' ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.view.line')}
            </button>
            <button
              onClick={() => setChartType('bars')}
              className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${chartType === 'bars' ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.view.bars')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMetric('value')}
              className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${metric === 'value' ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.metric.value')}
            </button>
            <button
              onClick={() => setMetric('delta')}
              className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${metric === 'delta' ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.metric.delta')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          <div className="popup-surface rounded-2xl p-4 lg:col-span-3">
            {loading ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-[var(--text-secondary)]">
                {translate('common.loading')}
              </div>
            ) : series.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-[var(--text-secondary)]">
                {translate('cost.noData')}
              </div>
            ) : chartType === 'bars' || metric === 'delta' ? (
              <BarChart data={series} height={220} color="var(--status-success-fg)" rangeHours={rangeHours} />
            ) : (
              <SensorHistoryGraph
                data={series}
                height={320}
                color="var(--status-success-fg)"
                noDataLabel={translate('cost.noData')}
                formatXLabel={(d) => {
                  if (rangeHours >= 168) return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
                  if (rangeHours >= 48) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
                  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }}
              />
            )}
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="popup-surface flex items-center gap-3 rounded-2xl p-4">
              <TrendingUp className="h-5 w-5 text-[var(--status-success-fg)]" />
              <div>
                <p className="text-[10px] tracking-widest text-[var(--text-secondary)] uppercase">
                  {translate('cost.stats.last')}
                </p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {stats.last} {currency}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="popup-surface rounded-2xl p-4">
                <p className="text-[10px] tracking-widest text-[var(--text-secondary)] uppercase">
                  {translate('cost.stats.min')}
                </p>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {stats.min} {currency}
                </p>
              </div>
              <div className="popup-surface rounded-2xl p-4">
                <p className="text-[10px] tracking-widest text-[var(--text-secondary)] uppercase">
                  {translate('cost.stats.max')}
                </p>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {stats.max} {currency}
                </p>
              </div>
            </div>
            <div className="popup-surface flex items-center gap-3 rounded-2xl p-4">
              <BarChart3 className="h-5 w-5 text-[var(--status-success-fg)]" />
              <div>
                <p className="text-[10px] tracking-widest text-[var(--text-secondary)] uppercase">
                  {translate('cost.stats.avg')}
                </p>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {stats.avg} {currency}
                </p>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
