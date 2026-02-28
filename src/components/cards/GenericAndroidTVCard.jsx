import { Tv, Play, Pause } from '../../icons';
import { getMediaLogoUrl } from '../../utils/mediaLogos';

export default function GenericAndroidTVCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  entities,
  mediaPlayerId,
  remoteId: _remoteId,
  linkedMediaPlayers,
  size,
  getA,
  getEntityImageUrl,
  onOpen,
  customNames,
  t,
  callService,
}) {
  const entity = entities[mediaPlayerId];
  if (!entity) return null;

  // Determine which entity to display (linked player override logic)
  let displayEntityId = mediaPlayerId;
  let linkedActive = false;

  if (linkedMediaPlayers && Array.isArray(linkedMediaPlayers)) {
    for (const linkedId of linkedMediaPlayers) {
      const linkedState = entities[linkedId]?.state;
      if (linkedState === 'playing' || linkedState === 'paused' || linkedState === 'buffering') {
        displayEntityId = linkedId;
        linkedActive = true;
        break;
      }
    }
  }

  const displayEntity = entities[displayEntityId];
  // Basic State (from main TV usually, unless we want to show linked state purely)
  // Logic decision: If playing linked media, show linked metadata, but keep TV power status if possible or just show linked?
  // User request: "media image of Emby/jellyfin media to come in the Modal for android TV"
  // Usually this implies overriding the metadata (title, image, app name) but the "ON/OFF" state might still be relevant to the TV.
  // However, simple approach: Use displayEntity for metadata.

  const state = entity?.state; // Keep main TV state for ON/OFF status
  const displayState = displayEntity?.state;

  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state !== 'off' && !isUnavailable;

  // Is the device actually playing something?
  const isPlaying = displayState === 'playing';

  // Metadata retrieval
  // When linked player is active: Use media_series_title (Series) OR media_title (Movie) as the large title
  // Small Subtitle: Series Title if Series, or empty. NO app name.

  let appName = getA(displayEntityId, 'app_name');
  let title = getA(displayEntityId, 'media_title');

  if (linkedActive) {
    const seriesTitle = getA(displayEntityId, 'media_series_title');
    // If series title exists, it's a series.
    if (seriesTitle) {
      // title already holds episode title from media_title
      appName = seriesTitle; // Series Name in Subtitle
    } else {
      // title already holds movie title from media_title
      // User wants App Name
      if (!appName) {
        appName =
          displayEntityId !== mediaPlayerId
            ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name
            : null;
      }
    }
  } else {
    // Normal Android TV usage
    appName =
      appName ||
      (displayEntityId !== mediaPlayerId ? displayEntity?.attributes?.friendly_name : null);
  }

  const picture = getEntityImageUrl(displayEntity?.attributes?.entity_picture);
  const deviceName = customNames[cardId] || entity?.attributes?.friendly_name || 'Android TV';
  const isSmall = size === 'small';

  const getAppLogo = (app) => {
    // Detect linked player app from display entity attributes
    if (linkedActive) {
      const appId = displayEntity?.attributes?.app_id?.toLowerCase() || '';
      const appNameStr = displayEntity?.attributes?.app_name?.toLowerCase() || '';
      if (appId.includes('jellyfin') || appNameStr.includes('jellyfin'))
        return getMediaLogoUrl('jellyfin');
      if (appId.includes('emby') || appNameStr.includes('emby'))
        return getMediaLogoUrl('emby');
    }

    return getMediaLogoUrl(app);
  };

  const appLogo = getAppLogo(appName);

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
      >
        {controls}

        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl transition-all group-hover:scale-110 ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
          >
            {picture ? (
              <img src={picture} alt="" className="h-full w-full object-cover" />
            ) : appLogo ? (
              <img
                src={appLogo}
                alt={appName || 'Android TV'}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <Tv className="h-5 w-5" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <p
              className={`${picture || appLogo ? 'text-gray-300' : 'text-[var(--text-secondary)]'} truncate text-xs font-bold tracking-widest uppercase opacity-70`}
            >
              {deviceName}
            </p>
            <p className="truncate text-lg leading-tight font-medium text-[var(--text-primary)]">
              {appName || (isOn ? t('media.homeScreen') : t('status.off'))}
            </p>
            {title && (
              <p
                className={`${picture || appLogo ? 'text-gray-200' : 'text-[var(--text-muted)]'} truncate text-xs font-medium`}
              >
                {title}
              </p>
            )}
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 transition-all ${isOn ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
        >
          <span className="text-[10px] font-bold tracking-widest uppercase">
            {isOn ? (isPlaying ? t('status.playing') : t('common.on')) : t('common.off')}
          </span>
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
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
    >
      {controls}

      <div className="relative z-10 flex items-start justify-between">
        <div
          className={`rounded-2xl p-3 transition-all group-hover:scale-110 ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
        >
          <Tv className="h-5 w-5" />
        </div>
        {!linkedActive && (
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all ${isOn ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
          >
            <span className="text-xs font-bold tracking-widest uppercase">
              {isOn ? (isPlaying ? t('status.playing') : t('common.on')) : t('common.off')}
            </span>
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`${picture || appLogo ? 'text-gray-400' : 'text-[var(--text-secondary)]'} mb-1 text-xs font-bold tracking-widest uppercase opacity-60`}
          >
            {deviceName}
          </p>
          <h3 className="mb-1 line-clamp-2 text-3xl leading-none font-thin">
            {appName || (isOn ? t('media.homeScreen') : t('status.off'))}
          </h3>
          {title && (
            <p
              className={`text-xs ${picture || appLogo ? 'text-gray-300' : 'text-[var(--text-muted)]'} line-clamp-1 font-medium`}
            >
              {title}
            </p>
          )}
        </div>
        {isOn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Control the DISPLAY entity if it's playing, otherwise fall back to media player
              const targetId = isPlaying ? displayEntityId : mediaPlayerId;
              callService('media_player', 'media_play_pause', { entity_id: targetId });
            }}
            className="relative z-20 flex-shrink-0 rounded-full bg-white p-3 shadow-lg transition-all active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" color="black" fill="black" />
            ) : (
              <Play className="ml-0.5 h-6 w-6" color="black" fill="black" />
            )}
          </button>
        )}
      </div>

      {(picture || appLogo) && (
        <div className="absolute inset-0 z-0">
          {picture ? (
            <img src={picture} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center ${!linkedActive ? 'p-0' : 'p-12'}`}
            >
              <img
                src={appLogo}
                alt={appName}
                className={`h-full w-full ${!linkedActive ? 'object-cover opacity-60' : 'object-contain opacity-50'}`}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>
      )}
    </div>
  );
}
