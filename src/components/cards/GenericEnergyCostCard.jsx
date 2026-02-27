import { Coins } from '../../icons';
import { getIconComponent } from '../../icons';
import { useHomeAssistantMeta } from '../../contexts';

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
  t,
}) {
  const { haConfig } = useHomeAssistantMeta();
  const currency = settings?.currency || haConfig?.currency || 'kr';

  const isSmall = settings?.size === 'small';
  const todayEntity = todayEntityId ? entities[todayEntityId] : null;
  const monthEntity = monthEntityId ? entities[monthEntityId] : null;

  const name = customNames[cardId] || t('energyCost.title');
  const Icon = customIcons[cardId] ? getIconComponent(customIcons[cardId]) || Coins : Coins;
  const translate = t || ((key) => key);
  const todayLabel = settings?.todayLabel || translate('energyCost.today');
  const monthLabel = settings?.monthLabel || translate('energyCost.thisMonth');

  if (isSmall) {
    return (
      <div
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}
          >
            <Icon className="h-6 w-6 stroke-[1.5px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
              {name}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm leading-none font-bold text-[var(--text-primary)]">
                {getEntityValue(todayEntity, decimals)} {currency}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{todayLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key="energy_cost"
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50" />
      <div className="relative z-10 flex items-start justify-between">
        <div
          className="rounded-2xl p-3 transition-all duration-500 group-hover:scale-110"
          style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}
        >
          <Icon className="h-5 w-5" style={{ strokeWidth: 1.5 }} />
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full border px-3 py-1 transition-all"
          style={{
            backgroundColor: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="text-xs font-bold tracking-widest uppercase">{name}</span>
        </div>
      </div>
      <div className="relative z-10 mt-2 grid grid-cols-2 gap-y-1">
        <div className="col-start-1 row-start-1 pb-1">
          <p
            className="text-[11px] font-bold tracking-widest uppercase opacity-60"
            style={{ color: 'var(--text-secondary)' }}
          >
            {todayLabel}
          </p>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-4xl font-thin" style={{ color: 'var(--text-primary)' }}>
              {getEntityValue(todayEntity, decimals)}
            </span>
            <span className="text-lg text-[var(--text-secondary)]">{currency}</span>
          </div>
        </div>
        <div className="col-span-2 row-start-2 my-0.5 h-px bg-[var(--glass-border)] opacity-30" />
        <div className="col-start-2 row-start-3 justify-self-end pt-1 text-right">
          <p
            className="text-[11px] font-bold tracking-widest uppercase opacity-60"
            style={{ color: 'var(--text-secondary)' }}
          >
            {monthLabel}
          </p>
          <p className="mt-0.5 text-xl leading-none font-light text-[var(--text-primary)]">
            {formatMonthValue(monthEntity)} {currency}
          </p>
        </div>
      </div>
    </div>
  );
}
