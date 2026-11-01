import { useEffect, useId, useMemo, useRef, useState } from 'react';

type Point = [number, number];

interface HistoryPoint {
  time: string | number | Date;
  value: unknown;
}

interface SensorHistoryGraphProps {
  data?: HistoryPoint[] | null;
  height?: number;
  color?: string;
  noDataLabel?: string;
  formatXLabel?: (date: Date) => string;
  strokeColor?: string;
  areaColor?: string;
  ariaLabel?: string;
}

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
  return points.reduce((path: string, point, index, allPoints) => {
    if (index === 0) return `M ${point[0]},${point[1]}`;
    const [cpsX, cpsY] = controlPoint(allPoints[index - 1], allPoints[index - 2], point, false);
    const [cpeX, cpeY] = controlPoint(point, allPoints[index - 1], allPoints[index + 1], true);
    return `${path} C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
  }, '');
};

const formatSummaryValue = (value: number, range: number) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: range < 10 ? 1 : 0,
  });

export default function SensorHistoryGraph({
  data,
  height = 200,
  color = '#3b82f6',
  noDataLabel = 'No history data available',
  formatXLabel = undefined,
  strokeColor = undefined,
  areaColor = undefined,
  ariaLabel = undefined,
}: SensorHistoryGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, '');
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateWidth = (width: number) => {
      if (Number.isFinite(width) && width > 0) setContainerWidth(width);
    };
    updateWidth(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => updateWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const safeData = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .map((point) => ({ ...point, value: Number(point.value) }))
        .filter((point) => Number.isFinite(point.value)),
    [data]
  );
  const hasData = safeData.length > 0;
  const width = 600;
  const padding = { top: 24, right: 18, bottom: 30, left: 44 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = Math.max(1, height - padding.top - padding.bottom);

  const chart = useMemo(() => {
    if (!hasData) {
      return {
        values: [],
        points: [],
        pathData: '',
        areaData: '',
        min: 0,
        max: 1,
        dataMin: 0,
        dataMax: 0,
        range: 1,
        average: 0,
      };
    }

    const rawValues = safeData.map((point) => point.value);
    const windowSize = Math.max(1, Math.round(rawValues.length / 30));
    const values = rawValues.map((_, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(rawValues.length, index + Math.ceil(windowSize / 2));
      let sum = 0;
      for (let cursor = start; cursor < end; cursor += 1) sum += rawValues[cursor];
      return sum / Math.max(1, end - start);
    });

    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    let min = dataMin;
    let max = dataMax;
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const rawRange = max - min;
    const minimumRange = Math.max(2, (Math.abs(max + min) / 2) * 0.1);
    if (rawRange < minimumRange) {
      const midpoint = (max + min) / 2;
      min = midpoint - minimumRange / 2;
      max = midpoint + minimumRange / 2;
    }

    const rangeBeforeSnap = max - min;
    const snapStep =
      rangeBeforeSnap <= 2
        ? 0.5
        : rangeBeforeSnap <= 5
          ? 1
          : rangeBeforeSnap <= 20
            ? 2
            : rangeBeforeSnap <= 50
              ? 5
              : rangeBeforeSnap <= 200
                ? 10
                : 50;
    min = Math.floor(min / snapStep) * snapStep;
    max = Math.ceil(max / snapStep) * snapStep;
    const range = max - min || 1;
    const points: Point[] = values.map((value, index) => [
      padding.left + (index / Math.max(values.length - 1, 1)) * graphWidth,
      padding.top + graphHeight - ((value - min) / range) * graphHeight,
    ]);
    const pathData = createBezierPath(points, 0.3, {
      minY: padding.top,
      maxY: padding.top + graphHeight,
    });
    const graphBottom = padding.top + graphHeight;

    return {
      values,
      points,
      pathData,
      areaData: `${pathData} L ${padding.left + graphWidth},${graphBottom} L ${padding.left},${graphBottom} Z`,
      min,
      max,
      dataMin,
      dataMax,
      range,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  }, [graphHeight, graphWidth, hasData, padding.left, padding.top, safeData]);

  const labelCount = containerWidth < 420 ? 3 : 5;
  const xLabels = useMemo(() => {
    if (!hasData) return [];
    return Array.from({ length: labelCount }, (_, index) => {
      const fraction = index / Math.max(labelCount - 1, 1);
      const dataIndex = Math.round(fraction * (safeData.length - 1));
      const point = safeData[dataIndex];
      const date = new Date(point.time);
      const label = formatXLabel
        ? formatXLabel(date)
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const anchor: 'start' | 'middle' | 'end' =
        index === 0 ? 'start' : index === labelCount - 1 ? 'end' : 'middle';
      return {
        x: padding.left + fraction * graphWidth,
        label,
        anchor,
      };
    });
  }, [formatXLabel, graphWidth, hasData, labelCount, padding.left, safeData]);

  const yLabels = [
    { value: chart.max, y: padding.top },
    { value: (chart.max + chart.min) / 2, y: padding.top + graphHeight / 2 },
    { value: chart.min, y: padding.top + graphHeight },
  ];
  const lineColor = strokeColor || color;
  const fillColor = areaColor || color;
  const areaGradientId = `area-gradient-${reactId}`;
  const fadeGradientId = `fade-gradient-${reactId}`;
  const maskId = `mask-${reactId}`;
  const summaryLabel =
    ariaLabel ||
    `Sensor history. Minimum ${formatSummaryValue(chart.dataMin, chart.range)}, average ${formatSummaryValue(chart.average, chart.range)}, maximum ${formatSummaryValue(chart.dataMax, chart.range)}.`;

  if (!hasData) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        {noDataLabel}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      data-chart-label-count={labelCount}
      data-chart-safe-inset={padding.right}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label={summaryLabel}
      >
        <defs>
          <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
            <stop offset="50%" stopColor={fillColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={fadeGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="80%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={maskId}>
            <rect x="0" y="0" width={width} height={height} fill={`url(#${fadeGradientId})`} />
          </mask>
        </defs>

        {yLabels.map((label) => (
          <line
            key={label.value}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke="currentColor"
            strokeOpacity="0.07"
            strokeDasharray="4 4"
          />
        ))}

        <path d={chart.areaData} fill={`url(#${areaGradientId})`} mask={`url(#${maskId})`} />
        <path
          d={chart.pathData}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />

        {yLabels.map((label) => (
          <text
            key={label.value}
            x={padding.left - 8}
            y={label.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="font-mono text-[10px] tracking-tighter"
            style={{ fill: 'var(--text-secondary)', opacity: 0.65 }}
          >
            {formatSummaryValue(label.value, chart.range)}
          </text>
        ))}

        {xLabels.map((label) => (
          <text
            key={`${label.x}-${label.label}`}
            x={label.x}
            y={height - 5}
            textAnchor={label.anchor}
            className="font-mono text-[10px] tracking-tighter"
            style={{ fill: 'var(--text-secondary)', opacity: 0.65 }}
          >
            {label.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
