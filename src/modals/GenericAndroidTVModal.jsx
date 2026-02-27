import {
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Home,
  Settings,
  Gamepad2,
  Tv,
  Power,
  Volume2,
} from '../icons';

export default function GenericAndroidTVModal({
  show,
  onClose,
  entities,
  mediaPlayerId,
  remoteId,
  linkedMediaPlayers,
  callService,
  getA,
  getEntityImageUrl,
  customNames,
  t,
}) {
  if (!show) return null;

  const entity = entities[mediaPlayerId];
  if (!entity) return null;

  // Determine priority entity for metadata
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

  const state = entity?.state;
  const isOn = state !== 'off' && state !== 'unavailable' && state !== 'unknown';

  const displayState = displayEntity?.state;
  const isPlaying = displayState === 'playing';
  const isPaused = displayState === 'paused';

  let appName = getA(displayEntityId, 'app_name');
  let title = getA(displayEntityId, 'media_title');

  if (linkedActive) {
    const seriesTitle = getA(displayEntityId, 'media_series_title');
    if (seriesTitle) {
      // title already holds episode title from media_title
      appName = seriesTitle; // Series Name
    } else {
      // title already holds movie title from media_title
      if (!appName) {
        appName =
          displayEntityId !== mediaPlayerId
            ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name
            : null;
      }
    }
  } else {
    appName =
      appName ||
      (displayEntityId !== mediaPlayerId
        ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name
        : null);
  }

  const picture = getEntityImageUrl(displayEntity?.attributes?.entity_picture);
  const deviceName =
    customNames[mediaPlayerId] || entity?.attributes?.friendly_name || 'Android TV';

  // Status Logic
  const statusColor = isPlaying
    ? '#60a5fa'
    : isPaused
      ? '#fbbf24'
      : isOn
        ? '#a78bfa'
        : 'var(--text-secondary)';
  const statusBg = isPlaying
    ? 'rgba(59, 130, 246, 0.1)'
    : isPaused
      ? 'rgba(251, 191, 36, 0.1)'
      : isOn
        ? 'rgba(167, 139, 250, 0.1)'
        : 'var(--glass-bg)';

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sendCommand = (command) => {
    if (remoteId) {
      callService('remote', 'send_command', { entity_id: remoteId, command });
    }
  };

  const controlMedia = (action) => {
    const targetId =
      action.includes('media') && displayEntityId !== mediaPlayerId
        ? displayEntityId
        : mediaPlayerId;
    callService('media_player', action, { entity_id: targetId });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="popup-anim relative max-h-[80vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 shadow-2xl backdrop-blur-xl md:rounded-[3rem] md:p-12"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 z-20 md:top-10 md:right-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4 font-sans">
          <div
            className="rounded-2xl p-4 transition-all duration-500"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            {isOn ? <Gamepad2 className="h-8 w-8" /> : <Tv className="h-8 w-8" />}
          </div>
          <div>
            <h3 className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
              {deviceName}
            </h3>
            {!linkedActive && (
              <div
                className="mt-2 inline-block rounded-full px-3 py-1 transition-all duration-500"
                style={{ backgroundColor: statusBg, color: statusColor }}
              >
                <p className="text-[10px] font-bold tracking-widest uppercase italic">
                  {t('status.statusLabel')}: {state}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 font-sans lg:grid-cols-5">
          {/* Left Column (Span 3) - Media Info & Controls */}
          <div className="space-y-6 lg:col-span-3">
            <div className="popup-surface flex flex-col gap-4 rounded-2xl p-4">
              {/* Album Art / Info Area */}
              <div className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black/20">
                {picture ? (
                  <>
                    <img
                      src={picture}
                      alt={title}
                      className="h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute right-6 bottom-6 left-6">
                      <p className="mb-1 text-xs font-bold tracking-widest text-[var(--accent-color)] uppercase">
                        {appName || t('media.homeScreen')}
                      </p>
                      <h2 className="line-clamp-2 text-2xl leading-tight font-bold text-white">
                        {title || t('media.noneMedia')}
                      </h2>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
                    <Tv className="mb-4 h-16 w-16 opacity-20" />
                    <span className="text-xs font-bold tracking-widest uppercase opacity-50">
                      {t('media.noneMedia')}
                    </span>
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => controlMedia('media_previous_track')}
                  className="rounded-full bg-[var(--glass-bg)] p-3 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  onClick={() => controlMedia('media_play_pause')}
                  className="rounded-full bg-[var(--accent-color)] p-5 font-bold text-white shadow-lg transition-all hover:bg-[var(--accent-color)] active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6 fill-current" />
                  ) : (
                    <Play className="ml-1 h-6 w-6 fill-current" />
                  )}
                </button>
                <button
                  onClick={() => controlMedia('media_next_track')}
                  className="rounded-full bg-[var(--glass-bg)] p-3 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Span 2) - Remote + Volume & Power */}
          {remoteId && (
            <div className="popup-surface flex flex-col items-center gap-6 rounded-2xl p-4 lg:col-span-2">
              {/* D-Pad */}
              <div className="relative h-44 w-44">
                {/* Up */}
                <button
                  onClick={() => sendCommand('DPAD_UP')}
                  className="absolute top-0 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
                {/* Left */}
                <button
                  onClick={() => sendCommand('DPAD_LEFT')}
                  className="absolute top-1/2 left-0 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {/* Right */}
                <button
                  onClick={() => sendCommand('DPAD_RIGHT')}
                  className="absolute top-1/2 right-0 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                {/* Down */}
                <button
                  onClick={() => sendCommand('DPAD_DOWN')}
                  className="absolute bottom-0 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
                {/* Center */}
                <button
                  onClick={() => sendCommand('DPAD_CENTER')}
                  className="absolute top-1/2 left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-color)] text-[10px] font-bold text-white shadow-lg transition-all hover:bg-[var(--accent-color)] active:scale-90"
                >
                  OK
                </button>
              </div>

              {/* Nav Buttons */}
              <div className="grid w-full grid-cols-3 gap-4">
                <button
                  onClick={() => sendCommand('BACK')}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)] p-3 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                  <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase group-hover:text-[var(--text-secondary)]">
                    {t('shield.back')}
                  </span>
                </button>
                <button
                  onClick={() => sendCommand('HOME')}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)] p-3 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                >
                  <Home className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                  <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase group-hover:text-[var(--text-secondary)]">
                    {t('shield.home')}
                  </span>
                </button>
                <button
                  onClick={() => sendCommand('MENU')}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)] p-3 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                >
                  <Settings className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                  <span className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase group-hover:text-[var(--text-secondary)]">
                    Menu
                  </span>
                </button>
              </div>

              {/* Volume & Power Controls */}
              <div className="flex w-full flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => controlMedia('volume_down')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--glass-bg)] py-3 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                  >
                    <Volume2 className="h-4 w-4 opacity-50" />
                    <span className="text-lg font-bold">−</span>
                  </button>
                  <button
                    onClick={() => controlMedia('volume_up')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--glass-bg)] py-3 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                  >
                    <span className="text-lg font-bold">+</span>
                    <Volume2 className="h-4 w-4 opacity-50" />
                  </button>
                </div>
                <button
                  onClick={() => (isOn ? controlMedia('turn_off') : controlMedia('turn_on'))}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold transition-all active:scale-95 ${isOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                >
                  <Power className="h-5 w-5" />
                  {isOn ? t('shield.turnOff') : t('shield.turnOn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
