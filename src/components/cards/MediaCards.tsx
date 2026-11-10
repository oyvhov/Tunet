import { memo } from 'react';
import { getIconComponent } from '../../icons';
import {
  AlertTriangle,
  ArrowLeftRight,
  Pause,
  Play,
  Power,
  SkipBack,
  SkipForward,
  Speaker,
  Tv,
} from '../../icons';
import { getMediaPlayerPowerAction } from '../../utils/mediaPlayerFeatures';
import { getUnavailableLabel, isUnavailableState } from '../../utils/entityState';
import type { MouseEvent } from 'react';
import type { CardBaseProps, EntityMap } from '../../types/dashboard';
import type { CardCallService, GetEntityAttribute } from '../../types/cards';
import type { CardSettingsEntry, CardSettingsMap } from '../../utils/cardSettingsKey';
import { cardButtonProps } from '../../utils/keyboard';
import { useIsLightTheme } from '../../hooks/useIsLightTheme';
import CardName from '../ui/CardName';

type MediaEntity = EntityMap[string];

// The idle card is a size container: on a short card (phone rows, a smaller card scale)
// the ring, icon and gaps shrink so the ring stays inside the card.
const SHORT_IDLE_RING = '[@container(max-height:13rem)]:mb-2 [@container(max-height:13rem)]:p-3';
const SHORT_IDLE_ICON = '[@container(max-height:13rem)]:h-6 [@container(max-height:13rem)]:w-6';
const SHORT_IDLE_POWER = '[@container(max-height:13rem)]:mt-2';

/** Props the media and TV cards share. */
export interface MediaCardCommonProps extends Pick<
  CardBaseProps,
  'cardId' | 'dragProps' | 'controls' | 'cardStyle' | 'isMobile' | 't'
> {
  entities: EntityMap;
  editMode?: boolean;
  customNames: Record<string, string>;
  getA: GetEntityAttribute;
  getEntityImageUrl: (url: string | null | undefined) => string | null;
  callService: CardCallService;
}

interface MediaCardProps extends MediaCardCommonProps {
  customIcons: Record<string, string>;
  isMediaActive: (entity: MediaEntity | undefined) => boolean;
  onOpen: (mpId: string, groupKey: string | null, groupIds: null) => void;
  isFullWidthMobile?: boolean;
  cardSettings: CardSettingsMap;
  settingsKey: string;
}

interface MediaPlayerCardProps extends MediaCardProps {
  mpId: string;
}

interface MediaGroupCardProps extends MediaCardProps {
  saveCardSetting: (id: string, setting: string, value: unknown) => void;
}

/* ─── Single media player card ─── */

