import { memo, useId } from 'react';
import { CHART_STATUS_COLORS, getThresholdColor } from '../../utils/chartColors';

type Point = [number, number];

interface SparkLineDatum {
  value: number;
}

interface SparkLineProps {
  data?: SparkLineDatum[] | null;
  currentIndex?: number;
  height?: number;
  fade?: boolean;
  variant?: 'line' | 'bar';
  bleed?: boolean;
  maxBars?: number;
  zeroBaseline?: boolean;
  ariaLabel?: string;
}

// Helper function to create smooth Bezier curves
const createBezierPath = (
  points: Point[],
  smoothing = 0.3,
  bounds?: { minY: number; maxY: number }
) => {
  const line = (p1: Point, p2: Point) => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return { length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) };
  };
  const controlPoint = (
    current: Point,
    previous: Point | undefined,
    next: Point | undefined,
    reverse: boolean
  ): Point => {
    const p = previous || current;
    const n = next || current;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const length = l.length * smoothing;
    const y = current[1] + Math.sin(angle) * length;
    return [
      current[0] + Math.cos(angle) * length,
      bounds ? Math.max(bounds.minY, Math.min(bounds.maxY, y)) : y,
    ];
  };
  return points.reduce((acc: string, point, i, a) => {
    if (i === 0) return `M ${point[0]},${point[1]}`;
    const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point, false);
    const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
  }, '');
};

