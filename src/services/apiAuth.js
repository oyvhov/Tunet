import { getAuth } from 'home-assistant-js-websocket';
import { clearOAuthTokens, getOAuthTokenSavedAt, loadTokens, saveTokens } from './oauthStorage';

export const HOME_ASSISTANT_API_UNAUTHORIZED_EVENT = 'tunet:api-auth-unauthorized';
const OAUTH_PROACTIVE_REFRESH_MS = 45 * 60 * 1000;
const OAUTH_REFRESH_SKEW_MS = 60 * 1000;

let oauthAuthProvider = null;
let detachedOAuthAuth = null;
let pendingOAuthRefreshPromise = null;
let pendingOAuthAuthPromise = null;

export const getStoredAuthMethod = () => {
  try {
    return globalThis.localStorage?.getItem('ha_auth_method') || 'oauth';
  } catch {
    return 'oauth';
  }
};

const isOAuthAuthMethod = () => getStoredAuthMethod() === 'oauth';

const getOAuthAuth = () => oauthAuthProvider?.current ?? detachedOAuthAuth ?? null;

const getStoredToken = () => {
  try {
    const authMethod = getStoredAuthMethod();
    if (authMethod === 'oauth') {
      const oauthToken = loadTokens()?.access_token;
      if (oauthToken) return oauthToken;
      return '';
    }

    return globalThis.localStorage?.getItem('ha_token') || globalThis.sessionStorage?.getItem('ha_token') || '';
  } catch {
    return '';
  }
};

const getCurrentOAuthAccessToken = () => {
  const auth = getOAuthAuth();
  if (typeof auth?.accessToken === 'string' && auth.accessToken) {
    return auth.accessToken;
  }

  return loadTokens()?.access_token || '';
};

const getStoredOAuthExpiresAt = () => {
  const expiresAt = Number(loadTokens()?.expires);
  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : 0;
};

const clearCachedOAuthAuth = () => {
  detachedOAuthAuth = null;
  pendingOAuthAuthPromise = null;
};

const ensureOAuthAuthSession = async () => {
  if (!isOAuthAuthMethod()) {
    return null;
  }

  const existingAuth = getOAuthAuth();
  if (existingAuth) {
    return existingAuth;
  }

  if (pendingOAuthAuthPromise) {
    return pendingOAuthAuthPromise;
  }

  const hassUrl = getStoredUrl();
  const tokens = loadTokens();
  if (!hassUrl || !tokens?.access_token) {
    return null;
  }
  if (tokens.hassUrl && tokens.hassUrl !== hassUrl) {
    return null;
  }

  pendingOAuthAuthPromise = getAuth({
    hassUrl,
    saveTokens,
    loadTokens: () => Promise.resolve(loadTokens()),
  })
    .then((auth) => {
      detachedOAuthAuth = auth;
      return auth;
    })
    .catch((error) => {
      clearCachedOAuthAuth();
      throw error;
    })
    .finally(() => {
      pendingOAuthAuthPromise = null;
    });

  return pendingOAuthAuthPromise;
};

const shouldProactivelyRefreshOAuth = () => {
  if (!isOAuthAuthMethod()) return false;
  const auth = getOAuthAuth();
  if (auth?.expired === true) return true;

  const expiresAt = getStoredOAuthExpiresAt();
  if (expiresAt > 0) {
    return Date.now() + OAUTH_REFRESH_SKEW_MS >= expiresAt;
  }

  if (typeof auth?.refreshAccessToken !== 'function') return false;

  const savedAt = getOAuthTokenSavedAt();
  if (!savedAt) return true;
  return Date.now() - savedAt >= OAUTH_PROACTIVE_REFRESH_MS;
};

const clearStoredTokenAuth = () => {
  try {
    globalThis.localStorage?.removeItem('ha_token');
    globalThis.sessionStorage?.removeItem('ha_token');
  } catch {
    // ignore storage errors
  }
};

/** @typedef {Error & { status: number, body: { error: string } }} UnauthorizedApiError */

const createUnauthorizedError = (message) => {
  const error = /** @type {UnauthorizedApiError} */ (new Error(message));
  error.status = 401;
  error.body = { error: message };
  return error;
};

