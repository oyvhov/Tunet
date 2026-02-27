import { useEffect, useRef, useState } from 'react';
import { getIconComponent } from '../../icons';
import { AlertTriangle, Battery, Bot, Home, MapPin, Pause, Play } from '../../icons';

const VacuumCard = ({
  vacuumId,
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

    const updateWidth = () => {
      setIsNarrowSmallCard(element.clientWidth < 230);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const entity = entities[vacuumId];
  if (!entity) {
    if (editMode) {
      return (
        <div
          key={vacuumId}
          {...dragProps}
          className="touch-feedback relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-red-500/50 bg-[var(--card-bg)] p-4"
          style={cardStyle}
        >
          {controls}
          <AlertTriangle className="mb-2 h-8 w-8 text-red-500 opacity-80" />
          <p className="text-center text-xs font-bold tracking-widest text-red-500 uppercase">
            {t('common.missing')}
          </p>
          <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-red-400/70">
            {vacuumId}
          </p>
        </div>
      );
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[vacuumId] || {};
  const isSmall = settings.size === 'small';
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const battery = getA(vacuumId, 'battery_level');
  const room = getA(vacuumId, 'current_room') || getA(vacuumId, 'room');
  const name = customNames[vacuumId] || getA(vacuumId, 'friendly_name', t('vacuum.name'));
  const vacuumIconName = customIcons[vacuumId] || entity?.attributes?.icon;
  const Icon = vacuumIconName ? getIconComponent(vacuumIconName) || Bot : Bot;
  const statusText = (() => {
    if (state === 'cleaning') return t('vacuum.cleaning');
    if (state === 'returning') return t('vacuum.returning');
    if ((state === 'charging' || state === 'docked') && battery === 100) return t('vacuum.docked');
    if (state === 'docked') return t('vacuum.charging');
    if (state === 'idle') return t('vacuum.idle');
    return state || t('vacuum.unknown');
  })();

  const showRoom = !!room;
  const showBattery = typeof battery === 'number';

  if (isSmall) {
    return (
      <div
        ref={cardRef}
        key={vacuumId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen();
        }}
        className={`glass-texture touch-feedback ${isMobile ? 'gap-2 p-3 pl-4' : 'gap-4 p-4 pl-5'} group relative flex h-full items-center justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{
          ...cardStyle,
          backgroundColor: state === 'cleaning' ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)',
          borderColor: editMode
            ? 'rgba(59, 130, 246, 0.2)'
            : state === 'cleaning'
              ? 'rgba(59, 130, 246, 0.3)'
              : 'var(--card-border)',
          containerType: 'inline-size',
        }}
      >
        {controls}
        <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'} min-w-0 flex-1`}>
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all group-hover:scale-110 ${state === 'cleaning' ? 'animate-pulse bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
          >
            <Icon className="h-6 w-6 stroke-[1.5px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
              {name}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm leading-none font-bold text-[var(--text-primary)]">
                {statusText}
              </span>
              {showBattery && !isNarrowSmallCard && (
                <span className="text-xs text-[var(--text-secondary)]">{battery}%</span>
              )}
            </div>
          </div>
        </div>
        <div className="vacuum-card-controls shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isUnavailable)
                callService('vacuum', state === 'cleaning' ? 'pause' : 'start', {
                  entity_id: vacuumId,
                });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95"
          >
            {state === 'cleaning' ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isUnavailable) callService('vacuum', 'return_to_base', { entity_id: vacuumId });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      key={vacuumId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen();
      }}
      className={`glass-texture touch-feedback ${isMobile ? 'p-5' : 'p-7'} group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{
        ...cardStyle,
        backgroundColor: state === 'cleaning' ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)',
        borderColor: editMode
          ? 'rgba(59, 130, 246, 0.2)'
          : state === 'cleaning'
            ? 'rgba(59, 130, 246, 0.3)'
            : 'var(--card-border)',
      }}
    >
      {controls}
      <div className="flex items-start justify-between font-sans">
        <div
          className={`rounded-2xl transition-all group-hover:scale-110 group-hover:rotate-3 ${isMobile ? 'p-2.5' : 'p-3'} ${state === 'cleaning' ? 'animate-pulse bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
        >
          <Icon className="h-5 w-5 stroke-[1.5px]" />
        </div>
        <div className="flex flex-col items-end gap-2">
          {showRoom && (
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[var(--text-secondary)]">
              <MapPin className="h-3 w-3" />
              <span className="text-xs font-bold tracking-widest uppercase">{room}</span>
            </div>
          )}
          {showBattery && (
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-[var(--text-secondary)]">
              <Battery className="h-3 w-3" />
              <span className="text-xs font-bold tracking-widest uppercase">{battery}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
            {name}
          </p>
          <h3 className="text-3xl leading-none font-thin text-[var(--text-primary)]">
            {statusText}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isUnavailable)
                callService('vacuum', state === 'cleaning' ? 'pause' : 'start', {
                  entity_id: vacuumId,
                });
            }}
            className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95`}
          >
            {state === 'cleaning' ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isUnavailable) callService('vacuum', 'return_to_base', { entity_id: vacuumId });
            }}
            className={`${isMobile ? 'p-2.5' : 'p-3'} rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95`}
          >
            <Home className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VacuumCard;
