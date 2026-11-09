import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, TrendingUp, BarChart3 } from '../icons';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import { getHistory, getStatistics } from '../services/haClient';
import { getIconComponent } from '../icons';
import { useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import { buildCostIncrementBuckets } from '../utils/costSeries';
import Segmented from '../components/ui/Segmented';

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
    const entry = buckets.get(bucketStart) || {
      last: p.value,
      lastTime: time,
      time: new Date(bucketStart),
    };
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

const BarChart = ({ data, height = 200, color = 'var(--status-success-fg)', rangeHours = 24 }) => {
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
  const loadedViewRef = useRef(null);

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
      loadedViewRef.current = null;
      setLoading(false);
      setSeries([]);
      return;
    }

    let cancelled = false;
    const view = `${activeEntity.entity_id}|${rangeHours}|${metric}|${chartType}`;
    // A new sensor value refreshes what is on screen; only a different view shows loading.
    const silent = loadedViewRef.current === view;

    const fetchHistory = async () => {
      if (!silent) setLoading(true);
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
          .filter((d) => d.value !== null && d.time instanceof Date);

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
        const deltaSeries = buildCostIncrementBuckets(rawSeries, rangeHours);

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

        if (cancelled) return;
        loadedViewRef.current = view;
        setSeries(nextSeries);
      } catch (error) {
        if (cancelled) return;
        console.error('Cost history fetch failed', error);
        if (!silent) setSeries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
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
  const modalTitleId = `cost-modal-title-${activeEntity?.entity_id?.replace(/[^a-zA-Z0-9_-]/g, '-') || 'cost'}`;

  if (!show) return null;

  const sourceOptions = [
    { value: 'today', label: translate('energyCost.today') },
    { value: 'month', label: translate('energyCost.thisMonth') },
  ].filter((item) => (item.value === 'today' ? todayEntityId : monthEntityId));
  const rangeOptions = [24, 48, 72, 168].map((hours) => ({
    value: hours,
    label: translate(hours >= 168 ? 'sensor.graphRange7d' : `sensor.graphRange${hours}h`),
  }));
  const formatStat = (value) => (value === '--' ? '--' : `${value} ${currency}`);
  const renderStat = (value, className) =>
    loading ? (
      <span
        className="mt-1 block h-6 w-24 animate-pulse rounded-md bg-[var(--glass-bg-hover)]"
        aria-hidden="true"
      />
    ) : (
      <p className={`${className} font-semibold text-[var(--text-primary)] tabular-nums`}>
        {formatStat(value)}
      </p>
    );

  return (
    <AccessibleModalShell open={show} onClose={onClose} titleId={modalTitleId} size="l">
      {() => (
        <>
          <ModalHeader
            title={displayName}
            closeLabel={translate('common.close')}
            onClose={onClose}
            icon={<HeaderIcon />}
            iconClassName="bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
            status={
              <StatusChip
                label={
                  source === 'month'
                    ? translate('energyCost.thisMonth')
                    : translate('energyCost.today')
                }
              />
            }
          />

          <ModalBody>
            <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-4">
              {sourceOptions.length > 1 && (
                <div className="flex flex-col gap-2">
                  <span className="modal-section-label">{translate('cost.period')}</span>
                  <Segmented
                    ariaLabel={translate('cost.period')}
                    value={source}
                    onChange={setSource}
                    options={sourceOptions}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <span className="modal-section-label">{translate('sensor.graphRange')}</span>
                <Segmented
                  ariaLabel={translate('sensor.graphRange')}
                  value={rangeHours}
                  onChange={setRangeHours}
                  options={rangeOptions}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="modal-section-label">{translate('cost.display')}</span>
                <div className="flex flex-wrap gap-2">
                  <Segmented
                    ariaLabel={translate('cost.display')}
                    value={chartType}
                    onChange={setChartType}
                    options={[
                      { value: 'line', label: translate('cost.view.line') },
                      { value: 'bars', label: translate('cost.view.bars') },
                    ]}
                  />
                  <Segmented
                    ariaLabel={`${translate('cost.metric.value')} / ${translate('cost.metric.delta')}`}
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: 'value', label: translate('cost.metric.value') },
                      { value: 'delta', label: translate('cost.metric.delta') },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
              <div className="popup-surface rounded-2xl p-4 lg:col-span-3">
                {loading ? (
                  <div
                    className="flex h-[320px] items-center justify-center text-sm text-[var(--text-secondary)]"
                    aria-busy="true"
                  >
                    {translate('common.loading')}
                  </div>
                ) : series.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center text-sm text-[var(--text-secondary)]">
                    {translate('cost.noData')}
                  </div>
                ) : chartType === 'bars' || metric === 'delta' ? (
                  <BarChart
                    data={series}
                    height={220}
                    color="var(--status-success-fg)"
                    rangeHours={rangeHours}
                  />
                ) : (
                  <SensorHistoryGraph
                    data={series}
                    height={320}
                    color="var(--status-success-fg)"
                    noDataLabel={translate('cost.noData')}
                    formatXLabel={(d) => {
                      if (rangeHours >= 168)
                        return d.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
                      if (rangeHours >= 48)
                        return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
                      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }}
                  />
                )}
              </div>
              <div className="space-y-4 lg:col-span-2">
                <div className="popup-surface flex items-center gap-3 rounded-2xl p-4">
                  <TrendingUp className="h-5 w-5 text-[var(--status-success-fg)]" />
                  <div>
                    <p className="modal-section-label">{translate('cost.stats.last')}</p>
                    {renderStat(stats.last, 'text-lg')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="popup-surface rounded-2xl p-4">
                    <p className="modal-section-label">{translate('cost.stats.min')}</p>
                    {renderStat(stats.min, 'text-base')}
                  </div>
                  <div className="popup-surface rounded-2xl p-4">
                    <p className="modal-section-label">{translate('cost.stats.max')}</p>
                    {renderStat(stats.max, 'text-base')}
                  </div>
                </div>
                <div className="popup-surface flex items-center gap-3 rounded-2xl p-4">
                  <BarChart3 className="h-5 w-5 text-[var(--status-success-fg)]" />
                  <div>
                    <p className="modal-section-label">{translate('cost.stats.avg')}</p>
                    {renderStat(stats.avg, 'text-base')}
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
