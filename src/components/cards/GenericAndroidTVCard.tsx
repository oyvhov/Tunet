import { memo, useEffect, useState } from 'react';
import { Tv, Play, Pause, Power, RefreshCw } from '../../icons';
import { getMediaLogoUrl } from '../../utils/mediaLogos';
import { getUnavailableLabel, isUnavailableState } from '../../utils/entityState';
import { usePowerToggle } from '../../hooks/usePowerToggle';
import type { MouseEvent } from 'react';
import type { MediaCardCommonProps } from './MediaCards';

interface GenericAndroidTVCardProps extends MediaCardCommonProps {
  mediaPlayerId: string;
  remoteId?: string;
  linkedMediaPlayers?: unknown;
  size?: string;
  onOpen?: () => void;
}

const GenericAndroidTVCard = memo(
  /** Android TV card: what is playing, app logo, play/pause and power. */ function GenericAndroidTVCard({
    cardId,
    dragProps,
    controls,
    cardStyle,
    editMode,
    entities,
    mediaPlayerId,
    remoteId,
    linkedMediaPlayers,
    size,
    getA,
    getEntityImageUrl,
    onOpen,
    customNames,
    isMobile,
    t,
    callService,
  }: GenericAndroidTVCardProps) {
    const [waking, setWaking] = useState(false);
    const state = entities[mediaPlayerId]?.state; // Keep main TV state for ON/OFF status
    const isUnavailable = isUnavailableState(state) || !state;
    const isOn = state !== 'off' && state !== 'standby' && !isUnavailable;
    // The remote entity can be fine while the media player is not, and can still wake the TV.
    const canWakeViaRemote =
      Boolean(remoteId) && !isUnavailableState(entities[remoteId ?? '']?.state ?? state);
    const canTogglePower = !isUnavailable || canWakeViaRemote;
    const { isPending, togglePower } = usePowerToggle({
      entityId: mediaPlayerId,
      isOn,
      domain: 'media_player',
      callService,
      // Same wake route as the popup: the remote when there is one.
      buildCall: () =>
        !isOn && canWakeViaRemote && remoteId
          ? { domain: 'remote', service: 'turn_on', data: { entity_id: remoteId } }
          : null,
    });
    useEffect(() => {
      if (!waking) return undefined;
      if (isOn) {
        setWaking(false);
        return undefined;
      }
      const timer = setTimeout(() => setWaking(false), 20000);
      return () => clearTimeout(timer);
    }, [waking, isOn]);

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

    const displayState = displayEntity?.state;
    const offLabel = isUnavailable ? getUnavailableLabel(state, t) : t('status.off');
    const offPillLabel = isUnavailable ? getUnavailableLabel(state, t) : t('common.off');

    // Is the device actually playing something?
    const isPlaying = displayState === 'playing';

    // Metadata retrieval
    // When linked player is active: Use media_series_title (Series) OR media_title (Movie) as the large title
    // Small Subtitle: Series Title if Series, or empty. NO app name.

    let appName = getA(displayEntityId, 'app_name');
    const title = getA(displayEntityId, 'media_title');

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
    const isDenseMobile = isMobile && !isSmall;

    const getAppLogo = (app: string | null | undefined) => {
      // Detect linked player app from display entity attributes
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

    const powerButton = canTogglePower && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) togglePower();
        }}
        disabled={editMode || isPending}
        aria-busy={isPending}
        className={`relative flex items-center justify-center rounded-full transition-all before:absolute before:-inset-1.5 active:scale-90 ${
          isDenseMobile ? 'h-8 w-8' : 'h-9 w-9'
        } ${isSmall ? '' : 'shadow-md'} ${
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
    );

    if (!isOn && !linkedActive && !isSmall) {
      const canTurnOn = canTogglePower && typeof callService === 'function';
      const turnOn = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (editMode || !canTurnOn || waking) return;
        setWaking(true);
        const request = canWakeViaRemote
          ? callService('remote', 'turn_on', { entity_id: remoteId })
          : callService('media_player', 'turn_on', { entity_id: mediaPlayerId });
        Promise.resolve(request).catch(() => setWaking(false));
      };

      return (
        <div
          key={cardId}
          {...dragProps}
          data-haptic={editMode ? undefined : 'card'}
          data-tv-state={waking ? 'waking' : isUnavailable ? 'unavailable' : 'off'}
          onClick={(e) => {
            e.stopPropagation();
            if (!editMode && onOpen) onOpen();
          }}
          className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
          style={cardStyle}
        >
          {controls}

          <div className="relative z-10 flex items-start justify-between">
            <div
              className={`bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all group-hover:scale-110 ${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'}`}
            >
              <Tv className={isDenseMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            </div>
            {!isUnavailable && (
              <div
                className={`flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all ${isDenseMobile ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1.5'}`}
              >
                <span
                  className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}
                >
                  {waking ? t('tv.starting') : t('common.off')}
                </span>
              </div>
            )}
          </div>

          <div
            className={`relative z-10 flex items-end justify-between ${isDenseMobile ? 'gap-3' : 'gap-4'}`}
          >
            <div className="min-w-0">
              <p
                className={`text-[var(--text-secondary)] ${isDenseMobile ? 'mb-0.5 text-[10px]' : 'mb-1 text-xs'} font-bold tracking-widest uppercase opacity-60`}
              >
                {deviceName}
              </p>
              <h3
                className={`${isDenseMobile ? 'text-[1.45rem]' : 'text-3xl'} line-clamp-2 pb-0.5 leading-tight font-thin text-[var(--text-primary)]`}
              >
                {offLabel}
              </h3>
            </div>
            {canTurnOn && (
              <button
                type="button"
                onClick={turnOn}
                disabled={editMode}
                aria-label={`${t('shield.turnOn')}: ${deviceName}`}
                aria-busy={waking}
                title={t('shield.turnOn')}
                className={`relative z-20 flex-shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-95 ${isDenseMobile ? 'p-2.5' : 'p-3'}`}
              >
                {waking ? (
                  <RefreshCw
                    className={`${isDenseMobile ? 'h-5 w-5' : 'h-6 w-6'} animate-spin motion-reduce:animate-none`}
                  />
                ) : (
                  <Power className={isDenseMobile ? 'h-5 w-5' : 'h-6 w-6'} />
                )}
              </button>
            )}
          </div>
        </div>
      );
    }

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
          className={`${picture || appLogo ? 'media-on-art' : ''} glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
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
                  alt={appName || 'Android TV'}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <Tv className="h-5 w-5" />
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <p
                className={`${picture || appLogo ? 'text-white/80' : 'text-[var(--text-secondary)]'} truncate text-xs font-bold tracking-widest uppercase opacity-70`}
              >
                {deviceName}
              </p>
              <p className="truncate text-lg leading-tight font-medium text-[var(--text-primary)]">
                {appName || (isOn ? t('media.homeScreen') : offLabel)}
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
            <div
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 transition-all ${isOn ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
            >
              <span className="text-[10px] font-bold tracking-widest uppercase">
                {isOn ? (isPlaying ? t('status.playing') : t('common.on')) : offPillLabel}
              </span>
            </div>
            {powerButton}
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
        className={`${picture || appLogo ? 'media-on-art' : ''} glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{ ...cardStyle, color: picture || appLogo ? 'white' : 'var(--text-primary)' }}
      >
        {controls}

        <div className="relative z-10 flex items-start justify-between">
          <div
            className={`transition-all group-hover:scale-110 ${isOn ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'} ${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'}`}
          >
            <Tv className={isDenseMobile ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
          <div className="flex items-center gap-2">
            {!linkedActive && (
              <div
                className={`flex items-center rounded-full border transition-all ${isOn ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'} ${isDenseMobile ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1.5'}`}
              >
                <span
                  className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}
                >
                  {isOn ? (isPlaying ? t('status.playing') : t('common.on')) : offPillLabel}
                </span>
              </div>
            )}
            {powerButton}
          </div>
        </div>

        <div
          className={`relative z-10 flex items-end justify-between ${isDenseMobile ? 'gap-3' : 'gap-4'}`}
        >
          <div className="min-w-0">
            <p
              className={`${picture || appLogo ? 'text-white/70' : 'text-[var(--text-secondary)]'} ${isDenseMobile ? 'mb-0.5 text-[10px]' : 'mb-1 text-xs'} font-bold tracking-widest uppercase opacity-60`}
            >
              {deviceName}
            </p>
            <h3
              className={`${isDenseMobile ? 'mb-0.5 text-[1.45rem]' : 'mb-1 text-3xl'} line-clamp-2 leading-none font-thin`}
            >
              {appName || (isOn ? t('media.homeScreen') : offLabel)}
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
                  src={appLogo ?? undefined}
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

export default GenericAndroidTVCard;
