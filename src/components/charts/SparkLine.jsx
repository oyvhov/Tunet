import { useMemo } from 'react';

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

export default function SparkLine({ data, currentIndex, height = 40, fade = false }) {
  const pointsData = Array.isArray(data) ? data : [];
  const lineStrokeWidth = 3;
  const pointRadius = 3.5;
  const verticalPadding = Math.max(4, Math.ceil(pointRadius + lineStrokeWidth / 2));
  
  const idSuffix = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  const areaId = `cardAreaGrad-${idSuffix}`;
  const lineId = `cardLineGrad-${idSuffix}`;
  const maskId = `cardMask-${idSuffix}`;

  if (pointsData.length === 0) return null;

  const values = pointsData.map(d => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = max - min || 1;
  const width = 300;
  const chartTop = verticalPadding;
  const chartBottom = height - verticalPadding;
  const chartHeight = Math.max(1, chartBottom - chartTop);
  const points = values.map((v, i) => [
    values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
    chartBottom - ((v - min) / range) * chartHeight
  ]);

  const pathData = createBezierPath(points, 0.3);
  const areaData = `${pathData} L ${width},${chartBottom} L 0,${chartBottom} Z`;
  const currentPoint = points[currentIndex] || points[0];

  const getDotColor = (val) => {
    const t = (val - min) / range;
    if (t > 0.6) return "#ef4444";
    if (t > 0.3) return "#eab308";
    return "#3b82f6";
  };

  return (
    <div className="mt-1 relative opacity-80 group-hover:opacity-100 transition-all duration-700">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          {/* Area gradient - more opaque at top */}
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#eab308" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.04" />
          </linearGradient>
          
          {/* Line gradient - color based on value */}
          <linearGradient id={lineId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          
          {/* Fade mask for smooth bottom */}
          <linearGradient id={maskId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          
          <mask id={`${maskId}-use`}>
            <rect x="0" y="0" width={width} height={height} fill={`url(#${maskId})`} />
          </mask>
        </defs>
        
        {/* Area fill with smooth fade */}
        <path d={areaData} fill={`url(#${areaId})`} mask={`url(#${maskId}-use)`} />
        
        {/* Bezier line with gradient */}
        <path d={pathData} fill="none" stroke={`url(#${lineId})`} strokeWidth={lineStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Current point marker */}
        <circle cx={currentPoint[0]} cy={currentPoint[1]} r={pointRadius} fill={getDotColor(values[currentIndex])} className="animate-pulse" />
      </svg>
      {fade && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--glass-bg)] opacity-60" />
      )}
    </div>
  );
}