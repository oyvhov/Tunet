import React from 'react';

export default function SensorHistoryGraph({ data, height = 200, color = "#3b82f6", noDataLabel = "No history data available" }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
        {noDataLabel}
      </div>
    );
  }

  // Determine graph dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = 600; // viewBox width
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Calculate min/max values
  const values = data.map(d => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  
  if (min === max) {
    min -= 1;
    max += 1;
  }
  
  // Add some padding to Y-axis range
  const range = max - min;
  const renderMin = min - (range * 0.05);
  const renderMax = max + (range * 0.05);
  const renderRange = renderMax - renderMin;

  // Create points
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * graphWidth;
    const y = padding.top + graphHeight - ((d.value - renderMin) / renderRange) * graphHeight;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;
  const areaData = `${pathData} L ${padding.left + graphWidth},${height - padding.bottom} L ${padding.left},${height - padding.bottom} Z`;

  // Generate Y-axis labels (Max, Mid, Min)
  const yLabels = [
    { value: max, y: padding.top },
    { value: (max + min) / 2, y: padding.top + graphHeight / 2 },
    { value: min, y: height - padding.bottom }
  ];

  // Generate X-axis labels (Start, End) - Simplified
  const startTime = new Date(data[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(data[data.length - 1].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Generate unique ID for gradient
  const gradientId = `graph-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
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

        {/* Area fill */}
        <path d={areaData} fill={`url(#${gradientId})`} style={{mixBlendMode: 'screen'}} />

        {/* Line - Thinner, cleaner */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Y-axis Labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={label.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-[12px] fill-current opacity-70 font-mono"
            style={{fill: 'var(--text-secondary)'}}
          >
            {label.value.toFixed(1)}
          </text>
        ))}

        {/* X-axis Labels */}
        <text
          x={padding.left}
          y={height - 5}
          textAnchor="start"
          className="text-[12px] fill-current opacity-70 font-mono"
          style={{fill: 'var(--text-secondary)'}}
        >
          {startTime}
        </text>
        <text
          x={width - padding.right}
          y={height - 5}
          textAnchor="end"
          className="text-[12px] fill-current opacity-70 font-mono"
          style={{fill: 'var(--text-secondary)'}}
        >
          {endTime}
        </text>
      </svg>
    </div>
  );
}
