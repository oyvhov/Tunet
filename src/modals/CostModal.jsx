import { useEffect, useMemo, useState } from 'react';
import { Coins, X, TrendingUp, BarChart3 } from '../icons';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import { getHistory, getStatistics } from '../services/haClient';
import { getIconComponent } from '../icons';
import { useHomeAssistantMeta } from '../contexts';

const parseNumeric = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : null;
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
    const entry = buckets.get(bucketStart) || { total: 0, count: 0, time: new Date(bucketStart) };
    entry.total += p.value;
    entry.count += 1;
    buckets.set(bucketStart, entry);
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.time - b.time)
    .map((b) => ({
      time: b.time,
      value: b.count ? b.total / b.count : 0,
    }));
};

const buildDeltaSeries = (series) => {
  if (series.length < 2) return series;
  return series.map((point, idx) => {
    if (idx === 0) return { ...point, value: 0 };
    const prev = series[idx - 1];
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

const BarChart = ({ data, height = 200, color = '#34d399' }) => {
  if (!data.length) return null;
  const width = 600;
  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value), 0);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
        <line
          x1={padding.left}
          y1={padding.top}
          x2={width - padding.right}
          y2={padding.top}
          stroke="currentColor"
          strokeOpacity="0.05"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity="0.08"
        />
        {data.map((point, idx) => {
          const x = padding.left + (idx / Math.max(data.length - 1, 1)) * chartWidth;
          const barWidth = (chartWidth / Math.max(data.length, 1)) * 0.6;
          const normalized = (point.value - min) / range;
          const barHeight = normalized * chartHeight;
          return (
            <rect
              key={`${point.time}-${idx}`}
              x={x - barWidth / 2}
              y={padding.top + (chartHeight - barHeight)}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={color}
              opacity={0.85}
            />
          );
        })}
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
            value: parseNumeric(d.state),
            time: new Date(
              d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.lu || d.lc
            ),
          }))
          .filter(
            (d) => d.value !== null && d.time instanceof Date && !Number.isNaN(d.time.getTime())
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
          .sort((a, b) => a.time - b.time);
        const lineSeries = ensureRangeCoverage(rawSeries, start, end);
        const bucketed = buildBuckets(rawSeries, rangeHours);
        const deltaSeries = buildDeltaSeries(bucketed);

        let nextSeries = lineSeries;
        if (metric === 'delta') nextSeries = deltaSeries;
        else if (chartType === 'bars') nextSeries = bucketed;

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

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-10"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 md:top-10 md:right-10"
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
            <h3 className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
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
              <div className="flex h-[220px] items-center justify-center text-sm text-[var(--text-secondary)]">
                {translate('common.loading')}
              </div>
            ) : series.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-[var(--text-secondary)]">
                {translate('cost.noData')}
              </div>
            ) : chartType === 'bars' ? (
              <BarChart data={series} height={220} color="#34d399" />
            ) : (
              <SensorHistoryGraph
                data={series}
                height={220}
                color="#34d399"
                noDataLabel={translate('cost.noData')}
              />
            )}
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="popup-surface flex items-center gap-3 rounded-2xl p-4">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
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
              <BarChart3 className="h-5 w-5 text-emerald-400" />
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
      </div>
    </div>
  );
}
