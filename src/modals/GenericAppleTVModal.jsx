import { useEffect, useState } from 'react';
import {
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
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import { getMediaPlayerStateLabel, getMediaPlayerStateTone } from '../utils/mediaPlayerState';
import { getUnavailableLabel, isUnavailableState } from '../utils/entityState';

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
  const isUnavailable = isUnavailableState(state);
  const isOn = state !== 'off' && state !== 'standby' && !isUnavailable;
  // Playback goes to the linked player while one is active, so it still works without the TV.
  const playbackDisabled = isUnavailable && !linkedActive;

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

  const iconClassName = isPlaying
    ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
    : isPaused
      ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
      : isOn
        ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
        : '';

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
    <AccessibleModalShell open={show && !!entity} onClose={onClose} titleId={modalTitleId} size="l">
      {() => (
        <>
          <ModalHeader
            title={deviceName}
            closeLabel={t('common.close')}
            onClose={onClose}
            icon={<AppleLogoIcon />}
            iconClassName={iconClassName}
            status={
              <StatusChip
                tone={getMediaPlayerStateTone(state)}
                label={getMediaPlayerStateLabel(state, t)}
              />
            }
          />

          <ModalBody className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-12">
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
                        <p className="mb-1 text-xs font-bold tracking-[0.12em] text-[var(--accent-color)] uppercase">
                          {appName || t('media.homeScreen')}
                        </p>
                        <h2 className="line-clamp-2 text-lg leading-tight font-bold text-white sm:text-2xl">
                          {title || t('media.noneMedia')}
                        </h2>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                      <Tv className="h-10 w-10 opacity-40 sm:h-12 sm:w-12" />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {isUnavailable
                          ? getUnavailableLabel(state, t)
                          : isOn
                            ? appName || t('media.homeScreen')
                            : t('status.off')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-3 pt-1 sm:gap-4">
                  <button
                    disabled={playbackDisabled}
                    onClick={() => controlMedia('media_previous_track')}
                    className="rounded-full bg-[var(--glass-bg)] p-3 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
                    aria-label={t('media.previousTrack')}
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    disabled={playbackDisabled}
                    onClick={() => controlMedia('media_play_pause')}
                    className="rounded-full bg-[var(--accent-color)] p-3.5 font-bold text-[var(--accent-contrast)] shadow-lg transition-all hover:bg-[var(--accent-color)] active:scale-95 disabled:opacity-50 sm:p-4"
                    aria-label={t('shield.playPause')}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 fill-current" />
                    ) : (
                      <Play className="ml-0.5 h-6 w-6 fill-current" />
                    )}
                  </button>
                  <button
                    disabled={playbackDisabled}
                    onClick={() => controlMedia('media_next_track')}
                    className="rounded-full bg-[var(--glass-bg)] p-3 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
                    aria-label={t('media.nextTrack')}
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Launch Sources / Apps */}
              {sourceList.length > 0 && (
                <div className="popup-surface rounded-2xl p-4">
                  <span className="modal-section-label mb-3 block">{t('appletv.apps')}</span>
                  <div className="flex flex-wrap gap-2">
                    {sourceList.map((source) => {
                      const isActiveApp = appName?.toLowerCase() === source.toLowerCase();
                      return (
                        <button
                          disabled={isUnavailable}
                          key={source}
                          onClick={() =>
                            callService('media_player', 'select_source', {
                              entity_id: mediaPlayerId,
                              source,
                            })
                          }
                          className={`min-h-11 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
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
                {remoteId && (
                  <>
                    {/* Circular Clickpad / D-Pad Ring (Apple TV Touch Surface) */}
                    <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[var(--glass-bg)] shadow-inner">
                      {/* Up */}
                      <button
                        disabled={isUnavailable}
                        onClick={() => sendRemoteCommand('up')}
                        className="absolute top-0.5 flex h-11 w-14 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50"
                        aria-label={t('remote.up')}
                      >
                        <ChevronUp className="h-5 w-5" />
                      </button>

                      {/* Down */}
                      <button
                        disabled={isUnavailable}
                        onClick={() => sendRemoteCommand('down')}
                        className="absolute bottom-0.5 flex h-11 w-14 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50"
                        aria-label={t('remote.down')}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>

                      {/* Left */}
                      <button
                        disabled={isUnavailable}
                        onClick={() => sendRemoteCommand('left')}
                        className="absolute left-0.5 flex h-14 w-11 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50"
                        aria-label={t('remote.left')}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      {/* Right */}
                      <button
                        disabled={isUnavailable}
                        onClick={() => sendRemoteCommand('right')}
                        className="absolute right-0.5 flex h-14 w-11 items-center justify-center text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50"
                        aria-label={t('remote.right')}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Center Select */}
                      <button
                        disabled={isUnavailable}
                        onClick={() => sendRemoteCommand('select')}
                        className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--glass-bg-hover)] text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase shadow-md transition-all hover:bg-[var(--glass-border)] active:scale-95 disabled:opacity-50"
                        aria-label={t('remote.select')}
                      >
                        {t('common.ok')}
                      </button>
                    </div>

                    {/* Row 1: Back (< / Menu) & TV/Home */}
                    <div className="grid w-full grid-cols-2 gap-3 px-1">
                      <button
                        disabled={isUnavailable}
                        onClick={() => sendRemoteCommand('menu')}
                        className="flex h-12 flex-col items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
                        aria-label={t('appletv.menu') || 'Menu'}
                      >
                        <span className="text-sm font-bold">&lt;</span>
                        <span className="text-[11px] font-bold tracking-[0.08em] uppercase opacity-70">
                          {t('appletv.menu') || 'Back'}
                        </span>
                      </button>

                      <button
                        disabled={isUnavailable}
                        onClick={() => sendRemoteCommand('home')}
                        className="flex h-12 flex-col items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
                        aria-label={t('appletv.tvHome') || 'TV / Home'}
                      >
                        <Home className="h-4 w-4" />
                        <span className="text-[11px] font-bold tracking-[0.08em] uppercase opacity-70">
                          TV
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {/* Row 2: Play/Pause & Volume Rocker */}
                <div className="grid w-full grid-cols-2 gap-3 px-1">
                  <button
                    disabled={playbackDisabled}
                    onClick={() => controlMedia('media_play_pause')}
                    className="flex h-[6.25rem] flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
                    aria-label={t('shield.playPause')}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="ml-0.5 h-5 w-5" />
                    )}
                    <span className="text-[11px] font-bold tracking-[0.08em] uppercase opacity-70">
                      {t('shield.playPause')}
                    </span>
                  </button>

                  {/* Volume Rocker Up/Down in single vertical pill */}
                  <div className="flex h-[6.25rem] flex-col items-center justify-between rounded-2xl bg-[var(--glass-bg)] p-1">
                    <button
                      disabled={isUnavailable}
                      onClick={() => controlMedia('volume_up')}
                      className="flex w-full flex-1 items-center justify-center text-sm font-bold text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50"
                      aria-label={t('media.volume.up')}
                    >
                      +
                    </button>
                    <div className="h-px w-6 bg-[var(--glass-border)]" />
                    <button
                      disabled={isUnavailable}
                      onClick={() => controlMedia('volume_down')}
                      className="flex w-full flex-1 items-center justify-center text-sm font-bold text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50"
                      aria-label={t('media.volume.down')}
                    >
                      −
                    </button>
                  </div>
                </div>

                {/* Mute Button */}
                <div className="w-full px-1">
                  <button
                    disabled={isUnavailable}
                    onClick={toggleMute}
                    aria-pressed={isMuted}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--glass-bg)] text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
                  >
                    <VolumeX className="h-4 w-4 opacity-70" />
                    <span className="text-[11px] font-bold tracking-[0.08em] uppercase">
                      {isMuted ? t('media.volume.unmute') : t('media.volume.mute')}
                    </span>
                  </button>
                </div>

                <div className="w-full px-1">
                  <Button
                    block
                    variant={isOn ? 'destructive' : isUnavailable ? 'secondary' : 'primary'}
                    disabled={isUnavailable}
                    onClick={() =>
                      isOn
                        ? callService('media_player', 'turn_off', { entity_id: mediaPlayerId })
                        : callService('media_player', 'turn_on', { entity_id: mediaPlayerId })
                    }
                    icon={<Power className="h-5 w-5" />}
                  >
                    {isUnavailable
                      ? getUnavailableLabel(state, t)
                      : isOn
                        ? t('shield.turnOff')
                        : t('shield.turnOn')}
                  </Button>
                </div>
              </div>
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