export const MediaPlayerCard = memo(
  ({
    cardId,
    mpId,
    dragProps,
    controls,
    cardStyle,
    entities,
    editMode,
    customNames,
    customIcons,
    getA,
    getEntityImageUrl,
    callService,
    isMediaActive,
    onOpen,
    isMobile,
    isFullWidthMobile,
    t,
    cardSettings,
    settingsKey,
  }: MediaPlayerCardProps) => {
    const isLightTheme = useIsLightTheme();
    const entity = entities[mpId];
    if (!entity) {
      if (editMode) {
        return (
          <div
            key={mpId}
            {...dragProps}
            className="glass-texture touch-feedback relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[var(--status-error-border)] bg-[var(--card-bg)] p-4"
            style={cardStyle}
          >
            {controls}
            <AlertTriangle className="mb-2 h-8 w-8 text-[var(--status-error-fg)] opacity-80" />
            <p className="text-center text-xs font-bold tracking-widest text-[var(--status-error-fg)] uppercase">
              {t('common.missing')}
            </p>
            <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-[var(--status-error-fg)]/70">
              {mpId}
            </p>
          </div>
        );
      }
      return null;
    }

    const mpState = entity?.state;
    const isPlaying = mpState === 'playing';
    const isActive = isMediaActive(entity);
    const name = customNames[cardId || mpId] || getA(mpId, 'friendly_name', t('media.mediaPlayer'));
    const title =
      getA(mpId, 'media_title') || (isActive ? t('status.active') : t('media.noneMedia'));
    const subtitle =
      getA(mpId, 'media_artist') ||
      getA(mpId, 'media_series_title') ||
      getA(mpId, 'media_album_name') ||
      '';
    const picture = getEntityImageUrl(entity?.attributes?.entity_picture);
    const isChannel = getA(mpId, 'media_content_type') === 'channel';
    const mediaIconName = customIcons?.[cardId] || customIcons?.[mpId] || null;
    const MediaIcon = mediaIconName
      ? getIconComponent(mediaIconName) || (isChannel ? Tv : Speaker)
      : isChannel
        ? Tv
        : Speaker;
    const powerAction = getMediaPlayerPowerAction(entity);
    const canTogglePower = Boolean(powerAction);
    const isPowerOffAction = powerAction === 'turn_off';
    const isDenseMobile = Boolean(isMobile);
    const useWideMobileControls = Boolean(isMobile && isFullWidthMobile);

    const settings: CardSettingsEntry =
      cardSettings && settingsKey ? cardSettings[settingsKey] || cardSettings[cardId] || {} : {};
    const artworkMode = settings.artworkMode || 'default';
    const isCoverMode = artworkMode === 'cover';
    const playingBackgroundMotion = settings.playingBackgroundMotion || 'off';
    const useSubtlePlayingMotion = !editMode && isPlaying && playingBackgroundMotion === 'subtle';
    // A light theme tints the card with the album colour instead of darkening it.
    const isLightArt = Boolean(picture) && !isCoverMode && isLightTheme;
    const isOnArt = Boolean(picture) && !isLightArt;
    const useWhiteText = (Boolean(picture) || isCoverMode) && !isLightArt;

    if (!isActive) {
      // A small card on a phone is one short row: the ring would not fit, so it shows text only.
      const showIdleRing = !(isDenseMobile && settings.size === 'small');
      return (
        <div
          key={mpId}
          {...dragProps}
          {...cardButtonProps(editMode, name)}
          data-haptic={editMode ? undefined : 'card'}
          onClick={(e) => {
            e.stopPropagation();
            if (!editMode) onOpen(mpId, null, null);
          }}
          className={`glass-texture touch-feedback group @container-size relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-4 sm:p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
          style={{ ...cardStyle, color: 'var(--text-primary)' }}
        >
          {controls}
          {showIdleRing && (
            <div
              className={`${isDenseMobile ? 'mb-3 rounded-full p-4' : 'mb-4 rounded-full p-5'} ${SHORT_IDLE_RING} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
              style={{ backgroundColor: 'var(--glass-bg)' }}
            >
              <MediaIcon
                className={`${isDenseMobile ? 'h-6 w-6' : 'h-8 w-8'} ${SHORT_IDLE_ICON} text-[var(--text-secondary)]`}
              />
            </div>
          )}
          <div className="w-full px-4 text-center">
            <p className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {isUnavailableState(mpState) ? getUnavailableLabel(mpState, t) : t('media.noneMusic')}
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <CardName
                lines={1}
                className="text-xs tracking-widest text-[var(--text-secondary)] uppercase opacity-70"
              >
                {String(name)}
              </CardName>
            </div>
          </div>
          {canTogglePower && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                callService('media_player', powerAction!, { entity_id: mpId });
              }}
              className={`mt-4 ${SHORT_IDLE_POWER} rounded-full p-2.5 transition-colors active:scale-95 ${isPowerOffAction ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] hover:opacity-90' : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90'}`}
              title={isPowerOffAction ? t('status.off') : t('status.on')}
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        key={mpId}
        {...dragProps}
        {...cardButtonProps(editMode, name)}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen(mpId, null, null);
        }}
        className={`${isOnArt ? 'media-on-art' : ''} glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-4 sm:p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={{
          ...cardStyle,
          color: isOnArt ? 'white' : 'var(--text-primary)',
        }}
      >
        {controls}

        {/* Background artwork */}
        {picture && (
          <div
            className={`pointer-events-none absolute inset-0 z-0 ${editMode ? '' : 'transition-all duration-500'} ${isCoverMode ? 'opacity-100' : 'opacity-20'} ${useSubtlePlayingMotion ? 'media-bg-subtle-pulse' : ''}`}
          >
            <img
              src={picture}
              alt=""
              className={`h-full w-full object-cover ${editMode ? '' : 'transition-transform duration-[10s] ease-in-out'} ${isCoverMode ? '' : 'scale-150 blur-xl'} ${isPlaying ? 'scale-[1.1]' : 'scale-100'} ${useSubtlePlayingMotion ? 'media-bg-subtle-drift' : ''}`}
            />
            <div
              className={`absolute inset-0 ${editMode ? '' : 'transition-opacity duration-500'} ${isCoverMode ? 'bg-gradient-to-t from-black/80 via-black/40 to-black/30' : 'bg-black/20'}`}
            />
            {useSubtlePlayingMotion && <div className="media-bg-subtle-overlay absolute inset-0" />}
          </div>
        )}

        <div
          className={`relative z-10 ${isCoverMode ? '' : `@container flex items-start ${isDenseMobile ? 'gap-3' : 'gap-4'}`}`}
        >
          {!isCoverMode && (
            <div
              className={`${isDenseMobile ? 'h-16 w-16' : 'h-20 w-20 @max-[13rem]:h-14 @max-[13rem]:w-14'} flex shrink-0 items-center justify-center overflow-hidden`}
            >
              {picture ? (
                <img
                  src={picture}
                  alt="Cover"
                  className={`h-full w-full object-cover ${isDenseMobile ? 'rounded-xl' : 'rounded-2xl'}`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MediaIcon
                    className={`${isDenseMobile ? 'h-6 w-6' : 'h-8 w-8'} text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110`}
                  />
                </div>
              )}
            </div>
          )}
          <div className={`flex flex-col overflow-hidden ${isCoverMode ? 'w-full pt-1' : 'pt-1'}`}>
            <div className="mb-1 flex items-center gap-2">
              <CardName
                lines={1}
                className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase ${isCoverMode ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}
              >
                {String(name)}
              </CardName>
            </div>
            <h3
              className={`mb-0.5 ${isCoverMode ? (isDenseMobile ? 'text-lg' : 'text-2xl') : isDenseMobile ? 'line-clamp-2 text-base' : 'line-clamp-2 text-lg'} leading-tight font-bold ${isCoverMode ? 'text-white' : ''}`}
            >
              {title || t('common.unknown')}
            </h3>
            {subtitle && (
              <p
                className={`${useWhiteText ? 'text-white/80' : 'text-[var(--text-secondary)]'} ${isCoverMode ? (isDenseMobile ? 'text-xs' : 'text-sm') : isDenseMobile ? 'truncate text-[11px]' : 'truncate text-xs'} font-medium`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div
          className={`relative z-10 flex items-center justify-center ${useWideMobileControls ? 'mt-2 gap-5 px-1' : isDenseMobile ? 'mt-3 gap-3 px-0' : 'mt-1 gap-[clamp(0.125rem,1.5vw,1.5rem)] px-0.5 sm:mt-2 sm:px-0'}`}
        >
          <button
            aria-label={t('media.previous')}
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', 'media_previous_track', { entity_id: mpId });
            }}
            className={`${useWhiteText ? 'text-white/80 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 ${useWideMobileControls ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 p-0 backdrop-blur-sm' : isDenseMobile ? 'p-2.5' : 'p-[clamp(0.15rem,0.9vw,0.5rem)]'} transition-colors active:scale-90`}
          >
            <SkipBack
              className={
                useWideMobileControls
                  ? 'h-6 w-6'
                  : isDenseMobile
                    ? 'h-5 w-5'
                    : 'h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]'
              }
            />
          </button>
          <button
            aria-label={isPlaying ? t('media.pause') : t('media.play')}
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', 'media_play_pause', { entity_id: mpId });
            }}
            className={`flex shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isCoverMode ? 'border border-white/30 bg-white/20 text-white backdrop-blur-md' : 'bg-white text-black'} ${useWideMobileControls ? 'h-14 w-14' : isDenseMobile ? 'h-11 w-11' : 'h-[clamp(1.9rem,5.8vw,3rem)] w-[clamp(1.9rem,5.8vw,3rem)]'}`}
          >
            {isPlaying ? (
              <Pause
                className={
                  useWideMobileControls
                    ? 'h-6 w-6 fill-current'
                    : isDenseMobile
                      ? 'h-5 w-5 fill-current'
                      : 'h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current'
                }
              />
            ) : (
              <Play
                className={
                  useWideMobileControls
                    ? 'ml-0.5 h-6 w-6 fill-current'
                    : isDenseMobile
                      ? 'ml-0.5 h-5 w-5 fill-current'
                      : 'ml-0.5 h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current'
                }
              />
            )}
          </button>
          <button
            aria-label={t('media.next')}
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', 'media_next_track', { entity_id: mpId });
            }}
            className={`${useWhiteText ? 'text-white/80 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 ${useWideMobileControls ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 p-0 backdrop-blur-sm' : isDenseMobile ? 'p-2.5' : 'p-[clamp(0.15rem,0.9vw,0.5rem)]'} transition-colors active:scale-90`}
          >
            <SkipForward
              className={
                useWideMobileControls
                  ? 'h-6 w-6'
                  : isDenseMobile
                    ? 'h-5 w-5'
                    : 'h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]'
              }
            />
          </button>
          {canTogglePower && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                callService('media_player', powerAction!, { entity_id: mpId });
              }}
              className={`${useWhiteText ? (isPowerOffAction ? 'text-[var(--status-error-fg)] hover:text-white' : 'text-[var(--status-success-fg)] hover:text-white') : isPowerOffAction ? 'text-[var(--status-error-fg)] hover:opacity-80' : 'text-[var(--status-success-fg)] hover:opacity-80'} shrink-0 ${useWideMobileControls ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 p-0 backdrop-blur-sm' : isDenseMobile ? 'p-2.5' : 'p-[clamp(0.15rem,0.9vw,0.5rem)]'} transition-colors active:scale-90`}
              title={isPowerOffAction ? t('status.off') : t('status.on')}
            >
              <Power
                className={
                  useWideMobileControls
                    ? 'h-6 w-6'
                    : isDenseMobile
                      ? 'h-5 w-5'
                      : 'h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]'
                }
              />
            </button>
          )}
        </div>
      </div>
    );
  }
);

