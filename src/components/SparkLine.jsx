import React from 'react';

export default function SparkLine({ data, currentIndex }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 300;
  const height = 40;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height
  }));
  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;
  const currentPoint = points[currentIndex] || points[0];

  const getDotColor = (val) => {
    const t = (val - min) / range;
    if (t > 0.6) return "#ef4444";
    if (t > 0.3) return "#eab308";
    return "#3b82f6";
  };

  return (
    <div className="mt-2 relative opacity-80 group-hover:opacity-100 transition-all duration-700">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="cardAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="50%" stopColor="#eab308" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" /></linearGradient>
          <linearGradient id="cardLineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
        </defs>
        <path d={areaData} fill="url(#cardAreaGrad)" />
        <path d={pathData} fill="none" stroke="url(#cardLineGrad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="3" fill={getDotColor(values[currentIndex])} className="animate-pulse" />
      </svg>
    </div>
  );
}