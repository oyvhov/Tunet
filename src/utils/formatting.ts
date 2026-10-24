import type { Translate } from '../types/ha';

export const formatRelativeTime = (
  timestamp: string | number | Date | null | undefined,
  t?: Translate | null
): string => {
  if (!timestamp || timestamp === 'unavailable' || timestamp === 'unknown' || timestamp === '--')
    return '--';
  // Fallback t function if not provided
  const translate = t || ((key: string) => key);

  try {
    const past = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return translate('time.justNow');
    if (diffMins < 60) return translate('time.minutesAgo').replace('{minutes}', String(diffMins));
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (remainingMins === 0)
      return translate('time.hoursAgo').replace('{hours}', String(diffHours));
    return translate('time.hoursMinutesAgo')
      .replace('{hours}', String(diffHours))
      .replace('{minutes}', String(remainingMins));
  } catch (_e) {
    return translate('time.unknown');
  }
};

export const formatDuration = (seconds: unknown): string => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/** Check if an entity belongs to a togglable domain. */
export const isToggleEntity = (id: string | null | undefined): boolean => {
  const domain = id?.split('.')?.[0];
  const toggleDomains: (string | undefined)[] = [
    'automation',
    'switch',
    'input_boolean',
    'script',
    'fan',
  ];
  return toggleDomains.includes(domain);
};
