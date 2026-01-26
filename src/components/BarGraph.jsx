import React from 'react';

const BarGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const normalizedData = data.map(d => (typeof d === 'object' ? d : { value: d, label: '' }));
  
  // Ensure we always show 7 bars to maintain layout
  const paddedData = [...Array(Math.max(0, 7 - normalizedData.length)).fill({ value: 0, label: '' }), ...normalizedData];
  const max = Math.max(...paddedData.map(d => d.value)) * 1.1 || 1;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end gap-[2px] px-0 opacity-90 pointer-events-none">
      {paddedData.map((d, i) => (
        <div key={i} className="flex-1 flex items-end h-full group relative pointer-events-auto">
           <div className={`w-full rounded-t-sm transition-all duration-1000 ${i === paddedData.length - 1 ? 'bg-emerald-400' : 'bg-emerald-500/30 group-hover:bg-emerald-500/60'}`} style={{ height: `${(d.value/max)*100}%` }}></div>
           {d.value > 0 && (
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-[#121214] border border-white/10 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl flex flex-col items-center pointer-events-none">
               <span className="font-bold text-emerald-400 text-xs">{d.value.toFixed(0)} kr</span>
               <span className="text-gray-500 font-medium uppercase tracking-wider">{d.label}</span>
             </div>
           )}
        </div>
      ))}
    </div>
  );
};

export default BarGraph;
