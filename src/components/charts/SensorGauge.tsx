/**
 * Lightweight SVG gauge/donut/bar for sensor cards.
 * No external deps - pure SVG plus CSS motion (see `sensor-viz` in animations.css).
 *
 * Arcs and rings share one language: the same stroke-to-size ratio, round caps, track
 * colour, bezel ticks on the empty track, a tint-to-colour gradient along the value and a
 * dot that marks the value. They draw in once on screen and sweep to new values.
 */
import { useId } from 'react';
import type { CSSProperties } from 'react';
import { observeChartReveal, useValueRipple } from './chartMotion';

/** Stroke thickness as a share of the gauge's diameter, the same for arcs and rings. */
export const GAUGE_STROKE_RATIO = 0.12;
const ARC_TICKS = 10;
const RING_TICKS = 12;
const TRACK_COLOR = 'var(--glass-bg)';

interface RangeProps {
  value: number;
  min: number;
  max: number;
  color?: string;
  ariaLabel?: string;
}

interface RingProps extends RangeProps {
  size?: number;
  /** Sizing classes for the wrapper; without them the gauge is `size` px wide. */
  className?: string;
}

type VizStyle = CSSProperties & Record<`--viz-${string}`, string | number | undefined>;

const round = (value: number) => Math.round(value * 100) / 100;

const toFraction = (value: number, min: number, max: number) => {
  const range = max - min || 1;
  return Math.max(0, Math.min(1, (value - min) / range));
};

const polar = (center: number, radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return [
    round(center + radius * Math.cos(radians)),
    round(center + radius * Math.sin(radians)),
  ] as const;
};

function RangeRing({
  shape,
  value,
  min,
  max,
  size,
  color,
  className,
  ariaLabel,
}: Required<Pick<RingProps, 'size' | 'color'>> &
  Omit<RingProps, 'size' | 'color'> & { shape: 'arc' | 'ring' }) {
  const gradientId = `viz-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const pct = toFraction(value, min, max);
  const rippleRef = useValueRipple<HTMLSpanElement>(round(pct * 100));

  const isArc = shape === 'arc';
  const stroke = round(size * GAUGE_STROKE_RATIO);
  const center = size / 2;
  const radius = round((size - stroke) / 2);
  const height = isArc ? round(center + stroke / 2) : size;
  const startAngle = isArc ? 180 : -90;
  const sweep = isArc ? 180 : 360;
  const length = round((sweep / 180) * Math.PI * radius);
  const [startX, startY] = polar(center, radius, startAngle);
  const [endX, endY] = polar(center, radius, startAngle + pct * sweep);
  const tickCount = isArc ? ARC_TICKS : RING_TICKS;
  const tickReach = stroke * 0.21;
  const ticks = Array.from({ length: isArc ? tickCount - 1 : tickCount }, (_, index) => {
    const angle = startAngle + ((isArc ? index + 1 : index) / tickCount) * sweep;
    const [x1, y1] = polar(center, radius - tickReach, angle);
    const [x2, y2] = polar(center, radius + tickReach, angle);
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }).join(' ');
  const arcPath = `M ${stroke / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${center}`;
  const ringProps = { cx: center, cy: center, r: radius };
  const valueStyle: VizStyle = {
    '--viz-len': `${length}px`,
    '--viz-offset': `${round(length * (1 - pct))}px`,
  };
  const markerTop = `${round((stroke / 2 / size) * 100)}%`;
  const strokeProps = {
    fill: 'none',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
  };

  return (
    <div
      ref={observeChartReveal}
      className={`sensor-viz relative ${className || ''}`}
      style={{ '--viz-color': color, ...(className ? {} : { width: size }) } as VizStyle}
    >
      <svg
        width={size}
        height={height}
        viewBox={`0 0 ${size} ${height}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel || `${value} in a range from ${min} to ${max}`}
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
          >
            <stop offset="0" className="sensor-viz-stop" stopOpacity={0.5} />
            <stop offset="1" className="sensor-viz-stop" />
          </linearGradient>
        </defs>
        {isArc ? (
          <path data-viz-track d={arcPath} stroke={TRACK_COLOR} {...strokeProps} />
        ) : (
          <circle data-viz-track {...ringProps} stroke={TRACK_COLOR} {...strokeProps} />
        )}
        <path
          data-viz-ticks
          d={ticks}
          fill="none"
          stroke="var(--text-secondary)"
          strokeOpacity={0.35}
          strokeWidth={Math.max(0.6, round(size * 0.009))}
        />
        {isArc ? (
          <path
            data-viz-value
            className="sensor-viz-value"
            d={arcPath}
            stroke={`url(#${gradientId})`}
            style={valueStyle}
            {...strokeProps}
          />
        ) : (
          <circle
            data-viz-value
            className="sensor-viz-value"
            {...ringProps}
            stroke={`url(#${gradientId})`}
            transform={`rotate(-90 ${center} ${center})`}
            style={valueStyle}
            {...strokeProps}
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 aspect-square w-full"
      >
        <span
          data-viz-arm
          className="sensor-viz-arm absolute inset-0"
          style={
            {
              '--viz-angle': `${round(pct * sweep - (isArc ? 90 : 0))}deg`,
              '--viz-angle-start': `${isArc ? -90 : 0}deg`,
            } as VizStyle
          }
        >
          <span
            ref={rippleRef}
            className="sensor-viz-marker sensor-viz-ripple"
            style={{ top: markerTop, width: `${round((stroke / size) * 100)}%` }}
          />
          <span
            data-viz-dot
            className="sensor-viz-marker sensor-viz-dot"
            style={{
              top: markerTop,
              width: `${round((Math.max(stroke * 0.45, 2.4) / size) * 100)}%`,
            }}
          />
        </span>
      </span>
    </div>
  );
}

export function Gauge({
  value,
  min,
  max,
  size = 80,
  color = 'var(--accent-color)',
  className = '',
  ariaLabel = undefined,
}: RingProps) {
  return (
    <RangeRing
      shape="arc"
      value={value}
      min={min}
      max={max}
      size={size}
      color={color}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

export function Donut({
  value,
  min,
  max,
  size = 80,
  color = 'var(--accent-color)',
  className = '',
  ariaLabel = undefined,
}: RingProps) {
  return (
    <RangeRing
      shape="ring"
      value={value}
      min={min}
      max={max}
      size={size}
      color={color}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

export function Bar({
  value,
  min,
  max,
  height = 12,
  color = 'var(--accent-color)',
  ariaLabel = undefined,
}: RangeProps & { height?: number }) {
  const pct = toFraction(value, min, max);
  return (
    <div
      ref={observeChartReveal}
      className="sensor-viz-bar relative w-full overflow-hidden rounded-full bg-[var(--glass-bg)]"
      style={
        {
          height: Math.max(6, height),
          '--viz-color': color,
          '--viz-pct': Math.round(pct * 10000) / 10000,
        } as VizStyle
      }
      role="img"
      aria-label={ariaLabel || `${value} in a range from ${min} to ${max}`}
    >
      <div className="sensor-viz-bar-fill relative h-full min-w-[3px] rounded-full" />
    </div>
  );
}
