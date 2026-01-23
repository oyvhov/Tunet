import SparkLine from './SparkLine';

export default function EnergyPowerCard({
  dragProps,
  controls,
  cardStyle,
  editMode,
  name,
  Icon,
  priceDisplay,
  currentPrice,
  priceStats,
  fullPriceData,
  currentPriceIndex,
  onOpen
}) {
  let levelText = 'NORMAL';
  let levelColor = 'text-blue-400';

  if (!Number.isNaN(currentPrice) && priceStats.avg > 0) {
    if (currentPrice >= priceStats.avg * 1.4) {
      levelText = 'VELDIG HØG';
      levelColor = 'text-red-400';
    } else if (currentPrice >= priceStats.avg * 1.15) {
      levelText = 'HØG';
      levelColor = 'text-orange-400';
    } else if (currentPrice <= priceStats.avg * 0.9) {
      levelText = 'LAV';
      levelColor = 'text-green-400';
    }
  }

  return (
    <div
      key="power"
      {...dragProps}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <div className="flex justify-between items-start">
        <div className="p-3 rounded-2xl text-amber-400 group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)' }}>
          <Icon className="w-5 h-5" style={{ strokeWidth: 1.5 }} />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
          <span className={`text-xs tracking-widest uppercase font-bold ${levelColor}`}>{levelText}</span>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <p className="text-[var(--text-secondary)] text-xs uppercase mb-0.5 font-bold opacity-60 leading-none" style={{ letterSpacing: '0.05em' }}>
            {name}
          </p>
        </div>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-4xl font-medium text-[var(--text-primary)] leading-none">{String(priceDisplay)}</span>
          <span className="text-[var(--text-muted)] font-medium text-base ml-1">øre</span>
        </div>
        <SparkLine data={fullPriceData} currentIndex={currentPriceIndex} />
      </div>
    </div>
  );
}
