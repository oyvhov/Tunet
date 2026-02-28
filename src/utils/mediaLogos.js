// Media Application Logo Utilities

export const MEDIA_LOGO_MAP = {
  'notifications for android tv': 'https://cdn.simpleicons.org/android',
  notification: 'https://cdn.simpleicons.org/android',
  android: 'https://cdn.simpleicons.org/android',
  'play store': 'https://cdn.simpleicons.org/googleplay',
  'google play': 'https://cdn.simpleicons.org/googleplay',
  'google cast': 'https://cdn.simpleicons.org/chromecast',
  chromecast: 'https://cdn.simpleicons.org/chromecast',
  emby: 'https://cdn.simpleicons.org/emby',
  jellyfin: 'https://cdn.simpleicons.org/jellyfin',
  spotify: 'https://cdn.simpleicons.org/spotify',
  youtube: 'https://cdn.simpleicons.org/youtube',
  'youtube tv': 'https://cdn.simpleicons.org/youtube',
  netflix: 'https://cdn.simpleicons.org/netflix',
  disney: 'https://cdn.simpleicons.org/disneyplus',
  'disney+': 'https://cdn.simpleicons.org/disneyplus',
  hbo: 'https://cdn.simpleicons.org/hbo',
  'prime video': 'https://cdn.simpleicons.org/amazonprimevideo',
  plex: 'https://cdn.simpleicons.org/plex',
  kodi: 'https://cdn.simpleicons.org/kodi',
  twitch: 'https://cdn.simpleicons.org/twitch',
};

export const NRK_SVG =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NiAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzE3NjdDRSIgZD0iTTAgMGg0NnYyNEgweiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik02IDE4VjZoNHYxMkg2Wk0xNS4yNCA3LjkgMTcuNTEgMThIMTMuMkwxMC41IDZoMi40MWMuNTYgMCAxLjEuMTkgMS41MS41NS40My4zNS42Ni44My44MiAxLjM2Wk0xOCAxOFY2aDR2MTJoLTRabTcuMDEtNy40NGEyLjM1IDIuMzUgMCAwIDEtMi4wOC0xLjE5IDIuMzQgMi4zNCAwIDAgMS0uMzItMS4yYzAtLjQzLjEtLjg0LjMyLTEuMmEyLjQxIDIuNDEgMCAwIDEgNC4xNCAwYy4yMi4zNi4zMy43Ny4zMiAxLjJhMi40IDIuNCAwIDAgMS0yLjM4IDIuNFpNMjggMThWNmg0djEyaC00Wm04Ljk3LTUuNDQuMjYuNDFhOTIuMjYgOTIuMjYgMCAwIDAgMS40MiAyLjMyIDMyMC44IDMyMC44IDAgMCAxIDEuNjQgMi43aC00LjMzYTYxNC4xNyA2MTQuMTcgMCAwIDAtMi4xNy0zLjUzIDYwLjEyIDYwLjEyIDAgMCAxLS45OS0xLjYyIDEuNzUgMS43NSAwIDAgMS0uMjktLjg0Yy4wMi0uMjkuMTEtLjU3LjI3LS44MWwuMzctLjZhMTI3LjA3IDEyNy4wNyAwIDAgMCAyLjA3LTMuNEwzNS45NiA2aDQuMzNsLTMuMzUgNS40NmMtLjEuMTYtLjE2LjM1LS4xNy41NC4wMS4yLjA4LjQuMi41NloiLz48L3N2Zz4=';

/**
 * Resolves the logo URL for a given media application name
 * @param {string} appName - The name of the application
 * @returns {string|null} - The URL of the logo or null if not found
 */
export const getMediaLogoUrl = (appName) => {
  if (!appName) return null;
  const appLower = appName.toLowerCase();

  // NRK logo as inline SVG
  if (appLower.includes('nrk')) {
    return NRK_SVG;
  }

  for (const [key, url] of Object.entries(MEDIA_LOGO_MAP)) {
    if (appLower.includes(key)) return url;
  }
  return null;
};
