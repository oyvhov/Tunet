type Translate = (key: string) => string;

/** True when Home Assistant cannot act on or report the entity right now. */
export function isUnavailableState(state: string | null | undefined): boolean {
  return state === 'unavailable' || state === 'unknown';
}

/** The text every card shows for a state where `isUnavailableState` is true. */
export function getUnavailableLabel(state: string | null | undefined, t: Translate): string {
  return state === 'unknown' ? t('common.unknown') : t('status.unavailable');
}
