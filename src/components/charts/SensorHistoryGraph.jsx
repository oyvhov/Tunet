import React, { useMemo } from 'react';

// Helper function to create smooth Bezier curves
const createBezierPath = (points, smoothing = 0.3) => {
  const line = (p1, p2) => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return { length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) };
  };
  const controlPoint = (current, previous, next, reverse) => {
    const p = previous || current;
    const n = next || current;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const length = l.length * smoothing;
    return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length];
  };
  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point[0]},${point[1]}`;
    const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point, false);
    const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
  }, '');
};

export default function SensorHistoryGraph({
  data,
  height = 200,
  color = '#3b82f6',
  noDataLabel = 'No history data available',
  formatXLabel,
}) {
  const hasData = Array.isArray(data) && data.length > 0;
  const safeData = hasData ? data : [];

  // Determine graph dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 600; // viewBox width
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Calculate min/max values
  const values = safeData.map((d) => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  // Add some padding to top of Y-axis range only
  const range = max - min;
  const renderMin = min; // No bottom padding
  const renderMax = max + range * 0.05;
  const renderRange = renderMax - renderMin;

  // Create points for Bezier curve
  const pointsArray = safeData.map((d, i) => [
    padding.left + (i / Math.max(safeData.length - 1, 1)) * graphWidth,
    padding.top + graphHeight - ((d.value - renderMin) / renderRange) * graphHeight,
  ]);

  const pathData = useMemo(() => createBezierPath(pointsArray, 0.3), [pointsArray]);
  const areaData = useMemo(
    () => `${pathData} L ${padding.left + graphWidth},${height} L ${padding.left},${height} Z`,
    [pathData, padding.left, graphWidth, height]
  );

  // Generate Y-axis labels (Max, Mid, Min)
  const yLabels = [
    { value: max, y: padding.top },
    { value: (max + min) / 2, y: padding.top + graphHeight / 2 },
    { value: min, y: height - padding.bottom },
  ];

  // Generate X-axis labels (Start, End + Intermediates)
  // Logic: try to fit ~5 labels.
  const xLabels = [];
  const numLabels = 5;
  for (let i = 0; i < numLabels; i++) {
    const fraction = i / (numLabels - 1);
    const index = Math.round(fraction * (safeData.length - 1));
    const point = safeData[index];
    if (point) {
      const x = padding.left + fraction * graphWidth;
      const label = formatXLabel
        ? formatXLabel(new Date(point.time))
        : new Date(point.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const anchor = i === 0 ? 'start' : i === numLabels - 1 ? 'end' : 'middle';
      xLabels.push({ x, label, anchor });
    }
  }

  // Generate unique IDs for gradients
  const areaGradientId = `area-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const fadeGradientId = `fade-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const maskId = `mask-${Math.random().toString(36).substr(2, 9)}`;

  if (!hasData) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-gray-500">
        {noDataLabel}
      </div>
    );
  }

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Area gradient - more opaque at top, fades to bottom */}
          <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="50%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>

          {/* Fade mask for smooth bottom edge */}
          <linearGradient id={fadeGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="80%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <mask id={maskId}>
            <rect x="0" y="0" width={width} height={height} fill={`url(#${fadeGradientId})`} />
          </mask>
        </defs>

        {/* Grid lines - Very subtle */}
        {yLabels.map((label, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke="currentColor"
            strokeOpacity="0.05"
            strokeDasharray="4 4"
          />
        ))}

        {/* Area fill with gradient */}
        <path d={areaData} fill={`url(#${areaGradientId})`} mask={`url(#${maskId})`} />

        {/* Bezier line - smooth and crisp */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Y-axis Labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={label.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-current font-mono text-[10px] tracking-tighter opacity-60"
            style={{ fill: 'var(--text-secondary)' }}
          >
            {label.value.toFixed(1)}
          </text>
        ))}

        {/* X-axis Labels */}
        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={height - 5}
            textAnchor={l.anchor}
            className="fill-current font-mono text-[10px] tracking-tighter opacity-60"
            style={{ fill: 'var(--text-secondary)' }}
          >
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
