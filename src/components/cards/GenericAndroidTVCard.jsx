import { Tv, Play, Pause } from '../../icons';

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
  callService
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
             appName = (displayEntityId !== mediaPlayerId ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name : null);
          }
      }
  } else {
      // Normal Android TV usage
      appName = appName || (displayEntityId !== mediaPlayerId ? (displayEntity?.attributes?.friendly_name) : null);
  }

  const picture = getEntityImageUrl(displayEntity?.attributes?.entity_picture);
  const deviceName = customNames[cardId] || entity?.attributes?.friendly_name || 'Android TV';
  const isSmall = size === 'small';

  const getAppLogo = (app) => {
    // Detect linked player app from display entity attributes
    if (linkedActive) {
        const appId = displayEntity?.attributes?.app_id?.toLowerCase() || '';
        const appName = displayEntity?.attributes?.app_name?.toLowerCase() || '';
        if (appId.includes('jellyfin') || appName.includes('jellyfin')) return 'https://cdn.simpleicons.org/jellyfin';
        if (appId.includes('emby') || appName.includes('emby')) return 'https://cdn.simpleicons.org/emby';
    }

    if (!app) return null;
    const appLower = app.toLowerCase();
    
    // NRK logo as inline SVG
    if (appLower.includes('nrk')) {
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NiAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzE3NjdDRSIgZD0iTTAgMGg0NnYyNEgweiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik02IDE4VjZoNHYxMkg2Wk0xNS4yNCA3LjkgMTcuNTEgMThIMTMuMkwxMC41IDZoMi40MWMuNTYgMCAxLjEuMTkgMS41MS41NS40My4zNS42Ni44My44MiAxLjM2Wk0xOCAxOFY2aDR2MTJoLTRabTcuMDEtNy40NGEyLjM1IDIuMzUgMCAwIDEtMi4wOC0xLjE5IDIuMzQgMi4zNCAwIDAgMS0uMzItMS4yYzAtLjQzLjEtLjg0LjMyLTEuMmEyLjQxIDIuNDEgMCAwIDEgNC4xNCAwYy4yMi4zNi4zMy43Ny4zMiAxLjJhMi40IDIuNCAwIDAgMS0yLjM4IDIuNFpNMjggMThWNmg0djEyaC00Wm04Ljk3LTUuNDQuMjYuNDFhOTIuMjYgOTIuMjYgMCAwIDAgMS40MiAyLjMyIDMyMC44IDMyMC44IDAgMCAxIDEuNjQgMi43aC00LjMzYTYxNC4xNyA2MTQuMTcgMCAwIDAtMi4xNy0zLjUzIDYwLjEyIDYwLjEyIDAgMCAxLS45OS0xLjYyIDEuNzUgMS43NSAwIDAgMS0uMjktLjg0Yy4wMi0uMjkuMTEtLjU3LjI3LS44MWwuMzctLjZhMTI3LjA3IDEyNy4wNyAwIDAgMCAyLjA3LTMuNEwzNS45NiA2aDQuMzNsLTMuMzUgNS40NmMtLjEuMTYtLjE2LjM1LS4xNy41NC4wMS4yLjA4LjQuMi41NloiLz48L3N2Zz4=';
    }
    
    const logoMap = {
      'notifications for android tv': 'https://cdn.simpleicons.org/android',
      'notification': 'https://cdn.simpleicons.org/android',
      'android': 'https://cdn.simpleicons.org/android',
      'play store': 'https://cdn.simpleicons.org/googleplay',
      'google play': 'https://cdn.simpleicons.org/googleplay',
      'google cast': 'https://cdn.simpleicons.org/chromecast',
      'chromecast': 'https://cdn.simpleicons.org/chromecast',
      'emby': 'https://cdn.simpleicons.org/emby',
      'jellyfin': 'https://cdn.simpleicons.org/jellyfin',
      'spotify': 'https://cdn.simpleicons.org/spotify',
      'youtube': 'https://cdn.simpleicons.org/youtube',
      'youtube tv': 'https://cdn.simpleicons.org/youtube',
      'netflix': 'https://cdn.simpleicons.org/netflix',
      'disney': 'https://cdn.simpleicons.org/disneyplus',
      'disney+': 'https://cdn.simpleicons.org/disneyplus',
      'hbo': 'https://cdn.simpleicons.org/hbo',
      'prime video': 'https://cdn.simpleicons.org/amazonprimevideo',
      'plex': 'https://cdn.simpleicons.org/plex',
      'kodi': 'https://cdn.simpleicons.org/kodi',
      'twitch': 'https://cdn.simpleicons.org/twitch'
    };

    for (const [key, url] of Object.entries(logoMap)) {
      if (appLower.includes(key)) return url;
    }
    return null;
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
        className={`glass-texture touch-feedback p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
      >
        {controls}

        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center transition-all group-hover:scale-110 ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
            {picture ? (
              <img src={picture} alt="" className="w-full h-full object-cover" />
            ) : appLogo ? (
              <img src={appLogo} alt={appName || 'Android TV'} className="w-full h-full object-contain p-2" />
            ) : (
              <Tv className="w-5 h-5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <p className={`${picture || appLogo ? 'text-gray-300' : 'text-[var(--text-secondary)]'} text-xs tracking-widest uppercase font-bold opacity-70 truncate`}>{deviceName}</p>
            <p className="text-lg font-medium text-[var(--text-primary)] leading-tight truncate">{appName || (isOn ? t('media.homeScreen') : t('status.off'))}</p>
            {title && <p className={`${picture || appLogo ? 'text-gray-200' : 'text-[var(--text-muted)]'} text-xs truncate font-medium`}>{title}</p>}
          </div>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${isOn ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">{isOn ? (isPlaying ? t('status.playing') : t('common.on')) : t('common.off')}</span>
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
      className={`glass-texture touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
    >
      {controls}

      <div className="flex justify-between items-start relative z-10">
        <div className={`p-3 rounded-2xl transition-all group-hover:scale-110 ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
          <Tv className="w-5 h-5" />
        </div>
        {!linkedActive && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${isOn ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
            <span className="text-xs font-bold uppercase tracking-widest">{isOn ? (isPlaying ? t('status.playing') : t('common.on')) : t('common.off')}</span>
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className={`${picture || appLogo ? 'text-gray-400' : 'text-[var(--text-secondary)]'} text-xs tracking-widest uppercase mb-1 font-bold opacity-60`}>{deviceName}</p>
          <h3 className="text-3xl font-thin leading-none line-clamp-2 mb-1">{appName || (isOn ? t('media.homeScreen') : t('status.off'))}</h3>
          {title && <p className={`text-xs ${picture || appLogo ? 'text-gray-300' : 'text-[var(--text-muted)]'} line-clamp-1 font-medium`}>{title}</p>}
        </div>
        {isOn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Control the DISPLAY entity if it's playing, otherwise fall back to media player
              const targetId = isPlaying ? displayEntityId : mediaPlayerId;
              callService("media_player", "media_play_pause", { entity_id: targetId });
            }}
            className="p-3 rounded-full transition-all active:scale-95 shadow-lg relative z-20 flex-shrink-0 bg-white"
          >
            {isPlaying ? <Pause className="w-6 h-6" color="black" fill="black" /> : <Play className="w-6 h-6 ml-0.5" color="black" fill="black" />}
          </button>
        )}
      </div>

      {(picture || appLogo) && (
        <div className="absolute inset-0 z-0">
          {picture ? (
            <img src={picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${!linkedActive ? 'p-0' : 'p-12'}`}>
              <img src={appLogo} alt={appName} className={`w-full h-full ${!linkedActive ? 'object-cover opacity-60' : 'object-contain opacity-50'}`} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>
      )}
    </div>
  );
}
