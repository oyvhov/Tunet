export const MUSIC_ASSISTANT_URL_KEY = 'tunet_music_assistant_url';

export type HaPanels = Record<
  string,
  { url_path?: string; title?: string | null; config?: Record<string, unknown> | null } | undefined
>;

export function normalizeExternalUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function openExternalUrl(value: unknown): boolean {
  const url = normalizeExternalUrl(value);
  if (!url) return false;
  globalThis.window?.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function readMusicAssistantUrl(): string {
  try {
    return globalThis.localStorage?.getItem(MUSIC_ASSISTANT_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function writeMusicAssistantUrl(value: string): void {
  try {
    if (value.trim()) globalThis.localStorage?.setItem(MUSIC_ASSISTANT_URL_KEY, value.trim());
    else globalThis.localStorage?.removeItem(MUSIC_ASSISTANT_URL_KEY);
  } catch {
    // ignore storage errors
  }
}

const joinHaPath = (haUrl: unknown, path: string): string => {
  const base = normalizeExternalUrl(haUrl);
  return base ? `${base.replace(/\/+$/, '')}/${path}` : '';
};

/**
 * The add-on's sidebar panel. Its path works on every HA version, unlike the add-on page,
 * which moved from /hassio/ingress/<slug> to /app/<slug> when add-ons became apps.
 */
export function getMusicAssistantAddonPath(panels: HaPanels | null | undefined): string {
  const addonPanel = Object.values(panels || {}).find((panel) => {
    const addon = panel?.config?.addon ?? panel?.config?.ingress;
    return typeof addon === 'string' && addon.includes('music_assistant');
  });
  return addonPanel?.url_path || '';
}

/** The configured address wins; otherwise the Music Assistant add-on panel, when installed. */
export function resolveMusicAssistantUrl(
  configuredUrl: unknown,
  haUrl: unknown,
  panels: HaPanels | null | undefined
): string {
  const configured = normalizeExternalUrl(configuredUrl);
  if (configured) return configured;
  const path = getMusicAssistantAddonPath(panels);
  return path ? joinHaPath(haUrl, path) : '';
}
