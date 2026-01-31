import { Tv } from '../icons';

export default function GenericAndroidTVCard({
  cardId,
  dragProps,
  controls,
  cardStyle,
  editMode,
  entities,
  mediaPlayerId,
  remoteId,
  size,
  getA,
  getEntityImageUrl,
  onOpen,
  customNames,
  t
}) {
  const entity = entities[mediaPlayerId];
  if (!entity) return null;

  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state !== 'off' && !isUnavailable;
  const isPlaying = state === 'playing';
  const appName = getA(mediaPlayerId, 'app_name');
  const title = getA(mediaPlayerId, 'media_title');
  const picture = getEntityImageUrl(entity?.attributes?.entity_picture);
  const deviceName = customNames[cardId] || entity?.attributes?.friendly_name || 'Android TV';
  const isSmall = size === 'small';

  const getAppLogo = (app) => {
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
        className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
      >
        {controls}

        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center transition-all ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
            {picture ? (
              <img src={picture} alt="" className="w-full h-full object-cover" />
            ) : appLogo ? (
              <img src={appLogo} alt={appName || 'Android TV'} className="w-full h-full object-contain p-2" />
            ) : (
              <Tv className="w-5 h-5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <p className={`${picture || appLogo ? 'text-gray-300' : 'text-[var(--text-secondary)]'} text-[10px] tracking-widest uppercase font-bold opacity-70 truncate`}>{deviceName}</p>
            <p className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate">{appName || (isOn ? t('media.homeScreen') : t('status.off'))}</p>
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
      className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
    >
      {controls}

      <div className="flex justify-between items-start relative z-10">
        <div className={`p-3 rounded-2xl transition-all ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
          <Tv className="w-5 h-5" />
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${isOn ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
          <span className="text-xs font-bold uppercase tracking-widest">{isOn ? (isPlaying ? t('status.playing') : t('common.on')) : t('common.off')}</span>
        </div>
      </div>

      <div className="relative z-10">
        <p className={`${picture || appLogo ? 'text-gray-400' : 'text-[var(--text-secondary)]'} text-xs tracking-widest uppercase mb-1 font-bold opacity-60`}>{deviceName}</p>
        <h3 className="text-2xl font-medium leading-none line-clamp-2 mb-1">{appName || (isOn ? t('media.homeScreen') : t('status.off'))}</h3>
        {title && <p className={`text-xs ${picture || appLogo ? 'text-gray-300' : 'text-[var(--text-muted)]'} line-clamp-1 font-medium`}>{title}</p>}
      </div>

      {(picture || appLogo) && (
        <div className="absolute inset-0 z-0 opacity-45">
          {picture ? (
            <>
              <img src={picture} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/50 to-transparent" />
            </>
          ) : appLogo ? (
            <>
              <img src={appLogo} alt={appName} className="w-full h-full object-contain p-12 blur-sm scale-160" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/35 to-transparent" />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
