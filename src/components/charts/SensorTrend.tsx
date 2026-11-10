import { memo, useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { observeChartReveal, playChartSettle, useValueRipple } from './chartMotion';
import { createBezierPath, getSparkRange, smoothSparkValues } from './sparkPath';
import type { SparkPoint } from './sparkPath';

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 40;
const PADDING = 5;

interface SensorTrendProps {
  data: { value: number }[] | null | undefined;
  color?: string;
  ariaLabel?: string;
  /** Sizing classes; the trend fills this box. */
  className?: string;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Compact history curve for small sensor cards: a smooth line from a faint tail to the value
 * colour, an area that fades out, and a dot on the latest reading. It wipes in once on screen,
 * new readings slide in from the right and the dot ripples when the value changes.
 */
function SensorTrend({
  data,
  color = 'var(--accent-color)',
  ariaLabel = 'Sensor trend',
  className = 'h-10 w-24',
}: SensorTrendProps) {
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const points = Array.isArray(data) ? data.filter((point) => Number.isFinite(point?.value)) : [];
  const count = points.length;
  const latest = count > 0 ? points[count - 1].value : null;
  const rippleRef = useValueRipple<HTMLSpanElement>(latest);
  const plotRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(count);

  useEffect(() => {
    const previous = lastCount.current;
    lastCount.current = count;
    if (previous < 2 || count <= previous) return;
    playChartSettle(plotRef.current, [
      { transform: `translateX(${round(VIEW_WIDTH / (count - 1))}%)` },
      { transform: 'none' },
    ]);
  }, [count]);

  if (count === 0) return null;

  const rawValues = points.map((point) => point.value);
  if (count === 1) rawValues.push(rawValues[0]);
  const values = smoothSparkValues(rawValues);
  // The dot shows the reading on the card, so the newest point is never averaged away.
  values[values.length - 1] = rawValues[rawValues.length - 1];
  const { min, max } = getSparkRange(values);
  const range = max - min || 1;
  const bottom = VIEW_HEIGHT - PADDING;
  const coords: SparkPoint[] = values.map((value, index) => [
    round((index / (values.length - 1)) * VIEW_WIDTH),
    round(bottom - ((value - min) / range) * (bottom - PADDING)),
  ]);
  const line = createBezierPath(coords, 0.3, { minY: PADDING, maxY: bottom });
  const area = `${line} L ${VIEW_WIDTH},${VIEW_HEIGHT} L 0,${VIEW_HEIGHT} Z`;
  const [endX, endY] = coords[coords.length - 1];
  const marker = {
    left: `${round((endX / VIEW_WIDTH) * 100)}%`,
    top: `${round((endY / VIEW_HEIGHT) * 100)}%`,
  };

  return (
    <div
      ref={observeChartReveal}
      className={`sensor-trend relative ${className}`}
      style={{ '--viz-color': color } as CSSProperties}
    >
      <div ref={plotRef} className="sensor-trend-plot absolute inset-0">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient
              id={`trend-line-${ids}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={VIEW_WIDTH}
              y2="0"
            >
              <stop offset="0" className="sensor-viz-stop" stopOpacity={0.3} />
              <stop offset="1" className="sensor-viz-stop" />
            </linearGradient>
            <linearGradient
              id={`trend-area-${ids}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={PADDING}
              x2="0"
              y2={VIEW_HEIGHT}
            >
              <stop offset="0" className="sensor-viz-stop" stopOpacity={0.24} />
              <stop offset="1" className="sensor-viz-stop" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            data-trend-area
            className="sensor-trend-shape"
            d={area}
            style={{ d: `path("${area}")` }}
            fill={`url(#trend-area-${ids})`}
          />
          <path
            data-trend-line
            className="sensor-trend-shape"
            d={line}
            style={{ d: `path("${line}")` }}
            fill="none"
            stroke={`url(#trend-line-${ids})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span
            ref={rippleRef}
            className="sensor-viz-marker sensor-viz-ripple sensor-trend-marker"
            style={marker}
          />
          <span
            data-trend-dot
            className="sensor-viz-marker sensor-trend-dot sensor-trend-marker"
            style={marker}
          />
        </span>
      </div>
    </div>
  );
}

export default memo(SensorTrend);
