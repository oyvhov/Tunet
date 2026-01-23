import { useState, useRef } from 'react';

export default function InteractivePowerGraph({ data, currentIndex }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 800;
  const height = 300;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / range) * height,
    val: v,
    time: new Date(data[i].start).toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })
  }));
  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round((x / width) * (values.length - 1));
    if (idx >= 0 && idx < values.length) setHoverIndex(idx);
  };
  const activePoint = (hoverIndex !== null ? points[hoverIndex] : points[currentIndex]) || points[0];

  const getDotColor = (val) => {
    const t = (val - min) / range;
    if (t > 0.6) return "#ef4444";
    if (t > 0.3) return "#eab308";
    return "#3b82f6";
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-4 px-2">
        <div><p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold mb-0.5">Tidspunkt</p><p className="text-xl font-medium text-[var(--text-primary)]">{activePoint.time}</p></div>
        <div className="text-right"><p className="text-[10px] tracking-widest uppercase font-bold mb-0.5" style={{color: getDotColor(activePoint.val)}}>Pris</p><p className="text-3xl font-light text-[var(--text-primary)] italic leading-none tracking-tighter">{activePoint.val.toFixed(2)} <span className="text-sm text-gray-600 not-italic ml-1">øre</span></p></div>
      </div>
      <div className="relative h-60 w-full" onMouseLeave={() => setHoverIndex(null)}>
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 font-bold py-1 pointer-events-none"><span>{max.toFixed(0)}</span><span>{min.toFixed(0)}</span></div>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible cursor-crosshair" onMouseMove={handleMouseMove} onTouchMove={(e) => handleMouseMove(e.touches[0])}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="50%" stopColor="#eab308" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" /></linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#eab308" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
          </defs>
          <path d={areaData} fill="url(#areaGrad)" /><path d={pathData} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {activePoint && <><line x1={activePoint.x} y1="0" x2={activePoint.x} y2={height} stroke={getDotColor(activePoint.val)} strokeWidth="1" opacity="0.3" /><circle cx={activePoint.x} cy={activePoint.y} r="4" fill={getDotColor(activePoint.val)} /><circle cx={activePoint.x} cy={activePoint.y} r="10" fill={getDotColor(activePoint.val)} fillOpacity="0.1" /></>}
        </svg>
      </div>
    </div>
  );
}