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
  Settings,
  Gamepad2,
  Tv,
  Power,
  Volume2,
  VolumeX,
} from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import { getMediaPlayerStateLabel, getMediaPlayerStateTone } from '../utils/mediaPlayerState';
import { getUnavailableLabel, isUnavailableState } from '../utils/entityState';

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
  const [pictureFailed, setPictureFailed] = useState(false);
  const modalTitleId = `android-tv-modal-title-${(mediaPlayerId || 'media').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

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
  useEffect(() => {
    setPictureFailed(false);
  }, [picture]);

  if (!show) return null;

  if (!entity) return null;

  const deviceName =
    customNames[mediaPlayerId] || entity?.attributes?.friendly_name || 'Android TV';

  const iconClassName = isPlaying
    ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
    : isPaused
      ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
      : isOn
        ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
        : '';

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

  // Same wake route as the card: the remote when there is one, as it can reach a sleeping TV.
  const togglePower = () => {
    if (isOn) controlMedia('turn_off');
    else if (remoteId) callService('remote', 'turn_on', { entity_id: remoteId });
    else controlMedia('turn_on');
  };

  const isMuted = entity.attributes?.is_volume_muted === true;
  const toggleMute = () =>
    callService('media_player', 'volume_mute', {
      entity_id: mediaPlayerId,
      is_volume_muted: !isMuted,
    });

  const sourceList = Array.isArray(entity.attributes?.source_list)
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
            icon={isOn ? <Gamepad2 /> : <Tv />}
            iconClassName={iconClassName}
            status={
              !linkedActive ? (
                <StatusChip
                  tone={getMediaPlayerStateTone(state)}
                  label={getMediaPlayerStateLabel(state, t)}
                />
              ) : null
            }
          />

          <ModalBody className="grid grid-cols-1 items-start gap-3 sm:gap-6 lg:grid-cols-5">
            {/* Left Column (Span 3) - Media Info & Controls */}
            <div className="space-y-3 sm:space-y-6 lg:col-span-3">
              <div className="popup-surface flex flex-col gap-2 rounded-2xl p-3 sm:gap-4 sm:p-4">
                {/* Album Art / Info Area */}
                <div className="group relative h-36 w-full overflow-hidden rounded-xl bg-black/20 sm:aspect-video sm:h-auto">
                  {picture && !pictureFailed ? (
                    <>
                      <img
                        src={picture}
                        alt={title}
                        className="h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-60"
                        onError={() => setPictureFailed(true)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
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
                        {t('media.noneMedia')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  <button
                    disabled={playbackDisabled}
                    onClick={() => controlMedia('media_previous_track')}
                    className="rounded-full bg-[var(--glass-bg)] p-2.5 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50 sm:p-3"
                    aria-label={t('media.previousTrack')}
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>
                  <button
                    disabled={playbackDisabled}
                    onClick={() => controlMedia('media_play_pause')}
                    className="rounded-full bg-[var(--accent-color)] p-3.5 font-bold text-[var(--accent-contrast)] shadow-lg transition-all hover:bg-[var(--accent-color)] active:scale-95 disabled:opacity-50 sm:p-5"
                    aria-label={isPlaying ? t('media.pause') : t('media.play')}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 fill-current" />
                    ) : (
                      <Play className="ml-1 h-6 w-6 fill-current" />
                    )}
                  </button>
                  <button
                    disabled={playbackDisabled}
                    onClick={() => controlMedia('media_next_track')}
                    className="rounded-full bg-[var(--glass-bg)] p-2.5 text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50 sm:p-3"
                    aria-label={t('media.nextTrack')}
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Launch Sources / Apps */}
              {sourceList.length > 0 && (
                <div className="popup-surface rounded-2xl p-3 sm:p-4">
                  <span className="modal-section-label mb-3 block">{t('appletv.apps')}</span>
                  <div className="flex flex-wrap gap-2">
                    {sourceList.map((source) => {
                      const isActiveApp = appName?.toLowerCase() === source.toLowerCase();
                      return (
                        <button
                          key={source}
                          disabled={isUnavailable}
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

            {/* Right Column (Span 2) - Remote + Volume & Power */}
            <div className="popup-surface flex flex-col items-center gap-3 rounded-2xl p-3 sm:gap-6 sm:p-4 lg:col-span-2">
              {remoteId && (
                <>
                  {/* D-Pad */}
                  <div className="relative h-32 w-32 sm:h-44 sm:w-44">
                    {/* Up */}
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('DPAD_UP')}
                      className="absolute top-0 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50 sm:h-14 sm:w-14"
                      aria-label={t('remote.up')}
                    >
                      <ChevronUp className="h-5 w-5" />
                    </button>
                    {/* Left */}
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('DPAD_LEFT')}
                      className="absolute top-1/2 left-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50 sm:h-14 sm:w-14"
                      aria-label={t('remote.left')}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {/* Right */}
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('DPAD_RIGHT')}
                      className="absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50 sm:h-14 sm:w-14"
                      aria-label={t('remote.right')}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    {/* Down */}
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('DPAD_DOWN')}
                      className="absolute bottom-0 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90 disabled:opacity-50 sm:h-14 sm:w-14"
                      aria-label={t('remote.down')}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                    {/* Center */}
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('DPAD_CENTER')}
                      className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-color)] text-[11px] font-bold text-[var(--accent-contrast)] shadow-lg transition-all hover:bg-[var(--accent-color)] active:scale-90 disabled:opacity-50 sm:h-12 sm:w-12"
                      aria-label={t('remote.select')}
                    >
                      {t('common.ok')}
                    </button>
                  </div>

                  {/* Nav Buttons */}
                  <div className="grid w-full grid-cols-3 gap-2 sm:gap-4">
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('BACK')}
                      className="group flex flex-col items-center gap-1 rounded-2xl bg-[var(--glass-bg)] p-2 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 disabled:opacity-50 sm:gap-2 sm:p-3"
                    >
                      <ChevronLeft className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                      <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase group-hover:text-[var(--text-secondary)]">
                        {t('shield.back')}
                      </span>
                    </button>
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('HOME')}
                      className="group flex flex-col items-center gap-1 rounded-2xl bg-[var(--glass-bg)] p-2 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 disabled:opacity-50 sm:gap-2 sm:p-3"
                    >
                      <Home className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                      <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase group-hover:text-[var(--text-secondary)]">
                        {t('shield.home')}
                      </span>
                    </button>
                    <button
                      disabled={isUnavailable}
                      onClick={() => sendCommand('MENU')}
                      className="group flex flex-col items-center gap-1 rounded-2xl bg-[var(--glass-bg)] p-2 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 disabled:opacity-50 sm:gap-2 sm:p-3"
                    >
                      <Settings className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                      <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase group-hover:text-[var(--text-secondary)]">
                        {t('shield.menu')}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* Volume & Power Controls */}
              <div className="flex w-full flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    disabled={isUnavailable}
                    onClick={() => controlMedia('volume_down')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--glass-bg)] py-2.5 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 disabled:opacity-50 sm:py-3"
                    aria-label={t('media.volume.down')}
                  >
                    <Volume2 className="h-4 w-4 opacity-50" />
                    <span className="text-lg font-bold">−</span>
                  </button>
                  <button
                    disabled={isUnavailable}
                    onClick={() => controlMedia('volume_up')}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--glass-bg)] py-2.5 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95 disabled:opacity-50 sm:py-3"
                    aria-label={t('media.volume.up')}
                  >
                    <span className="text-lg font-bold">+</span>
                    <Volume2 className="h-4 w-4 opacity-50" />
                  </button>
                </div>
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
                <Button
                  block
                  variant={isOn ? 'destructive' : isUnavailable ? 'secondary' : 'primary'}
                  disabled={isUnavailable}
                  onClick={togglePower}
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
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
