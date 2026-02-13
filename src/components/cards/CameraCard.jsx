import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Video, VideoOff, Eye, RefreshCw } from '../../icons';
import { getIconComponent } from '../../icons';

/* ── State badge ──────────────────────────────────────────────────────── */
const StateBadge = ({ state, t }) => {
  const translate = t || ((k) => k);
  const isRecording = state === 'recording';
  const isStreaming = state === 'streaming';
  const isUnavailable = state === 'unavailable' || state === 'unknown';

  if (isUnavailable) return null;

  const label = isRecording
    ? translate('camera.recording')
    : isStreaming
      ? translate('camera.streaming')
      : translate('camera.idle');

  const color = isRecording
    ? 'bg-red-500'
    : isStreaming
      ? 'bg-blue-500'
      : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
      <div className={`w-1.5 h-1.5 rounded-full ${color} ${isRecording ? 'animate-pulse' : ''}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
        {label}
      </span>
    </div>
  );
};

/* ── Small camera card ────────────────────────────────────────────────── */
const SmallCameraCard = ({
  cardId, dragProps, controls, cardStyle, editMode, onOpen,
  name, snapshotUrl, state, Icon, isUnavailable, t,
}) => {
  const translate = t || ((k) => k);
  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`
        touch-feedback relative rounded-[2rem] overflow-hidden
        transition-all duration-300 group h-full select-none border
        border-[var(--glass-border)] bg-[var(--glass-bg)]
        ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}
        ${isUnavailable ? 'opacity-60' : ''}
      `}
      style={{ ...cardStyle, minHeight: '120px' }}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
    >
      {controls}

      {/* Snapshot background */}
      {snapshotUrl && !isUnavailable ? (
        <img
          src={snapshotUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <VideoOff className="w-8 h-8 text-white/30" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Top-left: state badge */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <StateBadge state={state} t={t} />
      </div>

      {/* Bottom: name */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-10">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-white/70" />
          <span className="text-xs font-bold text-white truncate">{name}</span>
        </div>
      </div>
    </div>
  );
};

/* ── Main CameraCard ──────────────────────────────────────────────────── */
const CameraCard = ({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  onOpen,
  settings,
  getEntityImageUrl,
  t,
}) => {
  if (!entity || !entityId) return null;

  const isSmall = settings?.size === 'small';
  const state = entity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;

  const name = customNames[cardId] || entity.attributes?.friendly_name || entityId;
  const cameraIconName = customIcons[cardId] || entity?.attributes?.icon;
  const Icon = cameraIconName ? (getIconComponent(cameraIconName) || Camera) : Camera;

  // Snapshot URL with periodic refresh
  const refreshInterval = (settings?.refreshInterval || 10) * 1000;
  const [cacheBust, setCacheBust] = useState(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCacheBust(Date.now());
    }, refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [refreshInterval]);

  const rawPicture = entity?.attributes?.entity_picture;
  const baseUrl = getEntityImageUrl ? getEntityImageUrl(rawPicture) : rawPicture;
  const snapshotUrl = baseUrl
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}ts=${cacheBust}`
    : null;

  // Motion detection indicator
  const hasMotion = entity.attributes?.motion_detection === true;

  const translate = t || ((k) => k);

  if (isSmall) {
    return (
      <SmallCameraCard
        cardId={cardId} dragProps={dragProps} controls={controls}
        cardStyle={cardStyle} editMode={editMode} onOpen={onOpen}
        name={name} snapshotUrl={snapshotUrl} state={state}
        Icon={Icon} isUnavailable={isUnavailable} t={t}
      />
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`
        touch-feedback relative rounded-[2.5rem] overflow-hidden
        transition-all duration-300 group h-full select-none border
        border-[var(--glass-border)] bg-[var(--glass-bg)]
        ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}
        ${isUnavailable ? 'opacity-60' : ''}
      `}
      style={{ ...cardStyle, minHeight: '200px' }}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
    >
      {controls}

      {/* Snapshot image */}
      {snapshotUrl && !isUnavailable ? (
        <img
          src={snapshotUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20">
          <VideoOff className="w-12 h-12 text-white/20" />
          <span className="text-xs text-white/30 font-bold uppercase tracking-wider">
            {translate('camera.unavailable')}
          </span>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10">
        <StateBadge state={state} t={t} />
        <div className="flex items-center gap-2">
          {hasMotion && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
              <Eye className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {translate('camera.motion')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 p-5 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/10 shrink-0">
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{name}</div>
              <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">
                {entity.attributes?.brand || entity.attributes?.model_id || translate('camera.live')}
              </div>
            </div>
          </div>
          {!isUnavailable && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/10">
              <Video className="w-4 h-4 text-white/80" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCard;
