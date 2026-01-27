import { Gamepad2 } from '../icons';

export default function ShieldCard({
  dragProps,
  getControls,
  cardStyle,
  editMode,
  entities,
  shieldId,
  getA,
  getEntityImageUrl,
  setShowShieldModal,
  t
}) {
  const entity = entities[shieldId];
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state !== 'off' && !isUnavailable;
  const isPlaying = state === 'playing';
  const appName = getA(shieldId, 'app_name');
  const title = getA(shieldId, 'media_title');
  const picture = getEntityImageUrl(entity?.attributes?.entity_picture);

  const getAppLogo = (app) => {
    if (!app) return null;
    const appLower = app.toLowerCase();
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
      'youtube tv': 'https://cdn.simpleicons.org/youtube'
    };

    for (const [key, url] of Object.entries(logoMap)) {
      if (appLower.includes(key)) return url;
    }
    return null;
  };

  const appLogo = getAppLogo(appName);

  return (
    <div
      key="shield"
      {...dragProps}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) setShowShieldModal(true);
      }}
      className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
    >
      {getControls('shield')}

      <div className="flex justify-between items-start relative z-10">
        <div className={`p-3 rounded-2xl transition-all ${isOn ? 'bg-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${isOn ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
          <span className="text-xs font-bold uppercase tracking-widest">{isOn ? (isPlaying ? t('status.playing') : t('common.on')) : t('common.off')}</span>
        </div>
      </div>

      <div className="relative z-10">
        <p className={`${picture || appLogo ? 'text-gray-400' : 'text-[var(--text-secondary)]'} text-xs tracking-widest uppercase mb-1 font-bold opacity-60`}>Shield TV</p>
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
