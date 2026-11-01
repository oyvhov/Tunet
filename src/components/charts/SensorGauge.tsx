/**
 * Lightweight SVG gauge/donut/bar for sensor cards.
 * No external deps - pure SVG.
 */
interface RangeProps {
  value: number;
  min: number;
  max: number;
  color?: string;
  ariaLabel?: string;
}

interface RingProps extends RangeProps {
  size?: number;
  strokeWidth?: number;
}

export function Gauge({
  value,
  min,
  max,
  size = 80,
  strokeWidth = 8,
  color = 'var(--accent-color)',
  className = '',
  ariaLabel = undefined,
}: RingProps & { className?: string }) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const height = size / 2 + strokeWidth / 2;
  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 ${size} ${height}`}
      className={`overflow-visible ${className}`}
      role="img"
      aria-label={ariaLabel || `${value} in a range from ${min} to ${max}`}
    >
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke="var(--glass-bg)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

export function Donut({
  value,
  min,
  max,
  size = 80,
  strokeWidth = 10,
  color = 'var(--accent-color)',
  ariaLabel = undefined,
}: RingProps) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
      role="img"
      aria-label={ariaLabel || `${value} in a range from ${min} to ${max}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--glass-bg)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
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
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  return (
    <div
      className="relative w-full overflow-hidden rounded-full bg-[var(--glass-bg)]"
      style={{ height: Math.max(6, height) }}
      role="img"
      aria-label={ariaLabel || `${value} in a range from ${min} to ${max}`}
    >
      <div
        className="relative h-full min-w-[3px] rounded-full transition-all duration-400 ease-out"
        style={{ width: `${pct * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
