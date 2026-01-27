export default function EnergyCostCard({
  dragProps,
  controls,
  cardStyle,
  editMode,
  name,
  Icon,
  todayValue,
  monthValue,
  isSmall = false,
  t
}) {
  const translate = t || ((key) => key);

  if (isSmall) {
    return (
      <div
        {...dragProps}
        className={`p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
            <Icon className="w-6 h-6 stroke-[1.5px]" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{name}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)] leading-none">{String(todayValue)} kr</span>
              <span className="text-xs text-[var(--text-secondary)]">{translate('energyCost.today')}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider opacity-60">{translate('energyCost.thisMonth')}</span>
          <span className="text-base font-medium text-[var(--text-primary)]">{monthValue} kr</span>
        </div>
      </div>
    );
  }

  return (
    <div
      key="energy_cost"
      {...dragProps}
      className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50 pointer-events-none" />
      <div className="flex justify-between items-start relative z-10">
        <div className="p-3 rounded-2xl transition-all duration-500" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
          <Icon className="w-5 h-5" style={{ strokeWidth: 1.5 }} />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
          <span className="text-xs tracking-widest font-bold uppercase">{name}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 relative z-10 mt-2">
        <p className="text-[var(--text-secondary)] text-xs uppercase font-bold opacity-60 leading-none tracking-widest">{translate('energyCost.today')}</p>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-5xl font-light text-[var(--text-primary)] tracking-tight">{String(todayValue)}</span>
          <span className="text-[var(--text-secondary)] font-medium text-lg">kr</span>
        </div>
      </div>
      <div className="relative z-10 mt-auto pt-4 border-t border-[var(--glass-border)]">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-80">{translate('energyCost.thisMonth')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-medium text-[var(--text-primary)]">{monthValue}</span>
            <span className="text-xs text-[var(--text-secondary)]">kr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
