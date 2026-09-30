import { memo } from 'react';
import { Play, Pause, Power, RefreshCw } from '../../icons';
import { getMediaLogoUrl } from '../../utils/mediaLogos';
import { usePowerToggle } from '../../hooks/usePowerToggle';

function AppleLogoIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .61-2.64 1.36-.56.64-.99 1.68-.86 2.7.99.08 2.02-.51 2.58-1.21z" />
    </svg>
  );
}

const GenericAppleTVCard = memo(
  /** @param {any} props */ function GenericAppleTVCard({
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
    isMobile,
    t,
    callService,
    settings,
  }) {
    const entity = entities[mediaPlayerId];
    const isUnavailable = !entity || ['unavailable', 'unknown'].includes(entity.state);
    const isOn = !isUnavailable && entity.state !== 'off' && entity.state !== 'standby';
    const { isPending, togglePower } = usePowerToggle({
      entityId: mediaPlayerId,
      isOn,
      domain: 'media_player',
      callService,
    });
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
    const displayState = displayEntity?.state;
    const isPlaying = displayState === 'playing';

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
        (displayEntityId !== mediaPlayerId ? displayEntity?.attributes?.friendly_name : null);
    }

    const picture = getEntityImageUrl(displayEntity?.attributes?.entity_picture);
    const deviceName = customNames[cardId] || entity?.attributes?.friendly_name || 'Apple TV';
    const isSmall = size === 'small';
    const isDenseMobile = isMobile && !isSmall;
    const isTapToggle = settings?.tapAction === 'toggle';

    const getAppLogo = (app) => {
      if (linkedActive) {
        const appId = displayEntity?.attributes?.app_id?.toLowerCase() || '';
        const appNameStr = displayEntity?.attributes?.app_name?.toLowerCase() || '';
        if (appId.includes('jellyfin') || appNameStr.includes('jellyfin'))
          return getMediaLogoUrl('jellyfin');
        if (appId.includes('emby') || appNameStr.includes('emby')) return getMediaLogoUrl('emby');
      }
      return getMediaLogoUrl(app);
    };

    const appLogo = getAppLogo(appName);

    const handleTogglePower = (e) => {
      if (e) e.stopPropagation();
      if (editMode || isUnavailable) return;
      togglePower();
    };

    const handleCardClick = (e) => {
      e.stopPropagation();
      if (editMode) return;
      if (isTapToggle) {
        handleTogglePower(e);
      } else if (onOpen) {
        onOpen();
      }
    };

    const detailsAreaProps = isTapToggle
      ? {
          role: 'button',
          tabIndex: editMode ? -1 : 0,
          'aria-label': `${deviceName}: ${t('editCard.tapActionModal')}`,
          onClick: (e) => {
            e.stopPropagation();
            if (!editMode && onOpen) onOpen();
          },
          onKeyDown: (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            e.stopPropagation();
            if (!editMode && onOpen) onOpen();
          },
        }
      : {};

    if (isSmall) {
      return (
        <div
          key={cardId}
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          onClick={handleCardClick}
          className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
          style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
        >
          {controls}

          <div className="flex min-w-0 items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl transition-all group-hover:scale-110 ${isOn ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
            >
              {picture ? (
                <img src={picture} alt="" className="h-full w-full object-cover" />
              ) : appLogo ? (
                <img
                  src={appLogo}
                  alt={appName || 'Apple TV'}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <AppleLogoIcon className="h-6 w-6" />
              )}
            </div>
            <div className="flex min-w-0 flex-col" {...detailsAreaProps}>
              <p
                className={`${picture || appLogo ? 'text-white/80' : 'text-[var(--text-secondary)]'} truncate text-xs font-bold tracking-widest uppercase opacity-70`}
              >
                {deviceName}
              </p>
              <p className="truncate text-lg leading-tight font-medium text-[var(--text-primary)]">
                {appName || (isOn ? t('media.homeScreen') : t('status.off'))}
              </p>
              {title && (
                <p
                  className={`${picture || appLogo ? 'text-white/90' : 'text-[var(--text-muted)]'} truncate text-xs font-medium`}
                >
                  {title}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePower}
              disabled={editMode || isPending || isUnavailable}
              aria-busy={isPending}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all before:absolute before:-inset-1.5 active:scale-90 ${
                isOn
                  ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] hover:opacity-90'
                  : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90'
              }`}
              title={isOn ? t('shield.turnOff') : t('shield.turnOn')}
              aria-label={isOn ? t('shield.turnOff') : t('shield.turnOn')}
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={handleCardClick}
        className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
      >
        {controls}

        <div className="relative z-10 flex items-start justify-between">
          <div
            className={`transition-all group-hover:scale-110 ${isOn ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'} ${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'}`}
          >
            <AppleLogoIcon className={isDenseMobile ? 'h-5 w-5' : 'h-6 w-6'} />
          </div>

          <div className="flex items-center gap-2">
            {!linkedActive && (
              <div
                className={`flex items-center rounded-full border transition-all ${isOn ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'} ${isDenseMobile ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1.5'}`}
              >
                <span
                  className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}
                >
                  {isOn ? (isPlaying ? t('status.playing') : t('common.on')) : t('common.off')}
                </span>
              </div>
            )}

            {/* Direct Power button on card */}
            <button
              type="button"
              onClick={handleTogglePower}
              disabled={editMode || isPending || isUnavailable}
              aria-busy={isPending}
              className={`relative flex items-center justify-center rounded-full shadow-md transition-all before:absolute before:-inset-1.5 active:scale-90 ${
                isDenseMobile ? 'h-8 w-8' : 'h-9 w-9'
              } ${
                isOn
                  ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] hover:opacity-90'
                  : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90'
              }`}
              title={isOn ? t('shield.turnOff') : t('shield.turnOn')}
              aria-label={isOn ? t('shield.turnOff') : t('shield.turnOn')}
            >
              {isPending ? (
                <RefreshCw
                  className={`${isDenseMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} animate-spin motion-reduce:animate-none`}
                />
              ) : (
                <Power className={isDenseMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              )}
            </button>
          </div>
        </div>

        <div
          className={`relative z-10 flex items-end justify-between ${isDenseMobile ? 'gap-3' : 'gap-4'}`}
        >
          <div className="min-w-0" {...detailsAreaProps}>
            <p
              className={`${picture || appLogo ? 'text-white/70' : 'text-[var(--text-secondary)]'} ${isDenseMobile ? 'mb-0.5 text-[10px]' : 'mb-1 text-xs'} font-bold tracking-widest uppercase opacity-60`}
            >
              {deviceName}
            </p>
            <h3
              className={`${isDenseMobile ? 'mb-0.5 text-[1.45rem]' : 'mb-1 text-3xl'} line-clamp-2 leading-none font-thin`}
            >
              {appName || (isOn ? t('media.homeScreen') : t('status.off'))}
            </h3>
            {title && (
              <p
                className={`${isDenseMobile ? 'text-[11px]' : 'text-xs'} ${picture || appLogo ? 'text-white/80' : 'text-[var(--text-muted)]'} line-clamp-1 font-medium`}
              >
                {title}
              </p>
            )}
          </div>

          {isOn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const targetId = linkedActive ? displayEntityId : mediaPlayerId;
                callService('media_player', 'media_play_pause', { entity_id: targetId });
              }}
              className={`relative z-20 flex-shrink-0 rounded-full bg-white shadow-lg transition-all active:scale-95 ${isDenseMobile ? 'p-2.5' : 'p-3'}`}
              title={t('shield.playPause')}
              aria-label={t('shield.playPause')}
            >
              {isPlaying ? (
                <Pause
                  className={isDenseMobile ? 'h-5 w-5' : 'h-6 w-6'}
                  color="black"
                  fill="black"
                />
              ) : (
                <Play
                  className={`${isDenseMobile ? 'ml-0.5 h-5 w-5' : 'ml-0.5 h-6 w-6'}`}
                  color="black"
                  fill="black"
                />
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
                className={`flex h-full w-full items-center justify-center ${!linkedActive ? 'p-0' : isDenseMobile ? 'p-8' : 'p-12'}`}
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
);

export default GenericAppleTVCard;
