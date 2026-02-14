import { Coins } from '../../icons';
import { getIconComponent } from '../../icons';

const getEntityValue = (entity, decimals = 0) => {
  const state = entity?.state;
  if (!state || state === 'unavailable' || state === 'unknown') return '--';
  const value = parseFloat(state);
  if (Number.isFinite(value)) {
    return value.toFixed(decimals);
  }
  return state;
};

const formatMonthValue = (entity) => {
  const value = parseFloat(entity?.state);
  if (Number.isFinite(value)) return Math.round(value);
  return String(getEntityValue(entity));
};

export default function GenericEnergyCostCard({
  cardId,
  todayEntityId,
  monthEntityId,
  entities,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  decimals = 0,
  settings,
  onOpen,
  t
}) {
  const isSmall = settings?.size === 'small';
  const todayEntity = todayEntityId ? entities[todayEntityId] : null;
  const monthEntity = monthEntityId ? entities[monthEntityId] : null;

  const name = customNames[cardId] || t('energyCost.title');
  const Icon = customIcons[cardId] ? (getIconComponent(customIcons[cardId]) || Coins) : Coins;
  const translate = t || ((key) => key);
  const todayLabel = settings?.todayLabel || translate('energyCost.today');
  const monthLabel = settings?.monthLabel || translate('energyCost.thisMonth');

  if (isSmall) {
    return (
      <div
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }}
        className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
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
              <span className="text-sm font-bold text-[var(--text-primary)] leading-none">{getEntityValue(todayEntity, decimals)} kr</span>
              <span className="text-xs text-[var(--text-secondary)]">{todayLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider opacity-60">{monthLabel}</span>
          <span className="text-base font-medium text-[var(--text-primary)]">{formatMonthValue(monthEntity)} kr</span>
        </div>
      </div>
    );
  }

  return (
    <div
      key="energy_cost"
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => { e.stopPropagation(); if (!editMode && onOpen) onOpen(); }}
      className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
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
      <div className="grid grid-cols-2 gap-y-2 relative z-10 mt-2">
        <div className="col-start-1 row-start-1">
            <p className="text-[11px] tracking-widest font-bold uppercase opacity-60" style={{ color: 'var(--text-secondary)' }}>{todayLabel}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{getEntityValue(todayEntity, decimals)}</span>
            <span className="text-lg text-[var(--text-secondary)]">kr</span>
          </div>
        </div>
        <div className="col-span-2 row-start-2 h-px" style={{ backgroundColor: 'var(--glass-border)' }} />
        <div className="col-start-2 row-start-3 justify-self-end text-right">
           <p className="text-[11px] tracking-widest font-bold uppercase opacity-60" style={{ color: 'var(--text-secondary)' }}>{monthLabel}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatMonthValue(monthEntity)} kr</p>
        </div>
      </div>
    </div>
  );
}
