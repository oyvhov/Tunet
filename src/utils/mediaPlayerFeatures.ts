const MEDIA_PLAYER_FEATURE = {
  TURN_ON: 128,
  TURN_OFF: 256,
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