function SparkLine({
  data,
  currentIndex,
  height = 40,
  fade = false,
  variant = 'line',
  bleed = false,
  maxBars = 16,
  zeroBaseline = false,
  ariaLabel = 'Sensor history',
}: SparkLineProps) {
  const pointsData = Array.isArray(data) ? data : [];
  const lineStrokeWidth = 3;
  const pointRadius = 3.5;
  const verticalPadding = Math.max(4, Math.ceil(pointRadius + lineStrokeWidth / 2));
  const plotInset = bleed ? 0 : 12;
  const reactId = useId();
  const idSuffix = reactId.replace(/:/g, '');
  const areaId = `cardAreaGrad-${idSuffix}`;
  const lineId = `cardLineGrad-${idSuffix}`;
  const maskId = `cardMask-${idSuffix}`;

  if (pointsData.length === 0) return null;

  // Smooth values with a moving average to reduce jitter
  const rawValues = pointsData.map((d) => d.value);
  const windowSize = Math.max(1, Math.round(rawValues.length / 30));
  const values = rawValues.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(rawValues.length, i + Math.ceil(windowSize / 2));
    let sum = 0;
    for (let j = start; j < end; j++) sum += rawValues[j];
    return sum / (end - start);
  });
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (zeroBaseline && variant === 'bar') {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  // Ensure a minimum visual range so small fluctuations don't look extreme
  const rawRange = max - min;
  const minRange = Math.max(2, (Math.abs(max + min) / 2) * 0.1);
  if (rawRange < minRange && !(zeroBaseline && variant === 'bar')) {
    const mid = (max + min) / 2;
    min = mid - minRange / 2;
    max = mid + minRange / 2;
  }
  // Snap to nice round numbers for a calmer visual
  const snapStep = rawRange <= 2 ? 0.5 : rawRange <= 5 ? 1 : rawRange <= 20 ? 2 : 5;
  min = Math.floor(min / snapStep) * snapStep;
  max = Math.ceil(max / snapStep) * snapStep;
  const range = max - min || 1;
  const width = 300;
  const plotWidth = width - plotInset * 2;
  const chartTop = verticalPadding;
  const chartBottom = height - verticalPadding;
  const chartHeight = Math.max(1, chartBottom - chartTop);
  const points: Point[] = values.map((v, i) => [
    values.length === 1 ? width / 2 : plotInset + (i / (values.length - 1)) * plotWidth,
    chartBottom - ((v - min) / range) * chartHeight,
  ]);

  const pathData = createBezierPath(points, 0.3, {
    minY: chartTop,
    maxY: chartBottom,
  });
  const areaBottom = bleed ? height + 4 : chartBottom;
  const areaData = `${pathData} L ${width - plotInset},${areaBottom} L ${plotInset},${areaBottom} Z`;
  const normalizedCurrentIndex =
    typeof currentIndex === 'number' &&
    Number.isInteger(currentIndex) &&
    currentIndex >= 0 &&
    currentIndex < values.length
      ? currentIndex
      : 0;
  const currentPoint = points[normalizedCurrentIndex] || points[0];

  const getValueColor = (val: number) => {
    const t = (val - min) / range;
    return getThresholdColor(t);
  };

  if (variant === 'bar') {
    const groupSize = Math.max(1, Math.ceil(values.length / maxBars));
    const barValues =
      groupSize === 1
        ? values
        : Array.from({ length: Math.ceil(values.length / groupSize) }, (_, groupIndex) => {
            const start = groupIndex * groupSize;
            const group = values.slice(start, start + groupSize);
            return group.reduce((sum, value) => sum + value, 0) / Math.max(group.length, 1);
          });
    const activeBarIndex =
      groupSize === 1 ? normalizedCurrentIndex : Math.floor(normalizedCurrentIndex / groupSize);
    const slotWidth = plotWidth / Math.max(barValues.length, 1);
    const barWidth = bleed
      ? Math.max(2, slotWidth * 0.62)
      : Math.max(3, Math.min(12, slotWidth - 1.5));
    const barBottom = bleed ? height + 4 : chartBottom;

    return (
      <div
        className={`relative ${bleed ? '' : 'mt-1'} opacity-80 transition-opacity duration-700 group-hover:opacity-100`}
        data-chart-safe-inset={plotInset}
      >
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="overflow-visible"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {barValues.map((value, index) => {
            const intensity = (value - min) / range;
            const barHeight = Math.max(3, intensity * chartHeight);
            const x = plotInset + index * slotWidth + (slotWidth - barWidth) / 2;
            const y = chartBottom - barHeight;
            const fullHeight = barBottom - y;
            const isCurrent = index === activeBarIndex;
            const fill = getValueColor(value);

            return (
              <g key={`bar-${index}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={fullHeight}
                  rx={Math.min(barWidth / 2, 3)}
                  fill={fill}
                  opacity={isCurrent ? 0.95 : 0.52}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.min(barHeight, 18)}
                  rx={Math.min(barWidth / 2, 3)}
                  fill={`url(#${areaId})`}
                  opacity={isCurrent ? 0.5 : 0.25}
                />
                {isCurrent && (
                  <rect
                    x={Math.max(0, x - 1)}
                    y={Math.max(0, y - 1)}
                    width={Math.min(width - x + 1, barWidth + 2)}
                    height={bleed ? fullHeight + 1 : Math.min(height - y + 1, barHeight + 2)}
                    rx={Math.min((barWidth + 2) / 2, 4)}
                    fill="none"
                    stroke={fill}
                    strokeOpacity="0.9"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </svg>
        {fade && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--glass-bg)] opacity-60" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${bleed ? '' : 'mt-1'} opacity-80 transition-opacity duration-700 group-hover:opacity-100`}
      data-chart-safe-inset={plotInset}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          {/* Area gradient - more opaque at top */}
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_STATUS_COLORS.high} stopOpacity="0.2" />
            <stop offset="50%" stopColor={CHART_STATUS_COLORS.mid} stopOpacity="0.12" />
            <stop offset="100%" stopColor={CHART_STATUS_COLORS.low} stopOpacity="0.04" />
          </linearGradient>

          {/* Line gradient - color based on value */}
          <linearGradient id={lineId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_STATUS_COLORS.high} />
            <stop offset="50%" stopColor={CHART_STATUS_COLORS.mid} />
            <stop offset="100%" stopColor={CHART_STATUS_COLORS.low} />
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
        <path
          d={pathData}
          fill="none"
          stroke={`url(#${lineId})`}
          strokeWidth={lineStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current point marker */}
        <circle
          cx={currentPoint[0]}
          cy={currentPoint[1]}
          r={pointRadius}
          fill={getValueColor(values[normalizedCurrentIndex])}
        />
      </svg>
      {fade && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--glass-bg)] opacity-60" />
      )}
    </div>
  );
}

export default memo(SparkLine);
