import type { Translate } from '../types/ha';

const resolveLocale = (locale?: string): string | undefined => {
  if (locale) return locale;
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return undefined;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Human time for "last changed" style labels: "just now", "12 min ago",
 * "today 14:31", "yesterday 23:02", then a short date.
 */
export const formatRelativeTime = (
  timestamp: string | number | Date | null | undefined,
  t?: Translate | null,
  locale?: string
): string => {
  if (!timestamp || timestamp === 'unavailable' || timestamp === 'unknown' || timestamp === '--')
    return '--';
  // Fallback t function if not provided
  const translate = t || ((key: string) => key);

  try {
    const past = new Date(timestamp);
    if (Number.isNaN(past.getTime())) return translate('time.unknown');
    const now = new Date();
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return translate('time.justNow');
    if (diffMins < 60) return translate('time.minutesAgo').replace('{minutes}', String(diffMins));

    const resolvedLocale = resolveLocale(locale);
    const clock = past.toLocaleTimeString(resolvedLocale, { hour: '2-digit', minute: '2-digit' });
    if (isSameDay(past, now)) return translate('time.todayAt').replace('{time}', clock);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(past, yesterday)) return translate('time.yesterdayAt').replace('{time}', clock);

    return past.toLocaleDateString(resolvedLocale, {
      day: 'numeric',
      month: 'short',
      ...(past.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    });
  } catch (_e) {
    return translate('time.unknown');
  }
};

/** Absolute date and time in the dashboard language, e.g. "7. nov. 00:32". */
export const formatDateTime = (
  timestamp: string | number | Date | null | undefined,
  locale?: string
): string => {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--';
  const resolvedLocale = resolveLocale(locale);
  const now = new Date();
  return date.toLocaleString(resolvedLocale, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  });
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