export function notifyHomeAssistantApiUnauthorized(message = 'Home Assistant authentication failed') {
  const authMethod = getStoredAuthMethod();

  if (authMethod === 'oauth') {
    clearCachedOAuthAuth();
    clearOAuthTokens();
  } else {
    clearStoredTokenAuth();
  }

  if (typeof globalThis.window !== 'undefined') {
    globalThis.window.dispatchEvent(
      new globalThis.CustomEvent(HOME_ASSISTANT_API_UNAUTHORIZED_EVENT, {
        detail: {
          authMethod,
          message,
        },
      })
    );
  }

  return createUnauthorizedError(message);
}

export function setOAuthAuthProvider(provider) {
  oauthAuthProvider = provider ?? null;
  if (provider) {
    detachedOAuthAuth = null;
  }
}

export async function refreshOAuthAccessToken() {
  if (!isOAuthAuthMethod()) {
    return getStoredToken();
  }

  if (pendingOAuthRefreshPromise) {
    return pendingOAuthRefreshPromise;
  }

  pendingOAuthRefreshPromise = (async () => {
    const auth = (await ensureOAuthAuthSession()) ?? getOAuthAuth();
    if (typeof auth?.refreshAccessToken === 'function') {
      await auth.refreshAccessToken();
      if (typeof auth?.accessToken === 'string' && auth.accessToken) {
        return auth.accessToken;
      }
    }

    return getCurrentOAuthAccessToken();
  })().finally(() => {
    pendingOAuthRefreshPromise = null;
  });

  return pendingOAuthRefreshPromise;
}

const getStoredUrl = () => {
  try {
    return globalThis.localStorage?.getItem('ha_url') || '';
  } catch {
    return '';
  }
};

const getStoredFallbackUrl = () => {
  try {
    return globalThis.localStorage?.getItem('ha_fallback_url') || '';
  } catch {
    return '';
  }
};

export function getHomeAssistantRequestHeaders() {
  const headers = {};
  const haUrl = getStoredUrl();
  const fallbackUrl = getStoredFallbackUrl();
  const accessToken = isOAuthAuthMethod() ? getCurrentOAuthAccessToken() : getStoredToken();

  if (haUrl) {
    headers['x-ha-url'] = haUrl;
  }

  if (fallbackUrl) {
    headers['x-ha-fallback-url'] = fallbackUrl;
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function getHomeAssistantRequestHeadersAsync({ forceRefreshOAuth = false } = {}) {
  const headers = {};
  const haUrl = getStoredUrl();
  const fallbackUrl = getStoredFallbackUrl();
  let accessToken = isOAuthAuthMethod() ? getCurrentOAuthAccessToken() : getStoredToken();

  if ((forceRefreshOAuth || shouldProactivelyRefreshOAuth()) && isOAuthAuthMethod()) {
    try {
      await ensureOAuthAuthSession();
    } catch (err) {
      if (forceRefreshOAuth) throw err;
      // Proactive session init failed; continue with existing token
    }
  }

  if (forceRefreshOAuth || shouldProactivelyRefreshOAuth()) {
    try {
      accessToken = await refreshOAuthAccessToken();
    } catch (err) {
      if (forceRefreshOAuth) throw err;
      // Proactive refresh failed; continue with existing token
    }
  }

  if (haUrl) {
    headers['x-ha-url'] = haUrl;
  }

  if (fallbackUrl) {
    headers['x-ha-fallback-url'] = fallbackUrl;
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export function hasHomeAssistantRequestAuth() {
  const headers = getHomeAssistantRequestHeaders();
  return Boolean(headers['x-ha-url'] && headers.Authorization);
}

export function getValidatedHomeAssistantRequestHeaders() {
  const headers = getHomeAssistantRequestHeaders();

  if (!headers['x-ha-url']) {
    throw notifyHomeAssistantApiUnauthorized('Missing Home Assistant URL');
  }

  if (!headers.Authorization) {
    throw notifyHomeAssistantApiUnauthorized('Missing Home Assistant bearer token');
  }

  return headers;
}

export async function getValidatedHomeAssistantRequestHeadersAsync(options = {}) {
  const headers = await getHomeAssistantRequestHeadersAsync(options);

  if (!headers['x-ha-url']) {
    throw notifyHomeAssistantApiUnauthorized('Missing Home Assistant URL');
  }

  if (!headers.Authorization) {
    throw notifyHomeAssistantApiUnauthorized('Missing Home Assistant bearer token');
  }

  return headers;
}
