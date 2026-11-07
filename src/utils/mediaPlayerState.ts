import type { StatusTone } from '../components/ui/ModalParts';

type Translate = (key: string) => string;

const STATE_LABEL_KEYS: Record<string, string> = {
  playing: 'state.playing',
  paused: 'state.paused',
  idle: 'state.idle',
  standby: 'state.standby',
  buffering: 'state.buffering',
  on: 'status.on',
  off: 'status.off',
  unavailable: 'status.unavailable',
  unknown: 'common.unknown',
};

/** Translated label for a media_player state. */
export function getMediaPlayerStateLabel(state: unknown, translate: unknown): string {
  const t = translate as Translate;
  const value = String(state || 'unknown').toLowerCase();
  const key = STATE_LABEL_KEYS[value];
  if (key) return t(key);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Status chip tone for a media_player state. */
export function getMediaPlayerStateTone(state: unknown): StatusTone {
  const value = String(state || '').toLowerCase();
  if (value === 'playing') return 'on';
  if (value === 'paused' || value === 'buffering') return 'accent';
  if (value === 'unavailable') return 'error';
  return 'neutral';
}
