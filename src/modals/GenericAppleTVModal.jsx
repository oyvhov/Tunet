import { useEffect, useState } from 'react';
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
  Tv,
  Power,
  VolumeX,
} from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';

function AppleLogoIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .61-2.64 1.36-.56.64-.99 1.68-.86 2.7.99.08 2.02-.51 2.58-1.21z" />
    </svg>
  );
}

export default function GenericAppleTVModal({
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
  cardId,
  t,
}) {
  const [pictureFailed, setPictureFailed] = useState(false);
  const modalTitleId = `apple-tv-modal-title-${(mediaPlayerId || 'media').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const entity = entities[mediaPlayerId];

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
  const isOn =
    state !== 'off' && state !== 'standby' && state !== 'unavailable' && state !== 'unknown';

  const displayState = displayEntity?.state;
  const isPlaying = displayState === 'playing';
  const isPaused = displayState === 'paused';

  let appName = getA(displayEntityId, 'app_name');
  let title = getA(displayEntityId, 'media_title');

  if (linkedActive) {
    const seriesTitle = getA(displayEntityId, 'media_series_title');
    if (seriesTitle) {
      appName = seriesTitle;
    } else if (!appName) {
      appName =
        displayEntityId !== mediaPlayerId
          ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name
          : null;
    }
  } else {
    appName =
      appName ||
      (displayEntityId !== mediaPlayerId
        ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name
        : null);
  }

  const picture = getEntityImageUrl(displayEntity?.attributes?.entity_picture);
  useEffect(() => {
    setPictureFailed(false);
  }, [picture]);

  if (!show || !entity) return null;

  const deviceName =
    customNames[cardId] ||
    customNames[mediaPlayerId] ||
    entity?.attributes?.friendly_name ||
    'Apple TV';

  const statusColor = isPlaying
    ? '#60a5fa'
    : isPaused
      ? '#fbbf24'
      : isOn
        ? '#34d399'
        : 'var(--text-secondary)';
  const statusBg = isPlaying
    ? 'rgba(59, 130, 246, 0.1)'
    : isPaused
      ? 'rgba(251, 191, 36, 0.1)'
      : isOn
        ? 'rgba(52, 211, 153, 0.1)'
        : 'var(--glass-bg)';

  const sendRemoteCommand = (command) => {
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

  const isMuted = entity.attributes?.is_volume_muted === true;
  const toggleMute = () =>
    callService('media_player', 'volume_mute', {
      entity_id: mediaPlayerId,
      is_volume_muted: !isMuted,
    });

  const sourceList = Array.isArray(entity?.attributes?.source_list)
    ? entity.attributes.source_list
    : [];

  return (
    <AccessibleModalShell
      open={show && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
      panelClassName="popup-anim relative max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border p-4 shadow-2xl backdrop-blur-xl sm:max-h-[85vh] sm:p-6 md:rounded-[3rem] md:p-10"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          <button
            onClick={onClose}
            className="modal-close absolute top-4 right-4 z-20 sm:top-6 sm:right-6 md:top-8 md:right-8"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="mb-4 flex items-center gap-3 pr-12 font-sans sm:mb-6 sm:gap-4">
            <div
              className="rounded-2xl p-3 transition-all duration-500 sm:p-4"
              style={{ backgroundColor: statusBg, color: statusColor }}
            >
              <AppleLogoIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h3
                id={modalTitleId}
                className="text-xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase sm:text-2xl"
              >
                {deviceName}
              </h3>
              <div
                className="mt-2 inline-block rounded-full px-3 py-1 transition-all duration-500"
                style={{ backgroundColor: statusBg, color: statusColor }}
              >
                <p className="text-[10px] font-bold tracking-widest uppercase">
                  {t('status.statusLabel')}: {state}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 font-sans sm:gap-6 lg:grid-cols-12">
            {/* Left Column (Span 7) - Media Info, Playback & Sources */}
            <div className="space-y-4 sm:space-y-6 lg:col-span-7">
              <div className="popup-surface flex flex-col gap-3 rounded-2xl p-4 sm:gap-4 sm:p-5">
                {/* Album Art / Info Area */}
                <div className="group relative h-40 w-full overflow-hidden rounded-xl bg-black/20 sm:aspect-video sm:h-auto">
                  {picture && !pictureFailed ? (
                    <>
                      <img
                        src={picture}
                        alt={title || ''}
                        className="h-full w-full object-cover opacity-85 transition-opacity duration-500 group-hover:opacity-75"
                        onError={() => setPictureFailed(true)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <div className="absolute right-3 bottom-3 left-3 sm:right-6 sm:bottom-6 sm:left-6">
                        <p className="mb-1 text-xs font-bold tracking-widest text-[var(--accent-color)] uppercase">
                          {appName || t('media.homeScreen')}
                        </p>
                        <h2 className="line-clamp-2 text-lg leading-tight font-bold text-white sm:text-2xl">
                          {title || t('media.noneMedia')}
                        </h2>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <Tv className="mb-2 h-10 w-10 opacity-25 sm:mb-3 sm:h-14 sm:w-14" />
                      <span className="text-xs font-bold tracking-widest uppercase opacity-60">
                        {isOn ? appName || t('media.homeScreen') : t('status.off')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-3 pt-1 sm:gap-4">
                  <button
                    onClick={() => controlMedia('media_previous_track')}
                    className="rounded-full bg-[var(--glass-bg)] p-3 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                    aria-label="Previous track"
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => controlMedia('media_play_pause')}
                    className="rounded-full bg-[var(--accent-color)] p-3.5 font-bold text-white shadow-lg transition-all hover:bg-[var(--accent-color)] active:scale-95 sm:p-4"
                    aria-label={t('shield.playPause')}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 fill-current" />
                    ) : (
                      <Play className="ml-0.5 h-6 w-6 fill-current" />
                    )}
                  </button>
                  <button
                    onClick={() => controlMedia('media_next_track')}
                    className="rounded-full bg-[var(--glass-bg)] p-3 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                    aria-label="Next track"
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Launch Sources / Apps */}
              {sourceList.length > 0 && (
                <div className="popup-surface rounded-2xl p-4">
                  <span className="mb-3 block text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                    {t('appletv.apps')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {sourceList.map((source) => {
                      const isActiveApp = appName?.toLowerCase() === source.toLowerCase();
                      return (
                        <button
                          key={source}
                          onClick={() =>
                            callService('media_player', 'select_source', {
                              entity_id: mediaPlayerId,
                              source,
                            })
                          }
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                            isActiveApp
                              ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                              : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {source}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Span 5) - Siri Remote Body */}
            <div className="flex flex-col items-center justify-center lg:col-span-5">
              <div className="popup-surface flex w-full max-w-[280px] flex-col items-center gap-4 rounded-[2.5rem] p-5 shadow-xl sm:gap-5 sm:p-6">
                {/* Remote Top: Power */}
                <div className="flex w-full items-center justify-end px-2">
                  <button
                    onClick={() =>
                      isOn
                        ? callService('media_player', 'turn_off', { entity_id: mediaPlayerId })
                        : callService('media_player', 'turn_on', { entity_id: mediaPlayerId })
                    }
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-90 ${
                      isOn
                        ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] hover:opacity-90'
                        : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90'
                    }`}
                    title={isOn ? t('shield.turnOff') : t('shield.turnOn')}
                    aria-label={isOn ? t('shield.turnOff') : t('shield.turnOn')}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>

                {remoteId && (
                  <>
                    {/* Circular Clickpad / D-Pad Ring (Apple TV Touch Surface) */}
                    <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[var(--glass-bg)] shadow-inner">
                      {/* Up */}
                      <button
                        onClick={() => sendRemoteCommand('up')}
                        className="absolute top-0.5 flex h-11 w-14 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90"
                        aria-label="Up"
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button>

                      {/* Down */}
                      <button
                        onClick={() => sendRemoteCommand('down')}
                        className="absolute bottom-0.5 flex h-11 w-14 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90"
                        aria-label="Down"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>

                      {/* Left */}
                      <button
                        onClick={() => sendRemoteCommand('left')}
                        className="absolute left-0.5 flex h-14 w-11 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90"
                        aria-label="Left"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      {/* Right */}
                      <button
                        onClick={() => sendRemoteCommand('right')}
                        className="absolute right-0.5 flex h-14 w-11 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90"
                        aria-label="Right"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Center Select */}
                      <button
                        onClick={() => sendRemoteCommand('select')}
                        className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--glass-bg-hover)] text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase shadow-md transition-all hover:bg-[var(--glass-border)] active:scale-95"
                        aria-label="Select"
                      >
                        OK
                      </button>
                    </div>

                    {/* Row 1: Back (< / Menu) & TV/Home */}
                    <div className="grid w-full grid-cols-2 gap-3 px-1">
                      <button
                        onClick={() => sendRemoteCommand('menu')}
                        className="flex h-12 flex-col items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                        aria-label={t('appletv.menu') || 'Menu'}
                      >
                        <span className="text-sm font-bold">&lt;</span>
                        <span className="text-[9px] font-bold tracking-widest uppercase opacity-70">
                          {t('appletv.menu') || 'Back'}
                        </span>
                      </button>

                      <button
                        onClick={() => sendRemoteCommand('home')}
                        className="flex h-12 flex-col items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                        aria-label={t('appletv.tvHome') || 'TV / Home'}
                      >
                        <Home className="h-4 w-4" />
                        <span className="text-[9px] font-bold tracking-widest uppercase opacity-70">
                          TV
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {/* Row 2: Play/Pause & Volume Rocker */}
                <div className="grid w-full grid-cols-2 gap-3 px-1">
                  <button
                    onClick={() => controlMedia('media_play_pause')}
                    className="flex h-[6.25rem] flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                    aria-label={t('shield.playPause')}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="ml-0.5 h-5 w-5" />
                    )}
                    <span className="text-[9px] font-bold tracking-widest uppercase opacity-70">
                      {t('shield.playPause')}
                    </span>
                  </button>

                  {/* Volume Rocker Up/Down in single vertical pill */}
                  <div className="flex h-[6.25rem] flex-col items-center justify-between rounded-2xl bg-[var(--glass-bg)] p-1">
                    <button
                      onClick={() => controlMedia('volume_up')}
                      className="flex w-full flex-1 items-center justify-center text-sm font-bold text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90"
                      aria-label="Volume up"
                    >
                      +
                    </button>
                    <div className="h-px w-6 bg-[var(--glass-border)]" />
                    <button
                      onClick={() => controlMedia('volume_down')}
                      className="flex w-full flex-1 items-center justify-center text-sm font-bold text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90"
                      aria-label="Volume down"
                    >
                      −
                    </button>
                  </div>
                </div>

                {/* Mute Button */}
                <div className="w-full px-1">
                  <button
                    onClick={toggleMute}
                    aria-pressed={isMuted}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--glass-bg)] text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95"
                  >
                    <VolumeX className="h-4 w-4 opacity-70" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">
                      {isMuted ? t('media.volume.unmute') : t('media.volume.mute')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
