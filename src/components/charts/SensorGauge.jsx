/**
 * Lightweight SVG gauge/donut/bar for sensor cards.
 * No external deps - pure SVG.
 */
export function Gauge({ value, min, max, size = 80, strokeWidth = 8, color = 'var(--accent-color)' }) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg width={size} height={size / 2 + strokeWidth / 2} className="overflow-visible">
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

export function Donut({ value, min, max, size = 80, strokeWidth = 10, color = 'var(--accent-color)' }) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="overflow-visible">
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

export function Bar({ value, min, max, height = 12, color = 'var(--accent-color)' }) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));

  return (
    <div className="w-full rounded-full bg-[var(--glass-bg)] overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-400 ease-out"
        style={{ width: `${pct * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
