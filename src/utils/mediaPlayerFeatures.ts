const MEDIA_PLAYER_FEATURE = {
  PAUSE: 1,
  SEEK: 2,
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  REPEAT_SET: 262144,
  GROUPING: 524288,
};

type MediaPlayerEntityLike = {
  state?: unknown;
  attributes?: { supported_features?: unknown } | null;
};

const supportsMediaPlayerFeature = (supportedFeatures: number, bitMask: number): boolean => {
  if (!Number.isFinite(supportedFeatures)) return false;
  return (supportedFeatures & bitMask) !== 0;
};

const getMediaPlayerSupportedFeatures = (entity: MediaPlayerEntityLike | null | undefined) =>
  Number(entity?.attributes?.supported_features || 0);

export const canTurnMediaPlayerOn = (entity: MediaPlayerEntityLike | null | undefined) =>
  supportsMediaPlayerFeature(getMediaPlayerSupportedFeatures(entity), MEDIA_PLAYER_FEATURE.TURN_ON);

export const canTurnMediaPlayerOff = (entity: MediaPlayerEntityLike | null | undefined) =>
  supportsMediaPlayerFeature(
    getMediaPlayerSupportedFeatures(entity),
    MEDIA_PLAYER_FEATURE.TURN_OFF
  );

export const getMediaPlayerPowerAction = (
  entity: MediaPlayerEntityLike | null | undefined
): 'turn_on' | 'turn_off' | null => {
  if (!entity) return null;
  const state = String(entity.state || '').toLowerCase();
  if (!state || state === 'unavailable' || state === 'unknown') return null;

  const canTurnOn = canTurnMediaPlayerOn(entity);
  const canTurnOff = canTurnMediaPlayerOff(entity);

  if (state === 'off') {
    return canTurnOn ? 'turn_on' : null;
  }

  if (canTurnOff) return 'turn_off';
  return null;
};

/** Which controls a player can use right now, from its state and supported features. */
export const getMediaPlayerControls = (entity: MediaPlayerEntityLike | null | undefined) => {
  const state = String(entity?.state || '').toLowerCase();
  const features = getMediaPlayerSupportedFeatures(entity);
  const supports = (bitMask: number) => supportsMediaPlayerFeature(features, bitMask);
  const hasMedia = state === 'playing' || state === 'paused' || state === 'buffering';
  const isAwake = hasMedia || state === 'idle' || state === 'on';
  const isRunning = state === 'playing' || state === 'buffering';

  return {
    playPause: isRunning
      ? supports(MEDIA_PLAYER_FEATURE.PAUSE)
      : isAwake && supports(MEDIA_PLAYER_FEATURE.PLAY),
    previous: hasMedia && supports(MEDIA_PLAYER_FEATURE.PREVIOUS_TRACK),
    next: hasMedia && supports(MEDIA_PLAYER_FEATURE.NEXT_TRACK),
    seek: hasMedia && supports(MEDIA_PLAYER_FEATURE.SEEK),
    shuffle: hasMedia && supports(MEDIA_PLAYER_FEATURE.SHUFFLE_SET),
    repeat: hasMedia && supports(MEDIA_PLAYER_FEATURE.REPEAT_SET),
    volumeSet: isAwake && supports(MEDIA_PLAYER_FEATURE.VOLUME_SET),
    volumeMute: isAwake && supports(MEDIA_PLAYER_FEATURE.VOLUME_MUTE),
    grouping: isAwake && supports(MEDIA_PLAYER_FEATURE.GROUPING),
  };
};
