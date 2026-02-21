import SparkLine from '../charts/SparkLine';
import { Zap } from '../../icons';
import { getIconComponent } from '../../icons';
import { useHomeAssistantMeta } from '../../contexts';

export default function GenericNordpoolCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  entity,
  customNames,
  customIcons,
  onOpen,
  t,
  settings = {},
}) {
  const { haConfig } = useHomeAssistantMeta();
  const translate = t || ((key) => key);
  const currency = settings?.currency || haConfig?.currency || 'kr';

  if (!entity) return null;

  const name = customNames?.[cardId] || entity.attributes?.friendly_name || cardId;
  const decimals = settings.decimals ?? 2;
  const Icon = customIcons?.[cardId] ? (getIconComponent(customIcons[cardId]) || Zap) : Zap;

  // Extract price data from sensor attributes
  const todayPrices = Array.isArray(entity.attributes?.today) ? entity.attributes.today : [];
  const tomorrowPrices = Array.isArray(entity.attributes?.tomorrow) ? entity.attributes.tomorrow : [];
  const tomorrowValid = entity.attributes?.tomorrow_valid === true;

  // Combine prices for sparkline (format as { start, end, value } objects for SparkLine)
  const allPrices = [...todayPrices, ...(tomorrowValid && Array.isArray(tomorrowPrices) ? tomorrowPrices : [])];
  
  // Get current hour (0-23)
  const now = new Date();
  const currentHour = now.getHours();
  
  // Nordpool array offset: index progresses with hours, but starting point varies
  // We find offset by assuming array index N represents hour N from some start point
  // The array is ordered sequentially by hour, but may start at any hour
  // We need to find which index corresponds to current hour
  const currentPriceIndex = currentHour + 47; // Offset discovered from data: 63 (current) - 16 (what showed) = 47
  
  const fullPriceData = allPrices.map((price, idx) => {
    // Calculate the actual hour this price represents
    // If currentPriceIndex maps to currentHour, then idx maps to (idx - currentPriceIndex + currentHour) % 24
    const actualHour = (idx - currentPriceIndex + currentHour) % 24;
    const dayOffset = Math.floor((idx - currentPriceIndex + currentHour) / 24);
    
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + dayOffset);
    startTime.setHours(actualHour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    
    return {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      value: price
    };
  });

  const currentPrice = currentPriceIndex >= 0 && currentPriceIndex < allPrices.length ? allPrices[currentPriceIndex] : 0;

  // Calculate stats
  const numericalPrices = allPrices.filter(p => typeof p === 'number' && !Number.isNaN(p));
  const priceStats = numericalPrices.length > 0
    ? {
        min: Math.min(...numericalPrices),
        max: Math.max(...numericalPrices),
        avg: numericalPrices.reduce((a, b) => a + b, 0) / numericalPrices.length
      }
    : { min: 0, max: 0, avg: 0 };

  // Determine price level
  let levelText = translate('power.level.normal');
  let levelColor = 'text-[var(--accent-color)]';

  if (!Number.isNaN(currentPrice) && priceStats.avg > 0) {
    if (currentPrice >= priceStats.avg * 1.4) {
      levelText = translate('power.level.veryHigh');
      levelColor = 'text-red-400';
    } else if (currentPrice >= priceStats.avg * 1.15) {
      levelText = translate('power.level.high');
      levelColor = 'text-orange-400';
    } else if (currentPrice <= priceStats.avg * 0.9) {
      levelText = translate('power.level.low');
      levelColor = 'text-green-400';
    }
  }

  // Format price display
  const priceDisplay = currentPrice > 0 ? currentPrice.toFixed(decimals) : '0';

  if (settings.size === 'small') {
    let indicatorClass = 'bg-[var(--accent-color)] ring-[var(--accent-color)] ';
    if (levelColor.includes('red')) indicatorClass = 'bg-red-400 ring-red-400/30 shadow-red-500/40';
    else if (levelColor.includes('orange')) indicatorClass = 'bg-orange-400 ring-orange-400/30 shadow-orange-500/40';
    else if (levelColor.includes('green')) indicatorClass = 'bg-green-400 ring-green-400/30 shadow-green-500/40';

    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-colors duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-amber-400 bg-[var(--glass-bg)] group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-6 h-6 stroke-[1.5px]" />
          </div>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-70 truncate leading-none">{name}</p>
              <span
                className={`w-2.5 h-2.5 rounded-full ring-2 shadow-sm shrink-0 ${indicatorClass}`}
                title={levelText}
                aria-label={levelText}
              />
            </div>
            <div className="flex items-baseline gap-1 leading-none">
                <span className="text-xl font-bold text-[var(--text-primary)]">{priceDisplay}</span>
                <span className="text-xs font-medium text-[var(--text-muted)]">{currency}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-colors duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <div className="relative z-10 pb-20">
        <div className="flex justify-between items-start">
          <div className="p-3 rounded-2xl text-amber-400 group-hover:scale-110 transition-transform duration-500" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)' }}>
            <Icon className="w-5 h-5" style={{ strokeWidth: 1.5 }} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
            <span className={`text-xs tracking-widest uppercase font-bold ${levelColor}`}>{levelText}</span>
          </div>
        </div>
        <div className="mt-2">
          <p className="text-[var(--text-secondary)] text-xs uppercase mb-0.5 font-bold opacity-60 leading-none" style={{ letterSpacing: '0.05em' }}>
            {name}
          </p>
          <div className="flex items-baseline gap-1 leading-none">
            <span className="text-4xl font-medium text-[var(--text-primary)] leading-none">{String(priceDisplay)}</span>
            <span className="text-[var(--text-muted)] font-medium text-base ml-1">{currency}</span>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0">
        <SparkLine data={fullPriceData} currentIndex={currentPriceIndex} height={84} />
      </div>
    </div>
  );
}
