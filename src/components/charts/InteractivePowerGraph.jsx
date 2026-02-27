import { useState, useRef } from 'react';

export default function InteractivePowerGraph({ data, currentIndex, t, locale, unit }) {
  const translate = t || ((key) => key);
  const currency = unit || translate('power.ore');
  const timeLocale = locale || 'en-GB';
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);
  if (!data || data.length === 0) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 800;
  const height = 300;
  const lineStrokeWidth = 3;
  const hoverDotRadius = 5;
  const verticalPadding = Math.max(6, Math.ceil(hoverDotRadius + lineStrokeWidth / 2));
  const chartTop = verticalPadding;
  const chartBottom = height - verticalPadding;
  const chartHeight = Math.max(1, chartBottom - chartTop);
  const points = values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: chartBottom - ((v - min) / range) * chartHeight,
    val: v,
    time: new Date(data[i].start).toLocaleTimeString(timeLocale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  // Bezier smoothing helper
  const getBezierPath = (points, _isClosed = false) => {
    if (points.length === 0) return '';

    const controlPoint = (current, previous, next, reverse) => {
      const p = previous || current;
      const n = next || current;
      const smoothing = 0.2;
      const o = line(p, n);
      const angle = o.angle + (reverse ? Math.PI : 0);
      const length = o.length * smoothing;
      const x = current.x + Math.cos(angle) * length;
      const y = current.y + Math.sin(angle) * length;
      return { x, y };
    };

    const line = (pointA, pointB) => {
      const lengthX = pointB.x - pointA.x;
      const lengthY = pointB.y - pointA.y;
      return {
        length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
        angle: Math.atan2(lengthY, lengthX),
      };
    };

    const d = points.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const cps = controlPoint(a[i - 1], a[i - 2], point);
      const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
      return `${acc} C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`;
    }, '');

    return d;
  };

  const pathData = getBezierPath(points);
  const areaData = `${pathData} L ${width},${chartBottom} L 0,${chartBottom} Z`;
  const currentPointData = points[currentIndex] || points[0];
  const hoverPointData = (hoverIndex !== null ? points[hoverIndex] : currentPointData) || points[0];

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round((x / width) * (values.length - 1));
    if (idx >= 0 && idx < values.length) setHoverIndex(idx);
  };

  const getDotColor = (val) => {
    const t = (val - min) / range;
    if (t > 0.6) return '#ef4444';
    if (t > 0.3) return '#eab308';
    return '#3b82f6';
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-end justify-between px-2">
        <div>
          <p className="mb-0.5 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
            {translate('power.time')}
          </p>
          <p className="text-xl font-medium text-[var(--text-primary)]">{hoverPointData.time}</p>
        </div>
        <div className="text-right">
          <p
            className="mb-0.5 text-[10px] font-bold tracking-widest uppercase"
            style={{ color: getDotColor(hoverPointData.val) }}
          >
            {translate('power.price')}
          </p>
          <p className="text-3xl leading-none font-light tracking-tighter text-[var(--text-primary)] italic">
            {hoverPointData.val.toFixed(2)}{' '}
            <span className="ml-1 text-sm text-gray-600 not-italic">{currency}</span>
          </p>
        </div>
      </div>
      <div className="relative h-60 w-full" onMouseLeave={() => setHoverIndex(null)}>
        <div className="pointer-events-none absolute top-0 left-0 flex h-full flex-col justify-between py-1 text-xs font-bold text-gray-600">
          <span>{max.toFixed(0)}</span>
          <span>{min.toFixed(0)}</span>
        </div>
        {/* "Now" indicator */}
        <div className="pointer-events-none absolute top-0 left-0 h-full" style={{ width: '100%' }}>
          <div
            className="absolute top-0 h-full border-l border-[var(--accent-color)] opacity-60"
            style={{ left: `${(currentPointData.x / width) * 100}%` }}
          >
            <span className="absolute -top-6 -left-8 rounded bg-[var(--card-bg)] px-2 py-0.5 text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
              Now
            </span>
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onTouchMove={(e) => handleMouseMove(e.touches[0])}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#eab308" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <path d={areaData} fill="url(#areaGrad)" />
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Current time permanent indicator */}
          <line
            x1={currentPointData.x}
            y1="0"
            x2={currentPointData.x}
            y2={height}
            stroke="rgba(59, 130, 246, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="3,2"
          />
          {hoverPointData && (
            <>
              <line
                x1={hoverPointData.x}
                y1="0"
                x2={hoverPointData.x}
                y2={height}
                stroke={getDotColor(hoverPointData.val)}
                strokeWidth="2"
                opacity="0.4"
              />
              <circle
                cx={hoverPointData.x}
                cy={hoverPointData.y}
                r="5"
                fill={getDotColor(hoverPointData.val)}
              />
              <circle
                cx={hoverPointData.x}
                cy={hoverPointData.y}
                r="11"
                fill={getDotColor(hoverPointData.val)}
                fillOpacity="0.1"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
