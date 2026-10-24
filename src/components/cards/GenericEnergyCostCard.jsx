import { memo } from 'react';
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

const getMonthProjection = (entity, now = new Date()) => {
  const value = parseFloat(entity?.state);
  if (!Number.isFinite(value)) return null;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed =
    (now.getDate() - 1 + (now.getHours() * 60 + now.getMinutes()) / 1440) / daysInMonth;
  if (elapsed < 0.1) return null;
  return Math.round(value / elapsed);
};

const formatMonthValue = (entity) => {
  const value = parseFloat(entity?.state);
  if (Number.isFinite(value)) return Math.round(value);
  return String(getEntityValue(entity));
};

const GenericEnergyCostCard = memo(
  /** @param {any} props */ function GenericEnergyCostCard({
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
    isMobile,
    onOpen,
    t,
  }) {
    const { haConfig } = useHomeAssistantMeta();
    const currency = settings?.currency || haConfig?.currency || 'kr';

    const isSmall = settings?.size === 'small';
    const isDenseMobile = isMobile && !isSmall;
    const todayEntity = todayEntityId ? entities[todayEntityId] : null;
    const monthEntity = monthEntityId ? entities[monthEntityId] : null;

    const name = customNames[cardId] || t('energyCost.title');
    const Icon = customIcons[cardId] ? getIconComponent(customIcons[cardId]) || Coins : Coins;
    const translate = t || ((key) => key);
    const todayLabel = settings?.todayLabel || translate('energyCost.today');
    const monthLabel = settings?.monthLabel || translate('energyCost.thisMonth');
    const todayValue = getEntityValue(todayEntity, decimals);
    const monthValue = formatMonthValue(monthEntity);
    const projectedMonth = getMonthProjection(monthEntity);

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
          style={{ ...cardStyle, containerType: 'inline-size' }}
        >
          {controls}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
              style={{
                backgroundColor: 'var(--status-success-bg)',
                color: 'var(--status-success-fg)',
              }}
            >
              <Icon className="h-6 w-6 stroke-[1.5px]" />
            </div>
            <div className="flex min-w-0 flex-col">
              <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
                {name}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm leading-none font-bold text-[var(--text-primary)]">
                  {todayValue} {currency}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">{todayLabel}</span>
              </div>
              {monthEntity && (
                <p
                  className="mt-1.5 truncate text-[11px] leading-none text-[var(--text-muted)] tabular-nums @max-[200px]:hidden"
                  data-cost-month
                >
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {monthValue} {currency}
                  </span>{' '}
                  {monthLabel}
                </p>
              )}
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
        className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={cardStyle}
      >
        {controls}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--status-success-bg)] to-transparent opacity-50" />
        <div className="relative z-10 flex items-start justify-between">
          <div
            className={`${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'} transition-all duration-500 group-hover:scale-110`}
            style={{
              backgroundColor: 'var(--status-success-bg)',
              color: 'var(--status-success-fg)',
            }}
          >
            <Icon className={isDenseMobile ? 'h-4 w-4' : 'h-5 w-5'} style={{ strokeWidth: 1.5 }} />
          </div>
          <div
            className={`flex items-center rounded-full border transition-all ${isDenseMobile ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1'}`}
            style={{
              backgroundColor: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}
            >
              {name}
            </span>
          </div>
        </div>
        <div
          className={`relative z-10 ${isDenseMobile ? 'mt-3 flex items-end justify-between gap-3' : 'mt-2 grid grid-cols-2 gap-y-1'}`}
        >
          <div className={isDenseMobile ? 'min-w-0 flex-1' : 'col-start-1 row-start-1 pb-1'}>
            <p
              className={`${isDenseMobile ? 'text-[10px]' : 'text-[11px]'} font-bold tracking-widest uppercase opacity-60`}
              style={{ color: 'var(--text-secondary)' }}
            >
              {todayLabel}
            </p>
            <div className={`flex items-baseline gap-1 ${isDenseMobile ? 'mt-1' : 'mt-0.5'}`}>
              <span
                className={`${isDenseMobile ? 'text-[1.7rem]' : 'text-4xl'} font-thin`}
                style={{ color: 'var(--text-primary)' }}
              >
                {todayValue}
              </span>
              <span
                className={`${isDenseMobile ? 'text-base' : 'text-lg'} text-[var(--text-secondary)]`}
              >
                {currency}
              </span>
            </div>
          </div>
          {isDenseMobile ? (
            <div className="min-w-0 text-right">
              <p
                className="text-[10px] font-bold tracking-widest uppercase opacity-60"
                style={{ color: 'var(--text-secondary)' }}
              >
                {monthLabel}
              </p>
              <p className="mt-1 text-sm leading-none font-medium text-[var(--text-primary)]">
                {monthValue} {currency}
              </p>
              {projectedMonth !== null && (
                <p className="mt-1 text-[10px] text-[var(--text-muted)] tabular-nums">
                  {translate('energyCost.projected')} ~{projectedMonth} {currency}
                </p>
              )}
            </div>
          ) : null}
          {!isDenseMobile && (
            <div className="col-span-2 row-start-2 my-0.5 h-px bg-[var(--glass-border)] opacity-30" />
          )}
          {!isDenseMobile && projectedMonth !== null && (
            <div className="col-start-1 row-start-3 self-end pt-1">
              <p className="text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                {translate('energyCost.projected')}
              </p>
              <p className="mt-0.5 text-xl leading-none font-light text-[var(--text-secondary)] tabular-nums">
                ~{projectedMonth} {currency}
              </p>
            </div>
          )}
          <div
            className={
              isDenseMobile ? 'hidden' : 'col-start-2 row-start-3 justify-self-end pt-1 text-right'
            }
          >
            <p
              className="text-[11px] font-bold tracking-widest uppercase opacity-60"
              style={{ color: 'var(--text-secondary)' }}
            >
              {monthLabel}
            </p>
            <p className="mt-0.5 text-xl leading-none font-light text-[var(--text-primary)]">
              {monthValue} {currency}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

export default GenericEnergyCostCard;
