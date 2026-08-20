import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Camera, AlertCircle } from '../../icons';
import { getIconComponent } from '../../icons';
import CameraFeed from '../camera/CameraFeed';

const CameraCard = memo(/** @param {any} props */ function CameraCard({
  cardId,
  entityId,
  entity,
  settings,
  entities,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  conn,
  getEntityImageUrl,
  onOpen,
  size,
  t,
}) {
  const [refreshTs, setRefreshTs] = useState(Date.now());
  const [activeSource, setActiveSource] = useState('loading');
  const intervalRef = useRef(null);
  const previousMotionActiveRef = useRef(false);

  const attrs = entity?.attributes || {};
  const isOffline =
    !entity ||
    entity.state === 'unavailable' ||
    entity.state === 'unknown' ||
    entity.state === 'off';
  const name = customNames?.[cardId] || attrs.friendly_name || entityId;
  const iconName = customIcons?.[cardId] || attrs.icon;
  const Icon = iconName ? getIconComponent(iconName) || Camera : Camera;
  const isSmall = size === 'small';

  const usingSnapshot = activeSource === 'snapshot';

  const refreshMode = settings?.cameraRefreshMode || 'interval';
  const refreshInterval = Math.max(2, Number(settings?.cameraRefreshInterval) || 10);
  const motionSensorId = settings?.cameraMotionSensor || null;

  const doRefresh = useCallback(() => {
    setRefreshTs(Date.now());
  }, []);

  // Interval-based snapshot refresh (only used when stream has failed)
  useEffect(() => {
    if (isOffline || !usingSnapshot || refreshMode !== 'interval') return;
    intervalRef.current = setInterval(doRefresh, refreshInterval * 1000);
    return () => clearInterval(intervalRef.current);
  }, [isOffline, usingSnapshot, refreshMode, refreshInterval, doRefresh]);

  // Motion-sensor-based refresh
  useEffect(() => {
    if (isOffline || refreshMode !== 'motion' || !motionSensorId) {
      previousMotionActiveRef.current = false;
      return;
    }
    const motionEntity = entities?.[motionSensorId];
    if (!motionEntity) {
      previousMotionActiveRef.current = false;
      return;
    }
    const motionState = motionEntity.state;
    const isMotionActive = motionState === 'on' || motionState === 'detected';
    if (isMotionActive && !previousMotionActiveRef.current) {
      doRefresh();
    }
    previousMotionActiveRef.current = isMotionActive;
  }, [isOffline, refreshMode, motionSensorId, entities, doRefresh]);

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        className="glass-texture touch-feedback group relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 pl-5 font-sans backdrop-blur-xl transition-all duration-300"
        style={cardStyle}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen?.();
        }}
      >
        {controls}
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--glass-bg)]">
          {!isOffline ? (
            <CameraFeed
              entityId={entityId}
              entity={entity}
              conn={conn}
              getEntityImageUrl={getEntityImageUrl}
              settings={settings}
              refreshKey={refreshTs}
              fit="cover"
              alt={name}
              t={t}
              onSourceChange={setActiveSource}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
              <Icon className="h-6 w-6 stroke-[1.5px] transition-transform duration-300 group-hover:scale-110" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <p className="mb-1.5 truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
            {isOffline ? t?.('camera.unavailable') || 'Unavailable' : t?.('camera.live') || 'Live'}
          </p>
          <p className="truncate text-sm leading-none font-bold text-[var(--text-primary)]">
            {name}
          </p>
        </div>
        <span
          className={`ml-auto h-2.5 w-2.5 shrink-0 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`}
        />
      </div>
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`glass-texture touch-feedback group relative h-full overflow-hidden rounded-3xl border bg-[var(--card-bg)] transition-all duration-500 ${editMode ? 'cursor-move' : 'cursor-pointer active:scale-[0.98]'}`}
      style={cardStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen?.();
      }}
    >
      {controls}

      {!isOffline ? (
        <div className="absolute inset-0">
          <CameraFeed
            entityId={entityId}
            entity={entity}
            conn={conn}
            getEntityImageUrl={getEntityImageUrl}
            settings={settings}
            refreshKey={refreshTs}
            fit="cover"
            alt={name}
            t={t}
            onSourceChange={setActiveSource}
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--glass-bg)]">
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)] opacity-70">
            <AlertCircle className="h-10 w-10" />
            <p className="text-xs font-bold tracking-widest uppercase">
              {t?.('camera.unavailable') || 'Unavailable'}
            </p>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 35%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Status badge */}
      <div className="popup-surface absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-2.5 py-1 text-[10px] font-bold tracking-widest text-[var(--text-primary)] uppercase">
        <span className={`h-2 w-2 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`} />
        {isOffline ? t?.('camera.unavailable') || 'Unavailable' : t?.('camera.live') || 'Live'}
      </div>

      {/* Motion indicator */}
      {refreshMode === 'motion' &&
        motionSensorId &&
        (() => {
          const motionEntity = entities?.[motionSensorId];
          const isMotion = motionEntity?.state === 'on' || motionEntity?.state === 'detected';
          if (!isMotion) return null;
          return (
            <div className="absolute top-3 right-3 flex animate-pulse items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/60 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white uppercase">
              {t?.('camera.motion') || 'Motion'}
            </div>
          );
        })()}

      {/* Name overlay */}
      <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between gap-3">
        <div className="popup-surface max-w-[75%] min-w-0 rounded-xl border border-[var(--glass-border)] px-3 py-2">
          <p className="truncate text-xs font-bold tracking-wide text-[var(--text-primary)] uppercase">
            {name}
          </p>
        </div>
        <div className="popup-surface shrink-0 rounded-xl border border-[var(--glass-border)] p-2 text-[var(--text-primary)]">
          <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>
    </div>
  );
});

export default CameraCard;
