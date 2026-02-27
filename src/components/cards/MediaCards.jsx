import {
  AlertTriangle,
  ArrowLeftRight,
  Pause,
  Play,
  Power,
  SkipBack,
  SkipForward,
  Speaker,
  Tv,
} from '../../icons';
import { getMediaPlayerPowerAction } from '../../utils/mediaPlayerFeatures';

/* ─── Single media player card ─── */

export const MediaPlayerCard = ({
  cardId,
  mpId,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  customNames,
  getA,
  getEntityImageUrl,
  callService,
  isMediaActive,
  onOpen,
  t,
  cardSettings,
  settingsKey,
}) => {
  const entity = entities[mpId];
  if (!entity) {
    if (editMode) {
      return (
        <div
          key={mpId}
          {...dragProps}
          className="glass-texture touch-feedback relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-red-500/50 bg-[var(--card-bg)] p-4"
          style={cardStyle}
        >
          {controls}
          <AlertTriangle className="mb-2 h-8 w-8 text-red-500 opacity-80" />
          <p className="text-center text-xs font-bold tracking-widest text-red-500 uppercase">
            {t('common.missing')}
          </p>
          <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-red-400/70">
            {mpId}
          </p>
        </div>
      );
    }
    return null;
  }

  const mpState = entity?.state;
  const isPlaying = mpState === 'playing';
  const isActive = isMediaActive(entity);
  const name = customNames[mpId] || getA(mpId, 'friendly_name', 'Media Player');
  const title = getA(mpId, 'media_title') || (isActive ? t('status.active') : t('media.noneMedia'));
  const subtitle =
    getA(mpId, 'media_artist') ||
    getA(mpId, 'media_series_title') ||
    getA(mpId, 'media_album_name') ||
    '';
  const picture = getEntityImageUrl(entity?.attributes?.entity_picture);
  const isChannel = getA(mpId, 'media_content_type') === 'channel';
  const powerAction = getMediaPlayerPowerAction(entity);
  const canTogglePower = Boolean(powerAction);
  const isPowerOffAction = powerAction === 'turn_off';

  const settings =
    cardSettings && settingsKey ? cardSettings[settingsKey] || cardSettings[cardId] || {} : {};
  const artworkMode = settings.artworkMode || 'default';
  const isCoverMode = artworkMode === 'cover';

  if (!isActive) {
    return (
      <div
        key={mpId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen(mpId, null, null);
        }}
        className={`glass-texture touch-feedback group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border p-4 font-sans transition-all duration-500 sm:p-7 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={{ ...cardStyle, color: 'var(--text-primary)' }}
      >
        {controls}
        <div
          className="mb-4 rounded-full p-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
          style={{ backgroundColor: 'var(--glass-bg)' }}
        >
          {isChannel ? (
            <Tv className="h-8 w-8 text-[var(--text-secondary)]" />
          ) : (
            <Speaker className="h-8 w-8 text-[var(--text-secondary)]" />
          )}
        </div>
        <div className="w-full px-4 text-center">
          <p className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
            {t('media.noneMusic')}
          </p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className="truncate text-xs tracking-widest text-[var(--text-muted)] uppercase opacity-40">
              {name}
            </p>
          </div>
        </div>
        {canTogglePower && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', powerAction, { entity_id: mpId });
            }}
            className={`mt-4 rounded-full p-2.5 transition-colors active:scale-95 ${isPowerOffAction ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
            title={isPowerOffAction ? t('status.off') : t('status.on')}
          >
            <Power className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      key={mpId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen(mpId, null, null);
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-4 font-sans transition-all duration-500 sm:p-7 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={{
        ...cardStyle,
        color:
          picture && isCoverMode
            ? 'white'
            : picture && !isCoverMode
              ? 'white'
              : 'var(--text-primary)',
      }}
    >
      {controls}

      {/* Background artwork */}
      {picture && (
        <div
          className={`pointer-events-none absolute inset-0 z-0 transition-all duration-500 ${isCoverMode ? 'opacity-100' : 'opacity-20'}`}
        >
          <img
            src={picture}
            alt=""
            className={`h-full w-full object-cover transition-transform duration-[10s] ease-in-out ${isCoverMode ? '' : 'scale-150 blur-xl'} ${isPlaying ? 'scale-[1.1]' : 'scale-100'}`}
          />
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${isCoverMode ? 'bg-gradient-to-t from-black/80 via-black/40 to-black/30' : 'bg-black/20'}`}
          />
        </div>
      )}

      <div className="relative z-10 flex items-start gap-4">
        {!isCoverMode && (
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-lg">
            {picture ? (
              <img src={picture} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {isChannel ? (
                  <Tv className="h-8 w-8 text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <Speaker className="h-8 w-8 text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110" />
                )}
              </div>
            )}
          </div>
        )}
        <div className={`flex flex-col overflow-hidden ${isCoverMode ? 'mt-auto pt-8' : 'pt-1'}`}>
          <div className="mb-1 flex items-center gap-2">
            <p
              className={`truncate text-xs font-bold tracking-widest uppercase ${isCoverMode ? 'text-gray-300' : 'text-[var(--text-secondary)]'}`}
            >
              {name}
            </p>
          </div>
          <h3
            className={`mb-0.5 truncate text-lg leading-tight font-bold ${isCoverMode ? 'text-white' : ''}`}
          >
            {title || t('common.unknown')}
          </h3>
          {subtitle && (
            <p
              className={`${picture || isCoverMode ? 'text-gray-300' : 'text-[var(--text-secondary)]'} truncate text-xs font-medium`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="relative z-10 mt-1 flex items-center justify-center gap-[clamp(0.125rem,1.5vw,1.5rem)] px-0.5 sm:mt-2 sm:px-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            callService('media_player', 'media_previous_track', { entity_id: mpId });
          }}
          className={`${picture || isCoverMode ? 'text-gray-300 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 p-[clamp(0.15rem,0.9vw,0.5rem)] transition-colors active:scale-90`}
        >
          <SkipBack className="h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            callService('media_player', 'media_play_pause', { entity_id: mpId });
          }}
          className={`flex h-[clamp(1.9rem,5.8vw,3rem)] w-[clamp(1.9rem,5.8vw,3rem)] shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isCoverMode ? 'border border-white/30 bg-white/20 text-white backdrop-blur-md' : 'bg-white text-black'}`}
        >
          {isPlaying ? (
            <Pause className="h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current" />
          ) : (
            <Play className="ml-0.5 h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            callService('media_player', 'media_next_track', { entity_id: mpId });
          }}
          className={`${picture || isCoverMode ? 'text-gray-300 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 p-[clamp(0.15rem,0.9vw,0.5rem)] transition-colors active:scale-90`}
        >
          <SkipForward className="h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]" />
        </button>
        {canTogglePower && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', powerAction, { entity_id: mpId });
            }}
            className={`${picture || isCoverMode ? (isPowerOffAction ? 'text-red-300 hover:text-red-100' : 'text-emerald-300 hover:text-emerald-100') : isPowerOffAction ? 'text-red-400 hover:text-red-500' : 'text-emerald-500 hover:text-emerald-600'} shrink-0 p-[clamp(0.15rem,0.9vw,0.5rem)] transition-colors active:scale-90`}
            title={isPowerOffAction ? t('status.off') : t('status.on')}
          >
            <Power className="h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Media group card (multiple players) ─── */

export const MediaGroupCard = ({
  cardId,
  dragProps,
  controls,
  cardStyle,
  entities,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  getA,
  getEntityImageUrl,
  callService,
  isMediaActive,
  saveCardSetting,
  onOpen,
  t,
}) => {
  const groupSettings = cardSettings[settingsKey] || {};
  const mediaIds = Array.isArray(groupSettings.mediaIds) ? groupSettings.mediaIds : [];
  const mediaEntities = mediaIds.map((id) => entities[id]).filter(Boolean);

  if (mediaEntities.length === 0) return null;

  const activeEntities = mediaEntities.filter(isMediaActive);
  const playingEntities = mediaEntities.filter((e) => e.state === 'playing');
  const pool = activeEntities.length > 0 ? activeEntities : mediaEntities;
  const cyclePool =
    playingEntities.length > 1
      ? playingEntities
      : activeEntities.length > 1
        ? activeEntities
        : pool;

  let currentMp = pool.find((e) => e.entity_id === groupSettings.activeId);
  if (!currentMp) currentMp = playingEntities[0] || pool[0];
  if (!currentMp) return null;

  const mpId = currentMp.entity_id;
  const mpState = currentMp.state;
  const isPlaying = mpState === 'playing';
  const isActive = activeEntities.length > 0;

  const artworkMode = groupSettings.artworkMode || 'default';
  const isCoverMode = artworkMode === 'cover';

  const name = customNames[cardId] || getA(mpId, 'friendly_name', 'Musikk');
  const title = getA(mpId, 'media_title') || (isActive ? t('status.active') : t('media.noneMusic'));
  const subtitle =
    getA(mpId, 'media_artist') ||
    getA(mpId, 'media_series_title') ||
    getA(mpId, 'media_album_name') ||
    '';
  const picture = getEntityImageUrl(currentMp.attributes?.entity_picture);
  const isChannel = getA(mpId, 'media_content_type') === 'channel';
  const powerAction = getMediaPlayerPowerAction(currentMp);
  const canTogglePower = Boolean(powerAction);
  const isPowerOffAction = powerAction === 'turn_off';

  const cyclePlayers = (e) => {
    e.stopPropagation();
    if (cyclePool.length < 2) return;
    const idx = cyclePool.findIndex((ent) => ent.entity_id === mpId);
    const next = cyclePool[(idx + 1) % cyclePool.length];
    saveCardSetting(settingsKey, 'activeId', next.entity_id);
  };

  if (!isActive) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen(mpId, settingsKey, null);
        }}
        className={`glass-texture touch-feedback group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border p-4 font-sans transition-all duration-500 sm:p-7 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={{ ...cardStyle, color: 'var(--text-primary)' }}
      >
        {controls}
        <div className="mb-4 rounded-full p-5" style={{ backgroundColor: 'var(--glass-bg)' }}>
          {isChannel ? (
            <Tv className="h-8 w-8 text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110" />
          ) : (
            <Speaker className="h-8 w-8 text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110" />
          )}
        </div>
        <div className="w-full px-4 text-center">
          <p className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
            {t('media.noneMusic')}
          </p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className="truncate text-xs tracking-widest text-[var(--text-muted)] uppercase opacity-40">
              {name}
            </p>
          </div>
        </div>
        {canTogglePower && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', powerAction, { entity_id: mpId });
            }}
            className={`mt-4 rounded-full p-2.5 transition-colors active:scale-95 ${isPowerOffAction ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
            title={isPowerOffAction ? t('status.off') : t('status.on')}
          >
            <Power className="h-4 w-4" />
          </button>
        )}
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
        if (!editMode) onOpen(mpId, settingsKey, null);
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-4 font-sans transition-all duration-500 sm:p-7 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
      style={{
        ...cardStyle,
        color:
          picture && isCoverMode
            ? 'white'
            : picture && !isCoverMode
              ? 'white'
              : 'var(--text-primary)',
      }}
    >
      {controls}
      {cyclePool.length > 1 && (
        <button
          onClick={cyclePlayers}
          className="absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[var(--text-secondary)] backdrop-blur-md transition-colors hover:text-[var(--text-primary)]"
          style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
        >
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-secondary)]" />
          <span className="text-xs font-bold">{cyclePool.length}</span>
          <ArrowLeftRight className="ml-0.5 h-3 w-3" />
        </button>
      )}
      {isPlaying && (
        <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-gradient-to-t from-[var(--glass-bg-hover)] via-transparent to-transparent opacity-50" />
      )}
      {isPlaying && (
        <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      )}

      {/* Background artwork */}
      {picture && (
        <>
          {/* Default artwork (blurred background) */}
          {!isCoverMode && (
            <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
              <img
                src={picture}
                alt=""
                className={`h-full w-full scale-150 object-cover blur-xl transition-transform duration-[10s] ease-in-out ${isPlaying ? 'scale-[1.6]' : 'scale-150'}`}
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}
          {/* Cover artwork (full sharp background) */}
          {isCoverMode && (
            <div className="pointer-events-none absolute inset-0 z-0">
              <img
                src={picture}
                alt=""
                className="h-full w-full scale-100 object-cover transition-transform duration-[10s] ease-in-out"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>
          )}
        </>
      )}

      <div className="relative z-10 flex items-start gap-4">
        {(!picture || !isCoverMode) && (
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-lg">
            {picture ? (
              <img src={picture} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {isChannel ? (
                  <Tv className="h-8 w-8 text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <Speaker className="h-8 w-8 text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110" />
                )}
              </div>
            )}
          </div>
        )}
        <div className={`flex flex-col overflow-hidden pt-1 ${isCoverMode ? 'w-full' : ''}`}>
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {name}
            </p>
          </div>
          <h3
            className={`mb-0.5 truncate text-lg leading-tight font-bold ${isCoverMode ? 'text-2xl' : ''}`}
          >
            {title || t('common.unknown')}
          </h3>
          {subtitle && (
            <p
              className={`${picture || isCoverMode ? 'text-gray-300' : 'text-[var(--text-secondary)]'} truncate text-xs font-medium`}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="relative z-10 mt-1 flex items-center justify-center gap-[clamp(0.125rem,1.5vw,1.5rem)] px-0.5 sm:mt-2 sm:px-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            callService('media_player', 'media_previous_track', { entity_id: mpId });
          }}
          className={`${picture || isCoverMode ? 'text-gray-300 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 p-[clamp(0.15rem,0.9vw,0.5rem)] transition-colors active:scale-90`}
        >
          <SkipBack className="h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            callService('media_player', 'media_play_pause', { entity_id: mpId });
          }}
          className={`flex h-[clamp(1.9rem,5.8vw,3rem)] w-[clamp(1.9rem,5.8vw,3rem)] shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isCoverMode ? 'border border-white/30 bg-white/20 text-white backdrop-blur-md' : 'bg-white text-black'}`}
        >
          {isPlaying ? (
            <Pause className="h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current" />
          ) : (
            <Play className="ml-0.5 h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            callService('media_player', 'media_next_track', { entity_id: mpId });
          }}
          className={`${picture || isCoverMode ? 'text-gray-300 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 p-[clamp(0.15rem,0.9vw,0.5rem)] transition-colors active:scale-90`}
        >
          <SkipForward className="h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]" />
        </button>
        {canTogglePower && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', powerAction, { entity_id: mpId });
            }}
            className={`${picture || isCoverMode ? (isPowerOffAction ? 'text-red-300 hover:text-red-100' : 'text-emerald-300 hover:text-emerald-100') : isPowerOffAction ? 'text-red-400 hover:text-red-500' : 'text-emerald-500 hover:text-emerald-600'} shrink-0 p-[clamp(0.15rem,0.9vw,0.5rem)] transition-colors active:scale-90`}
            title={isPowerOffAction ? t('status.off') : t('status.on')}
          >
            <Power className="h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]" />
          </button>
        )}
      </div>
    </div>
  );
};
