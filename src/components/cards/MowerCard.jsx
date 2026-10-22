import { useEffect, useRef, useState, memo } from 'react';
import { getIconComponent } from '../../icons';
import { AlertTriangle, Battery, Sprout, Home, MapPin, Pause, Play } from '../../icons';

function getMowerStateLabel(state, battery, t) {
  const normalized = String(state || '').toLowerCase();
  if (!normalized) return t('mower.unknown');

  if (normalized === 'mowing' || normalized === 'cleaning') return t('mower.mowing');
  if (
    normalized === 'returning' ||
    normalized === 'going_home' ||
    normalized === 'return_to_base'
  ) {
    return t('mower.returning');
  }
  if ((normalized === 'charging' || normalized === 'docked') && battery === 100)
    return t('mower.docked');
  if (normalized === 'docked') return t('mower.charging');
  if (normalized === 'idle' || normalized === 'ready') return t('mower.idle');
  if (normalized === 'paused' || normalized === 'pause') return t('mower.pause');
  if (['error', 'fault', 'problem', 'stuck'].includes(normalized)) {
    return t('mower.error');
  }
  if (normalized === 'stopped') return t('mower.stopped');
  return state;
}

const ACTIVE_STATES = ['mowing', 'cleaning'];

const MowerCard = ({
  mowerId,
  entityId: entityIdProp,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  customIcons,
  getA,
  callService,
  onOpen,
  isMobile,
  t,
}) => {
  const cardRef = useRef(null);
  const [isNarrowSmallCard, setIsNarrowSmallCard] = useState(false);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const updateWidth = (width) => {
      setIsNarrowSmallCard((prev) => {
        if (prev) return width < 296;
        return width < 276;
      });
    };

    updateWidth(element.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? element.clientWidth;
      updateWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const entityId = entityIdProp || mowerId;
  const entity = entities[entityId];
  if (!entity) {
    if (editMode) {
      return (
        <div
          key={mowerId}
          {...dragProps}
          className="touch-feedback relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[var(--status-error-border)] bg-[var(--card-bg)] p-4"
          style={cardStyle}
        >
          {controls}
          <AlertTriangle className="mb-2 h-8 w-8 text-[var(--status-error-fg)] opacity-80" />
          <p className="text-center text-xs font-bold tracking-widest text-[var(--status-error-fg)] uppercase">
            {t('common.missing')}
          </p>
          <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-[var(--status-error-fg)]/70">
            {mowerId}
          </p>
        </div>
      );
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[mowerId] || {};
  const isSmall = settings.size === 'small';
  const state = entity?.state;
  const normalizedState = String(state || '').toLowerCase();
  const isActive = ACTIVE_STATES.includes(normalizedState);
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isErrorState = ['error', 'fault', 'problem', 'stuck'].includes(normalizedState);
  const battery = getA(entityId, 'battery_level');
  const zone =
    getA(entityId, 'current_zone') || getA(entityId, 'zone') || getA(entityId, 'current_room');
  const name = customNames[mowerId] || getA(entityId, 'friendly_name', t('mower.name'));
  const mowerIconName = customIcons[mowerId] || entity?.attributes?.icon;
  const Icon = mowerIconName ? getIconComponent(mowerIconName) || Sprout : Sprout;
  const statusText = getMowerStateLabel(state, battery, t);
  const useStackedSmallControls = isMobile || isNarrowSmallCard;
  const useDenseMobileLargeLayout = isMobile && !isSmall;

  const showZone = !!zone;
  const showBattery = typeof battery === 'number';

  const callPrimary = () => {
    if (isUnavailable) return;
    callService('lawn_mower', isActive ? 'pause' : 'start_mowing', { entity_id: entityId });
  };
  const callDock = () => {
    if (isUnavailable) return;
    callService('lawn_mower', 'dock', { entity_id: entityId });
  };

  if (isSmall) {
    return (
      <div
        ref={cardRef}
        key={mowerId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen?.();
        }}
        className={`glass-texture touch-feedback group relative flex h-full overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${useStackedSmallControls ? 'items-center justify-between gap-3 p-3' : isMobile ? 'items-center justify-between gap-2 p-3 pl-4' : 'items-center justify-between gap-4 p-4 pl-5'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{
          ...cardStyle,
          backgroundColor: isErrorState
            ? 'var(--status-error-bg)'
            : isActive
              ? 'var(--status-success-bg)'
              : 'var(--card-bg)',
          borderColor: editMode
            ? 'rgba(59, 130, 246, 0.2)'
            : isErrorState
              ? 'var(--status-error-border)'
              : isActive
                ? 'var(--status-success-border)'
                : 'var(--card-border)',
          containerType: 'inline-size',
        }}
      >
        {controls}
        <div
          className={`flex min-w-0 ${useStackedSmallControls ? 'flex-1 items-center gap-3' : isMobile ? 'flex-1 items-center gap-3' : 'flex-1 items-center gap-4'}`}
        >
          <div
            className={`flex flex-shrink-0 items-center justify-center transition-all group-hover:scale-110 ${isActive ? 'animate-pulse bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'} ${useStackedSmallControls ? 'h-10 w-10 rounded-xl' : isMobile ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'}`}
          >
            <Icon
              className={`${useStackedSmallControls ? 'h-[18px] w-[18px]' : isMobile ? 'h-5 w-5' : 'h-6 w-6'} stroke-[1.5px]`}
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <p
              className={`${useStackedSmallControls ? 'mb-0.5 text-[10px]' : isMobile ? 'mb-1 text-[10px]' : 'mb-1.5 text-xs'} truncate leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60`}
            >
              {name}
            </p>
            <div
              className={`flex min-w-0 items-center ${useStackedSmallControls ? 'gap-1' : isMobile ? 'gap-1.5' : 'gap-2'}`}
            >
              <span
                className={`${useStackedSmallControls ? 'truncate text-[13px]' : isMobile ? 'text-xs' : 'text-sm'} leading-none font-bold text-[var(--text-primary)]`}
              >
                {statusText}
              </span>
              {isErrorState && (
                <span className="flex items-center gap-1 rounded-full border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-2 py-0.5 text-[10px] font-bold tracking-widest text-[var(--status-error-fg)] uppercase">
                  <AlertTriangle className="h-3 w-3" />
                  {t('mower.error')}
                </span>
              )}
              {showBattery && !useStackedSmallControls && (
                <span className="text-xs text-[var(--text-secondary)]">{battery}%</span>
              )}
            </div>
          </div>
        </div>
        <div
          className={
            useStackedSmallControls
              ? 'flex shrink-0 flex-col gap-1 rounded-2xl bg-[var(--glass-bg)] p-1'
              : 'mower-card-controls flex shrink-0 gap-2'
          }
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              callPrimary();
            }}
            aria-label={isActive ? t('mower.pause') : t('mower.start')}
            className={`flex items-center justify-center text-[var(--text-primary)] transition-colors active:scale-95 ${useStackedSmallControls ? 'h-8 w-8 rounded-xl hover:bg-[var(--glass-bg-hover)]' : 'h-8 w-8 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]'}`}
          >
            {isActive ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              callDock();
            }}
            aria-label={t('mower.dock')}
            className={`flex items-center justify-center text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] active:scale-95 ${useStackedSmallControls ? 'h-8 w-8 rounded-xl hover:bg-[var(--glass-bg-hover)]' : 'h-8 w-8 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]'}`}
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      key={mowerId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen?.();
      }}
      className={`glass-texture touch-feedback ${isMobile ? 'p-5' : 'p-7'} group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{
        ...cardStyle,
        backgroundColor: isErrorState
          ? 'var(--status-error-bg)'
          : isActive
            ? 'var(--status-success-bg)'
            : 'var(--card-bg)',
        borderColor: editMode
          ? 'rgba(59, 130, 246, 0.2)'
          : isErrorState
            ? 'var(--status-error-border)'
            : isActive
              ? 'var(--status-success-border)'
              : 'var(--card-border)',
      }}
    >
      {controls}
      <div
        className={`flex items-start justify-between font-sans ${useDenseMobileLargeLayout ? 'gap-3' : ''}`}
      >
        <div
          className={`transition-all group-hover:scale-110 group-hover:rotate-3 ${isMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'} ${isActive ? 'animate-pulse bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
        >
          <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} stroke-[1.5px]`} />
        </div>
        <div
          className={`flex flex-col items-end ${useDenseMobileLargeLayout ? 'gap-1.5' : 'gap-2'}`}
        >
          {isErrorState && (
            <div
              className={`flex items-center rounded-full border border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)] ${useDenseMobileLargeLayout ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1'}`}
            >
              <AlertTriangle className={useDenseMobileLargeLayout ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              <span
                className={`${useDenseMobileLargeLayout ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}
              >
                {t('mower.error')}
              </span>
            </div>
          )}
          {showZone && (
            <div
              className={`flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] ${useDenseMobileLargeLayout ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1'}`}
            >
              <MapPin className={useDenseMobileLargeLayout ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              <span
                className={`${useDenseMobileLargeLayout ? 'max-w-[9ch] text-[10px]' : 'text-xs'} truncate font-bold tracking-widest uppercase`}
              >
                {zone}
              </span>
            </div>
          )}
          {showBattery && !useDenseMobileLargeLayout && (
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[var(--text-secondary)]">
              <Battery className="h-3 w-3" />
              <span className="text-xs font-bold tracking-widest uppercase">{battery}%</span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`${useDenseMobileLargeLayout ? 'mt-2' : ''} ${useDenseMobileLargeLayout ? 'flex flex-col gap-3' : 'flex items-end justify-between'}`}
      >
        <div>
          <p
            className={`${useDenseMobileLargeLayout ? 'mb-0.5 text-[10px]' : 'mb-1 text-xs'} font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60`}
          >
            {name}
          </p>
          <h3
            className={`${useDenseMobileLargeLayout ? 'text-[1.4rem]' : isMobile ? 'text-[1.65rem]' : 'text-3xl'} leading-none font-thin text-[var(--text-primary)]`}
          >
            {statusText}
          </h3>
          {showBattery && useDenseMobileLargeLayout && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-[var(--text-secondary)]">
              <Battery className="h-2.5 w-2.5" />
              <span className="text-[10px] font-bold tracking-widest uppercase">{battery}%</span>
            </div>
          )}
        </div>
        <div
          className={`${useDenseMobileLargeLayout ? 'grid w-full grid-cols-2 gap-2' : 'flex gap-2'}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              callPrimary();
            }}
            aria-label={isActive ? t('mower.pause') : t('mower.start')}
            className={`${useDenseMobileLargeLayout ? 'flex h-10 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)]' : `${isMobile ? 'p-2.5' : 'p-3'} rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)]`} transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95`}
          >
            {isActive ? (
              <Pause
                className={`${useDenseMobileLargeLayout ? 'h-4 w-4' : 'h-5 w-5'} fill-current`}
              />
            ) : (
              <Play
                className={`${useDenseMobileLargeLayout ? 'ml-0.5 h-4 w-4' : 'ml-0.5 h-5 w-5'} fill-current`}
              />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              callDock();
            }}
            aria-label={t('mower.dock')}
            className={`${useDenseMobileLargeLayout ? 'flex h-10 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)]' : `${isMobile ? 'p-2.5' : 'p-3'} rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)]`} transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95`}
          >
            <Home className={useDenseMobileLargeLayout ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(MowerCard);