/* ─── Media group card (multiple players) ─── */

export const MediaGroupCard = memo(
  ({
    cardId,
    dragProps,
    controls,
    cardStyle,
    entities,
    editMode,
    cardSettings,
    settingsKey,
    customNames,
    customIcons,
    getA,
    getEntityImageUrl,
    callService,
    isMediaActive,
    saveCardSetting,
    onOpen,
    isMobile,
    isFullWidthMobile,
    t,
  }: MediaGroupCardProps) => {
    const isLightTheme = useIsLightTheme();
    const groupSettings: CardSettingsEntry = cardSettings[settingsKey] || {};
    const mediaIds = Array.isArray(groupSettings.mediaIds) ? groupSettings.mediaIds : [];
    const mediaEntities = mediaIds
      .map((id) => entities[id])
      .filter((entity): entity is MediaEntity => Boolean(entity));

    if (mediaEntities.length === 0) return null;

    const activeEntities = mediaEntities.filter(isMediaActive);
    const playingEntities = mediaEntities.filter((e) => e.state === 'playing');
    const pool = activeEntities.length > 0 ? activeEntities : mediaEntities;
    const cyclePool =
      playingEntities.length > 1
        ? playingEntities
        : activeEntities.length > 1
          ? activeEntities
          : pool;

    let currentMp = pool.find((e) => e.entity_id === groupSettings.activeId);
    if (!currentMp) currentMp = playingEntities[0] || pool[0];
    if (!currentMp) return null;

    // entity_id is optional in EntityMap, but Home Assistant always sends it.
    const mpId = currentMp.entity_id!;
    const mpState = currentMp.state;
    const isPlaying = mpState === 'playing';
    const isActive = activeEntities.length > 0;

    const artworkMode = groupSettings.artworkMode || 'default';
    const isCoverMode = artworkMode === 'cover';
    const playingBackgroundMotion = groupSettings.playingBackgroundMotion || 'off';
    const useSubtlePlayingMotion = !editMode && isPlaying && playingBackgroundMotion === 'subtle';

    const name = customNames[cardId] || getA(mpId, 'friendly_name', 'Musikk');
    const title =
      getA(mpId, 'media_title') || (isActive ? t('status.active') : t('media.noneMusic'));
    const subtitle =
      getA(mpId, 'media_artist') ||
      getA(mpId, 'media_series_title') ||
      getA(mpId, 'media_album_name') ||
      '';
    const picture = getEntityImageUrl(currentMp.attributes?.entity_picture);
    const isChannel = getA(mpId, 'media_content_type') === 'channel';
    const mediaIconName = customIcons?.[cardId] || customIcons?.[mpId] || null;
    const MediaIcon = mediaIconName
      ? getIconComponent(mediaIconName) || (isChannel ? Tv : Speaker)
      : isChannel
        ? Tv
        : Speaker;
    const powerAction = getMediaPlayerPowerAction(currentMp);
    const canTogglePower = Boolean(powerAction);
    const isPowerOffAction = powerAction === 'turn_off';
    const isDenseMobile = Boolean(isMobile);
    const useWideMobileControls = Boolean(isMobile && isFullWidthMobile);
    // A light theme tints the card with the album colour instead of darkening it.
    const isLightArt = Boolean(picture) && !isCoverMode && isLightTheme;
    const isOnArt = Boolean(picture) && !isLightArt;
    const useWhiteText = (Boolean(picture) || isCoverMode) && !isLightArt;

    const cyclePlayers = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (cyclePool.length < 2) return;
      const idx = cyclePool.findIndex((ent) => ent.entity_id === mpId);
      const next = cyclePool[(idx + 1) % cyclePool.length];
      saveCardSetting(settingsKey, 'activeId', next.entity_id);
    };

    if (!isActive) {
      // A small card on a phone is one short row: the ring would not fit, so it shows text only.
      const showIdleRing = !(isDenseMobile && groupSettings.size === 'small');
      return (
        <div
          key={cardId}
          {...dragProps}
          {...cardButtonProps(editMode, name)}
          data-haptic={editMode ? undefined : 'card'}
          onClick={(e) => {
            e.stopPropagation();
            if (!editMode) onOpen(mpId, settingsKey, null);
          }}
          className={`glass-texture touch-feedback group @container-size relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-4 sm:p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
          style={{ ...cardStyle, color: 'var(--text-primary)' }}
        >
          {controls}
          {showIdleRing && (
            <div
              className={`${isDenseMobile ? 'mb-3 rounded-full p-4' : 'mb-4 rounded-full p-5'} ${SHORT_IDLE_RING}`}
              style={{ backgroundColor: 'var(--glass-bg)' }}
            >
              <MediaIcon
                className={`${isDenseMobile ? 'h-6 w-6' : 'h-8 w-8'} ${SHORT_IDLE_ICON} text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110`}
              />
            </div>
          )}
          <div className="w-full px-4 text-center">
            <p className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {mediaEntities.every((player) => isUnavailableState(player.state))
                ? getUnavailableLabel(mpState, t)
                : t('media.noneMusic')}
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <CardName
                lines={1}
                className="text-xs tracking-widest text-[var(--text-secondary)] uppercase opacity-70"
              >
                {String(name)}
              </CardName>
            </div>
          </div>
          {canTogglePower && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                callService('media_player', powerAction!, { entity_id: mpId });
              }}
              className={`mt-4 ${SHORT_IDLE_POWER} rounded-full p-2.5 transition-colors active:scale-95 ${isPowerOffAction ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] hover:opacity-90' : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90'}`}
              title={isPowerOffAction ? t('status.off') : t('status.on')}
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        key={cardId}
        {...dragProps}
        {...cardButtonProps(editMode, name)}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen(mpId, settingsKey, null);
        }}
        className={`${isOnArt ? 'media-on-art' : ''} glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-4 sm:p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={{
          ...cardStyle,
          color: isOnArt ? 'white' : 'var(--text-primary)',
        }}
      >
        {controls}
        {cyclePool.length > 1 && (
          <button
            onClick={cyclePlayers}
            className={`absolute z-30 flex items-center gap-1.5 rounded-full border text-[var(--text-secondary)] backdrop-blur-md transition-colors hover:text-[var(--text-primary)] ${isDenseMobile ? 'top-3 right-3 px-2 py-1' : 'top-4 right-4 px-2.5 py-1'}`}
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
          >
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-secondary)]" />
            <span className="text-xs font-bold">{cyclePool.length}</span>
            <ArrowLeftRight className="ml-0.5 h-3 w-3" />
          </button>
        )}
        {isPlaying && (
          <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-gradient-to-t from-[var(--glass-bg-hover)] via-transparent to-transparent opacity-50" />
        )}
        {isPlaying && (
          <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        )}

        {/* Background artwork */}
        {picture && (
          <>
            {/* Default artwork (blurred background) */}
            {!isCoverMode && (
              <div
                className={`pointer-events-none absolute inset-0 z-0 opacity-20 ${useSubtlePlayingMotion ? 'media-bg-subtle-pulse' : ''}`}
              >
                <img
                  src={picture}
                  alt=""
                  className={`h-full w-full scale-150 object-cover blur-xl ${editMode ? '' : 'transition-transform duration-[10s] ease-in-out'} ${isPlaying ? 'scale-[1.6]' : 'scale-150'} ${useSubtlePlayingMotion ? 'media-bg-subtle-drift' : ''}`}
                />
                <div className="absolute inset-0 bg-black/20" />
                {useSubtlePlayingMotion && (
                  <div className="media-bg-subtle-overlay absolute inset-0" />
                )}
              </div>
            )}
            {/* Cover artwork (full sharp background) */}
            {isCoverMode && (
              <div
                className={`pointer-events-none absolute inset-0 z-0 ${useSubtlePlayingMotion ? 'media-bg-subtle-pulse' : ''}`}
              >
                <img
                  src={picture}
                  alt=""
                  className={`h-full w-full scale-100 object-cover ${editMode ? '' : 'transition-transform duration-[10s] ease-in-out'} ${useSubtlePlayingMotion ? 'media-bg-subtle-drift' : ''}`}
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                {useSubtlePlayingMotion && (
                  <div className="media-bg-subtle-overlay absolute inset-0" />
                )}
              </div>
            )}
          </>
        )}

        <div
          className={`relative z-10 ${isCoverMode ? '' : `@container flex items-start ${isDenseMobile ? 'gap-3' : 'gap-4'}`}`}
        >
          {!isCoverMode && (
            <div
              className={`${isDenseMobile ? 'h-16 w-16' : 'h-20 w-20 @max-[13rem]:h-14 @max-[13rem]:w-14'} flex shrink-0 items-center justify-center overflow-hidden`}
            >
              {picture ? (
                <img
                  src={picture}
                  alt="Cover"
                  className={`h-full w-full object-cover ${isDenseMobile ? 'rounded-xl' : 'rounded-2xl'}`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MediaIcon
                    className={`${isDenseMobile ? 'h-6 w-6' : 'h-8 w-8'} text-[var(--text-secondary)] transition-transform duration-300 group-hover:scale-110`}
                  />
                </div>
              )}
            </div>
          )}
          <div className={`flex flex-col overflow-hidden ${isCoverMode ? 'w-full pt-1' : 'pt-1'}`}>
            <div className="mb-1 flex items-center gap-2">
              <CardName
                lines={1}
                className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase ${isCoverMode ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}
              >
                {String(name)}
              </CardName>
            </div>
            <h3
              className={`mb-0.5 ${isCoverMode ? (isDenseMobile ? 'text-lg' : 'text-2xl') : isDenseMobile ? 'line-clamp-2 text-base' : 'line-clamp-2 text-lg'} leading-tight font-bold ${isCoverMode ? 'text-white' : ''}`}
            >
              {title || t('common.unknown')}
            </h3>
            {subtitle && (
              <p
                className={`${useWhiteText ? 'text-white/80' : 'text-[var(--text-secondary)]'} ${isCoverMode ? (isDenseMobile ? 'text-xs' : 'text-sm') : isDenseMobile ? 'truncate text-[11px]' : 'truncate text-xs'} font-medium`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div
          className={`relative z-10 flex items-center justify-center ${useWideMobileControls ? 'mt-2 gap-5 px-1' : isDenseMobile ? 'mt-3 gap-3 px-0' : 'mt-1 gap-[clamp(0.125rem,1.5vw,1.5rem)] px-0.5 sm:mt-2 sm:px-0'}`}
        >
          <button
            aria-label={t('media.previous')}
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', 'media_previous_track', { entity_id: mpId });
            }}
            className={`${useWhiteText ? 'text-white/80 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 ${useWideMobileControls ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 p-0 backdrop-blur-sm' : isDenseMobile ? 'p-2.5' : 'p-[clamp(0.15rem,0.9vw,0.5rem)]'} transition-colors active:scale-90`}
          >
            <SkipBack
              className={
                useWideMobileControls
                  ? 'h-6 w-6'
                  : isDenseMobile
                    ? 'h-5 w-5'
                    : 'h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]'
              }
            />
          </button>
          <button
            aria-label={isPlaying ? t('media.pause') : t('media.play')}
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', 'media_play_pause', { entity_id: mpId });
            }}
            className={`flex shrink-0 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isCoverMode ? 'border border-white/30 bg-white/20 text-white backdrop-blur-md' : 'bg-white text-black'} ${useWideMobileControls ? 'h-14 w-14' : isDenseMobile ? 'h-11 w-11' : 'h-[clamp(1.9rem,5.8vw,3rem)] w-[clamp(1.9rem,5.8vw,3rem)]'}`}
          >
            {isPlaying ? (
              <Pause
                className={
                  useWideMobileControls
                    ? 'h-6 w-6 fill-current'
                    : isDenseMobile
                      ? 'h-5 w-5 fill-current'
                      : 'h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current'
                }
              />
            ) : (
              <Play
                className={
                  useWideMobileControls
                    ? 'ml-0.5 h-6 w-6 fill-current'
                    : isDenseMobile
                      ? 'ml-0.5 h-5 w-5 fill-current'
                      : 'ml-0.5 h-[clamp(0.85rem,2vw,1.25rem)] w-[clamp(0.85rem,2vw,1.25rem)] fill-current'
                }
              />
            )}
          </button>
          <button
            aria-label={t('media.next')}
            onClick={(e) => {
              e.stopPropagation();
              callService('media_player', 'media_next_track', { entity_id: mpId });
            }}
            className={`${useWhiteText ? 'text-white/80 hover:text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} shrink-0 ${useWideMobileControls ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 p-0 backdrop-blur-sm' : isDenseMobile ? 'p-2.5' : 'p-[clamp(0.15rem,0.9vw,0.5rem)]'} transition-colors active:scale-90`}
          >
            <SkipForward
              className={
                useWideMobileControls
                  ? 'h-6 w-6'
                  : isDenseMobile
                    ? 'h-5 w-5'
                    : 'h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]'
              }
            />
          </button>
          {canTogglePower && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                callService('media_player', powerAction!, { entity_id: mpId });
              }}
              className={`${useWhiteText ? (isPowerOffAction ? 'text-[var(--status-error-fg)] hover:text-white' : 'text-[var(--status-success-fg)] hover:text-white') : isPowerOffAction ? 'text-[var(--status-error-fg)] hover:opacity-80' : 'text-[var(--status-success-fg)] hover:opacity-80'} shrink-0 ${useWideMobileControls ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 p-0 backdrop-blur-sm' : isDenseMobile ? 'p-2.5' : 'p-[clamp(0.15rem,0.9vw,0.5rem)]'} transition-colors active:scale-90`}
              title={isPowerOffAction ? t('status.off') : t('status.on')}
            >
              <Power
                className={
                  useWideMobileControls
                    ? 'h-6 w-6'
                    : isDenseMobile
                      ? 'h-5 w-5'
                      : 'h-[clamp(0.85rem,2.2vw,1.5rem)] w-[clamp(0.85rem,2.2vw,1.5rem)]'
                }
              />
            </button>
          )}
        </div>
      </div>
    );
  }
);
