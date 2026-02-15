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
      value: b.count ? b.total / b.count : 0
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
    <div className="w-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
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
          const barWidth = chartWidth / Math.max(data.length, 1) * 0.6;
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
  currency: propCurrency
}) {
  if (!show) return null;

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
          no_attributes: true
        });

        let points = (raw || [])
          .map((d) => ({
            value: parseNumeric(d.state),
            time: new Date(d.last_changed || d.last_updated || d.last_reported || d.timestamp || d.lu || d.lc)
          }))
          .filter((d) => d.value !== null && d.time instanceof Date && !Number.isNaN(d.time.getTime()));

        if (points.length < 2) {
          const stats = await getStatistics(conn, {
            statisticId: activeEntity.entity_id,
            start,
            end,
            period: rangeHours > 48 ? 'day' : 'hour'
          });
          points = (stats || [])
            .map((d) => ({
              value: parseNumeric(typeof d.mean === 'number' ? d.mean : (typeof d.state === 'number' ? d.state : d.sum)),
              time: new Date(d.start)
            }))
            .filter((d) => d.value !== null && d.time instanceof Date && !Number.isNaN(d.time.getTime()));
        }

        if (points.length < 2) {
          const val = parseNumeric(activeEntity.state);
          if (val !== null) {
            const now = new Date();
            points = [
              { value: val, time: new Date(now.getTime() - rangeHours * 60 * 60 * 1000) },
              { value: val, time: now }
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
  }, [show, conn, activeEntity?.entity_id, rangeHours, metric]);

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
      last: last.toFixed(2)
    };
  }, [series]);

  const displayName = name || translate('energyCost.title');
  const CustomIcon = iconName ? getIconComponent(iconName) : null;
  const HeaderIcon = CustomIcon || Coins;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[90vh] overflow-y-auto backdrop-blur-xl popup-anim"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-6 font-sans">
          <div className="p-4 rounded-2xl transition-all duration-500" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <HeaderIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">{displayName}</h3>
            <div className="mt-2 px-3 py-1 rounded-full border inline-flex items-center gap-2" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
              <span className="text-[10px] uppercase font-bold italic tracking-widest">
                {source === 'month' ? translate('energyCost.thisMonth') : translate('energyCost.today')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            {[{ key: 'today', label: translate('energyCost.today') }, { key: 'month', label: translate('energyCost.thisMonth') }]
              .filter((item) => (item.key === 'today' ? todayEntityId : monthEntityId))
              .map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSource(item.key)}
                  className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${source === item.key ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
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
                className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${rangeHours === hours ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                {hours >= 168 ? '7d' : `${hours}h`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${chartType === 'line' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.view.line')}
            </button>
            <button
              onClick={() => setChartType('bars')}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${chartType === 'bars' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.view.bars')}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMetric('value')}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${metric === 'value' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.metric.value')}
            </button>
            <button
              onClick={() => setMetric('delta')}
              className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${metric === 'delta' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              {translate('cost.metric.delta')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3 p-4 rounded-2xl popup-surface">
            {loading ? (
              <div className="h-[220px] flex items-center justify-center text-[var(--text-secondary)] text-sm">
                {translate('common.loading')}
              </div>
            ) : series.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-[var(--text-secondary)] text-sm">
                {translate('cost.noData')}
              </div>
            ) : chartType === 'bars' ? (
              <BarChart data={series} height={220} color="#34d399" />
            ) : (
              <SensorHistoryGraph data={series} height={220} color="#34d399" noDataLabel={translate('cost.noData')} />
            )}
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-2xl popup-surface flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{translate('cost.stats.last')}</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{stats.last} {currency}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl popup-surface">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{translate('cost.stats.min')}</p>
                <p className="text-base font-semibold text-[var(--text-primary)]">{stats.min} {currency}</p>
              </div>
              <div className="p-4 rounded-2xl popup-surface">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{translate('cost.stats.max')}</p>
                <p className="text-base font-semibold text-[var(--text-primary)]">{stats.max} {currency}</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl popup-surface flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{translate('cost.stats.avg')}</p>
                <p className="text-base font-semibold text-[var(--text-primary)]">{stats.avg} {currency}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
